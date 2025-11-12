const { StdinCommand } = require('@eartharoid/dbf');
const fs = require('fs');
const path = require('path');

module.exports = class AllFixCommand extends StdinCommand {
	constructor(client) {
		super(client, {
			aliases: ['fixes'],
			description: 'Forward all-in-one fix guide message',
			id: 'allfix',
		});
	}

	/**
	 * @param {string} input
	 */
	async run(input) {
		const client = this.client;
		const channelId = input.trim();

		if (!channelId) {
			client.log.warn('Usage: .allfix <channelId>');
			return;
		}

		try {
			// Load shortcuts config
			const configPath = path.join(process.cwd(), 'custom', 'support-shortcuts.json');
			const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

			const supportChannelId = config.supportChannelId;
			const messageId = config.shortcuts.allfix.messageId;

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
			client.log.success(`Forwarded all-fix guide to channel ${channelId}`);

		} catch (error) {
			client.log.error('Error forwarding message:', error);
		}
	}
};
