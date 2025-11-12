const { Button } = require('@eartharoid/dbf');

module.exports = class HWIDApproveButton extends Button {
	constructor(client, options) {
		super(client, {
			...options,
			id: 'hwid_approve',
		});
	}

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	async run(interaction) {
		/** @type {import("client")} */
		const client = this.client;

		try {
			await interaction.deferReply({ ephemeral: true });

			if (!client.hwidManager) {
				return interaction.editReply({
					content: '❌ HWID reset system is not available.',
				});
			}

			// Extract request ID from custom ID
			const requestId = interaction.customId.split(':')[1];

			if (!requestId) {
				return interaction.editReply({
					content: '❌ Invalid request ID.',
				});
			}

			// Approve the request
			const result = await client.hwidManager.approveRequest(
				requestId,
				interaction.user.id,
				interaction.user.tag
			);

			if (!result.success) {
				if (result.error === 'not_found') {
					return interaction.editReply({
						content: '❌ Request not found.',
					});
				}

				if (result.error === 'already_reviewed') {
					return interaction.editReply({
						content: '❌ This request has already been reviewed.',
					});
				}

				return interaction.editReply({
					content: '❌ An error occurred while approving the request.',
				});
			}

			// Update the message
			await client.hwidManager.updateRequestMessage(result.request);

			// Success
			await interaction.editReply({
				content: `✅ **HWID Reset Approved**\n\n` +
					`Request \`${requestId}\` has been approved.\n` +
					`User <@${result.request.userId}> has been notified via DM.`,
			});

			client.log.info(`HWID reset request ${requestId} approved by ${interaction.user.tag}`);

		} catch (error) {
			client.log.error('Error in HWID approve button:', error);
			
			if (interaction.deferred) {
				await interaction.editReply({
					content: '❌ An error occurred while processing the approval.',
				}).catch(() => {});
			}
		}
	}
};
