const fs = require('fs').promises;
const path = require('path');

class HWIDManager {
	constructor(client) {
		this.client = client;
		this.dataPath = path.join(__dirname, '../data/hwidRequests.json');
		this.configPath = path.join(__dirname, 'hwid-config.json');
	}

	/**
	 * Load HWID requests data
	 */
	async loadData() {
		try {
			const content = await fs.readFile(this.dataPath, 'utf8');
			const data = JSON.parse(content);
			
			if (!data.requests) data.requests = [];
			if (!data.userStats) data.userStats = {};
			
			return data;
		} catch (error) {
			this.client.log.error('Failed to load HWID data:', error);
			return { requests: [], userStats: {} };
		}
	}

	/**
	 * Save HWID requests data
	 */
	async saveData(data) {
		try {
			await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
		} catch (error) {
			this.client.log.error('Failed to save HWID data:', error);
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
			this.client.log.error('Failed to load HWID config:', error);
			return {
				reviewChannelId: null,
				botLogsChannelId: null,
				cooldownHours: 24,
				maxPendingRequests: 3,
			};
		}
	}

	/**
	 * Check if user is on cooldown
	 */
	async checkCooldown(userId) {
		const data = await this.loadData();
		const config = await this.loadConfig();
		
		if (!data.userStats[userId] || !data.userStats[userId].lastRequestAt) {
			return { onCooldown: false, timeRemaining: 0 };
		}

		const lastRequest = new Date(data.userStats[userId].lastRequestAt);
		const cooldownMs = config.cooldownHours * 60 * 60 * 1000;
		const timeSinceLastRequest = Date.now() - lastRequest.getTime();
		const timeRemaining = cooldownMs - timeSinceLastRequest;

		if (timeRemaining > 0) {
			return {
				onCooldown: true,
				timeRemaining,
				canRequestAt: new Date(Date.now() + timeRemaining),
			};
		}

		return { onCooldown: false, timeRemaining: 0 };
	}

	/**
	 * Get user's pending requests count
	 */
	async getPendingRequestsCount(userId) {
		const data = await this.loadData();
		return data.requests.filter(r => r.userId === userId && r.status === 'pending').length;
	}

	/**
	 * Create a new HWID reset request
	 */
	async createRequest(userId, username, reason, deviceInfo, guildId) {
		try {
			const data = await this.loadData();
			const config = await this.loadConfig();

			// Check cooldown
			const cooldownCheck = await this.checkCooldown(userId);
			if (cooldownCheck.onCooldown) {
				return {
					success: false,
					error: 'cooldown',
					timeRemaining: cooldownCheck.timeRemaining,
					canRequestAt: cooldownCheck.canRequestAt,
				};
			}

			// Check pending requests limit
			const pendingCount = await this.getPendingRequestsCount(userId);
			if (pendingCount >= config.maxPendingRequests) {
				return {
					success: false,
					error: 'max_pending',
					maxPending: config.maxPendingRequests,
				};
			}

			// Create request
			const request = {
				id: `hwid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				userId,
				username,
				reason,
				deviceInfo,
				guildId,
				status: 'pending',
				createdAt: new Date().toISOString(),
				reviewedBy: null,
				reviewedAt: null,
				denialReason: null,
				messageId: null,
			};

			data.requests.push(request);

			// Update user stats
			if (!data.userStats[userId]) {
				data.userStats[userId] = {
					totalRequests: 0,
					approved: 0,
					denied: 0,
					pending: 0,
					lastRequestAt: null,
				};
			}

			data.userStats[userId].totalRequests++;
			data.userStats[userId].pending++;
			data.userStats[userId].lastRequestAt = request.createdAt;

			await this.saveData(data);

			return {
				success: true,
				request,
			};
		} catch (error) {
			this.client.log.error('Failed to create HWID request:', error);
			return {
				success: false,
				error: 'internal',
			};
		}
	}

	/**
	 * Send request to review channel
	 */
	async sendToReviewChannel(request) {
		try {
			const config = await this.loadConfig();
			
			if (!config.reviewChannelId) {
				this.client.log.error('Review channel ID not configured');
				return null;
			}

			const channel = await this.client.channels.fetch(config.reviewChannelId);
			if (!channel) {
				this.client.log.error('Review channel not found');
				return null;
			}

			const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

			const embed = new EmbedBuilder()
				.setColor('#3498db')
				.setTitle('🔄 HWID Reset Request')
				.setDescription(`**User:** <@${request.userId}> (${request.username})\n**Request ID:** \`${request.id}\``)
				.addFields(
					{ name: '📝 Reason', value: request.reason || 'No reason provided', inline: false },
					{ name: '💻 Device Info', value: request.deviceInfo || 'No device info provided', inline: false },
					{ name: '⏰ Requested At', value: `<t:${Math.floor(new Date(request.createdAt).getTime() / 1000)}:F>`, inline: false }
				)
				.setFooter({ text: `User ID: ${request.userId}` })
				.setTimestamp();

			const row = new ActionRowBuilder()
				.addComponents(
					new ButtonBuilder()
						.setCustomId(`hwid_approve:${request.id}`)
						.setLabel('Approve')
						.setStyle(ButtonStyle.Success)
						.setEmoji('✅'),
					new ButtonBuilder()
						.setCustomId(`hwid_deny:${request.id}`)
						.setLabel('Deny')
						.setStyle(ButtonStyle.Danger)
						.setEmoji('❌')
				);

			const message = await channel.send({ embeds: [embed], components: [row] });

			// Store message ID in request
			const data = await this.loadData();
			const requestIndex = data.requests.findIndex(r => r.id === request.id);
			if (requestIndex !== -1) {
				data.requests[requestIndex].messageId = message.id;
				await this.saveData(data);
			}

			return message;
		} catch (error) {
			this.client.log.error('Failed to send request to review channel:', error);
			return null;
		}
	}

	/**
	 * Approve a request
	 */
	async approveRequest(requestId, staffUserId, staffUsername) {
		try {
			const data = await this.loadData();
			const requestIndex = data.requests.findIndex(r => r.id === requestId);

			if (requestIndex === -1) {
				return { success: false, error: 'not_found' };
			}

			const request = data.requests[requestIndex];

			if (request.status !== 'pending') {
				return { success: false, error: 'already_reviewed' };
			}

			// Update request
			request.status = 'approved';
			request.reviewedBy = staffUserId;
			request.reviewedAt = new Date().toISOString();

			// Update user stats
			if (data.userStats[request.userId]) {
				data.userStats[request.userId].approved++;
				data.userStats[request.userId].pending--;
			}

			await this.saveData(data);

			// DM user
			await this.dmUserApproval(request, staffUsername);

			// Log to bot logs
			await this.logActivity('approval', request, staffUserId, staffUsername);

			return { success: true, request };
		} catch (error) {
			this.client.log.error('Failed to approve request:', error);
			return { success: false, error: 'internal' };
		}
	}

	/**
	 * Deny a request
	 */
	async denyRequest(requestId, staffUserId, staffUsername, denialReason) {
		try {
			const data = await this.loadData();
			const requestIndex = data.requests.findIndex(r => r.id === requestId);

			if (requestIndex === -1) {
				return { success: false, error: 'not_found' };
			}

			const request = data.requests[requestIndex];

			if (request.status !== 'pending') {
				return { success: false, error: 'already_reviewed' };
			}

			// Update request
			request.status = 'denied';
			request.reviewedBy = staffUserId;
			request.reviewedAt = new Date().toISOString();
			request.denialReason = denialReason;

			// Update user stats
			if (data.userStats[request.userId]) {
				data.userStats[request.userId].denied++;
				data.userStats[request.userId].pending--;
			}

			await this.saveData(data);

			// DM user
			await this.dmUserDenial(request, staffUsername, denialReason);

			// Log to bot logs
			await this.logActivity('denial', request, staffUserId, staffUsername, denialReason);

			return { success: true, request };
		} catch (error) {
			this.client.log.error('Failed to deny request:', error);
			return { success: false, error: 'internal' };
		}
	}

	/**
	 * DM user about approval
	 */
	async dmUserApproval(request, staffUsername) {
		try {
			const user = await this.client.users.fetch(request.userId);
			const { EmbedBuilder } = require('discord.js');

			const embed = new EmbedBuilder()
				.setColor('#2ecc71')
				.setTitle('✅ HWID Reset Request Approved')
				.setDescription(`Your HWID reset request has been approved by ${staffUsername}.`)
				.addFields(
					{ name: '📝 Your Reason', value: request.reason || 'No reason provided', inline: false },
					{ name: '⏰ Approved At', value: `<t:${Math.floor(new Date(request.reviewedAt).getTime() / 1000)}:F>`, inline: false },
					{ name: '🎯 Next Steps', value: 'Your HWID has been reset. You can now use your product on a new device.', inline: false }
				)
				.setFooter({ text: `Request ID: ${request.id}` })
				.setTimestamp();

			await user.send({ embeds: [embed] });
			this.client.log.info(`Sent approval DM to user ${request.userId}`);
		} catch (error) {
			this.client.log.error(`Failed to DM user ${request.userId} about approval:`, error);
		}
	}

	/**
	 * DM user about denial
	 */
	async dmUserDenial(request, staffUsername, denialReason) {
		try {
			const user = await this.client.users.fetch(request.userId);
			const { EmbedBuilder } = require('discord.js');

			const embed = new EmbedBuilder()
				.setColor('#e74c3c')
				.setTitle('❌ HWID Reset Request Denied')
				.setDescription(`Your HWID reset request has been denied by ${staffUsername}.`)
				.addFields(
					{ name: '📝 Your Reason', value: request.reason || 'No reason provided', inline: false },
					{ name: '❌ Denial Reason', value: denialReason || 'No reason provided', inline: false },
					{ name: '⏰ Denied At', value: `<t:${Math.floor(new Date(request.reviewedAt).getTime() / 1000)}:F>`, inline: false },
					{ name: '🔄 Can Request Again', value: 'You can submit a new request after the cooldown period.', inline: false }
				)
				.setFooter({ text: `Request ID: ${request.id}` })
				.setTimestamp();

			await user.send({ embeds: [embed] });
			this.client.log.info(`Sent denial DM to user ${request.userId}`);
		} catch (error) {
			this.client.log.error(`Failed to DM user ${request.userId} about denial:`, error);
		}
	}

	/**
	 * Log activity to bot logs channel
	 */
	async logActivity(type, request, staffUserId, staffUsername, denialReason = null) {
		try {
			const config = await this.loadConfig();
			
			if (!config.botLogsChannelId) {
				this.client.log.warn('Bot logs channel ID not configured');
				return;
			}

			const channel = await this.client.channels.fetch(config.botLogsChannelId);
			if (!channel) {
				this.client.log.error('Bot logs channel not found');
				return;
			}

			const { EmbedBuilder } = require('discord.js');

			const embed = new EmbedBuilder()
				.setTimestamp();

			if (type === 'approval') {
				embed.setColor('#2ecc71')
					.setTitle('✅ HWID Reset Approved')
					.addFields(
						{ name: '👤 User', value: `<@${request.userId}> (${request.username})`, inline: true },
						{ name: '👮 Staff', value: `<@${staffUserId}> (${staffUsername})`, inline: true },
						{ name: '📝 Reason', value: request.reason || 'No reason provided', inline: false },
						{ name: '💻 Device', value: request.deviceInfo || 'No device info', inline: false },
						{ name: '🆔 Request ID', value: `\`${request.id}\``, inline: false }
					);
			} else if (type === 'denial') {
				embed.setColor('#e74c3c')
					.setTitle('❌ HWID Reset Denied')
					.addFields(
						{ name: '👤 User', value: `<@${request.userId}> (${request.username})`, inline: true },
						{ name: '👮 Staff', value: `<@${staffUserId}> (${staffUsername})`, inline: true },
						{ name: '📝 User Reason', value: request.reason || 'No reason provided', inline: false },
						{ name: '❌ Denial Reason', value: denialReason || 'No reason provided', inline: false },
						{ name: '🆔 Request ID', value: `\`${request.id}\``, inline: false }
					);
			}

			await channel.send({ embeds: [embed] });
			this.client.log.info(`Logged ${type} to bot logs channel`);
		} catch (error) {
			this.client.log.error('Failed to log activity:', error);
		}
	}

	/**
	 * Get user's reset statistics
	 */
	async getUserStats(userId) {
		const data = await this.loadData();
		
		if (!data.userStats[userId]) {
			return {
				totalRequests: 0,
				approved: 0,
				denied: 0,
				pending: 0,
				lastRequestAt: null,
			};
		}

		return data.userStats[userId];
	}

	/**
	 * Get user's request history
	 */
	async getUserRequests(userId) {
		const data = await this.loadData();
		return data.requests.filter(r => r.userId === userId).sort((a, b) => 
			new Date(b.createdAt) - new Date(a.createdAt)
		);
	}

	/**
	 * Update request message after review
	 */
	async updateRequestMessage(request) {
		try {
			const config = await this.loadConfig();
			
			if (!config.reviewChannelId || !request.messageId) {
				return;
			}

			const channel = await this.client.channels.fetch(config.reviewChannelId);
			if (!channel) return;

			const message = await channel.messages.fetch(request.messageId);
			if (!message) return;

			const { EmbedBuilder } = require('discord.js');

			const color = request.status === 'approved' ? '#2ecc71' : '#e74c3c';
			const statusEmoji = request.status === 'approved' ? '✅' : '❌';
			const statusText = request.status === 'approved' ? 'APPROVED' : 'DENIED';

			const embed = new EmbedBuilder()
				.setColor(color)
				.setTitle(`${statusEmoji} HWID Reset Request - ${statusText}`)
				.setDescription(`**User:** <@${request.userId}> (${request.username})\n**Request ID:** \`${request.id}\``)
				.addFields(
					{ name: '📝 Reason', value: request.reason || 'No reason provided', inline: false },
					{ name: '💻 Device Info', value: request.deviceInfo || 'No device info provided', inline: false },
					{ name: '⏰ Requested At', value: `<t:${Math.floor(new Date(request.createdAt).getTime() / 1000)}:F>`, inline: true },
					{ name: '👮 Reviewed By', value: `<@${request.reviewedBy}>`, inline: true },
					{ name: '⏱️ Reviewed At', value: `<t:${Math.floor(new Date(request.reviewedAt).getTime() / 1000)}:F>`, inline: true }
				)
				.setFooter({ text: `User ID: ${request.userId}` })
				.setTimestamp();

			if (request.denialReason) {
				embed.addFields({ name: '❌ Denial Reason', value: request.denialReason, inline: false });
			}

			await message.edit({ embeds: [embed], components: [] });
		} catch (error) {
			this.client.log.error('Failed to update request message:', error);
		}
	}
}

module.exports = HWIDManager;
