const { StdinCommand } = require('@eartharoid/dbf');
const fs = require('fs');
const path = require('path');

module.exports = class VpnCommand extends StdinCommand {
	constructor(client) {
		super(client, {
			aliases: ['proxy'],
			description: 'Forward VPN/Proxy troubleshooting message',
			id: 'vpn',
		});
	}

	/**
	 * @param {string} input
	 */
	async run(input) {
		const client = this.client;
		const channelId = input.trim();

		if (!channelId) {
			client.log.warn('Usage: .vpn <channelId>');
			return;
		}

		try {
			// Load shortcuts config
			const configPath = path.join(process.cwd(), 'custom', 'support-shortcuts.json');
			const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

			const supportChannelId = config.supportChannelId;
			const messageId = config.shortcuts.vpn.messageId;

			// Get the support channel and fetch the message
			const supportChannel = await client.channels.fetch(supportChannelId);
			if (!supportChannel) {
				client.log.error(`Support channel ${supportChannelId} not found`);
				return;
			}

			const message = await supportChannel.messages.fetch(messageId);
			if (!message) {
				client.log.error(`Message ${messageId} not found in support channel`);
				return;
			}

			// Get the target channel
			const targetChannel = await client.channels.fetch(channelId);
			if (!targetChannel) {
				client.log.error(`Target channel ${channelId} not found`);
				return;
			}

			// Resend the message
			const payload = {
				content: message.content || undefined,
				embeds: message.embeds.length > 0 ? message.embeds : undefined,
				files: message.attachments.size > 0 ? Array.from(message.attachments.values()) : undefined,
			};

			await targetChannel.send(payload);
			client.log.success(`Forwarded VPN troubleshooting to channel ${channelId}`);

		} catch (error) {
			client.log.error('Error forwarding message:', error);
		}
	}
};
