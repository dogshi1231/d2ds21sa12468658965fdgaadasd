const { Listener } = require('@eartharoid/dbf');

module.exports = class HWIDDenyReasonModalListener extends Listener {
	constructor(client, options) {
		super(client, {
			...options,
			emitter: client,
			event: 'interactionCreate',
		});
	}

	/**
	 * @param {import('discord.js').Interaction} interaction
	 */
	async run(interaction) {
		if (!interaction.isModalSubmit()) return;
		if (!interaction.customId.startsWith('hwid_deny_reason:')) return;

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

			// Get denial reason from modal
			const denialReason = interaction.fields.getTextInputValue('denial_reason');

			// Deny the request
			const result = await client.hwidManager.denyRequest(
				requestId,
				interaction.user.id,
				interaction.user.tag,
				denialReason
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
					content: '❌ An error occurred while denying the request.',
				});
			}

			// Update the message
			await client.hwidManager.updateRequestMessage(result.request);

			// Success
			await interaction.editReply({
				content: `❌ **HWID Reset Denied**\n\n` +
					`Request \`${requestId}\` has been denied.\n` +
					`User <@${result.request.userId}> has been notified via DM.\n\n` +
					`**Denial Reason:** ${denialReason}`,
			});

			client.log.info(`HWID reset request ${requestId} denied by ${interaction.user.tag}`);

		} catch (error) {
			client.log.error('Error in HWID deny reason modal:', error);
			
			if (interaction.deferred) {
				await interaction.editReply({
					content: '❌ An error occurred while processing the denial.',
				}).catch(() => {});
			}
		}
	}
};
