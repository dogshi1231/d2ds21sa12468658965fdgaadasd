const { SlashCommand } = require('@eartharoid/dbf');
const { ApplicationCommandOptionType, MessageFlags, EmbedBuilder } = require('discord.js');

module.exports = class WarnSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'Issue a warning to a customer',
			dmPermission: false,
			name: 'warn',
			options: [
				{
					description: 'The customer to warn',
					name: 'user',
					required: true,
					type: ApplicationCommandOptionType.User,
				},
				{
					description: 'Reason for the warning',
					name: 'reason',
					required: true,
					type: ApplicationCommandOptionType.String,
				},
			],
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

			const targetUser = interaction.options.getUser('user');
			const reason = interaction.options.getString('reason');

			// Add warning to profile
			client.profileManager.addWarning(targetUser.id, reason, interaction.user.id);

			const warnEmbed = new EmbedBuilder()
				.setColor(0xFF6B6B)
				.setTitle('⚠️ Warning Issued')
				.addFields(
					{ name: 'Customer', value: `${targetUser}`, inline: true },
					{ name: 'Issued By', value: `${interaction.user}`, inline: true },
					{ name: 'Reason', value: reason, inline: false },
				)
				.setFooter({ text: 'This warning has been recorded in their profile' })
				.setTimestamp();

			await interaction.editReply({ embeds: [warnEmbed] });

			// Try to DM the user
			try {
				await targetUser.send({
					embeds: [
						new EmbedBuilder()
							.setColor(0xFF6B6B)
							.setTitle('⚠️ You Have Received a Warning')
							.setDescription(`You have been issued a warning in **${interaction.guild.name}**.`)
							.addFields({ name: 'Reason', value: reason })
							.setFooter({ text: 'Please follow server rules and guidelines' })
							.setTimestamp(),
					],
				});
				client.log.info(`Sent warning DM to ${targetUser.tag}`);
			} catch (error) {
				client.log.warn(`Could not DM warning to ${targetUser.tag}`);
			}

			client.log.info(`${interaction.user.tag} warned ${targetUser.tag}: ${reason}`);

		} catch (error) {
			client.log.error('Error in warn command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while issuing the warning.',
			}).catch(() => {});
		}
	}
};
