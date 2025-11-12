const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class VouchSystem {
	constructor(client) {
		this.client = client;
		this.dataPath = path.join(process.cwd(), 'data', 'vouches.json');
		this.configPath = path.join(process.cwd(), 'custom', 'vouch-config.json');
		this.pendingVouches = new Map(); // messageId -> vouch data
		
		this.ensureDataFile();
	}

	ensureDataFile() {
		if (!fs.existsSync(this.dataPath)) {
			fs.writeFileSync(this.dataPath, JSON.stringify({
				vouches: [],
				stats: {},
			}, null, 2));
		}
	}

	/**
	 * Get vouch configuration
	 */
	getConfig() {
		if (fs.existsSync(this.configPath)) {
			return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
		}
		return {
			vouchesChannelId: null,
			rewardPercentage: 5,
			timeoutMinutes: 5,
		};
	}

	/**
	 * Send vouch request to customer
	 * @param {Object} options - Vouch request options
	 * @returns {Object} Vouch request data
	 */
	async sendVouchRequest(options) {
		const {
			customerId,
			customerUser,
			staffId,
			staffUser,
			ticketId,
			channelId,
			invoiceId,
			product,
			amount,
		} = options;

		try {
			const config = this.getConfig();
			const channel = await this.client.channels.fetch(channelId);

			// Create vouch request embed
			const embed = new EmbedBuilder()
				.setColor('#5865F2')
				.setTitle('⭐ Rate Your Support Experience')
				.setDescription(
					`Hey ${customerUser.username}! Your ticket has been marked as complete.\n\n` +
					`Please take a moment to rate the support you received from **${staffUser.username}**.\n\n` +
					`React with the number of stars (1-5) that best represents your experience:`
				)
				.addFields(
					{
						name: '⭐ Rating Scale',
						value: 
							'**1️⃣** - Poor\n' +
							'**2️⃣** - Below Average\n' +
							'**3️⃣** - Average\n' +
							'**4️⃣** - Good\n' +
							'**5️⃣** - Excellent',
						inline: true,
					},
					{
						name: '📦 Order Details',
						value: 
							`**Product:** ${product || 'N/A'}\n` +
							`**Invoice:** ${invoiceId || 'N/A'}\n` +
							`**Amount:** ${amount ? `$${(amount / 100).toFixed(2)}` : 'N/A'}`,
						inline: true,
					}
				)
				.setFooter({ text: `You have ${config.timeoutMinutes} minutes to respond` })
				.setTimestamp();

			const message = await channel.send({
				content: `${customerUser}`,
				embeds: [embed],
			});

			// Add reaction options
			await message.react('1️⃣');
			await message.react('2️⃣');
			await message.react('3️⃣');
			await message.react('4️⃣');
			await message.react('5️⃣');

			// Store pending vouch
			const vouchData = {
				messageId: message.id,
				channelId: channel.id,
				customerId,
				staffId,
				ticketId,
				invoiceId,
				product,
				amount,
				createdAt: new Date().toISOString(),
				expiresAt: new Date(Date.now() + config.timeoutMinutes * 60 * 1000).toISOString(),
			};

			this.pendingVouches.set(message.id, vouchData);

			// Set timeout
			setTimeout(() => {
				this.handleTimeout(message.id);
			}, config.timeoutMinutes * 60 * 1000);

			this.client.log.success(`Sent vouch request to ${customerUser.tag} for staff ${staffUser.tag}`);
			return vouchData;

		} catch (error) {
			this.client.log.error('Error sending vouch request:', error);
			throw error;
		}
	}

	/**
	 * Handle timeout for vouch request
	 * @param {string} messageId
	 */
	async handleTimeout(messageId) {
		if (!this.pendingVouches.has(messageId)) return;

		const vouchData = this.pendingVouches.get(messageId);
		this.pendingVouches.delete(messageId);

		try {
			const channel = await this.client.channels.fetch(vouchData.channelId);
			const message = await channel.messages.fetch(messageId);

			// Update embed to show expired
			const expiredEmbed = new EmbedBuilder()
				.setColor('#e74c3c')
				.setTitle('⏰ Vouch Request Expired')
				.setDescription(
					'This vouch request has expired. The customer did not respond in time.\n\n' +
					'**Owner can use `.force` command to manually award the reward.**'
				)
				.setTimestamp();

			await message.edit({ embeds: [expiredEmbed] });
			await message.reactions.removeAll();

			this.client.log.warn(`Vouch request ${messageId} expired`);

		} catch (error) {
			this.client.log.error('Error handling vouch timeout:', error);
		}
	}

	/**
	 * Process vouch reaction
	 * @param {Object} reaction
	 * @param {Object} user
	 */
	async processVouchReaction(reaction, user) {
		const messageId = reaction.message.id;
		
		if (!this.pendingVouches.has(messageId)) return;

		const vouchData = this.pendingVouches.get(messageId);

		// Check if the user is the customer
		if (user.id !== vouchData.customerId) return;

		// Map emoji to rating
		const ratingMap = {
			'1️⃣': 1,
			'2️⃣': 2,
			'3️⃣': 3,
			'4️⃣': 4,
			'5️⃣': 5,
		};

		const rating = ratingMap[reaction.emoji.name];
		if (!rating) return;

		// Remove from pending
		this.pendingVouches.delete(messageId);

		try {
			// Record the vouch
			await this.recordVouch({
				...vouchData,
				rating,
				respondedAt: new Date().toISOString(),
				method: 'reaction',
			});

			// Update message
			const channel = await this.client.channels.fetch(vouchData.channelId);
			const message = await channel.messages.fetch(messageId);

			const successEmbed = new EmbedBuilder()
				.setColor('#2ecc71')
				.setTitle('✅ Thank You for Your Feedback!')
				.setDescription(
					`You rated your experience: ${'⭐'.repeat(rating)} (${rating}/5)\n\n` +
					`Your feedback helps us improve our service. Thank you for your purchase!`
				)
				.setTimestamp();

			await message.edit({ embeds: [successEmbed] });
			await message.reactions.removeAll();

			// Process reward
			await this.processReward(vouchData, rating);

			// Post to public vouch channel
			await this.postPublicVouch(vouchData, rating);

			this.client.log.success(`Vouch processed: ${rating}/5 stars for staff ${vouchData.staffId}`);

		} catch (error) {
			this.client.log.error('Error processing vouch reaction:', error);
		}
	}

	/**
	 * Record vouch to database
	 * @param {Object} vouchData
	 */
	async recordVouch(vouchData) {
		try {
			const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf-8'));

			// Add vouch record
			data.vouches.push({
				id: `vouch_${Date.now()}`,
				customerId: vouchData.customerId,
				staffId: vouchData.staffId,
				ticketId: vouchData.ticketId,
				invoiceId: vouchData.invoiceId,
				product: vouchData.product,
				amount: vouchData.amount,
				rating: vouchData.rating,
				comment: vouchData.comment || null,
				method: vouchData.method || 'reaction',
				forced: vouchData.forced || false,
				forcedBy: vouchData.forcedBy || null,
				timestamp: vouchData.respondedAt || new Date().toISOString(),
			});

			// Update staff stats
			if (!data.stats[vouchData.staffId]) {
				data.stats[vouchData.staffId] = {
					totalVouches: 0,
					totalRating: 0,
					averageRating: 0,
					ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
					totalEarned: 0,
				};
			}

			const stats = data.stats[vouchData.staffId];
			stats.totalVouches++;
			stats.totalRating += vouchData.rating;
			stats.averageRating = (stats.totalRating / stats.totalVouches).toFixed(2);
			stats.ratingBreakdown[vouchData.rating]++;

			fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));

			// Track vouch in analytics system
			if (this.client.analytics) {
				this.client.analytics.trackVouch(vouchData.staffId);
			}

		} catch (error) {
			this.client.log.error('Error recording vouch:', error);
			throw error;
		}
	}

	/**
	 * Process staff reward for vouch
	 * @param {Object} vouchData
	 * @param {number} rating
	 */
	async processReward(vouchData, rating) {
		try {
			// Only give reward if rating is 4 or 5 stars
			if (rating < 4) {
				this.client.log.info(`No reward given for ${rating} star rating`);
				return;
			}

			// Check if rewards manager exists
			if (!this.client.rewards) {
				this.client.log.warn('Rewards manager not initialized');
				return;
			}

			const config = this.getConfig();
			const rewardAmount = Math.round(vouchData.amount * (config.rewardPercentage / 100));

			// Add to staff balance
			this.client.rewards.addBalance(vouchData.staffId, rewardAmount, {
				type: 'vouch',
				invoiceId: vouchData.invoiceId,
				rating: rating,
				timestamp: new Date().toISOString(),
			});

			// Update stats
			const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf-8'));
			if (data.stats[vouchData.staffId]) {
				data.stats[vouchData.staffId].totalEarned += rewardAmount;
				fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
			}

			this.client.log.success(
				`Awarded $${(rewardAmount / 100).toFixed(2)} to staff ${vouchData.staffId} (${rating} stars)`
			);

		} catch (error) {
			this.client.log.error('Error processing reward:', error);
		}
	}

	/**
	 * Post vouch to public channel
	 * @param {Object} vouchData
	 * @param {number} rating
	 */
	async postPublicVouch(vouchData, rating, forced = false) {
		try {
			const config = this.getConfig();
			if (!config.vouchesChannelId) return;

			const channel = await this.client.channels.fetch(config.vouchesChannelId);
			if (!channel) return;

			// Get staff member
			const staff = await this.client.users.fetch(vouchData.staffId).catch(() => null);
			const customer = await this.client.users.fetch(vouchData.customerId).catch(() => null);

			// Determine color based on rating
			let color = '#2ecc71'; // Green for 5 stars
			if (rating === 4) color = '#3498db'; // Blue
			if (rating === 3) color = '#f39c12'; // Orange
			if (rating <= 2) color = '#e74c3c'; // Red

			const embed = new EmbedBuilder()
				.setColor(color)
				.setTitle('⭐ New Customer Review')
				.setDescription(
					`**Rating:** ${'⭐'.repeat(rating)} (${rating}/5)\n` +
					`**Staff:** ${staff ? staff.tag : 'Unknown'}\n` +
					`**Product:** ${vouchData.product || 'N/A'}`
				)
				.addFields(
					{
						name: '📦 Order',
						value: `Invoice: \`${vouchData.invoiceId || 'N/A'}\``,
						inline: true,
					},
					{
						name: '💰 Amount',
						value: vouchData.amount ? `$${(vouchData.amount / 100).toFixed(2)}` : 'N/A',
						inline: true,
					}
				)
				.setFooter({ 
					text: forced ? '⚠️ Force vouched by owner' : '✅ Verified purchase',
				})
				.setTimestamp();

			if (vouchData.comment) {
				embed.addFields({
					name: '💬 Customer Feedback',
					value: vouchData.comment,
					inline: false,
				});
			}

			await channel.send({ embeds: [embed] });

		} catch (error) {
			this.client.log.error('Error posting public vouch:', error);
		}
	}

	/**
	 * Force vouch (owner only)
	 * @param {Object} options
	 */
	async forceVouch(options) {
		const {
			staffId,
			customerId,
			ticketId,
			invoiceId,
			product,
			amount,
			forcedBy,
		} = options;

		try {
			const vouchData = {
				customerId,
				staffId,
				ticketId,
				invoiceId,
				product,
				amount,
				rating: 5, // Force vouches always give 5 stars
				forced: true,
				forcedBy,
				respondedAt: new Date().toISOString(),
				method: 'force',
			};

			// Record the vouch
			await this.recordVouch(vouchData);

			// Process reward
			await this.processReward(vouchData, 5);

			// Post to public vouch channel
			await this.postPublicVouch(vouchData, 5, true);

			// Log to staff channel (mod log)
			await this.logForceVouch(vouchData);

			this.client.log.success(`Force vouch processed by ${forcedBy} for staff ${staffId}`);
			return vouchData;

		} catch (error) {
			this.client.log.error('Error processing force vouch:', error);
			throw error;
		}
	}

	/**
	 * Log force vouch to staff channel
	 * @param {Object} vouchData
	 */
	async logForceVouch(vouchData) {
		try {
			// Get mod log channel from claim config
			const claimConfigPath = path.join(process.cwd(), 'custom', 'claim-config.json');
			if (!fs.existsSync(claimConfigPath)) return;

			const claimConfig = JSON.parse(fs.readFileSync(claimConfigPath, 'utf-8'));
			if (!claimConfig.modLogChannelId) return;

			const channel = await this.client.channels.fetch(claimConfig.modLogChannelId);
			if (!channel) return;

			const embed = new EmbedBuilder()
				.setColor('#f39c12')
				.setTitle('⚠️ Force Vouch Used')
				.setDescription('An owner manually awarded a vouch reward without customer confirmation.')
				.addFields(
					{
						name: '👤 Staff Member',
						value: `<@${vouchData.staffId}>`,
						inline: true,
					},
					{
						name: '👥 Customer',
						value: `<@${vouchData.customerId}>`,
						inline: true,
					},
					{
						name: '🔨 Forced By',
						value: `<@${vouchData.forcedBy}>`,
						inline: true,
					},
					{
						name: '📦 Order Details',
						value: 
							`**Invoice:** ${vouchData.invoiceId || 'N/A'}\n` +
							`**Product:** ${vouchData.product || 'N/A'}\n` +
							`**Amount:** ${vouchData.amount ? `$${(vouchData.amount / 100).toFixed(2)}` : 'N/A'}`,
						inline: false,
					}
				)
				.setFooter({ text: 'Staff received 5% reward automatically' })
				.setTimestamp();

			await channel.send({ embeds: [embed] });

		} catch (error) {
			this.client.log.error('Error logging force vouch:', error);
		}
	}

	/**
	 * Get staff vouch stats
	 * @param {string} staffId
	 */
	getStaffStats(staffId) {
		try {
			const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf-8'));
			return data.stats[staffId] || null;
		} catch (error) {
			this.client.log.error('Error getting staff stats:', error);
			return null;
		}
	}

	/**
	 * Get all vouches
	 */
	getAllVouches() {
		try {
			const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf-8'));
			return data.vouches || [];
		} catch (error) {
			this.client.log.error('Error getting vouches:', error);
			return [];
		}
	}
}

module.exports = VouchSystem;
