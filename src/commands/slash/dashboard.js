const { SlashCommand } = require('@eartharoid/dbf');
const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = class DashboardSlashCommand extends SlashCommand {
  constructor(client, options) {
    const name = 'dashboard';
    super(client, {
      ...options,
      description: 'Show analytics dashboard summary',
      dmPermission: false,
      name,
    });
  }

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async run(interaction) {
    const client = this.client;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      if (!client.analytics || typeof client.analytics.getDashboardData !== 'function') {
        return interaction.editReply('❌ Analytics dashboard is not available.');
      }

      const data = await client.analytics.getDashboardData();
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('📊 Dashboard Summary')
        .setTimestamp()
        .addFields(
          { name: '📦 Orders Today', value: String(data.ordersToday), inline: true },
          { name: '💰 Revenue Today', value: `$${(data.revenueToday/100).toFixed(2)}`, inline: true },
          { name: '🎤 VC Joins Today', value: String(data.engagement.vcJoinsToday), inline: true },
        );

      if (data.topProduct) {
        embed.addFields({ name: '🏆 Top Product', value: `${data.topProduct.name} (${data.topProduct.count})`, inline: false });
      }

      const ratio = data.engagement.vcToPurchaseRatio;
      embed.addFields(
        { name: '🎧 VC-to-Purchase Ratio', value: `${ratio}%`, inline: true },
        { name: '💬 Messages Today', value: String(data.engagement.totalMessagesToday), inline: true },
      );

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      client.log.error('dashboard error:', err);
      return interaction.editReply('❌ Failed to build dashboard.');
    }
  }
}
