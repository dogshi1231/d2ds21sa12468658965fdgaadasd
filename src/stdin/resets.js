const { EmbedBuilder } = require('discord.js');

module.exports = {
	name: 'resets',
	description: 'View HWID reset statistics for a user',
	
	async execute(message, args) {
		try {
			const client = message.client;
			
			if (!client.hwidManager) {
				return message.reply('❌ HWID reset system is not available.');
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

			// Get user stats
			const stats = await client.hwidManager.getUserStats(targetUser.id);
			const requests = await client.hwidManager.getUserRequests(targetUser.id);

			// Check cooldown
			const cooldownCheck = await client.hwidManager.checkCooldown(targetUser.id);

			// Create embed
			const embed = new EmbedBuilder()
				.setColor('#9b59b6')
				.setTitle(`🔄 HWID Reset Statistics - ${targetUser.tag}`)
				.setThumbnail(targetUser.displayAvatarURL())
				.setTimestamp();

			let description = `**📊 Overview:**\n`;
			description += `• Total Requests: **${stats.totalRequests}**\n`;
			description += `• ✅ Approved: **${stats.approved}**\n`;
			description += `• ❌ Denied: **${stats.denied}**\n`;
			description += `• ⏳ Pending: **${stats.pending}**\n\n`;

			// Approval rate
			if (stats.totalRequests > 0) {
				const approvalRate = ((stats.approved / stats.totalRequests) * 100).toFixed(1);
				const ratingEmoji = approvalRate >= 80 ? '🔥' : approvalRate >= 60 ? '⭐' : approvalRate >= 40 ? '📈' : '📊';
				description += `**${ratingEmoji} Approval Rate:** ${approvalRate}%\n\n`;
			}

			// Cooldown status
			if (cooldownCheck.onCooldown) {
				const hoursRemaining = Math.ceil(cooldownCheck.timeRemaining / (1000 * 60 * 60));
				const minutesRemaining = Math.ceil((cooldownCheck.timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
				description += `**⏱️ Cooldown:** ${hoursRemaining}h ${minutesRemaining}m remaining\n`;
				description += `**Next Request:** <t:${Math.floor(cooldownCheck.canRequestAt.getTime() / 1000)}:R>\n\n`;
			} else {
				description += `**✅ Status:** Can submit a new request\n\n`;
			}

			// Last request
			if (stats.lastRequestAt) {
				const lastRequest = new Date(stats.lastRequestAt);
				description += `**🕐 Last Request:** <t:${Math.floor(lastRequest.getTime() / 1000)}:R>\n`;
			}

			embed.setDescription(description);

			// Recent requests (last 5)
			if (requests.length > 0) {
				const recentRequests = requests.slice(0, 5);
				let requestsText = '';

				for (const request of recentRequests) {
					const statusEmoji = request.status === 'approved' ? '✅' : request.status === 'denied' ? '❌' : '⏳';
					const date = new Date(request.createdAt);
					const dateStr = `<t:${Math.floor(date.getTime() / 1000)}:d>`;
					
					requestsText += `${statusEmoji} **${request.status.toUpperCase()}** - ${dateStr}\n`;
					requestsText += `   └ ${request.reason.substring(0, 60)}${request.reason.length > 60 ? '...' : ''}\n`;
					
					if (request.denialReason) {
						requestsText += `   └ *Denied: ${request.denialReason.substring(0, 50)}${request.denialReason.length > 50 ? '...' : ''}*\n`;
					}
					
					requestsText += '\n';
				}

				embed.addFields({
					name: `📋 Recent Requests (${Math.min(5, requests.length)}/${requests.length})`,
					value: requestsText || 'No recent requests',
					inline: false,
				});
			}

			// Add footer
			if (requests.length > 5) {
				embed.setFooter({ 
					text: `Showing 5 of ${requests.length} total requests` 
				});
			}

			await message.reply({ embeds: [embed] });

		} catch (error) {
			client.log.error('Error in resets command:', error);
			message.reply('❌ An error occurred while fetching HWID reset statistics.');
		}
	},
};
