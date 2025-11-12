const { SlashCommand } = require('@eartharoid/dbf');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = class AddClaimButtonSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'Add a claim button to this ticket',
			dmPermission: false,
			name: 'addclaimbutton',
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
			// Check if this is a ticket
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
					content: '❌ Only staff members can use this command.',
				});
			}

			// Check if already claimed
			if (client.ticketClaims.isClaimed(interaction.channel.id)) {
				return await interaction.editReply({
					content: '❌ This ticket is already claimed. Use the unclaim button first.',
				});
			}

			// Create claim button embed
			const claimEmbed = new EmbedBuilder()
				.setColor(0x5865F2)
				.setTitle('🎫 Ticket Available')
				.setDescription('This ticket is ready to be claimed by a staff member.\n\nClick the button below to claim this ticket.')
				.setFooter({ text: 'Claiming will lock the ticket to you and the customer only.' })
				.setTimestamp();

			const claimButton = new ButtonBuilder()
				.setCustomId(JSON.stringify({ action: 'claim_ticket' }))
				.setLabel('Claim Ticket')
				.setStyle(ButtonStyle.Primary)
				.setEmoji('✋');

			const row = new ActionRowBuilder().addComponents(claimButton);

			await interaction.channel.send({
				embeds: [claimEmbed],
				components: [row],
			});

			await interaction.editReply({
				content: '✅ Claim button added to this ticket!',
			});

		} catch (error) {
			client.log.error('Error adding claim button:', error);
			await interaction.editReply({
				content: '❌ An error occurred while adding the claim button.',
			}).catch(() => {});
		}
	}
};
