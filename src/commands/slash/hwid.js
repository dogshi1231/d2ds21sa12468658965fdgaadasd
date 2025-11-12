const { SlashCommand } = require('@eartharoid/dbf');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = class HwidSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'Request an HWID reset for your device',
			dmPermission: false,
			name: 'hwid',
		});
	}

	/**
	 * @param {import("discord.js").ChatInputCommandInteraction} interaction
	 */
	async run(interaction) {
		/** @type {import("client")} */
		const client = this.client;

		try {
			// Check if HWID manager is available
			if (!client.hwidManager) {
				return interaction.reply({
					content: '❌ HWID reset system is not available.',
					ephemeral: true,
				});
			}

			// Check cooldown
			const cooldownCheck = await client.hwidManager.checkCooldown(interaction.user.id);
			
			if (cooldownCheck.onCooldown) {
				const hoursRemaining = Math.ceil(cooldownCheck.timeRemaining / (1000 * 60 * 60));
				const minutesRemaining = Math.ceil((cooldownCheck.timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
				
				return interaction.reply({
					content: `⏱️ **Cooldown Active**\n\nYou can submit another HWID reset request in **${hoursRemaining}h ${minutesRemaining}m**.\n\nNext available: <t:${Math.floor(cooldownCheck.canRequestAt.getTime() / 1000)}:F>`,
					ephemeral: true,
				});
			}

			// Check pending requests limit
			const config = await client.hwidManager.loadConfig();
			const pendingCount = await client.hwidManager.getPendingRequestsCount(interaction.user.id);
			
			if (pendingCount >= config.maxPendingRequests) {
				return interaction.reply({
					content: `❌ **Maximum Pending Requests**\n\nYou already have ${pendingCount} pending request(s).\nPlease wait for them to be reviewed before submitting another.`,
					ephemeral: true,
				});
			}

			// Create modal
			const modal = new ModalBuilder()
				.setCustomId('hwid_request')
				.setTitle('HWID Reset Request');

			// Reason input
			const reasonInput = new TextInputBuilder()
				.setCustomId('reason')
				.setLabel('Reason for HWID Reset')
				.setStyle(TextInputStyle.Paragraph)
				.setPlaceholder('Explain why you need an HWID reset (e.g., new PC, hardware upgrade)')
				.setMinLength(10)
				.setMaxLength(500)
				.setRequired(true);

			// Device info input
			const deviceInput = new TextInputBuilder()
				.setCustomId('device_info')
				.setLabel('Device Information (Optional)')
				.setStyle(TextInputStyle.Paragraph)
				.setPlaceholder('Describe your device (e.g., Windows 11, RTX 3080, Ryzen 5900X)')
				.setMaxLength(300)
				.setRequired(false);

			modal.addComponents(
				new ActionRowBuilder().addComponents(reasonInput),
				new ActionRowBuilder().addComponents(deviceInput)
			);

			// Show modal
			await interaction.showModal(modal);

		} catch (error) {
			client.log.error('Error in /hwid command:', error);
			
			if (!interaction.replied && !interaction.deferred) {
				return interaction.reply({
					content: '❌ An error occurred while processing your request.',
					ephemeral: true,
				}).catch(() => {});
			}
		}
	}
};
