const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

async function logSellhubEvent(client, title, user, details = {}, isError = false) {
  try {
    // Load config
    const configPath = path.join(__dirname, '../../custom/server-config.json');
    let LOG_CHANNEL_ID = '1423174433857605763'; // fallback
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        LOG_CHANNEL_ID = config.channels.sellhubLogChannelId || LOG_CHANNEL_ID;
      } catch (e) {
        // use fallback
      }
    }

    const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isTextBased()) return false;

    const embed = new EmbedBuilder()
      .setColor(isError ? 0xE74C3C : 0x2ECC71)
      .setTitle(`[Sellhub] ${title}`)
      .addFields(
        { name: 'User', value: `${user} (${user?.id || 'unknown'})` },
        { name: 'Timestamp', value: new Date().toISOString() },
      )
      .setTimestamp();

    const payload = details?.payload ? JSON.stringify(details.payload, null, 2).slice(0, 1900) : null;
    const info = details?.info ? JSON.stringify(details.info, null, 2).slice(0, 1900) : null;
    if (details.id) embed.addFields({ name: 'ID', value: String(details.id) });
    if (payload) embed.addFields({ name: 'Payload', value: '```json\n' + payload + '\n```' });
    if (info) embed.addFields({ name: 'Info', value: '```json\n' + info + '\n```' });
    if (details.error) embed.addFields({ name: 'Error', value: String(details.error).slice(0, 1900) });

    await channel.send({ embeds: [embed] });
    return true;
  } catch (e) {
    // Silent: avoid recursive logging
    return false;
  }
}

module.exports = { logSellhubEvent };
