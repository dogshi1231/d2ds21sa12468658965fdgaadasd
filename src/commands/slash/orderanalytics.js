const { SlashCommand } = require('@eartharoid/dbf');
const { MessageFlags, EmbedBuilder } = require('discord.js');

module.exports = class OrderAnalyticsSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'View order and profit analytics (staff only)',
			dmPermission: false,
			name: 'orderanalytics',
		});
	}

	/**
	 * @param {import("discord.js").ChatInputCommandInteraction} interaction
	 */
	async run(interaction) {
		/** @type {import("client")} */
		const client = this.client;

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			// Check if user is staff
			const { isStaff } = require('../../lib/users');
			if (!await isStaff(interaction.guild, interaction.member.id)) {
				return await interaction.editReply({
					content: '❌ This command is only available to staff members.',
				});
			}

			// Check if order analytics is initialized
			if (!client.orderAnalytics) {
				return await interaction.editReply({
					content: '❌ Order analytics system is not initialized.',
				});
			}

			// Get analytics data
			const analytics = client.orderAnalytics.getAnalytics();

			// Calculate averages
			const avgOrderValue = analytics.orderCount > 0 
				? analytics.totalRevenue / analytics.orderCount 
				: 0;
			const avgProfit = analytics.orderCount > 0 
				? analytics.totalProfit / analytics.orderCount 
				: 0;
			const overallMargin = analytics.totalRevenue > 0 
				? ((analytics.totalProfit / analytics.totalRevenue) * 100).toFixed(2) 
				: 0;

			// Create analytics embed
			const embed = new EmbedBuilder()
				.setColor('#5865F2')
				.setTitle('📊 Order Analytics Dashboard')
				.setDescription('Comprehensive profit and revenue tracking')
				.addFields(
					{
						name: '📦 Total Orders',
						value: analytics.orderCount.toLocaleString(),
						inline: true,
					},
					{
						name: '💵 Total Revenue',
						value: `$${(analytics.totalRevenue / 100).toFixed(2)}`,
						inline: true,
					},
					{
						name: '✨ Total Profit',
						value: `$${(analytics.totalProfit / 100).toFixed(2)}`,
						inline: true,
					},
					{
						name: '💸 Total Cost',
						value: `$${(analytics.totalCost / 100).toFixed(2)}`,
						inline: true,
					},
					{
						name: '📈 Profit Margin',
						value: `${overallMargin}%`,
						inline: true,
					},
					{
						name: '📊 Avg Order Value',
						value: `$${(avgOrderValue / 100).toFixed(2)}`,
						inline: true,
					},
					{
						name: '💰 Avg Profit/Order',
						value: `$${(avgProfit / 100).toFixed(2)}`,
						inline: true,
					}
				)
				.setFooter({ text: 'Analytics are automatically updated when orders are processed' })
				.setTimestamp();

			// Get recent orders
			const recentOrders = Object.entries(analytics.orders)
				.sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp))
				.slice(0, 5);

			if (recentOrders.length > 0) {
				const recentOrdersText = recentOrders.map(([invoiceId, order]) => {
					const profit = (order.profit / 100).toFixed(2);
					const profitEmoji = order.profit > 0 ? '✅' : '❌';
					return `${profitEmoji} \`${invoiceId}\` - $${profit} profit`;
				}).join('\n');

				embed.addFields({
					name: '📝 Recent Orders',
					value: recentOrdersText,
					inline: false,
				});
			}

			await interaction.editReply({ embeds: [embed] });

		} catch (error) {
			client.log.error('Error in orderanalytics command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while fetching analytics.',
			}).catch(() => {});
		}
	}
};
