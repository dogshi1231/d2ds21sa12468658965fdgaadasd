const { SlashCommand } = require('@eartharoid/dbf');
const { ApplicationCommandOptionType, MessageFlags } = require('discord.js');

module.exports = class CheckResetsSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'Check support request history for a user (staff only)',
			dmPermission: false,
			name: 'checkresets',
			options: [
				{
					description: 'The user to check',
					name: 'user',
					required: true,
					type: ApplicationCommandOptionType.User,
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

			// Generate summary embed
			const summaryEmbed = await client.supportRequests.generateSummaryEmbed(
				targetUser,
				interaction.guildId
			);

			await interaction.editReply({ embeds: [summaryEmbed] });

		} catch (error) {
			client.log.error('Error in checkresets command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while fetching the request history.',
			}).catch(() => {});
		}
	}
};
