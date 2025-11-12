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
		const start = Date.now();

		try {
			client.log.debug.http(`claim_ticket: invoked by ${interaction.user?.id} in channel ${interaction.channel?.id} (message ${interaction.message?.id})`);
			await interaction.deferReply({ ephemeral: true });

			// fetch ticket from database
			let ticket;
			try {
				ticket = await client.prisma.ticket.findUnique({ where: { id: interaction.channel.id } });
				client.log.debug.http(`claim_ticket: db ticket result for ${interaction.channel.id}: ${ticket ? 'FOUND' : 'NOT_FOUND'}`);
			} catch (dbErr) {
				client.log.error('claim_ticket: error fetching ticket from prisma', dbErr);
				return await interaction.editReply({ content: '❌ Error fetching ticket data. Check logs.' });
			}

			if (!ticket) {
				client.log.warn(`claim_ticket: no ticket entry for channel ${interaction.channel.id}`);
				return await interaction.editReply({ content: '❌ This is not a valid ticket channel.' });
			}

			// staff check
			const { isStaff } = require('../lib/users');
			let staffOk = false;
			try {
				staffOk = await isStaff(interaction.guild, interaction.member.id);
				client.log.debug.http(`claim_ticket: isStaff(${interaction.member.id}) => ${staffOk}`);
			} catch (staffErr) {
				client.log.error('claim_ticket: error checking staff status', staffErr);
				return await interaction.editReply({ content: '❌ Error checking staff permissions. Check logs.' });
			}
			if (!staffOk) return await interaction.editReply({ content: '❌ Only staff members can claim tickets.' });

			// fetch customer
			let customer = null;
			try {
				customer = await interaction.guild.members.fetch(ticket.createdById);
				client.log.debug.http(`claim_ticket: fetched customer ${ticket.createdById}`);
			} catch (custErr) {
				client.log.warn(`claim_ticket: could not fetch customer ${ticket.createdById}`, custErr);
				return await interaction.editReply({ content: '❌ Could not find the ticket creator.' });
			}

			// attempt to claim
			let result;
			try {
				client.log.info(`claim_ticket: attempting to claim ticket ${interaction.channel.id} by ${interaction.user.id}`);
				result = await client.ticketClaims.claimTicket(interaction.channel, interaction.member, customer);
				client.log.info(`claim_ticket: claimTicket result for ${interaction.channel.id}: ${JSON.stringify(result)}`);
			} catch (claimErr) {
				client.log.error('claim_ticket: error in claimTicket', claimErr);
				return await interaction.editReply({ content: '❌ Error while claiming ticket. Check logs.' });
			}

			if (!result || !result.success) {
				client.log.warn(`claim_ticket: claimTicket failed: ${result?.message || 'no result'}`);
				return await interaction.editReply({ content: `❌ ${result?.message || 'Failed to claim ticket'}` });
			}

			// remove original message with button if possible
			try {
				if (interaction.message && interaction.message.deletable) {
					client.log.debug.http(`claim_ticket: deleting button message ${interaction.message.id}`);
					await interaction.message.delete();
				} else {
					client.log.debug.http('claim_ticket: interaction.message not deletable or not present');
				}
			} catch (delErr) {
				client.log.warn('claim_ticket: failed to delete interaction message', delErr);
			}

			// final reply
			try {
				await interaction.editReply({ content: '✅ You have successfully claimed this ticket!' });
				client.log.info(`claim_ticket: completed for ${interaction.channel.id} in ${Date.now() - start}ms`);
			} catch (editErr) {
				client.log.error('claim_ticket: failed to edit reply', editErr);
				// as a last resort, try a followUp
				try { await interaction.followUp({ content: '✅ You have successfully claimed this ticket!', ephemeral: true }); } catch (fupErr) { client.log.error('claim_ticket: followUp also failed', fupErr); }
			}

		} catch (error) {
			client.log.error('Error in claim ticket button (top-level):', error);
			try { await interaction.editReply({ content: '❌ An error occurred while claiming the ticket.' }); } catch {};
		}
	}
};
