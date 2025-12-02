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
	 * @param {import('discord.js').ChatInputCommandInteraction} interaction
	 */
	async run(interaction) {
		await interaction.deferReply();

		try {
			const client = this.client;
			if (!client.analytics || typeof client.analytics.getDashboardData !== 'function') {
				return await interaction.editReply('❌ Analytics system is not available.');
			}

			const data = await client.analytics.getDashboardData();

			const mainEmbed = new EmbedBuilder()
				.setColor('#3498db')
				.setTitle('📊 Real-Time Analytics Dashboard')
				.setTimestamp();

			// Orders
			const topProductText = data.topProduct ? `${data.topProduct.name} (${data.topProduct.count})` : 'N/A';
			mainEmbed.addFields({
				name: '📦 Orders',
				value: `Today: ${data.ordersToday} | Revenue: $${(data.revenueToday / 100).toFixed(2)}\nTop: ${topProductText}`,
				inline: false,
			});

			// Invites
			mainEmbed.addFields({
				name: '🎫 Invites',
				value: `Joins: ${data.invites.totalJoins} | Purchases: ${data.invites.totalPurchases || 0}\nJoin→Order: ${data.invites.joinToOrderRatio}%`,
				inline: true,
			});

			// Engagement
			mainEmbed.addFields({
				name: '💬 Engagement',
				value: `VC Joins: ${data.engagement.vcJoinsToday}\nVC→Purchase: ${data.engagement.vcToPurchaseRatio}%\nMessages: ${data.engagement.totalMessagesToday}`,
				inline: true,
			});

			// Staff (top 3 by revenue)
			const rev = data.staff.staffTicketRevenue || {};
			const topStaff = Object.entries(rev).sort((a,b)=>b[1]-a[1]).slice(0,3);
			if (topStaff.length) {
				const staffText = topStaff.map(([id, cents], i)=> `${i+1}. <@${id}> - $${(cents/100).toFixed(2)}`).join('\n');
				mainEmbed.addFields({ name: '🏆 Top Staff (Today)', value: staffText, inline: false });
			}

			// Profit by category (top 5)
			const pbc = data.profitByCategory || {};
			const pbcList = Object.entries(pbc)
				.map(([k,v]) => ({ k, margin: v.revenue ? (v.profit / v.revenue) : 0, profit: v.profit }))
				.sort((a,b)=> (b.profit - a.profit))
				.slice(0,5);
			if (pbcList.length) {
				const text = pbcList.map(x => `${x.k}: $${(x.profit/100).toFixed(2)} (${(x.margin*100).toFixed(1)}%)`).join('\n');
				mainEmbed.addFields({ name: '💵 Profit by Category', value: text, inline: false });
			}

			await interaction.editReply({ embeds: [mainEmbed] });
		} catch (error) {
			this.client.log.error('Error in analytics command:', error);
			await interaction.editReply('❌ An error occurred while fetching analytics data.');
		}
	}
};
