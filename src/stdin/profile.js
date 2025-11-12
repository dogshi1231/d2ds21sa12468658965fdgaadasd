const { EmbedBuilder } = require('discord.js');

module.exports = {
	name: 'profile',
	description: 'View a staff member\'s profile (staff only)',
	
	async execute(message, args) {
		try {
			const client = message.client;
			
			if (!client.staffManager) {
				return message.reply('❌ Staff management system is not available.');
			}

			// Check if command user is staff
			const issuerMember = await message.guild.members.fetch(message.author.id);
			const config = client.staffManager.config;
			const isStaff = issuerMember.roles.cache.some(role => config.staffRoleIds.includes(role.id));
			
			if (!isStaff && message.guild.ownerId !== message.author.id) {
				return message.reply('❌ This command is only available to staff members.');
			}

			// Get target user
			const mention = message.mentions.users.first();
			if (!mention) {
				return message.reply('❌ Please mention a user.\n**Usage:** `.profile @user`');
			}

			// Get profile data
			const profile = await client.staffManager.getStaffProfile(mention.id);

			if (!profile) {
				return message.reply('❌ Could not fetch profile data for this user.');
			}

			// Format last activity
			let lastActivityText = 'Never';
			if (profile.lastActivity) {
				const timestamp = Math.floor(new Date(profile.lastActivity).getTime() / 1000);
				lastActivityText = `<t:${timestamp}:R>`;
			}

			// Format purchase total
			const purchaseTotal = profile.purchaseTotal || 0;
			const formattedTotal = `$${purchaseTotal.toFixed(2)}`;

			// Create profile embed
			const embed = new EmbedBuilder()
				.setColor('#3498db')
				.setTitle(`📊 Staff Profile: ${mention.tag}`)
				.setThumbnail(mention.displayAvatarURL({ dynamic: true }))
				.addFields(
					{ name: '💰 Lifetime Purchase Total', value: formattedTotal, inline: true },
					{ name: '🎫 Tickets Handled', value: `${profile.ticketCount || 0}`, inline: true },
					{ name: '⚠️ Active Warnings', value: `${profile.activeWarnings}`, inline: true },
					{ name: '🕐 Last Activity', value: lastActivityText, inline: false }
				)
				.setTimestamp()
				.setFooter({ text: `User ID: ${mention.id}` });

			// Add recent activities if available
			if (profile.recentActivities && profile.recentActivities.length > 0) {
				const activities = profile.recentActivities
					.slice(0, 5)
					.map(activity => {
						const timestamp = Math.floor(new Date(activity.timestamp).getTime() / 1000);
						return `• <t:${timestamp}:R> - ${activity.type}`;
					})
					.join('\n');
				
				embed.addFields({ name: '📋 Recent Activity', value: activities, inline: false });
			}

			await message.reply({ embeds: [embed] });

		} catch (error) {
			client.log.error('Error in profile command:', error);
			message.reply('❌ An error occurred while fetching the profile.');
		}
	},
};
