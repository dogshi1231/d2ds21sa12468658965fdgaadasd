const { SlashCommand } = require('@eartharoid/dbf');
const { MessageFlags } = require('discord.js');

module.exports = class ReleaseSlashCommand extends SlashCommand {
	constructor(client, options) {
		const name = 'release';
		super(client, {
			...options,
			description: client.i18n.getMessage(null, `commands.slash.${name}.description`),
			descriptionLocalizations: client.i18n.getAllMessages(`commands.slash.${name}.description`),
			dmPermission: false,
			name,
			nameLocalizations: client.i18n.getAllMessages(`commands.slash.${name}.name`),
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
			// Make sure we're in a ticket channel
			const ticket = await client.prisma.ticket.findUnique({
				where: { id: interaction.channel.id },
			});

			if (!ticket) {
				return interaction.editReply({
					content: '❌ This command can only be used in ticket channels.',
				});
			}

			// Optional: check staff permissions like in /addclaimbutton
			const { isStaff } = require('../../lib/users');
			if (!await isStaff(interaction.guild, interaction.member.id)) {
				return interaction.editReply({
					content: '❌ Only staff members can use this command.',
				});
			}

			// Use our custom TicketClaimManager to unclaim + unlock + re-add button
			const result = await client.ticketClaims.unclaimTicket(
				interaction.channel,
				false,
				`${interaction.member} manually released this ticket.`
			);

			if (!result.success) {
				return interaction.editReply({
					content: `❌ ${result.message}`,
				});
			}

			// Success – TicketClaimManager already sent the release embed + Claim button
			return interaction.editReply({
				content: '🔓 Ticket released. A new **Claim Ticket** button has been posted in this channel.',
			});
		} catch (error) {
			client.log.error('Release command error:', error);
			return interaction.editReply({
				content: '❌ An error occurred while releasing the ticket.',
			});
		}
	}
};
