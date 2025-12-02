const { SlashCommand } = require('@eartharoid/dbf');
const { ApplicationCommandOptionType, MessageFlags } = require('discord.js');

module.exports = class SellhubSlashCommand extends SlashCommand {
  constructor(client, options) {
    const name = 'sellhub';
    super(client, {
      ...options,
      description: 'Sellhub actions: products list, invoices complete/refund',
      dmPermission: false,
      name,
      options: [
        {
          name: 'action',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: 'products_list', value: 'products_list' },
            { name: 'invoice_complete', value: 'invoice_complete' },
            { name: 'invoice_refund', value: 'invoice_refund' },
          ],
        },
        {
          name: 'id',
          type: ApplicationCommandOptionType.String,
          required: false,
          description: 'Invoice ID for complete/refund',
        },
      ],
    });
  }

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async run(interaction) {
    const client = this.client;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      // Staff-only guard
      const { isStaff } = require('../../lib/users');
      if (!await isStaff(interaction.guild, interaction.member.id)) {
        return interaction.editReply('❌ Only staff can use Sellhub commands.');
      }

      if (!client.sellhub) {
        return interaction.editReply('❌ Sellhub API is not configured.');
      }

      const action = interaction.options.getString('action', true);
      const id = interaction.options.getString('id', false) || '';

      switch (action) {
        case 'products_list': {
          const res = await client.sellhub.getProducts({ limit: 10 });
          const items = Array.isArray(res) ? res : (res?.data || []);
          if (!items.length) return interaction.editReply('No products found.');
          const lines = items.slice(0, 10).map(p => `• ${p.name || p.title || p.id} (ID: ${p.id || p._id || 'n/a'})`);
          return interaction.editReply(lines.join('\n'));
        }
        case 'invoice_complete': {
          if (!id) return interaction.editReply('Provide `id` for invoice_complete.');
          const result = await client.sellhub.completeInvoice(id);
          return interaction.editReply(`✅ Completed invoice ${id}.`);
        }
        case 'invoice_refund': {
          if (!id) return interaction.editReply('Provide `id` for invoice_refund.');
          const result = await client.sellhub.refundInvoice(id);
          return interaction.editReply(`✅ Refunded invoice ${id}.`);
        }
        default:
          return interaction.editReply('Unknown action.');
      }
    } catch (err) {
      client.log.error('sellhub error:', err);
      const msg = err?.data?.message || err.message || 'Failed.';
      return interaction.editReply('❌ ' + msg);
    }
  }
}
