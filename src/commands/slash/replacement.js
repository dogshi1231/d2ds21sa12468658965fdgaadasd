const { SlashCommand } = require('@eartharoid/dbf');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');

module.exports = class ReplacementSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'Request a product replacement',
			dmPermission: false,
			name: 'replacement',
		});
	}

	/**
	 * @param {import("discord.js").ChatInputCommandInteraction} interaction
	 */
	async run(interaction) {
		/** @type {import("client")} */
		const client = this.client;

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			// Check if user has pending request
			if (client.supportRequests.hasPendingRequest(interaction.user.id)) {
				return await interaction.editReply({
					content: '❌ You already have a pending request. Please complete or cancel your current request first.',
				});
			}

			// Check rate limit
			const rateLimit = client.supportRequests.checkRateLimit(interaction.user.id, 'replacement');
			
			if (!rateLimit.allowed) {
				const resetTime = Math.floor(rateLimit.resetDate.getTime() / 1000);
				return await interaction.editReply({
					content: `❌ **Replacement Limit Reached**\n\n` +
						`You've used all **${rateLimit.max}** replacement(s) in the last **${rateLimit.days} days**.\n\n` +
						`⏰ Your limit resets <t:${resetTime}:R> (<t:${resetTime}:F>)\n\n` +
						`If you need an exception, please contact staff for review.`,
				});
			}

			// Set pending request
			client.supportRequests.setPendingRequest(interaction.user.id, 'replacement');

			// Create modal
			const modal = new ModalBuilder()
				.setCustomId(JSON.stringify({ action: 'replacement_request' }))
				.setTitle('Replacement Request');

			// Invoice ID input
			const invoiceInput = new TextInputBuilder()
				.setCustomId('invoice_id')
				.setLabel('Invoice ID')
				.setStyle(TextInputStyle.Short)
				.setPlaceholder('Enter your invoice ID (e.g., 69aa4e44-8daf-478c...)')
				.setMinLength(5)
				.setMaxLength(100)
				.setRequired(true);

			// Product Key input
			const keyInput = new TextInputBuilder()
				.setCustomId('product_key')
				.setLabel('Product Key (if applicable)')
				.setStyle(TextInputStyle.Short)
				.setPlaceholder('Enter your product key or type N/A')
				.setMinLength(2)
				.setMaxLength(100)
				.setRequired(true);

			// Reason input
			const reasonInput = new TextInputBuilder()
				.setCustomId('reason')
				.setLabel('Reason for Replacement')
				.setStyle(TextInputStyle.Paragraph)
				.setPlaceholder('Please explain why you need a replacement (e.g., key not working, wrong product, etc.)...')
				.setMinLength(10)
				.setMaxLength(500)
				.setRequired(true);

			modal.addComponents(
				new ActionRowBuilder().addComponents(invoiceInput),
				new ActionRowBuilder().addComponents(keyInput),
				new ActionRowBuilder().addComponents(reasonInput)
			);

			// Show modal
			await interaction.showModal(modal);

			// Note: Modal submission will be handled by the modal handler
			// We don't editReply here because showModal() closes the interaction

		} catch (error) {
			client.log.error('Error in replacement command:', error);
			
			// Clear pending request on error
			client.supportRequests.clearPendingRequest(interaction.user.id);
			
			await interaction.editReply({
				content: '❌ An error occurred while processing your request.',
			}).catch(() => {});
		}
	}
};
