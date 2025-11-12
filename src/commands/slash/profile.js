const { SlashCommand } = require('@eartharoid/dbf');
const { ApplicationCommandOptionType, MessageFlags } = require('discord.js');

module.exports = class ProfileSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'View a customer\'s profile and purchase history',
			dmPermission: false,
			name: 'profile',
			options: [
				{
					description: 'The customer to view',
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

			// Generate profile embed
			const profileEmbed = await client.profileManager.generateProfileEmbed(
				interaction.guild,
				targetUser.id
			);

			if (!profileEmbed) {
				return await interaction.editReply({
					content: '❌ Could not load profile for this user.',
				});
			}

			await interaction.editReply({ embeds: [profileEmbed] });

		} catch (error) {
			client.log.error('Error in profile command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while fetching the profile.',
			}).catch(() => {});
		}
	}
};
