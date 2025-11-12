const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

class Analytics {
	constructor(client) {
		this.client = client;
		
		// Paths
		this.configPath = path.join(process.cwd(), 'custom', 'analytics-config.json');
		this.dailyStatsPath = path.join(process.cwd(), 'data', 'dailyStats.json');
		this.orderAnalyticsPath = path.join(process.cwd(), 'data', 'order_analytics.json');
		this.inviteTrackingPath = path.join(process.cwd(), 'data', 'invite_tracking.json');
		this.staffActivityPath = path.join(process.cwd(), 'data', 'staffActivity.json');
		this.vouchesPath = path.join(process.cwd(), 'data', 'vouches.json');
		this.invoiceLinksPath = path.join(process.cwd(), 'data', 'invoice_links.json');
		
		this.config = this.loadConfig();
		this.dailyStats = this.loadDailyStats();
		this.reportInterval = null;
		
		this.ensureDataFiles();
	}

	loadConfig() {
		try {
			return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
		} catch (error) {
			this.client.log.error('Failed to load analytics config:', error);
			return {
				analyticsChannelId: '1437178768752902145',
				inactivityNoticeChannelId: '1437175400953544734',
				reportIntervalHours: 24,
				reportTimeUTC: '00:00',
				productCosts: {},
				voiceChannelIds: [],
				generalChatIds: [],
			};
		}
	}

	loadDailyStats() {
		try {
			return JSON.parse(fs.readFileSync(this.dailyStatsPath, 'utf8'));
		} catch (error) {
			return {
				lastReset: null,
				ordersToday: 0,
				revenueToday: 0,
				invitesToday: 0,
				ticketsClaimedToday: {},
				vouchesToday: {},
				vcJoinsToday: 0,
				messagesPerUser: {},
				staffTicketRevenue: {},
			};
		}
	}

	saveDailyStats() {
		try {
			fs.writeFileSync(this.dailyStatsPath, JSON.stringify(this.dailyStats, null, 2));
		} catch (error) {
			this.client.log.error('Failed to save daily stats:', error);
		}
	}

	ensureDataFiles() {
		const dataDir = path.join(process.cwd(), 'data');
		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true });
		}

		if (!fs.existsSync(this.dailyStatsPath)) {
			this.saveDailyStats();
		}
	}

	/**
	 * Check if daily stats need to be reset
	 */
	checkDailyReset() {
		if (!this.dailyStats.lastReset) {
			this.dailyStats.lastReset = new Date().toISOString();
			this.saveDailyStats();
			return;
		}

		const lastReset = new Date(this.dailyStats.lastReset);
		const now = new Date();
		
		// Check if we've crossed into a new day (UTC)
		if (lastReset.getUTCDate() !== now.getUTCDate() || 
		    lastReset.getUTCMonth() !== now.getUTCMonth() ||
		    lastReset.getUTCFullYear() !== now.getUTCFullYear()) {
			this.resetDailyStats();
		}
	}

	resetDailyStats() {
		this.dailyStats = {
			lastReset: new Date().toISOString(),
			ordersToday: 0,
			revenueToday: 0,
			invitesToday: 0,
			ticketsClaimedToday: {},
			vouchesToday: {},
			vcJoinsToday: 0,
			messagesPerUser: {},
			staffTicketRevenue: {},
		};
		this.saveDailyStats();
		this.client.log.info('Daily stats have been reset');
	}

	/**
	 * Track an order for daily analytics
	 */
	trackOrder(amount) {
		this.checkDailyReset();
		this.dailyStats.ordersToday++;
		this.dailyStats.revenueToday += amount;
		this.saveDailyStats();
	}

	/**
	 * Track an invite for daily analytics
	 */
	trackInvite() {
		this.checkDailyReset();
		this.dailyStats.invitesToday++;
		this.saveDailyStats();
	}

	/**
	 * Track a ticket claim for daily analytics
	 */
	trackTicketClaim(staffId, amount = 0) {
		this.checkDailyReset();
		if (!this.dailyStats.ticketsClaimedToday[staffId]) {
			this.dailyStats.ticketsClaimedToday[staffId] = 0;
		}
		this.dailyStats.ticketsClaimedToday[staffId]++;
		
		if (amount > 0) {
			if (!this.dailyStats.staffTicketRevenue[staffId]) {
				this.dailyStats.staffTicketRevenue[staffId] = 0;
			}
			this.dailyStats.staffTicketRevenue[staffId] += amount;
		}
		
		this.saveDailyStats();
	}

	/**
	 * Track a vouch for daily analytics
	 */
	trackVouch(staffId) {
		this.checkDailyReset();
		if (!this.dailyStats.vouchesToday[staffId]) {
			this.dailyStats.vouchesToday[staffId] = 0;
		}
		this.dailyStats.vouchesToday[staffId]++;
		this.saveDailyStats();
	}

	/**
	 * Track VC join for daily analytics
	 */
	trackVCJoin() {
		this.checkDailyReset();
		this.dailyStats.vcJoinsToday++;
		this.saveDailyStats();
	}

	/**
	 * Track message for daily analytics
	 */
	trackMessage(userId) {
		this.checkDailyReset();
		if (!this.dailyStats.messagesPerUser[userId]) {
			this.dailyStats.messagesPerUser[userId] = 0;
		}
		this.dailyStats.messagesPerUser[userId]++;
		this.saveDailyStats();
	}

	/**
	 * Get order analytics for today
	 */
	async getOrderAnalytics() {
		const orderData = JSON.parse(fs.readFileSync(this.orderAnalyticsPath, 'utf8'));
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		let todayOrders = 0;
		let todayRevenue = 0;
		let profitByCategory = {};
		let productCounts = {};
		let topCustomer = { userId: null, amount: 0 };

		// Analyze all orders
		for (const [invoiceId, order] of Object.entries(orderData.orders || {})) {
			const orderDate = new Date(order.timestamp);
			
			// Today's orders
			if (orderDate >= today) {
				todayOrders++;
				todayRevenue += order.amount || 0;
			}

			// Product categories
			const product = (order.product || 'unknown').toLowerCase();
			if (!productCounts[product]) {
				productCounts[product] = 0;
			}
			productCounts[product]++;

			// Calculate profit
			const cost = this.getProductCost(product);
			const profit = (order.amount || 0) - cost;
			if (!profitByCategory[product]) {
				profitByCategory[product] = { profit: 0, count: 0, revenue: 0, cost: 0 };
			}
			profitByCategory[product].profit += profit;
			profitByCategory[product].count++;
			profitByCategory[product].revenue += order.amount || 0;
			profitByCategory[product].cost += cost;

			// Track customer spending
			if (order.userId) {
				// This would need to aggregate per user - we'll do this separately
			}
		}

		// Find top product
		const topProduct = Object.entries(productCounts)
			.sort((a, b) => b[1] - a[1])[0];

		// Get top customer by lifetime spend
		const topCustomerData = await this.getTopCustomers(1);

		return {
			ordersToday: todayOrders,
			revenueToday: todayRevenue,
			profitByCategory,
			topProduct: topProduct ? { name: topProduct[0], count: topProduct[1] } : null,
			topCustomer: topCustomerData[0] || null,
		};
	}

	/**
	 * Get product cost from config
	 */
	getProductCost(productName) {
		const product = productName.toLowerCase();
		
		// Check for exact match
		if (this.config.productCosts[product]) {
			return this.config.productCosts[product] * 100; // Convert to cents
		}

		// Check for partial matches
		for (const [key, cost] of Object.entries(this.config.productCosts)) {
			if (product.includes(key) || key.includes(product)) {
				return cost * 100; // Convert to cents
			}
		}

		// Default cost
		return (this.config.productCosts.default || 5) * 100;
	}

	/**
	 * Get invite analytics
	 */
	async getInviteAnalytics() {
		const inviteData = JSON.parse(fs.readFileSync(this.inviteTrackingPath, 'utf8'));
		const orderData = JSON.parse(fs.readFileSync(this.orderAnalyticsPath, 'utf8'));
		const invoiceLinks = JSON.parse(fs.readFileSync(this.invoiceLinksPath, 'utf8'));

		let totalJoins = Object.keys(inviteData.members || {}).length;
		let totalPurchases = Object.keys(orderData.orders || {}).length;
		let inviterConversions = {};

		// Calculate conversions per inviter
		for (const [memberId, memberData] of Object.entries(inviteData.members || {})) {
			const inviterId = memberData.invitedBy;
			if (!inviterId) continue;

			if (!inviterConversions[inviterId]) {
				inviterConversions[inviterId] = { joins: 0, purchases: 0, revenue: 0 };
			}
			inviterConversions[inviterId].joins++;

			// Check if this member made purchases
			for (const [invoiceId, order] of Object.entries(orderData.orders || {})) {
				if (order.userId === memberId) {
					inviterConversions[inviterId].purchases++;
					inviterConversions[inviterId].revenue += order.amount || 0;
				}
			}
		}

		// Find top converter
		const topConverter = Object.entries(inviterConversions)
			.sort((a, b) => b[1].purchases - a[1].purchases)[0];

		return {
			invitesToday: this.dailyStats.invitesToday,
			joinToOrderRatio: totalJoins > 0 ? (totalPurchases / totalJoins * 100).toFixed(1) : 0,
			topConverter: topConverter ? {
				userId: topConverter[0],
				joins: topConverter[1].joins,
				purchases: topConverter[1].purchases,
				revenue: topConverter[1].revenue,
			} : null,
		};
	}

	/**
	 * Get staff activity analytics
	 */
	async getStaffAnalytics(guildId) {
		const staffActivity = JSON.parse(fs.readFileSync(this.staffActivityPath, 'utf8'));
		const vouches = fs.existsSync(this.vouchesPath) 
			? JSON.parse(fs.readFileSync(this.vouchesPath, 'utf8'))
			: { vouches: {} };

		const guild = await this.client.guilds.fetch(guildId);
		const staffConfig = this.client.staffManager ? this.client.staffManager.config : null;
		
		let inactiveStaff = [];
		const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);

		// Analyze staff activity
		for (const [staffId, activity] of Object.entries(staffActivity.activity || {})) {
			const lastActivity = activity.lastActivity ? new Date(activity.lastActivity).getTime() : 0;
			
			if (lastActivity < threeDaysAgo || lastActivity === 0) {
				try {
					const member = await guild.members.fetch(staffId);
					inactiveStaff.push({
						userId: staffId,
						username: member.user.username,
						lastActivity: activity.lastActivity,
						ticketCount: activity.ticketCount || 0,
					});
				} catch (error) {
					// Member not found or left server
				}
			}
		}

		// Get most/least active staff
		const staffByActivity = Object.entries(staffActivity.activity || {})
			.map(([staffId, activity]) => ({
				userId: staffId,
				ticketCount: activity.ticketCount || 0,
				lastActivity: activity.lastActivity,
			}))
			.sort((a, b) => b.ticketCount - a.ticketCount);

		// Get vouch counts for today
		const vouchCounts = {};
		for (const [userId, userVouches] of Object.entries(vouches.vouches || {})) {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			
			const todayVouches = (userVouches || []).filter(v => {
				const vouchDate = new Date(v.timestamp);
				return vouchDate >= today;
			});
			
			if (todayVouches.length > 0) {
				vouchCounts[userId] = todayVouches.length;
			}
		}

		return {
			ticketsClaimedToday: this.dailyStats.ticketsClaimedToday,
			vouchesToday: vouchCounts,
			staffTicketRevenue: this.dailyStats.staffTicketRevenue,
			mostActiveStaff: staffByActivity.slice(0, 3),
			leastActiveStaff: staffByActivity.slice(-3).reverse(),
			inactiveStaff,
		};
	}

	/**
	 * Get VC and engagement analytics
	 */
	async getEngagementAnalytics() {
		// Get VC-to-purchase ratio
		const orderData = JSON.parse(fs.readFileSync(this.orderAnalyticsPath, 'utf8'));
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		let todayPurchases = 0;
		for (const order of Object.values(orderData.orders || {})) {
			const orderDate = new Date(order.timestamp);
			if (orderDate >= today) {
				todayPurchases++;
			}
		}

		const vcToPurchaseRatio = this.dailyStats.vcJoinsToday > 0 
			? (todayPurchases / this.dailyStats.vcJoinsToday * 100).toFixed(1)
			: 0;

		// Get top active users by messages
		const topUsers = Object.entries(this.dailyStats.messagesPerUser)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3);

		const totalMessages = Object.values(this.dailyStats.messagesPerUser)
			.reduce((sum, count) => sum + count, 0);

		return {
			vcJoinsToday: this.dailyStats.vcJoinsToday,
			vcToPurchaseRatio,
			totalMessagesToday: totalMessages,
			topUsers: topUsers.map(([userId, count]) => ({ userId, messageCount: count })),
		};
	}

	/**
	 * Get top customers by total spent
	 */
	async getTopCustomers(limit = 10) {
		const orderData = JSON.parse(fs.readFileSync(this.orderAnalyticsPath, 'utf8'));
		const customerSpending = {};

		// Aggregate spending per customer
		for (const order of Object.values(orderData.orders || {})) {
			if (!order.userId) continue;
			
			if (!customerSpending[order.userId]) {
				customerSpending[order.userId] = {
					totalSpent: 0,
					orderCount: 0,
					email: order.email,
				};
			}
			
			customerSpending[order.userId].totalSpent += order.amount || 0;
			customerSpending[order.userId].orderCount++;
		}

		// Sort and return top customers
		return Object.entries(customerSpending)
			.sort((a, b) => b[1].totalSpent - a[1].totalSpent)
			.slice(0, limit)
			.map(([userId, data]) => ({
				userId,
				totalSpent: data.totalSpent,
				orderCount: data.orderCount,
				email: data.email,
			}));
	}

	/**
	 * Get top staff by earnings
	 */
	async getTopStaff(limit = 10) {
		const orderData = JSON.parse(fs.readFileSync(this.orderAnalyticsPath, 'utf8'));
		const staffEarnings = {};

		// Aggregate earnings per staff member
		for (const order of Object.values(orderData.orders || {})) {
			if (!order.staffId) continue;
			
			if (!staffEarnings[order.staffId]) {
				staffEarnings[order.staffId] = {
					totalEarnings: 0,
					ticketCount: 0,
				};
			}
			
			staffEarnings[order.staffId].totalEarnings += order.amount || 0;
			staffEarnings[order.staffId].ticketCount++;
		}

		// Sort and return top staff
		return Object.entries(staffEarnings)
			.sort((a, b) => b[1].totalEarnings - a[1].totalEarnings)
			.slice(0, limit)
			.map(([staffId, data]) => ({
				staffId,
				totalEarnings: data.totalEarnings,
				ticketCount: data.ticketCount,
			}));
	}

	/**
	 * Get recent orders
	 */
	async getRecentOrders(limit = 5) {
		const orderData = JSON.parse(fs.readFileSync(this.orderAnalyticsPath, 'utf8'));
		
		return Object.entries(orderData.orders || {})
			.sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp))
			.slice(0, limit)
			.map(([invoiceId, order]) => ({
				invoiceId,
				product: order.product,
				amount: order.amount,
				userId: order.userId,
				timestamp: order.timestamp,
			}));
	}

	/**
	 * Get most common product sold
	 */
	async getMostCommonProduct() {
		const orderData = JSON.parse(fs.readFileSync(this.orderAnalyticsPath, 'utf8'));
		const productCounts = {};

		for (const order of Object.values(orderData.orders || {})) {
			const product = order.product || 'Unknown';
			productCounts[product] = (productCounts[product] || 0) + 1;
		}

		const sorted = Object.entries(productCounts)
			.sort((a, b) => b[1] - a[1]);

		return sorted.length > 0 ? {
			product: sorted[0][0],
			count: sorted[0][1],
		} : null;
	}

	/**
	 * Generate and post analytics report
	 */
	async postAnalyticsReport(guildId) {
		try {
			const channel = await this.client.channels.fetch(this.config.analyticsChannelId);
			if (!channel || !channel.isTextBased()) {
				this.client.log.error('Analytics channel not found or not text-based');
				return;
			}

			// Gather all analytics data
			const orderAnalytics = await this.getOrderAnalytics();
			const inviteAnalytics = await this.getInviteAnalytics();
			const staffAnalytics = await this.getStaffAnalytics(guildId);
			const engagementAnalytics = await this.getEngagementAnalytics();

			// Create embeds
			const embeds = [];

			// Order Analytics Embed
			const orderEmbed = new EmbedBuilder()
				.setColor('#3498db')
				.setTitle('📊 Order Analytics')
				.setTimestamp();

			orderEmbed.addFields(
				{ name: '📦 Orders Today', value: `${orderAnalytics.ordersToday}`, inline: true },
				{ name: '💰 Revenue Today', value: `$${(orderAnalytics.revenueToday / 100).toFixed(2)}`, inline: true },
				{ name: '\u200b', value: '\u200b', inline: true }
			);

			if (orderAnalytics.topProduct) {
				orderEmbed.addFields({
					name: '🏆 Top Product',
					value: `${orderAnalytics.topProduct.name} (${orderAnalytics.topProduct.count} sold)`,
					inline: false,
				});
			}

			if (orderAnalytics.topCustomer) {
				orderEmbed.addFields({
					name: '👑 Top Customer',
					value: `<@${orderAnalytics.topCustomer.userId}> - $${(orderAnalytics.topCustomer.totalSpent / 100).toFixed(2)} lifetime`,
					inline: false,
				});
			}

			// Add profit breakdown
			if (Object.keys(orderAnalytics.profitByCategory).length > 0) {
				let profitText = '';
				for (const [product, data] of Object.entries(orderAnalytics.profitByCategory)) {
					const profitPercent = data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(1) : 0;
					profitText += `**${product}**: $${(data.profit / 100).toFixed(2)} (${profitPercent}% margin)\n`;
				}
				orderEmbed.addFields({ name: '💵 Profit by Category', value: profitText || 'No data', inline: false });
			}

			embeds.push(orderEmbed);

			// Invite Analytics Embed
			const inviteEmbed = new EmbedBuilder()
				.setColor('#9b59b6')
				.setTitle('🎫 Invite Analytics')
				.setTimestamp();

			inviteEmbed.addFields(
				{ name: '📨 Invites Today', value: `${inviteAnalytics.invitesToday}`, inline: true },
				{ name: '🔄 Join-to-Order Ratio', value: `${inviteAnalytics.joinToOrderRatio}%`, inline: true },
				{ name: '\u200b', value: '\u200b', inline: true }
			);

			if (inviteAnalytics.topConverter) {
				inviteEmbed.addFields({
					name: '🌟 Top Converter',
					value: `<@${inviteAnalytics.topConverter.userId}>\n${inviteAnalytics.topConverter.purchases} purchases from ${inviteAnalytics.topConverter.joins} invites`,
					inline: false,
				});
			}

			embeds.push(inviteEmbed);

			// Staff Activity Embed
			const staffEmbed = new EmbedBuilder()
				.setColor('#2ecc71')
				.setTitle('👥 Staff Activity')
				.setTimestamp();

			const ticketsClaimedToday = Object.values(staffAnalytics.ticketsClaimedToday)
				.reduce((sum, count) => sum + count, 0);
			const vouchesEarnedToday = Object.values(staffAnalytics.vouchesToday)
				.reduce((sum, count) => sum + count, 0);

			staffEmbed.addFields(
				{ name: '🎫 Tickets Claimed Today', value: `${ticketsClaimedToday}`, inline: true },
				{ name: '⭐ Vouches Earned Today', value: `${vouchesEarnedToday}`, inline: true },
				{ name: '\u200b', value: '\u200b', inline: true }
			);

			// Top staff earnings today
			const topStaffToday = Object.entries(staffAnalytics.staffTicketRevenue)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 3);

			if (topStaffToday.length > 0) {
				let topStaffText = '';
				for (const [staffId, revenue] of topStaffToday) {
					const tickets = staffAnalytics.ticketsClaimedToday[staffId] || 0;
					topStaffText += `<@${staffId}> - $${(revenue / 100).toFixed(2)} (${tickets} tickets)\n`;
				}
				staffEmbed.addFields({ name: '🏆 Top Staff Today', value: topStaffText, inline: false });
			}

			// Most/least active staff
			if (staffAnalytics.mostActiveStaff.length > 0) {
				const mostActive = staffAnalytics.mostActiveStaff[0];
				staffEmbed.addFields({
					name: '📈 Most Active Staff (All-Time)',
					value: `<@${mostActive.userId}> - ${mostActive.ticketCount} tickets`,
					inline: true,
				});
			}

			if (staffAnalytics.leastActiveStaff.length > 0) {
				const leastActive = staffAnalytics.leastActiveStaff[0];
				staffEmbed.addFields({
					name: '📉 Least Active Staff',
					value: `<@${leastActive.userId}> - ${leastActive.ticketCount} tickets`,
					inline: true,
				});
			}

			embeds.push(staffEmbed);

			// Engagement Embed
			const engagementEmbed = new EmbedBuilder()
				.setColor('#e67e22')
				.setTitle('💬 VC & Engagement')
				.setTimestamp();

			engagementEmbed.addFields(
				{ name: '🎤 VC Joins Today', value: `${engagementAnalytics.vcJoinsToday}`, inline: true },
				{ name: '🎧 VC-to-Purchase Ratio', value: `${engagementAnalytics.vcToPurchaseRatio}%`, inline: true },
				{ name: '💬 Messages Today', value: `${engagementAnalytics.totalMessagesToday}`, inline: true }
			);

			if (engagementAnalytics.topUsers.length > 0) {
				let topUsersText = '';
				for (let i = 0; i < engagementAnalytics.topUsers.length; i++) {
					const user = engagementAnalytics.topUsers[i];
					topUsersText += `${i + 1}. <@${user.userId}> - ${user.messageCount} messages\n`;
				}
				engagementEmbed.addFields({ name: '🌟 Top 3 Most Active Users', value: topUsersText, inline: false });
			}

			embeds.push(engagementEmbed);

			// Post inactive staff warning if any
			if (staffAnalytics.inactiveStaff.length > 0) {
				const inactiveChannel = await this.client.channels.fetch(this.config.inactivityNoticeChannelId);
				if (inactiveChannel && inactiveChannel.isTextBased()) {
					let inactiveText = '⚠️ **Staff Inactivity Alert**\n\nThe following staff members haven\'t handled a ticket in 3+ days:\n\n';
					for (const staff of staffAnalytics.inactiveStaff) {
						const daysSince = staff.lastActivity 
							? Math.floor((Date.now() - new Date(staff.lastActivity).getTime()) / (1000 * 60 * 60 * 24))
							: '∞';
						inactiveText += `<@${staff.userId}> - Last activity: ${daysSince} days ago\n`;
					}
					
					await inactiveChannel.send(inactiveText);
				}
			}

			// Send all embeds
			await channel.send({ embeds });

			this.client.log.info('Analytics report posted successfully');
		} catch (error) {
			this.client.log.error('Failed to post analytics report:', error);
		}
	}

	/**
	 * Start automated reporting
	 */
	async startAutomatedReporting(guildId) {
		// Check daily and post if needed
		const checkAndPost = async () => {
			this.checkDailyReset();
			
			const now = new Date();
			const [targetHour, targetMinute] = this.config.reportTimeUTC.split(':').map(Number);
			
			// Check if it's time to post (within 1 hour window)
			if (now.getUTCHours() === targetHour && now.getUTCMinutes() >= targetMinute && now.getUTCMinutes() < targetMinute + 60) {
				const lastReportKey = `last_analytics_report`;
				const lastReport = await this.client.keyv.get(lastReportKey);
				const lastReportDate = lastReport ? new Date(lastReport) : null;
				
				// Only post once per day
				if (!lastReportDate || lastReportDate.getUTCDate() !== now.getUTCDate()) {
					await this.postAnalyticsReport(guildId);
					await this.client.keyv.set(lastReportKey, now.toISOString());
				}
			}
		};

		// Check every hour
		this.reportInterval = setInterval(checkAndPost, 60 * 60 * 1000);
		
		// Also check immediately
		checkAndPost();

		this.client.log.info(`Analytics automated reporting started (${this.config.reportIntervalHours}h interval)`);
	}

	/**
	 * Stop automated reporting
	 */
	stopAutomatedReporting() {
		if (this.reportInterval) {
			clearInterval(this.reportInterval);
			this.reportInterval = null;
			this.client.log.info('Analytics automated reporting stopped');
		}
	}
}

module.exports = Analytics;
