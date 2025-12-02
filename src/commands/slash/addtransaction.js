const { SlashCommand } = require('@eartharoid/dbf');
const { ApplicationCommandOptionType, MessageFlags } = require('discord.js');

module.exports = class AddTransactionSlashCommand extends SlashCommand {
  constructor(client, options) {
    const name = 'addtransaction';
    super(client, {
      ...options,
      description: 'Record a buy/sell transaction for analytics',
      dmPermission: false,
      name,
      options: [
        { name: 'side', description: 'Buy or sell', type: ApplicationCommandOptionType.String, required: true, choices: [
          { name: 'buy', value: 'buy' },
          { name: 'sell', value: 'sell' },
        ]},
        { name: 'price', description: 'Unit price in USD', type: ApplicationCommandOptionType.Number, required: true },
        { name: 'type', description: 'Item or symbol name', type: ApplicationCommandOptionType.String, required: true },
        { name: 'quantity', description: 'Units to buy/sell', type: ApplicationCommandOptionType.Integer, required: false },
        { name: 'mode', description: 'Matching mode (FIFO/LIFO)', type: ApplicationCommandOptionType.String, required: false, choices: [
          { name: 'FIFO', value: 'FIFO' },
          { name: 'LIFO', value: 'LIFO' },
        ]},
        { name: 'notes', description: 'Optional notes for this transaction', type: ApplicationCommandOptionType.String, required: false },
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
      if (!client.analytics || typeof client.analytics.addTransaction !== 'function') {
        return interaction.editReply('❌ Analytics transactions are not available.');
      }

      const side = interaction.options.getString('side', true);
      const price = interaction.options.getNumber('price', true);
      const type = interaction.options.getString('type', true);
      const quantity = interaction.options.getInteger('quantity', false) || 1;
      const mode = interaction.options.getString('mode', false) || undefined;
      const notes = interaction.options.getString('notes', false) || '';

      const summary = client.analytics.addTransaction(side, price, type, new Date(), notes, quantity, mode);

      const parts = [];
      parts.push(`✅ Recorded ${side} of ${quantity} × ${type} at $${price.toFixed(2)} (${summary.matchMode}).`);
      if (summary.side === 'sell') {
        parts.push(`Realized profit: $${summary.realizedProfitUsd.toFixed(2)}.`);
        if (summary.unmatchedSellQty > 0) {
          parts.push(`Unmatched sell quantity: ${summary.unmatchedSellQty}.`);
        }
        if (summary.matches.length) {
          parts.push(`Matches: ${summary.matches.map(m => `${m.qty}@$${(m.sellPriceCents/100).toFixed(2)} vs buy@$${(m.buyPriceCents/100).toFixed(2)}`).join(', ')}`);
        }
      }
      if (summary.remainingPositions && summary.remainingPositions.length) {
        parts.push(`Remaining positions: ${summary.remainingPositions.map(p => `${p.qtyRemaining}@$${(p.priceCents/100).toFixed(2)}`).join(', ')}`);
      }

      return interaction.editReply(parts.join('\n'));
    } catch (err) {
      client.log.error('addtransaction error:', err);
      return interaction.editReply('❌ Failed to record transaction.');
    }
  }
}
