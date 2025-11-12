const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

class SupportRequestManager {
	constructor(client) {
		this.client = client;
		this.dataDir = path.join(__dirname, '../data');
		this.requestsPath = path.join(this.dataDir, 'support_requests.json');
		this.configPath = path.join(__dirname, 'support-config.json');
		
		// Ensure data directory exists
		if (!fs.existsSync(this.dataDir)) {
			fs.mkdirSync(this.dataDir, { recursive: true });
		}
		
		// Load data
		this.requests = this.loadJSON(this.requestsPath, {});
		this.config = this.loadConfig();
		
		// Rate limits (in days)
		this.RATE_LIMITS = {
			hwid: { max: 2, days: 30 },
			replacement: { max: 1, days: 14 },
		};
	}

	loadConfig() {
		try {
			if (fs.existsSync(this.configPath)) {
				return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
			}
		} catch (error) {
			this.client.log.error('Failed to load support config:', error);
		}
		
		// Create default config
		const defaultConfig = {
			hwidLogsChannelId: 'YOUR_HWID_LOGS_CHANNEL_ID',
			replacementLogsChannelId: 'YOUR_REPLACEMENT_LOGS_CHANNEL_ID',
		};
		
		this.saveJSON(this.configPath, defaultConfig);
		return defaultConfig;
	}

	loadJSON(filepath, defaultValue) {
		try {
			if (fs.existsSync(filepath)) {
				const data = fs.readFileSync(filepath, 'utf8');
				return JSON.parse(data);
			}
		} catch (error) {
			this.client.log.error(`Error loading ${filepath}:`, error);
		}
		return defaultValue;
	}

	saveJSON(filepath, data) {
		try {
			fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
			return true;
		} catch (error) {
			this.client.log.error(`Error saving ${filepath}:`, error);
			return false;
		}
	}

	/**
	 * Initialize user request data
	 */
	getUserData(userId) {
		if (!this.requests[userId]) {
			this.requests[userId] = {
				userId,
				hwid: [],
				replacement: [],
				pendingRequest: null, // Prevent multiple simultaneous requests
			};
		}
		return this.requests[userId];
	}

	/**
	 * Check if user has a pending request
	 */
	hasPendingRequest(userId) {
		const userData = this.getUserData(userId);
		return userData.pendingRequest !== null;
	}

	/**
	 * Set pending request
	 */
	setPendingRequest(userId, type) {
		const userData = this.getUserData(userId);
		userData.pendingRequest = {
			type,
			timestamp: new Date().toISOString(),
		};
		this.saveJSON(this.requestsPath, this.requests);
	}

	/**
	 * Clear pending request
	 */
	clearPendingRequest(userId) {
		const userData = this.getUserData(userId);
		userData.pendingRequest = null;
		this.saveJSON(this.requestsPath, this.requests);
	}

	/**
	 * Check rate limit for a user
	 */
	checkRateLimit(userId, type) {
		const userData = this.getUserData(userId);
		const limit = this.RATE_LIMITS[type];
		
		if (!limit) return { allowed: false, reason: 'Invalid request type' };

		const requests = userData[type] || [];
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - limit.days);

		// Count requests within the time window
		const recentRequests = requests.filter(req => {
			const reqDate = new Date(req.timestamp);
			return reqDate >= cutoffDate;
		});

		const allowed = recentRequests.length < limit.max;
		const remaining = Math.max(0, limit.max - recentRequests.length);

		// Find when the oldest request will expire
		let resetDate = null;
		if (!allowed && recentRequests.length > 0) {
			const oldestReq = recentRequests.sort((a, b) => 
				new Date(a.timestamp) - new Date(b.timestamp)
			)[0];
			resetDate = new Date(oldestReq.timestamp);
			resetDate.setDate(resetDate.getDate() + limit.days);
		}

		return {
			allowed,
			remaining,
			used: recentRequests.length,
			max: limit.max,
			resetDate,
			days: limit.days,
		};
	}

	/**
	 * Record a support request
	 */
	async recordRequest(userId, type, data) {
		const userData = this.getUserData(userId);
		
		const request = {
			timestamp: new Date().toISOString(),
			invoiceId: data.invoiceId,
			productKey: data.productKey,
			reason: data.reason,
			email: data.email || null,
		};

		userData[type].push(request);
		this.clearPendingRequest(userId);
		this.saveJSON(this.requestsPath, this.requests);

		this.client.log.info(`Recorded ${type} request for user ${userId}: ${data.invoiceId}`);
		
		return request;
	}

	/**
	 * Get request history for a user
	 */
	getRequestHistory(userId, type = null) {
		const userData = this.getUserData(userId);
		
		if (type) {
			return {
				type,
				requests: userData[type] || [],
				total: userData[type]?.length || 0,
			};
		}

		return {
			hwid: {
				requests: userData.hwid || [],
				total: userData.hwid?.length || 0,
			},
			replacement: {
				requests: userData.replacement || [],
				total: userData.replacement?.length || 0,
			},
		};
	}

	/**
	 * Log request to staff channel
	 */
	async logToStaffChannel(user, type, data, guildId) {
		try {
			const channelId = type === 'hwid' 
				? this.config.hwidLogsChannelId 
				: this.config.replacementLogsChannelId;

			if (!channelId || channelId === 'YOUR_HWID_LOGS_CHANNEL_ID' || channelId === 'YOUR_REPLACEMENT_LOGS_CHANNEL_ID') {
				this.client.log.warn(`No log channel configured for ${type} requests`);
				return;
			}

			const channel = await this.client.channels.fetch(channelId).catch(() => null);
			if (!channel) {
				this.client.log.error(`Could not find log channel: ${channelId}`);
				return;
			}

			const userData = this.getUserData(user.id);
			const history = this.getRequestHistory(user.id);
			const rateLimit = this.checkRateLimit(user.id, type);

			const typeName = type === 'hwid' ? 'HWID Reset' : 'Replacement';
			const totalRequests = type === 'hwid' 
				? history.hwid.total 
				: history.replacement.total;

			const logEmbed = new EmbedBuilder()
				.setColor(0x5865F2)
				.setTitle(`🔧 ${typeName} Request`)
				.setAuthor({
					name: user.tag,
					iconURL: user.displayAvatarURL(),
				})
				.addFields(
					{ name: '👤 User', value: `${user} (${user.id})`, inline: true },
					{ name: '📧 Email', value: data.email || 'Unknown', inline: true },
					{ name: '🧾 Invoice ID', value: `\`${data.invoiceId}\``, inline: true },
					{ name: '🔑 Product Key', value: `\`${data.productKey}\``, inline: true },
					{ name: '📊 Total Requests', value: `${totalRequests} ${type} request(s)`, inline: true },
					{ name: '⏱️ Rate Limit', value: `${rateLimit.used}/${rateLimit.max} (${rateLimit.days} days)`, inline: true },
					{ name: '📝 Reason', value: data.reason, inline: false },
				)
				.setFooter({ text: `Request ID: ${user.id}-${Date.now()}` })
				.setTimestamp();

			await channel.send({ embeds: [logEmbed] });
			this.client.log.info(`Logged ${type} request to channel ${channelId}`);

		} catch (error) {
			this.client.log.error(`Error logging ${type} request to staff channel:`, error);
		}
	}

	/**
	 * Generate request summary embed for staff
	 */
	async generateSummaryEmbed(user, guildId) {
		const history = this.getRequestHistory(user.id);
		const hwidLimit = this.checkRateLimit(user.id, 'hwid');
		const replacementLimit = this.checkRateLimit(user.id, 'replacement');

		const embed = new EmbedBuilder()
			.setColor(0x00AFF4)
			.setTitle('📋 Support Request History')
			.setAuthor({
				name: user.tag,
				iconURL: user.displayAvatarURL(),
			})
			.addFields(
				{ 
					name: '🔄 HWID Resets', 
					value: `**Total:** ${history.hwid.total}\n` +
						   `**Rate Limit:** ${hwidLimit.used}/${hwidLimit.max} (${hwidLimit.days} days)\n` +
						   `**Remaining:** ${hwidLimit.remaining}`,
					inline: true 
				},
				{ 
					name: '🔁 Replacements', 
					value: `**Total:** ${history.replacement.total}\n` +
						   `**Rate Limit:** ${replacementLimit.used}/${replacementLimit.max} (${replacementLimit.days} days)\n` +
						   `**Remaining:** ${replacementLimit.remaining}`,
					inline: true 
				},
			)
			.setTimestamp();

		// Add recent HWID resets
		if (history.hwid.requests.length > 0) {
			const recentHwid = history.hwid.requests
				.slice(-3)
				.reverse()
				.map((req, i) => {
					const date = new Date(req.timestamp);
					return `${i + 1}. \`${req.invoiceId}\` — <t:${Math.floor(date.getTime() / 1000)}:R>`;
				})
				.join('\n');

			embed.addFields({
				name: '🕐 Recent HWID Resets',
				value: recentHwid || 'None',
				inline: false,
			});
		}

		// Add recent replacements
		if (history.replacement.requests.length > 0) {
			const recentRep = history.replacement.requests
				.slice(-3)
				.reverse()
				.map((req, i) => {
					const date = new Date(req.timestamp);
					return `${i + 1}. \`${req.invoiceId}\` — <t:${Math.floor(date.getTime() / 1000)}:R>`;
				})
				.join('\n');

			embed.addFields({
				name: '🕐 Recent Replacements',
				value: recentRep || 'None',
				inline: false,
			});
		}

		// Add warnings if over limit
		const warnings = [];
		if (!hwidLimit.allowed) {
			const resetTime = Math.floor(hwidLimit.resetDate.getTime() / 1000);
			warnings.push(`⚠️ HWID reset limit reached. Resets <t:${resetTime}:R>`);
		}
		if (!replacementLimit.allowed) {
			const resetTime = Math.floor(replacementLimit.resetDate.getTime() / 1000);
			warnings.push(`⚠️ Replacement limit reached. Resets <t:${resetTime}:R>`);
		}

		if (warnings.length > 0) {
			embed.addFields({
				name: '⚠️ Warnings',
				value: warnings.join('\n'),
				inline: false,
			});
		}

		return embed;
	}
}

module.exports = SupportRequestManager;
