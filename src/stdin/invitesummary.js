const { EmbedBuilder } = require('discord.js');

module.exports = {
	name: 'invitesummary',
	description: 'Shows invite summary statistics for different time periods',
	
	async execute(message, args) {
		try {
			const client = message.client;
			
			if (!client.inviteTracker) {
				return message.reply('❌ Invite tracking system is not initialized.');
			}

			// Parse time period (24h or 7d)
			let hours = 24;
			const timeArg = args[0]?.toLowerCase();
			
			if (timeArg === '7d' || timeArg === '7days' || timeArg === 'week') {
				hours = 168; // 7 days
			} else if (timeArg === '30d' || timeArg === '30days' || timeArg === 'month') {
				hours = 720; // 30 days
			}

			// Get summary stats
			const stats = await client.inviteTracker.getSummaryStats(hours);
			
			if (!stats) {
				return message.reply('❌ Failed to retrieve invite statistics.');
			}

			// Get top 5 inviters for this period
			const allInviters = await client.inviteTracker.getTopInviters('joins', 5);

			// Create embed
			const embed = new EmbedBuilder()
				.setColor('#3498db')
				.setTitle(`📥 Invite Summary - Last ${hours}h`)
				.setTimestamp();

			let description = `**📊 Overall Statistics:**\n`;
			description += `• Total joins: **${stats.totalJoins}**\n`;
			description += `• New customers: **${stats.newCustomers}**\n`;
			description += `• Conversion rate: **${stats.conversionRate}%**\n`;
			description += `• Revenue generated: **$${stats.totalRevenue}**\n\n`;

			// Top inviter in period
			if (stats.topInviter) {
				try {
					const user = await client.users.fetch(stats.topInviter.inviterId);
					description += `**🏆 Top Inviter (This Period):**\n`;
					description += `${user.tag}\n`;
					description += `└ ${stats.topInviter.joins} joins • $${stats.topInviter.revenue.toFixed(2)} revenue\n\n`;
				} catch {
					description += `**🏆 Top Inviter:** ${stats.topInviter.inviterId} (${stats.topInviter.joins} joins)\n\n`;
				}
			}

			// Top 5 inviters (all time)
			if (allInviters.length > 0) {
				description += `**🌟 Top 5 Inviters (All Time):**\n`;
				
				for (let i = 0; i < Math.min(5, allInviters.length); i++) {
					const inviter = allInviters[i];
					const rank = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i];
					
					try {
						const user = await client.users.fetch(inviter.inviterId);
						description += `${rank} **${user.tag}**\n`;
						description += `   └ ${inviter.totalJoins} joins • ${inviter.uniquePurchasers} customers • $${inviter.totalRevenue.toFixed(2)}\n`;
					} catch {
						description += `${rank} ${inviter.inviterId}\n`;
						description += `   └ ${inviter.totalJoins} joins • ${inviter.uniquePurchasers} customers\n`;
					}
				}
			}

			embed.setDescription(description);

			// Add footer with usage
			embed.setFooter({ 
				text: 'Use .invitesummary [24h/7d/30d] to change time period' 
			});

			await message.reply({ embeds: [embed] });

		} catch (error) {
			client.log.error('Error in invitesummary command:', error);
			message.reply('❌ An error occurred while fetching invite statistics.');
		}
	},
};
