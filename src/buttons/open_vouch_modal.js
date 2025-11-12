const { Button } = require('@eartharoid/dbf');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = class OpenVouchModalButton extends Button {
	constructor(client, options) {
		super(client, {
			...options,
			id: 'open_vouch_modal',
		});
	}

	/**
	 * @param {*} id
	 * @param {import("discord.js").ButtonInteraction} interaction
	 */
	async run(id, interaction) {
		/** @type {import("client")} */
		const client = this.client;

		try {
			const { ticketId, staffId } = id;

			// Create the modal
			const modal = new ModalBuilder()
				.setCustomId(JSON.stringify({
					action: 'vouch_submit',
					ticketId,
					staffId,
				}))
				.setTitle('Rate Your Support Experience');

			// Rating input (1-5)
			const ratingInput = new TextInputBuilder()
				.setCustomId('rating')
				.setLabel('Rating (1-5 stars)')
				.setStyle(TextInputStyle.Short)
				.setPlaceholder('Enter a number from 1 to 5')
				.setMinLength(1)
				.setMaxLength(1)
				.setRequired(true);

			// Comment input (optional)
			const commentInput = new TextInputBuilder()
				.setCustomId('comment')
				.setLabel('Review (Optional)')
				.setStyle(TextInputStyle.Paragraph)
				.setPlaceholder('Share your experience with our support team...')
				.setMinLength(0)
				.setMaxLength(1000)
				.setRequired(false);

			modal.addComponents(
				new ActionRowBuilder().addComponents(ratingInput),
				new ActionRowBuilder().addComponents(commentInput)
			);

			await interaction.showModal(modal);

		} catch (error) {
			client.log.error('Error in open vouch modal button:', error);
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({
					content: '❌ An error occurred while opening the review form.',
					ephemeral: true,
				}).catch(() => {});
			}
		}
	}
};
