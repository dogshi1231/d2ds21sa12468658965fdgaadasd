const { Modal } = require('@eartharoid/dbf');
const { MessageFlags } = require('discord.js');

module.exports = class VouchSubmitModal extends Modal {
	constructor(client, options) {
		super(client, {
			...options,
			id: 'vouch_submit',
		});
	}

	/**
	 * @param {*} id
	 * @param {import("discord.js").ModalSubmitInteraction} interaction
	 */
	async run(id, interaction) {
		/** @type {import("client")} */
		const client = this.client;

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			const { ticketId, staffId } = id;

			// Get rating and comment from modal
			const ratingStr = interaction.fields.getTextInputValue('rating');
			const comment = interaction.fields.getTextInputValue('comment') || '';

			client.log.info(`Vouch submission received: Rating=${ratingStr}, Comment="${comment}", TicketId=${ticketId}, StaffId=${staffId}`);

			// Validate rating
			const rating = parseInt(ratingStr);
			if (isNaN(rating) || rating < 1 || rating > 5) {
				client.log.warn(`Invalid rating submitted: ${ratingStr}`);
				return await interaction.editReply({
					content: '❌ Invalid rating. Please enter a number between 1 and 5.',
				});
			}

			// Get ticket channel
			const ticketChannel = await client.channels.fetch(ticketId).catch(() => null);
			if (!ticketChannel) {
				return await interaction.editReply({
					content: '❌ Could not find the ticket channel.',
				});
			}

			// Get staff member
			const staff = await interaction.guild.members.fetch(staffId).catch(() => null);
			if (!staff) {
				return await interaction.editReply({
					content: '❌ Could not find the staff member.',
				});
			}

			// Process the vouch
			client.log.info(`Processing vouch: ${rating}⭐ from ${interaction.member.user.tag} for ${staff.user.tag}`);
			
			const result = await client.rewards.processVouch(
				interaction,
				rating,
				comment,
				ticketChannel,
				interaction.member,
				staff
			);

			if (!result.success) {
				client.log.error(`Vouch processing failed: ${result.error}`);
				return await interaction.editReply({
					content: `❌ Error processing vouch: ${result.error}`,
				});
			}

			client.log.info(`Vouch processing completed successfully. Reward: $${(result.rewardAmount / 100).toFixed(2)}`);

			// Success message is sent by processVouch

		} catch (error) {
			client.log.error('Error in vouch submit modal:', error);
			await interaction.editReply({
				content: '❌ An error occurred while submitting your review.',
			}).catch(() => {});
		}
	}
};
