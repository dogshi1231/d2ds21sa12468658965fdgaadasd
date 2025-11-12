const { SlashCommand } = require('@eartharoid/dbf');
const { ApplicationCommandOptionType, MessageFlags, EmbedBuilder } = require('discord.js');

module.exports = class SupportActionSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'Log a support action for a customer (HWID reset, replacement, etc.)',
			dmPermission: false,
			name: 'supportaction',
			options: [
				{
					description: 'The customer receiving support',
					name: 'user',
					required: true,
					type: ApplicationCommandOptionType.User,
				},
				{
					description: 'Type of support action',
					name: 'type',
					required: true,
					type: ApplicationCommandOptionType.String,
					choices: [
						{
							name: 'HWID Reset',
							value: 'hwid_reset',
						},
						{
							name: 'Replacement',
							value: 'replacement',
						},
						{
							name: 'Key Swap',
							value: 'key_swap',
						},
					],
				},
				{
					description: 'Optional notes about this action',
					name: 'notes',
					required: false,
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
			const actionType = interaction.options.getString('type');
			const notes = interaction.options.getString('notes') || 'None';

			// Record the action in profile
			switch (actionType) {
			case 'hwid_reset':
				client.profileManager.recordHwidReset(targetUser.id);
				break;
			case 'replacement':
				client.profileManager.recordReplacement(targetUser.id);
				break;
			case 'key_swap':
				client.profileManager.recordKeySwap(targetUser.id);
				break;
			}

			const actionNames = {
				hwid_reset: 'HWID Reset',
				replacement: 'Replacement',
				key_swap: 'Key Swap',
			};

			const successEmbed = new EmbedBuilder()
				.setColor(0x00ff00)
				.setTitle('✅ Support Action Logged')
				.addFields(
					{ name: 'Customer', value: `${targetUser}`, inline: true },
					{ name: 'Action', value: actionNames[actionType], inline: true },
					{ name: 'Staff Member', value: `${interaction.user}`, inline: true },
					{ name: 'Notes', value: notes, inline: false },
				)
				.setTimestamp();

			await interaction.editReply({ embeds: [successEmbed] });

			client.log.info(`${interaction.user.tag} logged ${actionNames[actionType]} for ${targetUser.tag}`);

		} catch (error) {
			client.log.error('Error in supportaction command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while logging the support action.',
			}).catch(() => {});
		}
	}
};
