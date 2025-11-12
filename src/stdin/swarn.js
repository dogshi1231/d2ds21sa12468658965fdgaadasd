const { EmbedBuilder } = require('discord.js');

module.exports = {
	name: 'swarn',
	description: 'Give a staff member a warning',
	
	async execute(message, args) {
		try {
			const client = message.client;
			
			if (!client.staffManager) {
				return message.reply('❌ Staff management system is not available.');
			}

			// Check if user has permission (must be staff themselves)
			const issuerMember = await message.guild.members.fetch(message.author.id);
			
			// Get target user
			const mention = message.mentions.users.first();
			if (!mention) {
				return message.reply('❌ Please mention a staff member to warn.\n**Usage:** `.swarn @staff [reason]`');
			}

			const targetMember = await message.guild.members.fetch(mention.id);

			// Check role hierarchy
			const canWarn = await client.staffManager.checkRoleHierarchy(issuerMember, targetMember);
			
			if (!canWarn) {
				return message.reply('❌ You cannot warn this staff member. You can only warn staff members with lower roles than yours.');
			}

			// Get reason
			const reason = args.slice(1).join(' ');
			if (!reason || reason.length < 5) {
				return message.reply('❌ Please provide a reason for the warning (minimum 5 characters).\n**Usage:** `.swarn @staff [reason]`');
			}

			if (reason.length > 500) {
				return message.reply('❌ Warning reason is too long (maximum 500 characters).');
			}

			// Add warning
			const result = await client.staffManager.addWarning(
				mention.id,
				mention.tag,
				reason,
				message.author.id,
				message.author.tag,
				message.guild.id
			);

			if (!result.success) {
				return message.reply('❌ Failed to add warning. Please try again.');
			}

			// Create response embed
			const embed = new EmbedBuilder()
				.setColor(result.limitReached ? '#e74c3c' : '#e67e22')
				.setTitle('⚠️ Staff Warning Issued')
				.setDescription(`Warning given to ${mention}`)
				.addFields(
					{ name: '📝 Reason', value: reason, inline: false },
					{ name: '👮 Issued By', value: message.author.tag, inline: true },
					{ name: '⚠️ Active Warnings', value: `${result.activeCount}/3`, inline: true },
					{ name: '⏰ Expires', value: `<t:${Math.floor(new Date(result.warning.expiresAt).getTime() / 1000)}:R>`, inline: true }
				)
				.setTimestamp()
				.setFooter({ text: `Warning ID: ${result.warning.id}` });

			if (result.limitReached) {
				embed.addFields({
					name: '🚫 Action Taken',
					value: '**Staff role removed** due to reaching warning limit (3/3)',
					inline: false,
				});
			}

			await message.reply({ embeds: [embed] });

			// DM the warned staff member
			try {
				const dmEmbed = new EmbedBuilder()
					.setColor('#e67e22')
					.setTitle('⚠️ You Have Received a Staff Warning')
					.setDescription(`You have been warned in **${message.guild.name}**.`)
					.addFields(
						{ name: '📝 Reason', value: reason, inline: false },
						{ name: '👮 Issued By', value: message.author.tag, inline: true },
						{ name: '⚠️ Active Warnings', value: `${result.activeCount}/3`, inline: true },
						{ name: '⏰ Expires In', value: '30 days', inline: true }
					)
					.setTimestamp()
					.setFooter({ text: 'Warnings automatically expire after 30 days' });

				if (result.limitReached) {
					dmEmbed.setColor('#e74c3c');
					dmEmbed.addFields({
						name: '🚫 Staff Role Removed',
						value: 'You have reached the maximum number of warnings (3/3) and your staff role has been removed.',
						inline: false,
					});
				}

				await mention.send({ embeds: [dmEmbed] });
			} catch (dmError) {
				client.log.warn(`Could not DM warned user ${mention.tag}`);
			}

			client.log.info(`Warning issued to ${mention.tag} by ${message.author.tag}: ${reason}`);

		} catch (error) {
			client.log.error('Error in swarn command:', error);
			message.reply('❌ An error occurred while issuing the warning.');
		}
	},
};
