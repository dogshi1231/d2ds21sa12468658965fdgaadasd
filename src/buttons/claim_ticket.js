const { Button } = require('@eartharoid/dbf');
const { EmbedBuilder } = require('discord.js');

module.exports = class ClaimTicketButton extends Button {
	constructor(client, options) {
		super(client, {
			...options,
			id: 'claim_ticket',
		});
	}

	/**
	 * @param {*} id
	 * @param {import("discord.js").ButtonInteraction} interaction
	 */
	async run(id, interaction) {
		const client = this.client;

		try {
			await interaction.deferReply({ ephemeral: true });

			const ticket = await client.prisma.ticket.findUnique({
				where: { id: interaction.channel.id },
			});

			if (!ticket) {
				return await interaction.editReply({ content: '❌ This is not a valid ticket channel.' });
			}

			const { isStaff } = require('../lib/users');
			if (!await isStaff(interaction.guild, interaction.member.id)) {
				return await interaction.editReply({ content: '❌ Only staff members can claim tickets.' });
			}

			const customer = await interaction.guild.members.fetch(ticket.createdById).catch(() => null);
			if (!customer) {
				return await interaction.editReply({ content: '❌ Could not find the ticket creator.' });
			}

			const result = await client.ticketClaims.claimTicket(
				interaction.channel,
				interaction.member,
				customer
			);

			if (!result.success) {
				return await interaction.editReply({ content: `❌ ${result.message}` });
			}

			if (interaction.message.deletable) {
				await interaction.message.delete().catch(() => {});
			}

			await interaction.editReply({ content: '✅ You have successfully claimed this ticket!' });

		} catch (error) {
			client.log.error('Error in claim ticket button:', error);
			return await interaction.editReply({ content: '❌ An error occurred while claiming the ticket.' });
		}
	}
};
