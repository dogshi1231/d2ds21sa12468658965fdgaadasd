// /src/buttons/claim_ticket.js
const { Button } = require('@eartharoid/dbf');
const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = class ClaimTicketButton extends Button {
  constructor(client, options) {
    super(client, { ...options, id: 'claim_ticket' });

    // simple in-process lock to prevent double-claims/races
    if (!client._claimLocks) client._claimLocks = new Set();
  }

  /**
   * @param {*} id
   * @param {import('discord.js').ButtonInteraction} interaction
   */
  async run(id, interaction) {
    const client = this.client;

    // Always acknowledge the interaction quickly (prevents “thinking…” hang)
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    } catch { /* ignored – already deferred/replied by Discord in rare races */ }

    // Safety helper so we never exit without a response
    const safeReply = async (payload) => {
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply(payload);
        } else {
          await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
        }
      } catch { /* noop */ }
    };

    try {
      const channelId = interaction.channel?.id;
      if (!channelId) return safeReply({ content: '❌ Could not resolve this channel.' });

      // prevent two staff claiming at once
      if (client._claimLocks.has(channelId)) {
        return safeReply({ content: '⌛ Someone else is currently claiming this ticket. Try again in a moment.' });
      }
      client._claimLocks.add(channelId);

      // fetch ticket row
      const ticket = await client.prisma.ticket.findUnique({ where: { id: channelId } });
      if (!ticket) {
        client._claimLocks.delete(channelId);
        return safeReply({ content: '❌ This is not a valid ticket channel.' });
      }

      // staff check
      const { isStaff } = require('../lib/users');
      const staffOk = await isStaff(interaction.guild, interaction.member.id);
      if (!staffOk) {
        client._claimLocks.delete(channelId);
        return safeReply({ content: '❌ Only staff members can claim tickets.' });
      }

      // customer (ticket opener)
      const customer = await interaction.guild.members.fetch(ticket.createdById).catch(() => null);
      if (!customer) {
        client._claimLocks.delete(channelId);
        return safeReply({ content: '❌ Could not find the ticket creator.' });
      }

      // call your central claim logic (already handles perms/locking/etc.)
      const result = await client.ticketClaims.claimTicket(interaction.channel, interaction.member, customer);

      if (!result?.success) {
        client.log.warn(`[CLAIM FAIL] ${result?.message || 'Unknown error'}`);
        client._claimLocks.delete(channelId);
        return safeReply({ content: `❌ ${result?.message || 'Failed to claim this ticket.'}` });
      }

      // Try to remove the original button message; if we can’t, disable it
      try {
        if (interaction.message?.deletable) {
          await interaction.message.delete();
        } else if (interaction.message?.editable) {
          const disabledRow = interaction.message.components?.map(row => {
            const r = ActionRowBuilder.from(row);
            r.components = r.components.map(c =>
              ButtonBuilder.from(c).setDisabled(true)
            );
            return r;
          }) || [];
          await interaction.message.edit({ components: disabledRow });
        }
          client.log.info(`[CLAIM] start channel=${interaction.channel.id} staff=${interaction.user.id}`);
          const claimPromise = client.ticketClaims.claimTicket(
            interaction.channel,
            interaction.member,
            customer
          );
          const result = await Promise.race([
            claimPromise,
            new Promise(resolve =>
              setTimeout(() => resolve({ success: false, message: '⏱️ Claim operation timed out.' }), 7000)
            )
          ]);
          client.log.info(`[CLAIM] end success=${!!result?.success} msg="${result?.message || ''}"`);
      } catch (err) {
        client.log.warn('Could not remove/disable claim button:', err);
      }

      client._claimLocks.delete(channelId);
      return safeReply({ content: '✅ You have successfully claimed this ticket!' });

    } catch (err) {
      client.log.error('Error in claim_ticket button:', err);
      try { this.client._claimLocks?.delete(interaction.channel?.id); } catch {}
      return safeReply({ content: '❌ An unexpected error occurred while claiming the ticket.' });
    }
  }
};
