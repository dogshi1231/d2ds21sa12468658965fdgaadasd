const { EmbedBuilder } = require('discord.js');

module.exports = {
	name: 'invitetop',
	description: 'Shows top inviters ranked by various metrics',
	
	async execute(message, args) {
		try {
			const client = message.client;
			
			if (!client.inviteTracker) {
				return message.reply('❌ Invite tracking system is not initialized.');
			}

			// Parse metric type
			let metric = 'joins';
			const metricArg = args[0]?.toLowerCase();
			
			if (metricArg === 'revenue' || metricArg === 'money' || metricArg === 'profit') {
				metric = 'revenue';
			} else if (metricArg === 'customers' || metricArg === 'purchasers' || metricArg === 'buyers') {
				metric = 'purchasers';
			} else if (metricArg === 'conversion' || metricArg === 'rate' || metricArg === 'convert') {
				metric = 'conversion';
			}

			// Get top inviters
			const topInviters = await client.inviteTracker.getTopInviters(metric, 10);

			if (!topInviters || topInviters.length === 0) {
				return message.reply('❌ No invite data available yet.');
			}

			// Create embed
			const embed = new EmbedBuilder()
				.setColor('#f39c12')
				.setTimestamp();

			// Set title based on metric
			const titles = {
				joins: '🏆 Top Inviters - Most Joins',
				revenue: '💰 Top Inviters - Revenue Generated',
				purchasers: '🛍️ Top Inviters - Unique Customers',
				conversion: '📈 Top Inviters - Conversion Rate',
			};
			embed.setTitle(titles[metric]);

			// Build leaderboard
			let description = '';
			const medals = ['🥇', '🥈', '🥉'];

			for (let i = 0; i < Math.min(10, topInviters.length); i++) {
				const inviter = topInviters[i];
				const rank = i < 3 ? medals[i] : `**${i + 1}.**`;

				try {
					const user = await client.users.fetch(inviter.inviterId);
					description += `${rank} **${user.tag}**\n`;
				} catch {
					description += `${rank} User ${inviter.inviterId}\n`;
				}

				// Show relevant stats based on metric
				switch (metric) {
				case 'revenue':
					description += `   💵 $${inviter.totalRevenue.toFixed(2)} revenue • ${inviter.totalJoins} joins • ${inviter.uniquePurchasers} customers\n`;
					break;
				case 'purchasers':
					description += `   🛍️ ${inviter.uniquePurchasers} customers • ${inviter.totalJoins} joins • $${inviter.totalRevenue.toFixed(2)} revenue\n`;
					break;
				case 'conversion':
					description += `   📊 ${inviter.conversionRate.toFixed(1)}% conversion • ${inviter.uniquePurchasers}/${inviter.totalJoins} • $${inviter.totalRevenue.toFixed(2)}\n`;
					break;
				case 'joins':
				default:
					description += `   👥 ${inviter.totalJoins} joins • ${inviter.uniquePurchasers} customers • $${inviter.totalRevenue.toFixed(2)} revenue\n`;
					break;
				}

				description += '\n';
			}

			embed.setDescription(description);

			// Add footer with available metrics
			embed.setFooter({ 
				text: 'Use .invitetop [joins/revenue/customers/conversion] to change view' 
			});

			// Add field showing total statistics
			const allInviters = await client.inviteTracker.getTopInviters(metric, 999);
			const totalJoins = allInviters.reduce((sum, inv) => sum + inv.totalJoins, 0);
			const totalRevenue = allInviters.reduce((sum, inv) => sum + inv.totalRevenue, 0);
			const totalCustomers = allInviters.reduce((sum, inv) => sum + inv.uniquePurchasers, 0);
			const avgConversion = totalJoins > 0 ? ((totalCustomers / totalJoins) * 100).toFixed(1) : 0;

			embed.addFields({
				name: '📊 Server Totals',
				value: `${totalJoins} joins • ${totalCustomers} customers • $${totalRevenue.toFixed(2)} revenue • ${avgConversion}% conversion`,
				inline: false,
			});

			await message.reply({ embeds: [embed] });

		} catch (error) {
			client.log.error('Error in invitetop command:', error);
			message.reply('❌ An error occurred while fetching top inviters.');
		}
	},
};
