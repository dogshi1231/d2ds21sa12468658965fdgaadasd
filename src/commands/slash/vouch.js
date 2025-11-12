const { SlashCommand } = require('@eartharoid/dbf');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');

module.exports = class VouchSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'Request a vouch from the customer (use in claimed tickets only)',
			dmPermission: false,
			name: 'vouch',
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
			// Check if this is a ticket channel
			const ticket = await client.prisma.ticket.findUnique({
				where: { id: interaction.channel.id },
			});

			if (!ticket) {
				return await interaction.editReply({
					content: '❌ This command can only be used in ticket channels.',
				});
			}

			// Check if user is staff
			const { isStaff } = require('../../lib/users');
			if (!await isStaff(interaction.guild, interaction.member.id)) {
				return await interaction.editReply({
					content: '❌ Only staff members can request vouches.',
				});
			}

			// Check if ticket is claimed
			const claim = client.ticketClaims.getClaim(interaction.channel.id);
			if (!claim) {
				return await interaction.editReply({
					content: '❌ This ticket must be claimed before requesting a vouch.',
				});
			}

			// Verify the user requesting vouch is the claimer
			if (claim.claimerId !== interaction.user.id) {
				return await interaction.editReply({
					content: '❌ Only the staff member who claimed this ticket can request a vouch.',
				});
			}

			// Get customer
			const customer = await interaction.guild.members.fetch(ticket.createdById).catch(() => null);
			if (!customer) {
				return await interaction.editReply({
					content: '❌ Could not find the ticket creator.',
				});
			}

			// Create the modal for customer to fill
			const modal = new ModalBuilder()
				.setCustomId(JSON.stringify({
					action: 'vouch_modal',
					ticketId: interaction.channel.id,
					staffId: interaction.user.id,
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

			// Create button for review
			const { ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
			const button = new ButtonBuilder()
				.setCustomId(JSON.stringify({
					action: 'open_vouch_modal',
					ticketId: interaction.channel.id,
					staffId: interaction.user.id,
				}))
				.setLabel('📝 Leave a Review')
				.setStyle(ButtonStyle.Primary);

			const row = new ActionRowBuilder().addComponents(button);

			// Create embed explaining staff compensation
			const vouchEmbed = new EmbedBuilder()
				.setColor(0x5865F2)
				.setTitle('⭐ Rate Your Support Experience')
				.setDescription(
					`Hi ${customer}! ${interaction.member} has requested your feedback on your recent support.\n\n` +
					`**How This Works:**\n` +
					`💰 Your review helps our staff get paid!\n` +
					`📊 Staff earn a commission based on your satisfaction\n` +
					`⭐ Higher ratings = Better rewards for great service\n\n` +
					`**Your feedback matters!** Click the button below to submit your rating.`
				)
				.addFields(
					{ name: '📝 What We Ask', value: '• Rate 1-5 stars\n• Optional comment about your experience', inline: true },
					{ name: '⏱️ Time Limit', value: '15 minutes to submit', inline: true },
				)
				.setFooter({ text: 'Your honest feedback helps us improve our service!' })
				.setTimestamp();

			let dmSent = false;
			let ticketSent = false;

			// Try to send to DM first
			try {
				await customer.send({
					embeds: [vouchEmbed],
					components: [row],
				});
				dmSent = true;
				client.log.info(`Vouch request sent to ${customer.user.tag} via DM`);
			} catch (error) {
				client.log.warn(`Could not DM ${customer.user.tag}, will send in ticket channel`);
			}

			// Always send in ticket channel as well
			try {
				await interaction.channel.send({
					content: `${customer}`,
					embeds: [vouchEmbed],
					components: [row],
				});
				ticketSent = true;
				client.log.info(`Vouch request posted in ticket ${interaction.channel.id}`);
			} catch (error) {
				client.log.error('Could not send vouch request in ticket channel:', error);
			}

			// Confirm to staff
			if (dmSent && ticketSent) {
				await interaction.editReply({
					content: `✅ Vouch request sent to ${customer.user.tag} via **DM and ticket channel**!\n\n⏱️ They have **15 minutes** to respond.\n💡 If they don't respond, use \`/force ${interaction.channel.id}\` to claim your reward manually.`,
				});
			} else if (ticketSent) {
				await interaction.editReply({
					content: `✅ Vouch request sent to ${customer.user.tag} in the **ticket channel** (DMs disabled)!\n\n⏱️ They have **15 minutes** to respond.\n💡 If they don't respond, use \`/force ${interaction.channel.id}\` to claim your reward manually.`,
				});
			} else {
				await interaction.editReply({
					content: `❌ Could not send vouch request to ${customer.user.tag}.\n\nPlease try again or use \`/force ${interaction.channel.id}\` to claim your reward manually.`,
				});
				return;
			}

			// Set timeout for 15 minutes
			setTimeout(() => {
				client.log.info(`Vouch request for ticket ${interaction.channel.id} expired after 15 minutes`);
			}, 15 * 60 * 1000);

		} catch (error) {
			client.log.error('Error in vouch command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while requesting the vouch.',
			}).catch(() => {});
		}
	}
};
