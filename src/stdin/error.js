const { StdinCommand } = require('@eartharoid/dbf');
const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = class ErrorCommand extends StdinCommand {
	constructor(client) {
		super(client, {
			aliases: ['errors', 'fixes'],
			description: 'Show common loader error solutions',
			id: 'error',
		});
	}

	/**
	 * @param {string} input
	 */
	async run(input) {
		const client = this.client;
		const channelId = input.trim();

		if (!channelId) {
			client.log.warn('Usage: .error <channelId>');
			return;
		}

		try {
			// Load error solutions
			const errorsPath = path.join(process.cwd(), 'custom', 'error-solutions.json');
			const errorSolutions = JSON.parse(fs.readFileSync(errorsPath, 'utf-8'));

			// Get the channel
			const channel = await client.channels.fetch(channelId);
			if (!channel) {
				client.log.error(`Channel ${channelId} not found`);
				return;
			}

			// Create select menu with all error options
			const selectMenu = new StringSelectMenuBuilder()
				.setCustomId(JSON.stringify({ action: 'error_select' }))
				.setPlaceholder('Select an error to view the solution')
				.addOptions([
					{
						label: 'VPN / Proxy Detected',
						description: 'Loader detected a VPN or proxy connection',
						value: 'vpn_proxy',
						emoji: '🛡️',
					},
					{
						label: 'Driver Initialization Failed',
						description: 'Driver failed to load properly',
						value: 'driver_failed',
						emoji: '🔧',
					},
					{
						label: 'Invalid Product Key',
						description: 'Your product key is not valid or expired',
						value: 'invalid_key',
						emoji: '🔑',
					},
					{
						label: 'No Response from Loader',
						description: 'Loader is frozen or not responding',
						value: 'no_response',
						emoji: '⏳',
					},
					{
						label: 'HWID Mismatch',
						description: 'Hardware ID does not match your key',
						value: 'hwid_mismatch',
						emoji: '💻',
					},
					{
						label: 'Windows Defender Issues',
						description: 'Defender is blocking the loader',
						value: 'defender_issues',
						emoji: '🛡️',
					},
					{
						label: 'Loader Closed Automatically',
						description: 'Loader closes immediately after opening',
						value: 'auto_close',
						emoji: '⚠️',
					},
				]);

			const row = new ActionRowBuilder().addComponents(selectMenu);

			// Create introduction embed
			const introEmbed = new EmbedBuilder()
				.setColor('#5865F2')
				.setTitle('🔧 Common Loader Errors')
				.setDescription(
					'Select an error from the dropdown below to view detailed fix instructions.\n\n' +
					'**Available Solutions:**\n' +
					'• VPN / Proxy Detected\n' +
					'• Driver Initialization Failed\n' +
					'• Invalid Product Key\n' +
					'• No Response from Loader\n' +
					'• HWID Mismatch\n' +
					'• Windows Defender Issues\n' +
					'• Loader Closed Automatically'
				)
				.setFooter({ text: 'Select an error to see the fix instructions' })
				.setTimestamp();

			await channel.send({
				embeds: [introEmbed],
				components: [row],
			});

			client.log.success(`Sent error solutions menu to channel ${channelId}`);

		} catch (error) {
			client.log.error('Error sending error solutions:', error);
		}
	}
};
