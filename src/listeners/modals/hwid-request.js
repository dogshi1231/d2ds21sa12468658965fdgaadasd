const { Listener } = require('@eartharoid/dbf');

module.exports = class HWIDRequestModalListener extends Listener {
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
		if (interaction.customId !== 'hwid_request') return;

		/** @type {import("client")} */
		const client = this.client;

		try {
			await interaction.deferReply({ ephemeral: true });

			if (!client.hwidManager) {
				return interaction.editReply({
					content: '❌ HWID reset system is not available.',
				});
			}

			// Get modal inputs
			const reason = interaction.fields.getTextInputValue('reason');
			const deviceInfo = interaction.fields.getTextInputValue('device_info') || 'Not provided';

			// Create request
			const result = await client.hwidManager.createRequest(
				interaction.user.id,
				interaction.user.tag,
				reason,
				deviceInfo,
				interaction.guildId
			);

			if (!result.success) {
				if (result.error === 'cooldown') {
					const hoursRemaining = Math.ceil(result.timeRemaining / (1000 * 60 * 60));
					const minutesRemaining = Math.ceil((result.timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
					
					return interaction.editReply({
						content: `⏱️ **Cooldown Active**\n\nYou can submit another HWID reset request in **${hoursRemaining}h ${minutesRemaining}m**.\n\nNext available: <t:${Math.floor(result.canRequestAt.getTime() / 1000)}:F>`,
					});
				}

				if (result.error === 'max_pending') {
					return interaction.editReply({
						content: `❌ **Maximum Pending Requests**\n\nYou already have ${result.maxPending} pending request(s).\nPlease wait for them to be reviewed before submitting another.`,
					});
				}

				return interaction.editReply({
					content: '❌ An error occurred while submitting your request. Please try again later.',
				});
			}

			// Send to review channel
			const message = await client.hwidManager.sendToReviewChannel(result.request);

			if (!message) {
				return interaction.editReply({
					content: '⚠️ Your request was created but could not be sent to the review channel. Please contact staff.',
				});
			}

			// Success
			await interaction.editReply({
				content: `✅ **HWID Reset Request Submitted**\n\n` +
					`Your request has been sent to staff for review.\n` +
					`**Request ID:** \`${result.request.id}\`\n\n` +
					`📝 **Your Reason:** ${reason}\n` +
					`💻 **Device Info:** ${deviceInfo}\n\n` +
					`You will receive a DM when your request is reviewed.\n` +
					`⏰ Next request available: <t:${Math.floor((Date.now() + (24 * 60 * 60 * 1000)) / 1000)}:R>`,
			});

			client.log.info(`HWID reset request created: ${result.request.id} by ${interaction.user.tag}`);

		} catch (error) {
			client.log.error('Error in HWID request modal:', error);
			
			if (interaction.deferred) {
				await interaction.editReply({
					content: '❌ An error occurred while processing your request.',
				}).catch(() => {});
			}
		}
	}
};
