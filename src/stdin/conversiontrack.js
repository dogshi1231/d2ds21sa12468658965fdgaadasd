const { EmbedBuilder } = require('discord.js');

module.exports = {
	name: 'conversiontrack',
	description: 'Track invite-to-purchase conversion for a specific user',
	
	async execute(message, args) {
		try {
			const client = message.client;
			
			if (!client.inviteTracker) {
				return message.reply('❌ Invite tracking system is not initialized.');
			}

			// Get target user
			let targetUser;
			const mention = message.mentions.users.first();
			
			if (mention) {
				targetUser = mention;
			} else if (args[0]) {
				// Try to fetch by ID
				try {
					targetUser = await client.users.fetch(args[0]);
				} catch {
					return message.reply('❌ User not found. Please mention a user or provide a valid user ID.');
				}
			} else {
				// Default to command author
				targetUser = message.author;
			}

			// Get inviter stats
			const stats = await client.inviteTracker.getInviterStats(targetUser.id);
			
			if (!stats) {
				return message.reply('❌ Failed to retrieve statistics for this user.');
			}

			if (stats.totalJoins === 0) {
				return message.reply(`❌ **${targetUser.tag}** has not invited anyone yet or tracking was enabled after their invites.`);
			}

			// Create embed
			const embed = new EmbedBuilder()
				.setColor('#2ecc71')
				.setTitle(`📊 Conversion Tracking - ${targetUser.tag}`)
				.setThumbnail(targetUser.displayAvatarURL())
				.setTimestamp();

			let description = `**📈 Performance Metrics:**\n\n`;
			
			// Total joins
			description += `**Total Joins:** ${stats.totalJoins}\n`;
			
			// Unique purchasers
			const purchaserCount = stats.uniquePurchasers.length;
			description += `**Customers Generated:** ${purchaserCount}\n`;
			
			// Conversion rate
			const conversionRate = stats.conversionRate;
			const ratingEmoji = conversionRate >= 50 ? '🔥' : conversionRate >= 30 ? '⭐' : conversionRate >= 15 ? '📈' : '📊';
			description += `**Conversion Rate:** ${ratingEmoji} ${conversionRate}%\n\n`;
			
			// Revenue
			description += `**💰 Revenue Generated:**\n`;
			description += `Total: **$${stats.totalRevenue.toFixed(2)}**\n`;
			if (purchaserCount > 0) {
				const avgPerCustomer = stats.totalRevenue / purchaserCount;
				description += `Avg per customer: **$${avgPerCustomer.toFixed(2)}**\n`;
			}
			description += `\n`;

			// Visual representation of conversion
			const barLength = 20;
			const filledBars = Math.round((conversionRate / 100) * barLength);
			const emptyBars = barLength - filledBars;
			const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
			
			description += `**Conversion Progress:**\n`;
			description += `\`${progressBar}\` ${conversionRate}%\n\n`;

			// Performance rating
			let rating;
			if (conversionRate >= 50) {
				rating = '🔥 **Elite Converter** - Exceptional performance!';
			} else if (conversionRate >= 30) {
				rating = '⭐ **Strong Performer** - Above average conversion!';
			} else if (conversionRate >= 15) {
				rating = '📈 **Good Progress** - Solid conversion rate!';
			} else if (conversionRate >= 5) {
				rating = '📊 **Building Up** - Keep growing!';
			} else {
				rating = '🌱 **Early Stage** - Just getting started!';
			}
			
			description += `**Rating:** ${rating}\n\n`;

			// Invite codes used
			if (stats.invites && stats.invites.length > 0) {
				description += `**Active Invite Codes:** ${stats.invites.length}\n`;
				description += `\`${stats.invites.slice(0, 3).join('`, `')}\``;
				if (stats.invites.length > 3) {
					description += ` *+${stats.invites.length - 3} more*`;
				}
			}

			embed.setDescription(description);

			// Add comparison footer
			const allInviters = await client.inviteTracker.getTopInviters('conversion', 100);
			const userRank = allInviters.findIndex(inv => inv.inviterId === targetUser.id) + 1;
			
			if (userRank > 0) {
				embed.setFooter({ 
					text: `Ranked #${userRank} by conversion rate • Use .invitetop to see full leaderboard` 
				});
			}

			await message.reply({ embeds: [embed] });

		} catch (error) {
			client.log.error('Error in conversiontrack command:', error);
			message.reply('❌ An error occurred while tracking conversion data.');
		}
	},
};
