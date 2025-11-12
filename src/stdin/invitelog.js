const { EmbedBuilder } = require('discord.js');

module.exports = {
	name: 'invitelog',
	description: 'Lists all users who joined using a specific user\'s invites',
	
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

			// Get invited users
			const invitedUsers = await client.inviteTracker.getInvitedUsers(targetUser.id);

			if (!invitedUsers || invitedUsers.length === 0) {
				return message.reply(`❌ **${targetUser.tag}** has not invited anyone yet or tracking was enabled after their invites.`);
			}

			// Sort by join date (newest first)
			invitedUsers.sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));

			// Pagination settings
			const itemsPerPage = 10;
			const totalPages = Math.ceil(invitedUsers.length / itemsPerPage);
			let currentPage = 0;

			// Parse page number if provided
			const pageArg = args.find(arg => !isNaN(arg));
			if (pageArg) {
				currentPage = Math.max(0, Math.min(totalPages - 1, parseInt(pageArg) - 1));
			}

			// Get page data
			const startIdx = currentPage * itemsPerPage;
			const endIdx = Math.min(startIdx + itemsPerPage, invitedUsers.length);
			const pageUsers = invitedUsers.slice(startIdx, endIdx);

			// Calculate statistics
			const totalPurchasers = invitedUsers.filter(u => u.hasPurchased).length;
			const totalRevenue = invitedUsers.reduce((sum, u) => sum + u.totalSpent, 0);

			// Create embed
			const embed = new EmbedBuilder()
				.setColor('#9b59b6')
				.setTitle(`📋 Invite Log - ${targetUser.tag}`)
				.setThumbnail(targetUser.displayAvatarURL())
				.setTimestamp();

			// Add statistics header
			embed.addFields({
				name: '📊 Overview',
				value: `Total Invited: **${invitedUsers.length}** | Customers: **${totalPurchasers}** | Revenue: **$${totalRevenue.toFixed(2)}**`,
				inline: false,
			});

			// Build user list
			let userList = '';
			for (let i = 0; i < pageUsers.length; i++) {
				const user = pageUsers[i];
				const globalIdx = startIdx + i + 1;
				
				// Format join date
				const joinDate = new Date(user.joinedAt);
				const dateStr = joinDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
				
				// Customer status
				const statusIcon = user.hasPurchased ? '💰' : '👤';
				const spending = user.hasPurchased ? ` • $${user.totalSpent.toFixed(2)}` : '';
				
				// Try to fetch current username
				let username = user.username;
				try {
					const fetchedUser = await client.users.fetch(user.userId);
					username = fetchedUser.tag;
				} catch {
					// Use stored username if user not found
				}

				userList += `**${globalIdx}.** ${statusIcon} ${username}\n`;
				userList += `   └ Joined: ${dateStr} • Code: \`${user.inviteCode}\`${spending}\n\n`;
			}

			embed.addFields({
				name: `Members (${startIdx + 1}-${endIdx} of ${invitedUsers.length})`,
				value: userList || 'No users on this page.',
				inline: false,
			});

			// Add pagination footer
			if (totalPages > 1) {
				embed.setFooter({ 
					text: `Page ${currentPage + 1}/${totalPages} • Use .invitelog @user [page] to navigate` 
				});
			}

			await message.reply({ embeds: [embed] });

		} catch (error) {
			client.log.error('Error in invitelog command:', error);
			message.reply('❌ An error occurred while fetching invite log.');
		}
	},
};
