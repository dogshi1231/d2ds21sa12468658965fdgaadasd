const { Button } = require('@eartharoid/dbf');
const { MessageFlags } = require('discord.js');

module.exports = class UnclaimTicketButton extends Button {
	constructor(client, options) {
		super(client, {
			...options,
			id: 'unclaim_ticket',
		});
	}

	/**
	 * @param {*} id
	 * @param {import("discord.js").ButtonInteraction} interaction
	 */
	async run(id, interaction) {
		/** @type {import("client")} */
		const client = this.client;

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			// Get ticket data
			const ticket = await client.prisma.ticket.findUnique({
				where: { id: interaction.channel.id },
			});

			if (!ticket) {
				return await interaction.editReply({
					content: '❌ This is not a valid ticket channel.',
				});
			}

			// Get claim info
			const claim = client.ticketClaims.getClaim(interaction.channel.id);
			if (!claim) {
				return await interaction.editReply({
					content: '❌ This ticket is not currently claimed.',
				});
			}

			// Check if user is the claimer or staff
			const { isStaff } = require('../lib/users');
			const isClaimerOrStaff = interaction.user.id === claim.claimerId || await isStaff(interaction.guild, interaction.member.id);
			
			if (!isClaimerOrStaff) {
				return await interaction.editReply({
					content: '❌ Only the claimer or staff members can release this ticket.',
				});
			}

			// Release the ticket
			const result = await client.ticketClaims.unclaimTicket(
				interaction.channel,
				false,
				`Manually released by ${interaction.user.tag}`
			);

			if (!result.success) {
				return await interaction.editReply({
					content: `❌ ${result.message}`,
				});
			}

			await interaction.editReply({
				content: '✅ You have successfully released this ticket!',
			});

		} catch (error) {
			client.log.error('Error in unclaim ticket button:', error);
			await interaction.editReply({
				content: '❌ An error occurred while releasing the ticket.',
			}).catch(() => {});
		}
	}
};
