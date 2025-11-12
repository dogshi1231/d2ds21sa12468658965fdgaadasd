const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

class RewardsManager {
	constructor(client) {
		this.client = client;
		this.dataDir = path.join(__dirname, '../data');
		this.staffBalancesPath = path.join(this.dataDir, 'staff_balances.json');
		this.auditLogPath = path.join(this.dataDir, 'audit_log.json');
		this.claimsPath = path.join(this.dataDir, 'claims.json');
		this.profilesPath = path.join(this.dataDir, 'profiles.json');
		this.vouchConfigPath = path.join(__dirname, 'vouch-config.json');
		
		// Ensure data directory exists
		if (!fs.existsSync(this.dataDir)) {
			fs.mkdirSync(this.dataDir, { recursive: true });
		}
		
		// Load configuration
		this.loadConfig();
		
		// Load data files
		this.staffBalances = this.loadJSON(this.staffBalancesPath, {});
		this.auditLog = this.loadJSON(this.auditLogPath, []);
	}

	loadConfig() {
		try {
			if (fs.existsSync(this.vouchConfigPath)) {
				this.config = JSON.parse(fs.readFileSync(this.vouchConfigPath, 'utf8'));
			} else {
				// Create default config
				this.config = {
					vouchesChannelId: '1351359584601636897',
					rewardPercentage: 5,
					modLogChannelId: '1437223214534361098',
				};
				fs.writeFileSync(this.vouchConfigPath, JSON.stringify(this.config, null, 2));
			}
		} catch (error) {
			this.client.log.error('Error loading vouch config:', error);
			this.config = {
				vouchesChannelId: null,
				rewardPercentage: 5,
				modLogChannelId: null,
			};
		}
	}

	loadJSON(filepath, defaultValue = {}) {
		try {
			if (fs.existsSync(filepath)) {
				return JSON.parse(fs.readFileSync(filepath, 'utf8'));
			}
			return defaultValue;
		} catch (error) {
			this.client.log.error(`Error loading ${filepath}:`, error);
			return defaultValue;
		}
	}

	saveJSON(filepath, data) {
		try {
			fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
			return true;
		} catch (error) {
			this.client.log.error(`Error saving ${filepath}:`, error);
			return false;
		}
	}

	/**
	 * Get the cost of a product from claims by ticket ID or customer ID
	 */
	async getTicketCost(ticketId, customerId = null) {
		const claims = this.loadJSON(this.claimsPath, {});
		const profiles = this.loadJSON(this.profilesPath, {});
		
		// First try: Search for invoice linked to this ticket
		for (const [invoiceId, claim] of Object.entries(claims)) {
			if (claim.ticketId === ticketId) {
				return {
					amount: claim.amount || 0,
					product: claim.product || 'Unknown Product',
					invoiceId,
					vouchedBefore: claim.vouchedCount > 0,
					vouchedCount: claim.vouchedCount || 0,
				};
			}
		}
		
		// Second try: If no direct link, search by customer's email
		if (customerId && profiles[customerId]) {
			const customerEmail = profiles[customerId].email;
			this.client.log.info(`[GetTicketCost] Searching by customer email: ${customerEmail}`);
			
			// Find most recent claim with matching email
			let mostRecentClaim = null;
			let mostRecentInvoiceId = null;
			let mostRecentTimestamp = null;
			
			for (const [invoiceId, claim] of Object.entries(claims)) {
				if (claim.email === customerEmail) {
					const claimTime = new Date(claim.timestamp).getTime();
					if (!mostRecentTimestamp || claimTime > mostRecentTimestamp) {
						mostRecentTimestamp = claimTime;
						mostRecentClaim = claim;
						mostRecentInvoiceId = invoiceId;
					}
				}
			}
			
			if (mostRecentClaim) {
				this.client.log.info(`[GetTicketCost] Found invoice by email: ${mostRecentInvoiceId}`);
				// Auto-link this invoice to the ticket
				mostRecentClaim.ticketId = ticketId;
				mostRecentClaim.linkedAt = new Date().toISOString();
				this.saveJSON(this.claimsPath, claims);
				
				return {
					amount: mostRecentClaim.amount || 0,
					product: mostRecentClaim.product || 'Unknown Product',
					invoiceId: mostRecentInvoiceId,
					vouchedBefore: mostRecentClaim.vouchedCount > 0,
					vouchedCount: mostRecentClaim.vouchedCount || 0,
				};
			}
		}
		
		return null;
	}

	/**
	 * Credit staff member's balance
	 */
	creditStaff(staffId, amount, reason) {
		if (!this.staffBalances[staffId]) {
			this.staffBalances[staffId] = {
				balance: 0,
				totalEarned: 0,
				vouches: 0,
				history: [],
			};
		}

		this.staffBalances[staffId].balance += amount;
		this.staffBalances[staffId].totalEarned += amount;
		this.staffBalances[staffId].vouches += 1;
		this.staffBalances[staffId].history.push({
			amount,
			reason,
			timestamp: new Date().toISOString(),
		});

		this.saveJSON(this.staffBalancesPath, this.staffBalances);
	}

	/**
	 * Log reward to audit log
	 */
	logReward(data) {
		this.auditLog.push({
			...data,
			timestamp: new Date().toISOString(),
		});

		// Keep only last 1000 entries
		if (this.auditLog.length > 1000) {
			this.auditLog = this.auditLog.slice(-1000);
		}

		this.saveJSON(this.auditLogPath, this.auditLog);
	}

	/**
	 * Process vouch and reward staff
	 */
	async processVouch(interaction, rating, comment, ticketChannel, customer, staff) {
		try {
			this.client.log.info(`[ProcessVouch] Starting vouch processing for ticket ${ticketChannel.id}`);
			this.client.log.info(`[ProcessVouch] Rating: ${rating}, Customer: ${customer.user.tag}, Staff: ${staff.user.tag}`);
			
			// Get ticket cost (pass customer ID for email lookup)
			const costData = await this.getTicketCost(ticketChannel.id, customer.id);
			this.client.log.info(`[ProcessVouch] Cost data:`, costData);
			
			const cost = costData ? costData.amount : 0;
			const product = costData ? costData.product : 'Unknown Product';
			const invoiceId = costData ? costData.invoiceId : 'N/A';
			const vouchedBefore = costData ? costData.vouchedBefore : false;
			const vouchedCount = costData ? costData.vouchedCount : 0;
			
			this.client.log.info(`[ProcessVouch] Cost: $${cost / 100}, Product: ${product}, Invoice: ${invoiceId}, VouchedBefore: ${vouchedBefore}, VouchedCount: ${vouchedCount}`);

			// Calculate reward - 5% for first vouch, 1% for subsequent vouches
			let rewardPercentage = vouchedBefore ? 1 : this.config.rewardPercentage;
			const rewardAmount = Math.floor(cost * (rewardPercentage / 100));
			
			this.client.log.info(`[ProcessVouch] Reward percentage: ${rewardPercentage}% (${vouchedBefore ? 'repeat vouch' : 'first vouch'})`);
			
			// Update vouch count for this invoice
			if (invoiceId !== 'N/A') {
				const claims = this.loadJSON(this.claimsPath, {});
				if (claims[invoiceId]) {
					claims[invoiceId].vouchedCount = (claims[invoiceId].vouchedCount || 0) + 1;
					claims[invoiceId].lastVouchedAt = new Date().toISOString();
					this.saveJSON(this.claimsPath, claims);
				}
			}

			// Create vouch embed
			const vouchEmbed = new EmbedBuilder()
				.setColor(vouchedBefore ? 0xFFA500 : 0x00ff00) // Orange for repeat, Green for first
				.setTitle(vouchedBefore ? '🔄 Repeat Vouch' : '🟢 New Vouch')
				.addFields(
					{ name: '⭐️ Rating', value: '⭐'.repeat(rating), inline: true },
					{ name: '🎁 Product', value: product, inline: true },
					{ name: '🧑‍💻 Staff', value: `<@${staff.id}>`, inline: true },
					{ name: '👤 Customer', value: `<@${customer.id}>`, inline: true },
				)
				.setFooter({ text: `Invoice: ${invoiceId}${vouchedBefore ? ` • Vouch #${vouchedCount + 1}` : ''}` })
				.setTimestamp();

			if (vouchedBefore) {
				vouchEmbed.addFields({ 
					name: '🔁 Follow-up Support', 
					value: `This customer received additional help for the same purchase (${rewardPercentage}% reward)`,
					inline: false 
				});
			}

			if (comment && comment.trim().length > 0) {
				vouchEmbed.addFields({ name: '💬 Review', value: comment });
			}

			// Send to vouches channel
			this.client.log.info(`Attempting to send vouch to channel ${this.config.vouchesChannelId}`);
			try {
				const vouchesChannel = await this.client.channels.fetch(this.config.vouchesChannelId).catch(err => {
					this.client.log.error('Error fetching vouches channel:', err);
					return null;
				});
				
				if (vouchesChannel) {
					this.client.log.info(`Vouches channel found: ${vouchesChannel.name}`);
					await vouchesChannel.send({ embeds: [vouchEmbed] });
					this.client.log.info(`Vouch embed successfully sent to #${vouchesChannel.name}`);
				} else {
					this.client.log.error(`Vouches channel not found with ID: ${this.config.vouchesChannelId}`);
				}
			} catch (error) {
				this.client.log.error('Error sending vouch to vouches channel:', error);
			}

			// Credit staff member
			if (rewardAmount > 0) {
				this.creditStaff(
					staff.id,
					rewardAmount,
					`Vouch from ticket ${ticketChannel.name} - ${rating}⭐`
				);
			}

			// Log to audit
			this.logReward({
				type: 'vouch',
				staffId: staff.id,
				customerId: customer.id,
				ticketId: ticketChannel.id,
				rating,
				comment: comment || null,
				product,
				cost,
				rewardAmount,
				invoiceId,
			});

			// Send confirmation to customer (both DM and ticket)
			const confirmMessage = `✅ **Thank you for your feedback!**\n\n` +
				`Your ${rating}-star review has been submitted and posted to our vouches channel.\n\n` +
				`💰 **Your review helps ${staff} get paid!** Staff earn a ${this.config.rewardPercentage}% commission for excellent service.\n\n` +
				`We appreciate you taking the time to share your experience! 🙏`;

			// Try to send to customer's DM
			try {
				await customer.user.send(confirmMessage);
			} catch (error) {
				this.client.log.debug('Could not DM customer confirmation');
			}

			// Send in ticket channel
			try {
				await ticketChannel.send({
					content: `${customer}`,
					embeds: [new EmbedBuilder()
						.setColor(0x00ff00)
						.setTitle('✅ Review Submitted!')
						.setDescription(
							`Thank you for rating your support experience!\n\n` +
							`**Your ${rating}-star review has been recorded.**\n\n` +
							`💰 Your feedback helps our staff get paid! ${staff} has been credited with their commission.\n\n` +
							`We appreciate your time and honest feedback! 🙏`
						)
						.setTimestamp()
					],
				});
			} catch (error) {
				this.client.log.debug('Could not send confirmation in ticket channel');
			}

			// Send ephemeral confirmation to whoever submitted (in case they used button in ticket)
			await interaction.followUp({
				content: confirmMessage,
				ephemeral: true,
			});

			// Log to mod channel
			await this.logToModChannel(staff, customer, rating, product, rewardAmount, rewardPercentage, vouchedBefore);

			this.client.log.info(`Vouch processed: ${staff.user.tag} received $${(rewardAmount / 100).toFixed(2)} from ${customer.user.tag}`);

			return { success: true, rewardAmount };
		} catch (error) {
			this.client.log.error('Error processing vouch:', error);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Log reward to mod channel
	 */
	async logToModChannel(staff, customer, rating, product, rewardAmount, rewardPercentage = 5, isRepeat = false) {
		try {
			if (!this.config.modLogChannelId) return;

			const modChannel = await this.client.channels.fetch(this.config.modLogChannelId).catch(() => null);
			if (!modChannel) return;

			const logEmbed = new EmbedBuilder()
				.setColor(isRepeat ? 0xFFA500 : 0x5865F2) // Orange for repeat, Blue for first
				.setTitle(isRepeat ? '� Repeat Vouch Reward' : '�💰 Staff Reward')
				.setDescription(`${staff} received a vouch reward${isRepeat ? ' (follow-up support)' : ''}`)
				.addFields(
					{ name: 'Staff', value: `${staff.user.tag} (${staff.id})`, inline: true },
					{ name: 'Customer', value: `${customer.user.tag} (${customer.id})`, inline: true },
					{ name: 'Rating', value: `${'⭐'.repeat(rating)} (${rating}/5)`, inline: true },
					{ name: 'Product', value: product, inline: true },
					{ name: 'Reward', value: `$${(rewardAmount / 100).toFixed(2)} (${rewardPercentage}%)`, inline: true },
					{ name: 'New Balance', value: `$${((this.staffBalances[staff.id]?.balance || 0) / 100).toFixed(2)}`, inline: true },
				)
				.setTimestamp();

			await modChannel.send({ embeds: [logEmbed] });
		} catch (error) {
			this.client.log.error('Error logging to mod channel:', error);
		}
	}

	/**
	 * Force vouch without customer input (owner only)
	 */
	async forceVouch(ticketId, staffId, executorId) {
		try {
			// Verify executor is owner
			const application = await this.client.application.fetch();
			if (executorId !== application.owner.id) {
				return { success: false, message: 'Only the bot owner can force vouches.' };
			}

			// Get ticket cost
			const costData = await this.getTicketCost(ticketId);
			if (!costData) {
				return { success: false, message: 'Could not find cost data for this ticket.' };
			}

			const cost = costData.amount;
			const product = costData.product;
			const rewardAmount = Math.floor(cost * (this.config.rewardPercentage / 100));

			// Credit staff member
			this.creditStaff(
				staffId,
				rewardAmount,
				`Force vouch - Ticket ${ticketId}`
			);

			// Log to audit
			this.logReward({
				type: 'force_vouch',
				staffId,
				ticketId,
				product,
				cost,
				rewardAmount,
				executorId,
			});

			this.client.log.info(`Force vouch: Staff ${staffId} received $${rewardAmount} for ticket ${ticketId}`);

			return { success: true, rewardAmount, product };
		} catch (error) {
			this.client.log.error('Error forcing vouch:', error);
			return { success: false, message: error.message };
		}
	}

	/**
	 * Get staff balance
	 */
	getStaffBalance(staffId) {
		return this.staffBalances[staffId] || {
			balance: 0,
			totalEarned: 0,
			vouches: 0,
			history: [],
		};
	}

	/**
	 * Get count of tickets handled by staff member
	 */
	getStaffTicketCount(staffId) {
		let count = 0;
		const claims = this.loadJSON(this.claimsPath, {});

		// Count tickets linked to this staff member through vouches
		for (const entry of this.auditLog) {
			if (entry.staffId === staffId && (entry.type === 'vouch' || entry.type === 'force_vouch')) {
				count++;
			}
		}

		return count;
	}

	/**
	 * Get leaderboard data
	 */
	getLeaderboardData(guild) {
		// Sort by earnings
		const byEarnings = Object.entries(this.staffBalances)
			.map(([staffId, data]) => ({
				staffId,
				totalEarned: data.totalEarned || 0,
				balance: data.balance || 0,
				vouches: data.vouches || 0,
			}))
			.sort((a, b) => b.totalEarned - a.totalEarned);

		// Sort by vouches
		const byVouches = Object.entries(this.staffBalances)
			.map(([staffId, data]) => ({
				staffId,
				vouches: data.vouches || 0,
				totalEarned: data.totalEarned || 0,
			}))
			.sort((a, b) => b.vouches - a.vouches);

		// Count tickets per staff from audit log
		const ticketCounts = {};
		for (const entry of this.auditLog) {
			if (entry.staffId && (entry.type === 'vouch' || entry.type === 'force_vouch')) {
				ticketCounts[entry.staffId] = (ticketCounts[entry.staffId] || 0) + 1;
			}
		}

		const byTickets = Object.entries(ticketCounts)
			.map(([staffId, tickets]) => ({
				staffId,
				tickets,
			}))
			.sort((a, b) => b.tickets - a.tickets);

		return {
			byEarnings,
			byVouches,
			byTickets,
		};
	}
}

module.exports = RewardsManager;
