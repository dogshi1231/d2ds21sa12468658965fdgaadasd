const { SlashCommand } = require('@eartharoid/dbf');
const { MessageFlags } = require('discord.js');

module.exports = class ForceVouchSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'Force vouch reward without customer input (owner only)',
			dmPermission: false,
			name: 'force',
			options: [
				{
					name: 'ticket_id',
					description: 'The ticket channel ID',
					required: true,
					type: 3, // STRING
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
			const ticketId = interaction.options.getString('ticket_id');

			// Get claim info
			const claim = client.ticketClaims.getClaim(ticketId);
			if (!claim) {
				return await interaction.editReply({
					content: '❌ Could not find claim information for this ticket.',
				});
			}

			// Force vouch using rewards manager
			const result = await client.rewards.forceVouch(ticketId, claim.claimerId, interaction.user.id);

			if (!result.success) {
				return await interaction.editReply({
					content: `❌ ${result.message}`,
				});
			}

			const staff = await interaction.guild.members.fetch(claim.claimerId).catch(() => null);
			const staffTag = staff ? staff.user.tag : claim.claimerId;

			await interaction.editReply({
				content: `✅ Force vouch processed!\n\n**Staff:** ${staffTag}\n**Product:** ${result.product}\n**Reward:** $${(result.rewardAmount / 100).toFixed(2)}`,
			});

		} catch (error) {
			client.log.error('Error in force vouch command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while processing the force vouch.',
			}).catch(() => {});
		}
	}
};
