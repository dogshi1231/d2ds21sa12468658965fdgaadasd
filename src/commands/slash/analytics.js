const { SlashCommand } = require('@eartharoid/dbf');
const { EmbedBuilder } = require('discord.js');

module.exports = class AnalyticsCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'View real-time analytics and statistics',
			name: 'analytics',
		});
	}

	/**
	 * @param {import("discord.js").ChatInputCommandInteraction} interaction
	 */
	async run(interaction) {
		await interaction.deferReply();

		try {
			const client = this.client;

			if (!client.analytics) {
				return await interaction.editReply('❌ Analytics system is not available.');
			}

			// Gather analytics data
			const [
				orderAnalytics,
				inviteAnalytics,
				staffAnalytics,
				engagementAnalytics,
				topCustomers,
				topStaff,
				recentOrders,
				mostCommonProduct,
			] = await Promise.all([
				client.analytics.getOrderAnalytics(),
				client.analytics.getInviteAnalytics(),
				client.analytics.getStaffAnalytics(interaction.guildId),
				client.analytics.getEngagementAnalytics(),
				client.analytics.getTopCustomers(10),
				client.analytics.getTopStaff(10),
				client.analytics.getRecentOrders(5),
				client.analytics.getMostCommonProduct(),
			]);

			// Create main analytics embed
			const mainEmbed = new EmbedBuilder()
				.setColor('#3498db')
				.setTitle('📊 Real-Time Analytics Dashboard')
				.setTimestamp();

			// Order section
			mainEmbed.addFields({
				name: '📦 Order Statistics',
				value: `**Today:** ${orderAnalytics.ordersToday} orders | $${(orderAnalytics.revenueToday / 100).toFixed(2)}\n**Top Product:** ${orderAnalytics.topProduct?.name || 'N/A'} (${orderAnalytics.topProduct?.count || 0} sold)`,
				inline: false,
			});

			// Invite section
			mainEmbed.addFields({
				name: '🎫 Invite Performance',
				value: `**Today:** ${inviteAnalytics.invitesToday} invites\n**Conversion Rate:** ${inviteAnalytics.joinToOrderRatio}%`,
				inline: true,
			});

			// Staff section
			const totalTicketsToday = Object.values(staffAnalytics.ticketsClaimedToday).reduce((sum, count) => sum + count, 0);
			const totalVouchesToday = Object.values(staffAnalytics.vouchesToday).reduce((sum, count) => sum + count, 0);
			mainEmbed.addFields({
				name: '👥 Staff Activity',
				value: `**Tickets Today:** ${totalTicketsToday}\n**Vouches Today:** ${totalVouchesToday}`,
				inline: true,
			});

			// Top customers
			if (topCustomers.length > 0) {
				let customerText = '';
				for (let i = 0; i < Math.min(5, topCustomers.length); i++) {
					const customer = topCustomers[i];
					customerText += `${i + 1}. <@${customer.userId}> - $${(customer.totalSpent / 100).toFixed(2)} (${customer.orderCount} orders)\n`;
				}
				mainEmbed.addFields({ name: '👑 Top 5 Customers', value: customerText, inline: false });
			}

			// Top staff
			if (topStaff.length > 0) {
				let staffText = '';
				for (let i = 0; i < Math.min(5, topStaff.length); i++) {
					const staff = topStaff[i];
					staffText += `${i + 1}. <@${staff.staffId}> - $${(staff.totalEarnings / 100).toFixed(2)} (${staff.ticketCount} tickets)\n`;
				}
				mainEmbed.addFields({ name: '🏆 Top 5 Staff by Earnings', value: staffText, inline: false });
			}

			// Recent orders
			if (recentOrders.length > 0) {
				let ordersText = '';
				for (const order of recentOrders) {
					const timestamp = Math.floor(new Date(order.timestamp).getTime() / 1000);
					ordersText += `<t:${timestamp}:R> - ${order.product} - $${(order.amount / 100).toFixed(2)}\n`;
				}
				mainEmbed.addFields({ name: '🕒 Last 5 Orders', value: ordersText, inline: false });
			}

			// Most common product
			if (mostCommonProduct) {
				mainEmbed.addFields({
					name: '📈 Most Common Product',
					value: `${mostCommonProduct.product} (${mostCommonProduct.count} sold)`,
					inline: false,
				});
			}

			await interaction.editReply({ embeds: [mainEmbed] });

		} catch (error) {
			client.log.error('Error in analytics command:', error);
			await interaction.editReply('❌ An error occurred while fetching analytics data.');
		}
	}
};
