const { EmbedBuilder } = require('discord.js');

module.exports = {
	name: 'rwarning',
	description: 'Remove a warning from a staff member',
	
	async execute(message, args) {
		try {
			const client = message.client;
			
			if (!client.staffManager) {
				return message.reply('❌ Staff management system is not available.');
			}

			// Get target user
			const mention = message.mentions.users.first();
			if (!mention) {
				return message.reply('❌ Please mention a staff member.\n**Usage:** `.rwarning @staff`');
			}

			// Get their warnings
			const activeWarnings = await client.staffManager.getActiveWarnings(mention.id);

			if (activeWarnings.length === 0) {
				return message.reply(`❌ ${mention} has no active warnings.`);
			}

			// Create embed showing warnings
			const embed = new EmbedBuilder()
				.setColor('#9b59b6')
				.setTitle(`⚠️ Active Warnings for ${mention.tag}`)
				.setDescription(`Select a warning to remove by replying with its number (1-${activeWarnings.length})`)
				.setTimestamp();

			let warningsText = '';
			activeWarnings.forEach((warning, index) => {
				const issuedDate = new Date(warning.issuedAt);
				const expiresDate = new Date(warning.expiresAt);
				
				warningsText += `**${index + 1}.** Issued <t:${Math.floor(issuedDate.getTime() / 1000)}:R>\n`;
				warningsText += `   └ **Reason:** ${warning.reason}\n`;
				warningsText += `   └ **By:** ${warning.issuedByUsername}\n`;
				warningsText += `   └ **Expires:** <t:${Math.floor(expiresDate.getTime() / 1000)}:R>\n`;
				warningsText += `   └ **ID:** \`${warning.id}\`\n\n`;
			});

			embed.setDescription(warningsText + `\n**Reply with a number (1-${activeWarnings.length}) to remove that warning, or "cancel" to abort.**`);

			await message.reply({ embeds: [embed] });

			// Wait for user response
			const filter = m => m.author.id === message.author.id;
			const collected = await message.channel.awaitMessages({
				filter,
				max: 1,
				time: 30000,
				errors: ['time'],
			}).catch(() => null);

			if (!collected || collected.size === 0) {
				return message.reply('⏱️ Warning removal timed out.');
			}

			const response = collected.first();

			if (response.content.toLowerCase() === 'cancel') {
				return response.reply('❌ Warning removal cancelled.');
			}

			const choice = parseInt(response.content);

			if (isNaN(choice) || choice < 1 || choice > activeWarnings.length) {
				return response.reply(`❌ Invalid choice. Please enter a number between 1 and ${activeWarnings.length}.`);
			}

			const selectedWarning = activeWarnings[choice - 1];

			// Remove the warning
			const result = await client.staffManager.removeWarning(
				mention.id,
				selectedWarning.id,
				message.author.id,
				message.author.tag
			);

			if (!result.success) {
				if (result.error === 'not_found') {
					return response.reply('❌ Warning not found.');
				}
				return response.reply('❌ Failed to remove warning.');
			}

			// Success
			const successEmbed = new EmbedBuilder()
				.setColor('#2ecc71')
				.setTitle('✅ Warning Removed')
				.setDescription(`Warning removed from ${mention}`)
				.addFields(
					{ name: '📝 Reason', value: selectedWarning.reason, inline: false },
					{ name: '👮 Removed By', value: message.author.tag, inline: true },
					{ name: '⚠️ Remaining Warnings', value: `${result.remaining}`, inline: true }
				)
				.setTimestamp()
				.setFooter({ text: `Warning ID: ${selectedWarning.id}` });

			await response.reply({ embeds: [successEmbed] });

			// DM the staff member
			try {
				const dmEmbed = new EmbedBuilder()
					.setColor('#2ecc71')
					.setTitle('✅ Warning Removed')
					.setDescription(`One of your warnings has been removed in **${message.guild.name}**.`)
					.addFields(
						{ name: '📝 Original Reason', value: selectedWarning.reason, inline: false },
						{ name: '👮 Removed By', value: message.author.tag, inline: true },
						{ name: '⚠️ Remaining Warnings', value: `${result.remaining}`, inline: true }
					)
					.setTimestamp();

				await mention.send({ embeds: [dmEmbed] });
			} catch (dmError) {
				client.log.warn(`Could not DM user ${mention.tag} about warning removal`);
			}

			client.log.info(`Warning removed from ${mention.tag} by ${message.author.tag}`);

		} catch (error) {
			client.log.error('Error in rwarning command:', error);
			message.reply('❌ An error occurred while removing the warning.');
		}
	},
};
