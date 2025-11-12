const { Button } = require('@eartharoid/dbf');
const { EmbedBuilder, MessageFlags } = require('discord.js');

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

			// Check if user is staff
			const { isStaff } = require('../lib/users');
			if (!await isStaff(interaction.guild, interaction.member.id)) {
				return await interaction.editReply({
					content: '❌ Only staff members can claim tickets.',
				});
			}

			// Get customer
			const customer = await interaction.guild.members.fetch(ticket.createdById).catch(() => null);
			if (!customer) {
				return await interaction.editReply({
					content: '❌ Could not find the ticket creator.',
				});
			}

				let responded = false;
				const respond = async (msg) => {
					if (!responded) {
						responded = true;
						await interaction.editReply(msg).catch(() => {});
					}
				};
				// Timeout after 10 seconds
				setTimeout(() => respond({ content: '\u274c Claim timed out. Please try again or contact an admin.' }), 10000);
				try {
					// Get ticket data
					const ticket = await client.prisma.ticket.findUnique({
						where: { id: interaction.channel.id },
					});
					if (!ticket) return respond({ content: '\u274c This is not a valid ticket channel.' });

					// Check if user is staff
					const { isStaff } = require('../lib/users');
					if (!await isStaff(interaction.guild, interaction.member.id)) {
						return respond({ content: '\u274c Only staff members can claim tickets.' });
					}

					// Get customer
					const customer = await interaction.guild.members.fetch(ticket.createdById).catch(() => null);
					if (!customer) return respond({ content: '\u274c Could not find the ticket creator.' });

					// Attempt to claim the ticket
					const result = await client.ticketClaims.claimTicket(
						interaction.channel,
						interaction.member,
						customer
					);
					if (!result.success) return respond({ content: `\u274c ${result.message}` });

					// Delete the original message with the claim button
					if (interaction.message.deletable) {
						await interaction.message.delete().catch(() => {});
					}
					return respond({ content: '\u2705 You have successfully claimed this ticket!' });
				} catch (error) {
					client.log.error('Error in claim ticket button:', error);
					return respond({ content: '\u274c An error occurred while claiming the ticket.' });
				}
