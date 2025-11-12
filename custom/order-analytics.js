const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

class OrderAnalytics {
	constructor(client) {
		this.client = client;
		this.dataPath = path.join(process.cwd(), 'data', 'order_analytics.json');
		this.invoiceLinksPath = path.join(process.cwd(), 'data', 'invoice_links.json');
		this.costsPath = path.join(process.cwd(), 'custom', 'product-costs.json');
		this.inviteTrackingPath = path.join(process.cwd(), 'data', 'invite_tracking.json');
		
		this.ensureDataFiles();
	}

	ensureDataFiles() {
		// Ensure data directory exists
		const dataDir = path.join(process.cwd(), 'data');
		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true });
		}

		// Initialize order analytics
		if (!fs.existsSync(this.dataPath)) {
			fs.writeFileSync(this.dataPath, JSON.stringify({
				orders: {},
				totalRevenue: 0,
				totalProfit: 0,
				totalCost: 0,
				orderCount: 0,
			}, null, 2));
		}

		// Initialize invoice links
		if (!fs.existsSync(this.invoiceLinksPath)) {
			fs.writeFileSync(this.invoiceLinksPath, JSON.stringify({}, null, 2));
		}

		// Initialize invite tracking
		if (!fs.existsSync(this.inviteTrackingPath)) {
			fs.writeFileSync(this.inviteTrackingPath, JSON.stringify({
				invites: {},
				members: {},
			}, null, 2));
		}
	}

	/**
	 * Extract order data from embed
	 * @param {Object} embed - Discord embed object
	 * @returns {Object|null} Extracted order data
	 */
	extractOrderData(embed) {
		try {
			if (!embed.fields || embed.fields.length === 0) return null;

			const orderData = {
				invoiceId: null,
				product: null,
				email: null,
				price: null,
				quantity: 1,
				timestamp: new Date().toISOString(),
			};

			// Extract data from embed fields
			for (const field of embed.fields) {
				const name = field.name.toLowerCase();
				const value = field.value;

				// Invoice ID variations
				if (name.includes('invoice') && (name.includes('id') || name.includes('#'))) {
					orderData.invoiceId = value.replace(/[^a-zA-Z0-9-]/g, '');
				}

				// Product name variations
				if (name.includes('product') || name.includes('item') || name.includes('package')) {
					orderData.product = value;
				}

				// Email variations
				if (name.includes('email') || name.includes('customer')) {
					// Extract email from value (might be in format "user@example.com" or "<user@example.com>")
					const emailMatch = value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
					if (emailMatch) {
						orderData.email = emailMatch[0].toLowerCase();
					}
				}

				// Price variations
				if (name.includes('price') || name.includes('total') || name.includes('amount')) {
					// Extract price (handle $X.XX, X.XX, $X formats)
					const priceMatch = value.match(/\$?\s*(\d+\.?\d*)/);
					if (priceMatch) {
						orderData.price = Math.round(parseFloat(priceMatch[1]) * 100); // Convert to cents
					}
				}

				// Quantity variations
				if (name.includes('quantity') || name.includes('qty')) {
					const qtyMatch = value.match(/\d+/);
					if (qtyMatch) {
						orderData.quantity = parseInt(qtyMatch[0]);
					}
				}
			}

			// Check embed title and description for additional info
			if (embed.title) {
				if (!orderData.invoiceId) {
					const titleInvoice = embed.title.match(/invoice[:\s#]*([a-zA-Z0-9-]+)/i);
					if (titleInvoice) orderData.invoiceId = titleInvoice[1];
				}
			}

			if (embed.description) {
				if (!orderData.email) {
					const emailMatch = embed.description.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
					if (emailMatch) orderData.email = emailMatch[0].toLowerCase();
				}
			}

			// Validate required fields
			if (!orderData.invoiceId || !orderData.price) {
				return null;
			}

			return orderData;

		} catch (error) {
			this.client.log.error('Error extracting order data:', error);
			return null;
		}
	}

	/**
	 * Calculate cost and profit for an order
	 * @param {Object} orderData - Order data
	 * @returns {Object} Cost and profit info
	 */
	calculateProfit(orderData) {
		try {
			const costs = JSON.parse(fs.readFileSync(this.costsPath, 'utf-8'));
			
			let cost = 0;

			// Try to find exact product match
			if (orderData.product && costs.products[orderData.product]) {
				cost = costs.products[orderData.product].cost;
			} else {
				// Try to find partial match
				const productLower = orderData.product ? orderData.product.toLowerCase() : '';
				for (const [productName, productData] of Object.entries(costs.products)) {
					if (productLower.includes(productName.toLowerCase()) || 
						productName.toLowerCase().includes(productLower)) {
						cost = productData.cost;
						break;
					}
				}

				// If still no match, use category default
				if (cost === 0 && costs.categories.subscription) {
					cost = costs.categories.subscription.defaultCost;
				}
			}

			// Apply quantity
			cost *= orderData.quantity;

			const profit = orderData.price - cost;

			return {
				cost,
				profit,
				profitMargin: orderData.price > 0 ? ((profit / orderData.price) * 100).toFixed(2) : 0,
			};

		} catch (error) {
			this.client.log.error('Error calculating profit:', error);
			return { cost: 0, profit: orderData.price, profitMargin: 100 };
		}
	}

	/**
	 * Process and record an order
	 * @param {Object} orderData - Extracted order data
	 * @returns {Object} Processed order with profit info
	 */
	async processOrder(orderData) {
		try {
			const profitInfo = this.calculateProfit(orderData);
			
			// Load analytics
			const analytics = JSON.parse(fs.readFileSync(this.dataPath, 'utf-8'));

			// Create full order record
			const fullOrder = {
				...orderData,
				...profitInfo,
				userId: null,
				inviterUserId: null,
			};

			// Try to link to existing user
			if (orderData.email) {
				const invoiceLinks = JSON.parse(fs.readFileSync(this.invoiceLinksPath, 'utf-8'));
				
				// Check if this email is already linked
				for (const [userId, userData] of Object.entries(invoiceLinks)) {
					if (userData.emails && userData.emails.includes(orderData.email)) {
						fullOrder.userId = userId;
						break;
					}
				}

			// Check invite tracking to credit inviter
			if (fullOrder.userId) {
				const inviteTracking = JSON.parse(fs.readFileSync(this.inviteTrackingPath, 'utf-8'));
				if (inviteTracking.members[fullOrder.userId]) {
					fullOrder.inviterUserId = inviteTracking.members[fullOrder.userId].inviterId;
				}
			}
		}

		// Record order
		analytics.orders[orderData.invoiceId] = fullOrder;
		analytics.totalRevenue += orderData.price;
		analytics.totalProfit += profitInfo.profit;
		analytics.totalCost += profitInfo.cost;
		analytics.orderCount++;

		fs.writeFileSync(this.dataPath, JSON.stringify(analytics, null, 2));

		// Update invite tracking profit if applicable (legacy system)
		if (fullOrder.inviterUserId) {
			this.updateInviterProfit(fullOrder.inviterUserId, profitInfo.profit);
		}

		// Link to new InviteTracker system if available
		if (this.client.inviteTracker && fullOrder.userId) {
			await this.client.inviteTracker.linkInviteToOrder(
				fullOrder.userId,
				orderData.price,
				orderData.invoiceId,
				orderData.product
			);
		}

		// Track order in analytics system
		if (this.client.analytics) {
			this.client.analytics.trackOrder(orderData.price);
		}

		return fullOrder;

		} catch (error) {
			this.client.log.error('Error processing order:', error);
			throw error;
		}
	}

	/**
	 * Link invoice to Discord user
	 * @param {string} invoiceId - Invoice ID
	 * @param {string} userId - Discord user ID
	 * @param {string} email - Customer email
	 */
	linkInvoiceToUser(invoiceId, userId, email) {
		try {
			const invoiceLinks = JSON.parse(fs.readFileSync(this.invoiceLinksPath, 'utf-8'));

			if (!invoiceLinks[userId]) {
				invoiceLinks[userId] = {
					emails: [],
					invoices: [],
				};
			}

			// Add email if not already present
			const emailLower = email.toLowerCase();
			if (!invoiceLinks[userId].emails.includes(emailLower)) {
				invoiceLinks[userId].emails.push(emailLower);
			}

			// Add invoice if not already present
			if (!invoiceLinks[userId].invoices.includes(invoiceId)) {
				invoiceLinks[userId].invoices.push(invoiceId);
			}

			fs.writeFileSync(this.invoiceLinksPath, JSON.stringify(invoiceLinks, null, 2));

			// Update order record with user ID
			const analytics = JSON.parse(fs.readFileSync(this.dataPath, 'utf-8'));
			if (analytics.orders[invoiceId]) {
				analytics.orders[invoiceId].userId = userId;
				fs.writeFileSync(this.dataPath, JSON.stringify(analytics, null, 2));
			}

			this.client.log.info(`Linked invoice ${invoiceId} to user ${userId} (${email})`);

		} catch (error) {
			this.client.log.error('Error linking invoice to user:', error);
		}
	}

	/**
	 * Update inviter profit tracking
	 * @param {string} inviterId - Inviter user ID
	 * @param {number} profit - Profit to add
	 */
	updateInviterProfit(inviterId, profit) {
		try {
			const inviteTracking = JSON.parse(fs.readFileSync(this.inviteTrackingPath, 'utf-8'));

			if (!inviteTracking.invites[inviterId]) {
				inviteTracking.invites[inviterId] = {
					totalInvites: 0,
					totalProfit: 0,
					orders: [],
				};
			}

			inviteTracking.invites[inviterId].totalProfit += profit;

			fs.writeFileSync(this.inviteTrackingPath, JSON.stringify(inviteTracking, null, 2));

		} catch (error) {
			this.client.log.error('Error updating inviter profit:', error);
		}
	}

	/**
	 * Track member join via invite
	 * @param {string} userId - Joined user ID
	 * @param {string} inviterId - Inviter user ID
	 * @param {string} inviteCode - Invite code used
	 */
	trackInviteJoin(userId, inviterId, inviteCode) {
		try {
			const inviteTracking = JSON.parse(fs.readFileSync(this.inviteTrackingPath, 'utf-8'));

			// Initialize inviter if needed
			if (!inviteTracking.invites[inviterId]) {
				inviteTracking.invites[inviterId] = {
					totalInvites: 0,
					totalProfit: 0,
					orders: [],
				};
			}

			inviteTracking.invites[inviterId].totalInvites++;

			// Record member
			inviteTracking.members[userId] = {
				inviterId,
				inviteCode,
				joinedAt: new Date().toISOString(),
			};

			fs.writeFileSync(this.inviteTrackingPath, JSON.stringify(inviteTracking, null, 2));

		} catch (error) {
			this.client.log.error('Error tracking invite join:', error);
		}
	}

	/**
	 * Log profit to designated channel
	 * @param {Object} order - Full order data with profit info
	 * @param {string} guildId - Guild ID
	 */
	async logProfit(order, guildId) {
		try {
			const costs = JSON.parse(fs.readFileSync(this.costsPath, 'utf-8'));
			const channelId = costs.profitChannelId;

			if (!channelId) return;

			const channel = await this.client.channels.fetch(channelId);
			if (!channel) return;

			// Determine color based on profit margin
			let color = '#2ecc71'; // Green
			if (order.profitMargin < 30) color = '#f39c12'; // Orange
			if (order.profitMargin < 10) color = '#e74c3c'; // Red

			const embed = new EmbedBuilder()
				.setColor(color)
				.setTitle('💰 Order Profit Analytics')
				.setDescription(`**Invoice:** ${order.invoiceId}`)
				.addFields(
					{
						name: '📦 Product',
						value: order.product || 'Unknown',
						inline: true,
					},
					{
						name: '💵 Sale Price',
						value: `$${(order.price / 100).toFixed(2)}`,
						inline: true,
					},
					{
						name: '📊 Quantity',
						value: order.quantity.toString(),
						inline: true,
					},
					{
						name: '💸 Cost',
						value: `$${(order.cost / 100).toFixed(2)}`,
						inline: true,
					},
					{
						name: '✨ Profit',
						value: `$${(order.profit / 100).toFixed(2)}`,
						inline: true,
					},
					{
						name: '📈 Margin',
						value: `${order.profitMargin}%`,
						inline: true,
					}
				)
				.setTimestamp();

			if (order.email) {
				embed.addFields({
					name: '📧 Customer',
					value: order.email,
					inline: false,
				});
			}

			if (order.userId) {
				embed.addFields({
					name: '👤 Discord User',
					value: `<@${order.userId}>`,
					inline: true,
				});
			}

			if (order.inviterUserId) {
				embed.addFields({
					name: '🎯 Invited By',
					value: `<@${order.inviterUserId}>`,
					inline: true,
				});
			}

			await channel.send({ embeds: [embed] });

		} catch (error) {
			this.client.log.error('Error logging profit:', error);
		}
	}

	/**
	 * Get analytics data
	 * @returns {Object} Analytics summary
	 */
	getAnalytics() {
		return JSON.parse(fs.readFileSync(this.dataPath, 'utf-8'));
	}

	/**
	 * Get top customers by total spending
	 * @param {number} limit - Number of top customers to return
	 * @returns {Array} Top customers with their stats
	 */
	getTopCustomers(limit = 10) {
		try {
			const analytics = this.getAnalytics();
			const customerMap = {};

			// Aggregate by email
			for (const [invoiceId, order] of Object.entries(analytics.orders)) {
				if (!order.email) continue;

				if (!customerMap[order.email]) {
					customerMap[order.email] = {
						email: order.email,
						userId: order.userId,
						totalSpent: 0,
						totalOrders: 0,
						orders: [],
					};
				}

				customerMap[order.email].totalSpent += order.price;
				customerMap[order.email].totalOrders++;
				customerMap[order.email].orders.push(invoiceId);
				
				// Update userId if found
				if (order.userId && !customerMap[order.email].userId) {
					customerMap[order.email].userId = order.userId;
				}
			}

			// Sort by total spent
			return Object.values(customerMap)
				.sort((a, b) => b.totalSpent - a.totalSpent)
				.slice(0, limit);

		} catch (error) {
			this.client.log.error('Error getting top customers:', error);
			return [];
		}
	}

	/**
	 * Get top inviters by profit generated
	 * @param {number} limit - Number of top inviters to return
	 * @returns {Array} Top inviters with their stats
	 */
	getTopInviters(limit = 10) {
		try {
			const inviteTracking = JSON.parse(fs.readFileSync(this.inviteTrackingPath, 'utf-8'));

			return Object.entries(inviteTracking.invites)
				.map(([userId, data]) => ({
					userId,
					...data,
				}))
				.sort((a, b) => b.totalProfit - a.totalProfit)
				.slice(0, limit);

		} catch (error) {
			this.client.log.error('Error getting top inviters:', error);
			return [];
		}
	}
}

module.exports = OrderAnalytics;
