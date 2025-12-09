const fs = require('fs').promises;
const path = require('path');

class StaffManager {
	constructor(client) {
		this.client = client;
		this.activityPath = path.join(__dirname, '../data/staffActivity.json');
		this.warningsPath = path.join(__dirname, '../data/staffWarnings.json');
		this.configPath = path.join(__dirname, 'staff-config.json');
		this.inactivityCheckInterval = null;
		this.notifiedInactive = new Set(); // Track who we've already notified
	}

	/**
	 * Load staff activity data
	 */
	async loadActivity() {
		try {
			const content = await fs.readFile(this.activityPath, 'utf8');
			const data = JSON.parse(content);
			if (!data.activity) data.activity = {};
			return data;
		} catch (error) {
			// Create file on first run to avoid noisy logs
			const fallback = { activity: {} };
			try { await fs.writeFile(this.activityPath, JSON.stringify(fallback, null, 2)); } catch {}
			if (error?.code !== 'ENOENT') this.client.log.error('Failed to load staff activity:', error);
			return fallback;
		}
	}

	/**
	 * Save staff activity data
	 */
	async saveActivity(data) {
		try {
			await fs.writeFile(this.activityPath, JSON.stringify(data, null, 2));
		} catch (error) {
			this.client.log.error('Failed to save staff activity:', error);
		}
	}

	/**
	 * Load staff warnings data
	 */
	async loadWarnings() {
		try {
			const content = await fs.readFile(this.warningsPath, 'utf8');
			const data = JSON.parse(content);
			if (!data.warnings) data.warnings = {};
			return data;
		} catch (error) {
			this.client.log.error('Failed to load staff warnings:', error);
			return { warnings: {} };
		}
	}

	/**
	 * Save staff warnings data
	 */
	async saveWarnings(data) {
		try {
			await fs.writeFile(this.warningsPath, JSON.stringify(data, null, 2));
		} catch (error) {
			this.client.log.error('Failed to save staff warnings:', error);
		}
	}

	/**
	 * Load configuration
	 */
	async loadConfig() {
		try {
			const content = await fs.readFile(this.configPath, 'utf8');
			return JSON.parse(content);
		} catch (error) {
			this.client.log.error('Failed to load staff config:', error);
			return {
				inactivityChannelId: null,
				inactivityHours: 72,
				warningLimit: 3,
				warningExpiryDays: 30,
				checkIntervalHours: 6,
				staffRoleIds: [
					"1375292697358897189",
					"1375292697371476112",
					"1375292697358897185",
				],
			};
		}
	}

	/**
	 * Record staff activity
	 */
	async recordActivity(userId, activityType = 'ticket') {
		try {
			const data = await this.loadActivity();
			
			if (!data.activity[userId]) {
				data.activity[userId] = {
					lastActivity: null,
					ticketCount: 0,
					activities: [],
				};
			}

			data.activity[userId].lastActivity = new Date().toISOString();
			
			if (activityType === 'ticket') {
				data.activity[userId].ticketCount++;
			}

			// Keep last 10 activities
			data.activity[userId].activities.unshift({
				type: activityType,
				timestamp: new Date().toISOString(),
			});
			data.activity[userId].activities = data.activity[userId].activities.slice(0, 10);

			await this.saveActivity(data);

			// Remove from notified set if they were inactive
			this.notifiedInactive.delete(userId);

		} catch (error) {
			this.client.log.error('Failed to record staff activity:', error);
		}
	}

	/**
	 * Start inactivity monitoring
	 */
	async startInactivityMonitoring() {
		const config = await this.loadConfig();
		const intervalMs = config.checkIntervalHours * 60 * 60 * 1000;

		// Run check immediately on startup
		await this.checkInactivity();

		// Then schedule regular checks
		this.inactivityCheckInterval = setInterval(async () => {
			await this.checkInactivity();
		}, intervalMs);

		this.client.log.info(`Staff inactivity monitoring started (checking every ${config.checkIntervalHours}h)`);
	}

	/**
	 * Check for inactive staff and post notices
	 */
	async checkInactivity() {
		try {
			const config = await this.loadConfig();
			
			if (!config.inactivityChannelId) {
				this.client.log.warn('Inactivity channel not configured');
				return;
			}

			const data = await this.loadActivity();
			const inactivityMs = config.inactivityHours * 60 * 60 * 1000;
			const now = Date.now();

			// Get all guilds to check staff members
			for (const [guildId, guild] of this.client.guilds.cache) {
				// Get staff members from configured roles
				const staffMembers = new Set();
				
				if (config.staffRoleIds.length > 0) {
					for (const roleId of config.staffRoleIds) {
						const role = guild.roles.cache.get(roleId);
						if (role) {
							role.members.forEach(member => staffMembers.add(member));
						}
					}
				}

				// Check each staff member's activity
				for (const member of staffMembers) {
					const userId = member.user.id;
					
					// Skip bots
					if (member.user.bot) continue;

					// Skip if already notified
					if (this.notifiedInactive.has(userId)) continue;

					const activity = data.activity[userId];
					
					// If no activity record, skip (new staff)
					if (!activity || !activity.lastActivity) {
						continue;
					}

					const lastActivityTime = new Date(activity.lastActivity).getTime();
					const timeSinceActivity = now - lastActivityTime;

					// Check if inactive
					if (timeSinceActivity >= inactivityMs) {
						await this.postInactivityNotice(member, timeSinceActivity);
						this.notifiedInactive.add(userId);
					}
				}
			}

		} catch (error) {
			this.client.log.error('Error checking staff inactivity:', error);
		}
	}

	/**
	 * Post inactivity notice
	 */
	async postInactivityNotice(member, inactiveTime) {
		try {
			const config = await this.loadConfig();
			const channel = await this.client.channels.fetch(config.inactivityChannelId);
			
			if (!channel) {
				this.client.log.error('Inactivity channel not found');
				return;
			}

			const { EmbedBuilder } = require('discord.js');

			const hours = Math.floor(inactiveTime / (1000 * 60 * 60));
			const days = Math.floor(hours / 24);

			const embed = new EmbedBuilder()
				.setColor('#e67e22')
				.setTitle('⚠️ Staff Inactivity Notice')
				.setDescription(`${member} has been inactive in tickets for **${days} days** (${hours} hours).`)
				.addFields(
					{ name: '👤 Staff Member', value: `${member.user.tag}`, inline: true },
					{ name: '⏰ Inactive Duration', value: `${days}d ${hours % 24}h`, inline: true },
					{ name: '📋 Action Needed', value: 'Please check in and participate in support tickets.', inline: false }
				)
				.setTimestamp()
				.setFooter({ text: `User ID: ${member.user.id}` });

			await channel.send({ 
				content: `${member}`,
				embeds: [embed] 
			});

			this.client.log.info(`Posted inactivity notice for ${member.user.tag}`);

		} catch (error) {
			this.client.log.error('Failed to post inactivity notice:', error);
		}
	}

	/**
	 * Add warning to staff member
	 */
	async addWarning(userId, username, reason, issuedBy, issuedByUsername, guildId) {
		try {
			const data = await this.loadWarnings();
			const config = await this.loadConfig();

			if (!data.warnings[userId]) {
				data.warnings[userId] = [];
			}

			// Expire old warnings first
			await this.expireWarnings(userId);

			// Create warning
			const warning = {
				id: `warn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				reason,
				issuedBy,
				issuedByUsername,
				issuedAt: new Date().toISOString(),
				expiresAt: new Date(Date.now() + (config.warningExpiryDays * 24 * 60 * 60 * 1000)).toISOString(),
				guildId,
			};

			data.warnings[userId].push(warning);
			await this.saveWarnings(data);

			// Get current active warnings count
			const activeWarnings = await this.getActiveWarnings(userId);

			// Check if should remove staff role
			if (activeWarnings.length >= config.warningLimit) {
				await this.removeStaffRole(userId, guildId, 'Too many warnings');
			}

			// Log to bot logs
			await this.logWarning('add', warning, userId, username);

			return {
				success: true,
				warning,
				activeCount: activeWarnings.length,
				limitReached: activeWarnings.length >= config.warningLimit,
			};

		} catch (error) {
			this.client.log.error('Failed to add warning:', error);
			return { success: false, error: 'internal' };
		}
	}

	/**
	 * Remove a warning
	 */
	async removeWarning(userId, warningId, removedBy, removedByUsername) {
		try {
			const data = await this.loadWarnings();

			if (!data.warnings[userId]) {
				return { success: false, error: 'no_warnings' };
			}

			const warningIndex = data.warnings[userId].findIndex(w => w.id === warningId);

			if (warningIndex === -1) {
				return { success: false, error: 'not_found' };
			}

			const warning = data.warnings[userId][warningIndex];
			data.warnings[userId].splice(warningIndex, 1);

			await this.saveWarnings(data);

			// Log to bot logs
			await this.logWarning('remove', warning, userId, null, removedBy, removedByUsername);

			return {
				success: true,
				warning,
				remaining: data.warnings[userId].length,
			};

		} catch (error) {
			this.client.log.error('Failed to remove warning:', error);
			return { success: false, error: 'internal' };
		}
	}

	/**
	 * Get active (non-expired) warnings for a user
	 */
	async getActiveWarnings(userId) {
		try {
			const data = await this.loadWarnings();
			
			if (!data.warnings[userId]) {
				return [];
			}

			const now = new Date();
			return data.warnings[userId].filter(w => new Date(w.expiresAt) > now);

		} catch (error) {
			this.client.log.error('Failed to get active warnings:', error);
			return [];
		}
	}

	/**
	 * Expire old warnings for a user
	 */
	async expireWarnings(userId) {
		try {
			const data = await this.loadWarnings();
			
			if (!data.warnings[userId]) {
				return;
			}

			const now = new Date();
			const beforeCount = data.warnings[userId].length;
			data.warnings[userId] = data.warnings[userId].filter(w => new Date(w.expiresAt) > now);
			const afterCount = data.warnings[userId].length;

			if (beforeCount !== afterCount) {
				await this.saveWarnings(data);
				this.client.log.info(`Expired ${beforeCount - afterCount} warnings for user ${userId}`);
			}

		} catch (error) {
			this.client.log.error('Failed to expire warnings:', error);
		}
	}

	/**
	 * Check role hierarchy
	 */
	async checkRoleHierarchy(issuerMember, targetMember) {
		try {
			// Owner can warn anyone
			if (issuerMember.guild.ownerId === issuerMember.id) {
				return true;
			}

			// Check if issuer's highest role is higher than target's
			return issuerMember.roles.highest.position > targetMember.roles.highest.position;

		} catch (error) {
			this.client.log.error('Failed to check role hierarchy:', error);
			return false;
		}
	}

	/**
	 * Remove staff role
	 */
	async removeStaffRole(userId, guildId, reason) {
		try {
			const guild = await this.client.guilds.fetch(guildId);
			const member = await guild.members.fetch(userId);
			const config = await this.loadConfig();

			let removed = false;
			for (const roleId of config.staffRoleIds) {
				if (member.roles.cache.has(roleId)) {
					await member.roles.remove(roleId, reason);
					removed = true;
					this.client.log.info(`Removed staff role ${roleId} from ${member.user.tag}: ${reason}`);
				}
			}

			if (removed) {
				// Notify user via DM
				try {
					const { EmbedBuilder } = require('discord.js');
					const embed = new EmbedBuilder()
						.setColor('#e74c3c')
						.setTitle('❌ Staff Role Removed')
						.setDescription(`Your staff role has been removed from **${guild.name}**.`)
						.addFields(
							{ name: '📝 Reason', value: reason, inline: false },
							{ name: '⚠️ Warning Limit', value: 'You have reached the maximum number of warnings.', inline: false }
						)
						.setTimestamp();

					await member.send({ embeds: [embed] });
				} catch (dmError) {
					this.client.log.warn(`Could not DM user ${userId} about role removal`);
				}

				// Log to bot logs
				await this.logRoleRemoval(member, reason);
			}

			return removed;

		} catch (error) {
			this.client.log.error('Failed to remove staff role:', error);
			return false;
		}
	}

	/**
	 * Log warning activity
	 */
	async logWarning(type, warning, userId, username, actionBy = null, actionByUsername = null) {
		try {
			const config = await this.loadConfig();
			const hwidConfig = require('./hwid-config.json');
			
			if (!hwidConfig.botLogsChannelId) {
				return;
			}

			const channel = await this.client.channels.fetch(hwidConfig.botLogsChannelId);
			if (!channel) return;

			const { EmbedBuilder } = require('discord.js');
			const embed = new EmbedBuilder().setTimestamp();

			if (type === 'add') {
				embed.setColor('#e67e22')
					.setTitle('⚠️ Staff Warning Issued')
					.addFields(
						{ name: '👤 Staff Member', value: `<@${userId}> (${username || 'Unknown'})`, inline: true },
						{ name: '👮 Issued By', value: `<@${warning.issuedBy}> (${warning.issuedByUsername})`, inline: true },
						{ name: '📝 Reason', value: warning.reason, inline: false },
						{ name: '⏰ Expires', value: `<t:${Math.floor(new Date(warning.expiresAt).getTime() / 1000)}:R>`, inline: true },
						{ name: '🆔 Warning ID', value: `\`${warning.id}\``, inline: true }
					);
			} else if (type === 'remove') {
				embed.setColor('#2ecc71')
					.setTitle('✅ Staff Warning Removed')
					.addFields(
						{ name: '👤 Staff Member', value: `<@${userId}>`, inline: true },
						{ name: '👮 Removed By', value: `<@${actionBy}> (${actionByUsername})`, inline: true },
						{ name: '📝 Original Reason', value: warning.reason, inline: false },
						{ name: '🆔 Warning ID', value: `\`${warning.id}\``, inline: true }
					);
			}

			await channel.send({ embeds: [embed] });

		} catch (error) {
			this.client.log.error('Failed to log warning:', error);
		}
	}

	/**
	 * Log role removal
	 */
	async logRoleRemoval(member, reason) {
		try {
			const hwidConfig = require('./hwid-config.json');
			
			if (!hwidConfig.botLogsChannelId) {
				return;
			}

			const channel = await this.client.channels.fetch(hwidConfig.botLogsChannelId);
			if (!channel) return;

			const { EmbedBuilder } = require('discord.js');

			const embed = new EmbedBuilder()
				.setColor('#e74c3c')
				.setTitle('🚫 Staff Role Removed (Auto)')
				.setDescription(`${member} has been automatically removed from staff.`)
				.addFields(
					{ name: '👤 User', value: `${member.user.tag}`, inline: true },
					{ name: '📝 Reason', value: reason, inline: true },
					{ name: '⚠️ Warning Limit', value: 'Maximum warnings reached', inline: false }
				)
				.setTimestamp()
				.setFooter({ text: `User ID: ${member.user.id}` });

			await channel.send({ embeds: [embed] });

		} catch (error) {
			this.client.log.error('Failed to log role removal:', error);
		}
	}

	/**
	 * Get staff profile data
	 */
	async getStaffProfile(userId) {
		try {
			// Get activity data
			const activityData = await this.loadActivity();
			const activity = activityData.activity[userId] || {
				lastActivity: null,
				ticketCount: 0,
				activities: [],
			};

			// Get warnings
			const activeWarnings = await this.getActiveWarnings(userId);

			// Get purchase total from order analytics
			let purchaseTotal = 0;
			if (this.client.orderAnalytics) {
				try {
					const analytics = this.client.orderAnalytics.getAnalytics();
					for (const order of Object.values(analytics.orders)) {
						if (order.userId === userId) {
							purchaseTotal += order.price || 0;
						}
					}
				} catch (e) {
					this.client.log.warn('Could not fetch purchase total for profile');
				}
			}

			return {
				ticketCount: activity.ticketCount,
				lastActivity: activity.lastActivity,
				warningCount: activeWarnings.length,
				warnings: activeWarnings,
				purchaseTotal,
			};

		} catch (error) {
			this.client.log.error('Failed to get staff profile:', error);
			return null;
		}
	}

	/**
	 * Stop inactivity monitoring
	 */
	stopInactivityMonitoring() {
		if (this.inactivityCheckInterval) {
			clearInterval(this.inactivityCheckInterval);
			this.inactivityCheckInterval = null;
			this.client.log.info('Staff inactivity monitoring stopped');
		}
	}
}

module.exports = StaffManager;
