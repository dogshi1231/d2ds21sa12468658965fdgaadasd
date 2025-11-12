const { Button } = require('@eartharoid/dbf');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = class HWIDDenyButton extends Button {
	constructor(client, options) {
		super(client, {
			...options,
			id: 'hwid_deny',
		});
	}

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	async run(interaction) {
		/** @type {import("client")} */
		const client = this.client;

		try {
			if (!client.hwidManager) {
				return interaction.reply({
					content: '❌ HWID reset system is not available.',
					ephemeral: true,
				});
			}

			// Extract request ID from custom ID
			const requestId = interaction.customId.split(':')[1];

			if (!requestId) {
				return interaction.reply({
					content: '❌ Invalid request ID.',
					ephemeral: true,
				});
			}

			// Show modal for denial reason
			const modal = new ModalBuilder()
				.setCustomId(`hwid_deny_reason:${requestId}`)
				.setTitle('Deny HWID Reset Request');

			const reasonInput = new TextInputBuilder()
				.setCustomId('denial_reason')
				.setLabel('Reason for Denial')
				.setStyle(TextInputStyle.Paragraph)
				.setPlaceholder('Explain why this request is being denied...')
				.setMinLength(10)
				.setMaxLength(500)
				.setRequired(true);

			modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

			await interaction.showModal(modal);

		} catch (error) {
			client.log.error('Error in HWID deny button:', error);
			
			if (!interaction.replied) {
				await interaction.reply({
					content: '❌ An error occurred while processing the denial.',
					ephemeral: true,
				}).catch(() => {});
			}
		}
	}
};
