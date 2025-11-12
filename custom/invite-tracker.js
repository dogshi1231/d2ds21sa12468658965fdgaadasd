const fs = require('fs').promises;
const path = require('path');

class InviteTracker {
	constructor(client) {
		this.client = client;
		this.dataPath = path.join(__dirname, '../data/inviteLogs.json');
		this.cachePath = path.join(__dirname, '../data/inviteCache.json');
		this.inviteCache = new Map(); // guildId -> Map(code -> {uses, inviterId})
		this.ready = false;
	}

	/**
	 * Initialize the invite tracker and cache all current invites
	 */
	async initialize() {
		try {
			// Ensure data files exist
			await this.ensureDataFiles();

			// Cache invites for all guilds
			for (const [guildId, guild] of this.client.guilds.cache) {
				await this.cacheInvites(guild);
			}

			this.ready = true;
			this.client.log.info('InviteTracker initialized successfully');

			// Start daily summary task (every 24 hours)
			this.scheduleDailySummary();
		} catch (error) {
			this.client.log.error('Failed to initialize InviteTracker:', error);
		}
	}

	/**
	 * Ensure data files exist with proper structure
	 */
	async ensureDataFiles() {
		const defaultInviteLogs = {
			joins: [],
			stats: {},
		};

		const defaultInviteCache = {
			guilds: {},
		};

		try {
			await fs.access(this.dataPath);
		} catch {
			await fs.writeFile(this.dataPath, JSON.stringify(defaultInviteLogs, null, 2));
		}

		try {
			await fs.access(this.cachePath);
		} catch {
			await fs.writeFile(this.cachePath, JSON.stringify(defaultInviteCache, null, 2));
		}
	}

	/**
	 * Cache all invites for a guild
	 */
	async cacheInvites(guild) {
		try {
			const invites = await guild.invites.fetch();
			const guildInvites = new Map();

			for (const [code, invite] of invites) {
				guildInvites.set(code, {
					uses: invite.uses || 0,
					inviterId: invite.inviter?.id || null,
					code: invite.code,
				});
			}

			this.inviteCache.set(guild.id, guildInvites);

			// Save to disk for persistence
			await this.saveCacheToDisk();

			return guildInvites;
		} catch (error) {
			this.client.log.error(`Failed to cache invites for guild ${guild.id}:`, error);
			return new Map();
		}
	}

	/**
	 * Save invite cache to disk
	 */
	async saveCacheToDisk() {
		try {
			const cacheData = {
				guilds: {},
				lastUpdated: new Date().toISOString(),
			};

			for (const [guildId, invites] of this.inviteCache) {
				cacheData.guilds[guildId] = {};
				for (const [code, data] of invites) {
					cacheData.guilds[guildId][code] = data;
				}
			}

			await fs.writeFile(this.cachePath, JSON.stringify(cacheData, null, 2));
		} catch (error) {
			this.client.log.error('Failed to save invite cache:', error);
		}
	}

	/**
	 * Track a member join and determine which invite was used
	 */
	async trackMemberJoin(member) {
		try {
			if (!this.ready) {
				this.client.log.warn('InviteTracker not ready, skipping join tracking');
				return;
			}

			const guild = member.guild;
			const oldInvites = this.inviteCache.get(guild.id);

			if (!oldInvites) {
				this.client.log.warn(`No cached invites for guild ${guild.id}`);
				await this.cacheInvites(guild);
				return;
			}

			// Fetch current invites
			const newInvites = await guild.invites.fetch();

			// Find which invite was used (increased usage count)
			let usedInvite = null;
			let inviterId = null;

			for (const [code, newInvite] of newInvites) {
				const oldInvite = oldInvites.get(code);
				
				if (oldInvite && newInvite.uses > oldInvite.uses) {
					usedInvite = code;
					inviterId = newInvite.inviter?.id || oldInvite.inviterId;
					break;
				} else if (!oldInvite && newInvite.uses > 0) {
					// New invite that was just created and used
					usedInvite = code;
					inviterId = newInvite.inviter?.id;
					break;
				}
			}

			// Update cache with new invite data
			await this.cacheInvites(guild);

			// Record the join
			await this.recordJoin({
				userId: member.id,
				username: member.user.tag,
				inviteCode: usedInvite || 'unknown',
				inviterId: inviterId || 'unknown',
				joinedAt: new Date().toISOString(),
				guildId: guild.id,
			});

			// Track invite in analytics system
			if (this.client.analytics) {
				this.client.analytics.trackInvite();
			}

			if (usedInvite && inviterId) {
				this.client.log.info(`Member ${member.user.tag} joined using invite ${usedInvite} from ${inviterId}`);
			} else {
				this.client.log.warn(`Could not determine invite used by ${member.user.tag}`);
			}
		} catch (error) {
			this.client.log.error('Failed to track member join:', error);
		}
	}

	/**
	 * Record a join to the logs
	 */
	async recordJoin(joinData) {
		try {
			const data = await this.loadInviteLogs();

			// Add to joins array
			data.joins.push({
				id: `join_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				...joinData,
			});

			// Update stats for the inviter
			if (joinData.inviterId && joinData.inviterId !== 'unknown') {
				if (!data.stats[joinData.inviterId]) {
					data.stats[joinData.inviterId] = {
						totalJoins: 0,
						totalRevenue: 0,
						uniquePurchasers: new Set(),
						invites: [],
					};
				}

				data.stats[joinData.inviterId].totalJoins++;
				if (!data.stats[joinData.inviterId].invites.includes(joinData.inviteCode)) {
					data.stats[joinData.inviterId].invites.push(joinData.inviteCode);
				}
			}

			// Convert Set to Array for JSON serialization
			for (const inviterId in data.stats) {
				if (data.stats[inviterId].uniquePurchasers instanceof Set) {
					data.stats[inviterId].uniquePurchasers = Array.from(data.stats[inviterId].uniquePurchasers);
				}
			}

			await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
		} catch (error) {
			this.client.log.error('Failed to record join:', error);
		}
	}

	/**
	 * Link an invite to an order (when a customer makes a purchase)
	 */
	async linkInviteToOrder(userId, orderAmount, invoiceId, product) {
		try {
			const data = await this.loadInviteLogs();

			// Find the join record for this user
			const joinRecord = data.joins.find(j => j.userId === userId);

			if (!joinRecord || joinRecord.inviterId === 'unknown') {
				this.client.log.debug(`No tracked invite found for user ${userId}`);
				return null;
			}

			const inviterId = joinRecord.inviterId;

			// Update inviter stats
			if (!data.stats[inviterId]) {
				data.stats[inviterId] = {
					totalJoins: 0,
					totalRevenue: 0,
					uniquePurchasers: [],
					invites: [],
				};
			}

			// Convert to Set for uniqueness check
			const purchasers = new Set(data.stats[inviterId].uniquePurchasers);
			purchasers.add(userId);
			data.stats[inviterId].uniquePurchasers = Array.from(purchasers);

			// Add revenue
			data.stats[inviterId].totalRevenue += orderAmount;

			// Add purchase reference to join record
			if (!joinRecord.purchases) joinRecord.purchases = [];
			joinRecord.purchases.push({
				invoiceId,
				product,
				amount: orderAmount,
				timestamp: new Date().toISOString(),
			});

			await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));

			this.client.log.info(`Linked order $${orderAmount} to inviter ${inviterId} (via user ${userId})`);

			return {
				inviterId,
				orderAmount,
				totalRevenue: data.stats[inviterId].totalRevenue,
			};
		} catch (error) {
			this.client.log.error('Failed to link invite to order:', error);
			return null;
		}
	}

	/**
	 * Get statistics for a specific inviter
	 */
	async getInviterStats(userId) {
		try {
			const data = await this.loadInviteLogs();

			if (!data.stats[userId]) {
				return {
					totalJoins: 0,
					totalRevenue: 0,
					uniquePurchasers: [],
					conversionRate: 0,
					invites: [],
				};
			}

			const stats = data.stats[userId];
			const uniquePurchasers = Array.isArray(stats.uniquePurchasers) 
				? stats.uniquePurchasers 
				: Array.from(stats.uniquePurchasers);

			return {
				totalJoins: stats.totalJoins || 0,
				totalRevenue: stats.totalRevenue || 0,
				uniquePurchasers: uniquePurchasers,
				conversionRate: stats.totalJoins > 0 
					? ((uniquePurchasers.length / stats.totalJoins) * 100).toFixed(1)
					: 0,
				invites: stats.invites || [],
			};
		} catch (error) {
			this.client.log.error('Failed to get inviter stats:', error);
			return null;
		}
	}

	/**
	 * Get all users who joined using a specific user's invites
	 */
	async getInvitedUsers(inviterId) {
		try {
			const data = await this.loadInviteLogs();

			const invitedUsers = data.joins.filter(j => j.inviterId === inviterId);

			return invitedUsers.map(join => ({
				userId: join.userId,
				username: join.username,
				inviteCode: join.inviteCode,
				joinedAt: join.joinedAt,
				hasPurchased: join.purchases && join.purchases.length > 0,
				totalSpent: join.purchases 
					? join.purchases.reduce((sum, p) => sum + p.amount, 0)
					: 0,
			}));
		} catch (error) {
			this.client.log.error('Failed to get invited users:', error);
			return [];
		}
	}

	/**
	 * Get top inviters by various metrics
	 */
	async getTopInviters(metric = 'joins', limit = 10) {
		try {
			const data = await this.loadInviteLogs();

			const inviters = Object.entries(data.stats).map(([id, stats]) => ({
				inviterId: id,
				totalJoins: stats.totalJoins || 0,
				totalRevenue: stats.totalRevenue || 0,
				uniquePurchasers: Array.isArray(stats.uniquePurchasers) 
					? stats.uniquePurchasers.length 
					: 0,
				conversionRate: stats.totalJoins > 0 
					? ((Array.isArray(stats.uniquePurchasers) ? stats.uniquePurchasers.length : 0) / stats.totalJoins) * 100
					: 0,
			}));

			// Sort by metric
			switch (metric) {
			case 'revenue':
				inviters.sort((a, b) => b.totalRevenue - a.totalRevenue);
				break;
			case 'purchasers':
				inviters.sort((a, b) => b.uniquePurchasers - a.uniquePurchasers);
				break;
			case 'conversion':
				inviters.sort((a, b) => b.conversionRate - a.conversionRate);
				break;
			case 'joins':
			default:
				inviters.sort((a, b) => b.totalJoins - a.totalJoins);
				break;
			}

			return inviters.slice(0, limit);
		} catch (error) {
			this.client.log.error('Failed to get top inviters:', error);
			return [];
		}
	}

	/**
	 * Get summary statistics for a time period
	 */
	async getSummaryStats(hoursAgo = 24) {
		try {
			const data = await this.loadInviteLogs();
			const cutoffTime = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));

			// Filter joins within time period
			const recentJoins = data.joins.filter(j => new Date(j.joinedAt) >= cutoffTime);

			// Count unique purchasers in this period
			const purchasersInPeriod = new Set();
			for (const join of recentJoins) {
				if (join.purchases && join.purchases.length > 0) {
					purchasersInPeriod.add(join.userId);
				}
			}

			// Calculate total revenue in period
			let totalRevenue = 0;
			for (const join of recentJoins) {
				if (join.purchases) {
					totalRevenue += join.purchases
						.filter(p => new Date(p.timestamp) >= cutoffTime)
						.reduce((sum, p) => sum + p.amount, 0);
				}
			}

			// Find top inviter in period
			const inviterCounts = {};
			for (const join of recentJoins) {
				if (join.inviterId && join.inviterId !== 'unknown') {
					if (!inviterCounts[join.inviterId]) {
						inviterCounts[join.inviterId] = { joins: 0, revenue: 0 };
					}
					inviterCounts[join.inviterId].joins++;
					
					if (join.purchases) {
						const periodRevenue = join.purchases
							.filter(p => new Date(p.timestamp) >= cutoffTime)
							.reduce((sum, p) => sum + p.amount, 0);
						inviterCounts[join.inviterId].revenue += periodRevenue;
					}
				}
			}

			let topInviter = null;
			let maxJoins = 0;
			for (const [inviterId, counts] of Object.entries(inviterCounts)) {
				if (counts.joins > maxJoins) {
					maxJoins = counts.joins;
					topInviter = {
						inviterId,
						joins: counts.joins,
						revenue: counts.revenue,
					};
				}
			}

			return {
				totalJoins: recentJoins.length,
				newCustomers: purchasersInPeriod.size,
				conversionRate: recentJoins.length > 0 
					? ((purchasersInPeriod.size / recentJoins.length) * 100).toFixed(1)
					: 0,
				totalRevenue: totalRevenue.toFixed(2),
				topInviter,
			};
		} catch (error) {
			this.client.log.error('Failed to get summary stats:', error);
			return null;
		}
	}

	/**
	 * Schedule daily summary posting
	 */
	scheduleDailySummary() {
		// Post every 24 hours
		setInterval(async () => {
			await this.postDailySummary();
		}, 24 * 60 * 60 * 1000);

		// Also post on startup if configured
		this.client.log.info('Daily invite summary scheduled');
	}

	/**
	 * Post daily summary to configured channel
	 */
	async postDailySummary() {
		try {
			const config = require('./invite-config.json');
			
			if (!config.analyticsChannelId) {
				return;
			}

			const channel = await this.client.channels.fetch(config.analyticsChannelId);
			if (!channel) {
				this.client.log.error('Analytics channel not found');
				return;
			}

			const stats = await this.getSummaryStats(24);
			if (!stats) return;

			const { EmbedBuilder } = require('discord.js');
			const embed = new EmbedBuilder()
				.setColor('#3498db')
				.setTitle('📥 Daily Invite Report')
				.setTimestamp();

			let description = `**Period:** Last 24 Hours\n\n`;
			description += `📊 **Statistics:**\n`;
			description += `• Total joins: **${stats.totalJoins}**\n`;
			description += `• New customers: **${stats.newCustomers}**\n`;
			description += `• Conversion rate: **${stats.conversionRate}%**\n`;
			description += `• Revenue generated: **$${stats.totalRevenue}**\n\n`;

			if (stats.topInviter) {
				try {
					const user = await this.client.users.fetch(stats.topInviter.inviterId);
					description += `🏆 **Top Inviter:**\n`;
					description += `${user.tag} - ${stats.topInviter.joins} joins, $${stats.topInviter.revenue.toFixed(2)} revenue\n`;
				} catch {
					description += `🏆 **Top Inviter:** ${stats.topInviter.inviterId} (${stats.topInviter.joins} joins)\n`;
				}
			}

			embed.setDescription(description);

			await channel.send({ embeds: [embed] });
			this.client.log.info('Posted daily invite summary');
		} catch (error) {
			this.client.log.error('Failed to post daily summary:', error);
		}
	}

	/**
	 * Load invite logs from disk
	 */
	async loadInviteLogs() {
		try {
			const content = await fs.readFile(this.dataPath, 'utf8');
			const data = JSON.parse(content);

			// Ensure structure
			if (!data.joins) data.joins = [];
			if (!data.stats) data.stats = {};

			return data;
		} catch (error) {
			this.client.log.error('Failed to load invite logs:', error);
			return { joins: [], stats: {} };
		}
	}
}

module.exports = InviteTracker;
