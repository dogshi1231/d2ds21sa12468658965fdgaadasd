const { Modal } = require('@eartharoid/dbf');
const { MessageFlags } = require('discord.js');

module.exports = class ReplacementRequestModal extends Modal {
	constructor(client, options) {
		super(client, {
			...options,
			id: 'replacement_request',
		});
	}

	/**
	 * @param {import("discord.js").ModalSubmitInteraction} interaction
	 */
	async run(interaction) {
		/** @type {import("client")} */
		const client = this.client;

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			const userId = interaction.user.id;
			const invoiceId = interaction.fields.getTextInputValue('invoice_id');
			const productKey = interaction.fields.getTextInputValue('product_key');
			const reason = interaction.fields.getTextInputValue('reason');

			// Get user's email from profile manager
			let userEmail = null;
			const customersData = client.profileManager.getCustomers();
			
			// Find email by matching userId in customer records
			for (const email in customersData) {
				if (customersData[email].userId === userId) {
					userEmail = email;
					break;
				}
			}

			if (!userEmail) {
				// Check legacy profiles.json
				const profilesPath = require('path').join(process.cwd(), 'data', 'profiles.json');
				const fs = require('fs');
				
				if (fs.existsSync(profilesPath)) {
					const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
					for (const email in profiles) {
						if (profiles[email] === userId) {
							userEmail = email;
							break;
						}
					}
				}
			}

			// Record the request
			const requestData = {
				invoiceId,
				productKey: productKey === 'N/A' ? null : productKey,
				reason,
				email: userEmail || 'Unknown',
			};

			await client.supportRequests.recordRequest(userId, 'replacement', requestData);

			// Log to staff channel
			await client.supportRequests.logToStaffChannel(
				interaction.user,
				'replacement',
				requestData,
				interaction.guildId
			);

			// Clear pending request
			client.supportRequests.clearPendingRequest(userId);

			// Send success message
			await interaction.editReply({
				content: '✅ **Replacement Request Submitted**\n\n' +
					'Your request has been submitted to our staff team. They will review it and provide a replacement shortly.\n\n' +
					`**Invoice ID:** ${invoiceId}\n` +
					`**Product Key:** ${productKey}\n` +
					`**Reason:** ${reason}\n\n` +
					'You will receive a response once your request has been processed.',
			});

		} catch (error) {
			client.log.error('Error processing replacement request:', error);
			
			// Clear pending request on error
			client.supportRequests.clearPendingRequest(interaction.user.id);

			await interaction.editReply({
				content: '❌ An error occurred while submitting your request. Please try again later.',
			}).catch(() => {});
		}
	}
};
