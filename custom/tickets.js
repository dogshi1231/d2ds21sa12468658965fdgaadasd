const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

// Timeout helper for async operations
const withTimeout = (promise, ms, label = 'operation') =>
	Promise.race([
		promise,
		new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms))
	]);

class TicketClaimManager {
	constructor(client) {
		this.client = client;
		this.claimsPath = path.join(process.cwd(), 'data', 'ticket_claims.json');
		this.claims = this.loadClaims();
		this.inactivityTimers = new Map(); // channelId -> timeout
		this.INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds
		
		// Load configuration
		this.configPath = path.join(process.cwd(), 'custom', 'claim-config.json');
		this.config = this.loadConfig();
	}

	loadConfig() {
		try {
			if (fs.existsSync(this.configPath)) {
				return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
			}
		} catch (error) {
			this.client.log.error('Failed to load claim config:', error);
		}
		return {};
	}

	loadClaims() {
		try {
			if (fs.existsSync(this.claimsPath)) {
				return JSON.parse(fs.readFileSync(this.claimsPath, 'utf8'));
			}
		} catch (error) {
			this.client.log.error('Failed to load ticket claims:', error);
		}
		return {};
	}

	saveClaims() {
		try {
			const dir = path.dirname(this.claimsPath);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
			fs.writeFileSync(this.claimsPath, JSON.stringify(this.claims, null, 2));
		} catch (error) {
			this.client.log.error('Failed to save ticket claims:', error);
		}
	}

	/**
	 * Handle ticket claim
	 * @param {import('discord.js').Channel} channel 
	 * @param {import('discord.js').GuildMember} claimer 
	 * @param {import('discord.js').User} customer 
	 */
	async claimTicket(channel, claimer, customer) {
		try {
			// Check if already claimed
			if (this.claims[channel.id]) {
				const existingClaimer = await channel.guild.members.fetch(this.claims[channel.id].claimerId).catch(() => null);
				return {
					success: false,
					message: `This ticket is already claimed by ${existingClaimer ? existingClaimer.user.tag : 'another staff member'}.`,
				};
			}

			// Save claim data
			this.claims[channel.id] = {
				claimerId: claimer.id,
				customerId: customer.id,
				claimedAt: new Date().toISOString(),
				guildId: channel.guild.id,
			};
			this.saveClaims();

			// Lock channel (guard against perms/rate-limit stalls)
			this.client.log.debug(`[CLAIM] lockChannel start ${channel.id}`);
			await withTimeout(this.lockChannel(channel, claimer, customer), 7000, 'lockChannel');
			this.client.log.debug(`[CLAIM] lockChannel done ${channel.id}`);

			// Send claim confirmation embed (non-fatal if fails)
			const claimEmbed = new EmbedBuilder()
				.setColor(0x00ff00)
				.setTitle('✅ Ticket Claimed')
				.setDescription(`${claimer} has claimed this ticket and will assist you.`)
				.addFields(
					{ name: 'Claimed By', value: `${claimer.user.tag}`, inline: true },
					{ name: 'Claimed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
				)
				.setFooter({ text: 'This ticket is now locked to the claimer and customer only.' })
				.setTimestamp();

			try {
				await withTimeout(channel.send({ embeds: [claimEmbed] }), 5000, 'channel.send');
				this.client.log.debug(`[CLAIM] sent claim embed ${channel.id}`);
			} catch (e) {
				this.client.log.warn(`[CLAIM] failed to send embed in ${channel.id}: ${e.message}`);
			}

			// Start inactivity timer
			this.startInactivityTimer(channel.id);
			this.client.log.debug(`[CLAIM] timer started ${channel.id}`);

			// Log to mod channel (non-fatal)
			try {
				await withTimeout(this.logClaim(channel, claimer, customer, 'claim'), 5000, 'logClaim');
				this.client.log.debug(`[CLAIM] logged claim ${channel.id}`);
			} catch (e) {
				this.client.log.warn(`[CLAIM] failed to log claim ${channel.id}: ${e.message}`);
			}

			this.client.log.info(`Ticket ${channel.id} claimed by ${claimer.user.tag}`);

			return { success: true };
		} catch (error) {
			this.client.log.error('Error claiming ticket:', error);
			return { success: false, message: 'An error occurred while claiming the ticket.' };
		}
	}

	/**
	 * Handle ticket unclaim/release
	 * @param {import('discord.js').Channel} channel 
	 * @param {boolean} isAutoRelease 
	 * @param {string} reason 
	 */
	async unclaimTicket(channel, isAutoRelease = false, reason = 'Manual release') {
		try {
			const claim = this.claims[channel.id];
			if (!claim) {
				return { success: false, message: 'This ticket is not claimed.' };
			}

			const claimer = await channel.guild.members.fetch(claim.claimerId).catch(() => null);
			const customer = await channel.guild.members.fetch(claim.customerId).catch(() => null);

			// Clear inactivity timer
			this.clearInactivityTimer(channel.id);

			// Delete claim
			delete this.claims[channel.id];
			this.saveClaims();

			// Unlock channel
			await this.unlockChannel(channel);

			// Send release embed with claim button
			const releaseEmbed = new EmbedBuilder()
				.setColor(isAutoRelease ? 0xff9900 : 0x808080)
				.setTitle(isAutoRelease ? '⚠️ Ticket Auto-Released' : '🔓 Ticket Released')
				.setDescription(
					isAutoRelease
						? `Staff member was inactive for 10 minutes — ticket has been released.\n\nAnother staff member can now claim this ticket.`
						: reason
				)
				.addFields(
					{ name: 'Previously Claimed By', value: claimer ? `${claimer.user.tag}` : 'Unknown', inline: true },
					{ name: 'Released At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
				)
				.setTimestamp();

			// Add claim button
			const claimButton = new ButtonBuilder()
				.setCustomId(JSON.stringify({ action: 'claim_ticket' }))
				.setLabel('Claim Ticket')
				.setStyle(ButtonStyle.Primary)
				.setEmoji('✋');

			const row = new ActionRowBuilder().addComponents(claimButton);

			// Mention staff role(s) if configured and auto-release
			let content = '';
			if (isAutoRelease && this.config.staffRoleId) {
				const roleIds = this.config.staffRoleId.split(',').map(id => id.trim());
				const mentions = roleIds.map(id => `<@&${id}>`).join(' ');
				content = `${mentions} — Ticket needs assistance! Staff was inactive for 10 minutes.`;
			}

			await channel.send({
				content: content || undefined,
				embeds: [releaseEmbed],
				components: [row],
			});

			// Log to mod channel
			await this.logClaim(channel, claimer, customer, isAutoRelease ? 'auto-release' : 'release', reason);

			this.client.log.info(`Ticket ${channel.id} released (${isAutoRelease ? 'auto' : 'manual'})`);

			return { success: true };
		} catch (error) {
			this.client.log.error('Error unclaiming ticket:', error);
			return { success: false, message: 'An error occurred while releasing the ticket.' };
		}
	}

	/**
	 * Lock channel to claimer and customer only
	 */
	async lockChannel(channel, claimer, customer) {
		try {
			// Deny everyone from sending
			await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
				[PermissionFlagsBits.SendMessages]: false,
			});

			// Allow claimer + customer to view/send
			await channel.permissionOverwrites.edit(claimer, {
				[PermissionFlagsBits.SendMessages]: true,
				[PermissionFlagsBits.ViewChannel]: true,
			});
			await channel.permissionOverwrites.edit(customer, {
				[PermissionFlagsBits.SendMessages]: true,
				[PermissionFlagsBits.ViewChannel]: true,
			});

			// If you have staffRoleId in config, set them to view-only (no send)
			if (this.config.staffRoleId) {
				const roleIds = this.config.staffRoleId.split(',').map(s => s.trim()).filter(Boolean);
				for (const rid of roleIds) {
					const role = channel.guild.roles.cache.get(rid);
					if (!role) continue;
					await channel.permissionOverwrites.edit(role, {
						[PermissionFlagsBits.ViewChannel]: true,
						[PermissionFlagsBits.SendMessages]: false,
					});
				}
			}
		} catch (error) {
			this.client.log.error('Error locking channel:', error);
			throw error; // bubble so withTimeout can catch/time out
		}
	}

	/**
	 * Unlock channel for all staff
	 */
	async unlockChannel(channel) {
		try {
			await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
				[PermissionFlagsBits.SendMessages]: null,
			});

			const claim = this.claims[channel.id];
			if (claim) {
				await channel.permissionOverwrites.delete(claim.claimerId).catch(() => {});
				await channel.permissionOverwrites.delete(claim.customerId).catch(() => {});
			}

			if (this.config.staffRoleId) {
				const roleIds = this.config.staffRoleId.split(',').map(s => s.trim()).filter(Boolean);
				for (const rid of roleIds) {
					const role = channel.guild.roles.cache.get(rid);
					if (!role) continue;
					await channel.permissionOverwrites.edit(role, {
						[PermissionFlagsBits.ViewChannel]: true,
						[PermissionFlagsBits.SendMessages]: true,
					});
				}
			}
		} catch (error) {
			this.client.log.error('Error unlocking channel:', error);
			throw error;
		}
	}

	/**
	 * Start inactivity timer for a ticket
	 */
	startInactivityTimer(channelId) {
		// Clear existing timer if any
		this.clearInactivityTimer(channelId);

		const timer = setTimeout(async () => {
			const channel = await this.client.channels.fetch(channelId).catch(() => null);
			if (channel && this.claims[channelId]) {
				await this.unclaimTicket(channel, true, 'Staff inactive for 10 minutes');
			}
		}, this.INACTIVITY_TIMEOUT);

		this.inactivityTimers.set(channelId, timer);
		this.client.log.debug(`Started inactivity timer for ticket ${channelId}`);
	}

	/**
	 * Clear inactivity timer
	 */
	clearInactivityTimer(channelId) {
		const timer = this.inactivityTimers.get(channelId);
		if (timer) {
			clearTimeout(timer);
			this.inactivityTimers.delete(channelId);
			this.client.log.debug(`Cleared inactivity timer for ticket ${channelId}`);
		}
	}

	/**
	 * Reset inactivity timer (when claimer sends a message)
	 */
	resetInactivityTimer(channelId) {
		if (this.claims[channelId]) {
			this.client.log.debug(`Resetting inactivity timer for ticket ${channelId}`);
			this.startInactivityTimer(channelId);
		}
	}

	/**
	 * Handle message in claimed ticket
	 */
	async handleMessage(message) {
		if (!message.guild || message.author.bot) return;

		const claim = this.claims[message.channel.id];
		if (!claim) return;

		// If claimer sends a message, reset the timer
		if (message.author.id === claim.claimerId) {
			this.resetInactivityTimer(message.channel.id);
			this.client.log.debug(`Claimer ${message.author.tag} responded in ticket ${message.channel.id}, timer reset`);
		}
		// If customer sends a message, just continue the timer
		// (timer only resets when claimer responds)
	}

	/**
	 * Clean up claim when ticket is closed/deleted
	 */
	async cleanupTicket(channelId) {
		this.clearInactivityTimer(channelId);
		if (this.claims[channelId]) {
			delete this.claims[channelId];
			this.saveClaims();
			this.client.log.info(`Cleaned up claim data for ticket ${channelId}`);
		}
	}

	/**
	 * Log claim/unclaim to mod channel
	 */
	async logClaim(channel, claimer, customer, action, reason = '') {
		try {
			if (!this.config.modLogChannelId) return;

			const modLogChannel = await channel.guild.channels.fetch(this.config.modLogChannelId).catch(() => null);
			if (!modLogChannel || !modLogChannel.isTextBased()) return;

			const colors = {
				claim: 0x00ff00,
				release: 0x808080,
				'auto-release': 0xff9900,
			};

			const titles = {
				claim: '✅ Ticket Claimed',
				release: '🔓 Ticket Released',
				'auto-release': '⚠️ Ticket Auto-Released',
			};

			const logEmbed = new EmbedBuilder()
				.setColor(colors[action] || 0x808080)
				.setTitle(titles[action] || 'Ticket Claim Event')
				.addFields(
					{ name: 'Ticket', value: `<#${channel.id}>`, inline: true },
					{ name: 'Staff Member', value: claimer ? `${claimer.user.tag}` : 'Unknown', inline: true },
					{ name: 'Customer', value: customer ? `${customer.user.tag}` : 'Unknown', inline: true },
					{ name: 'Action', value: action, inline: true },
				);

			if (reason) {
				logEmbed.addFields({ name: 'Reason', value: reason });
			}

			logEmbed.setTimestamp();

			await modLogChannel.send({ embeds: [logEmbed] });
		} catch (error) {
			this.client.log.error('Error logging claim event:', error);
		}
	}

	/**
	 * Check if a ticket is claimed
	 */
	isClaimed(channelId) {
		return !!this.claims[channelId];
	}

	/**
	 * Get claim info
	 */
	getClaim(channelId) {
		return this.claims[channelId];
	}
}

module.exports = TicketClaimManager;
