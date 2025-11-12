const { SlashCommand } = require('@eartharoid/dbf');
const { MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = class LinkInvoiceSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'Link this ticket to an invoice for vouch rewards',
			dmPermission: false,
			name: 'linkinvoice',
			options: [
				{
					name: 'invoice_id',
					description: 'The invoice ID to link',
					required: true,
					type: 3, // STRING
				},
			],
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
					content: '❌ Only staff members can link invoices.',
				});
			}

			const invoiceId = interaction.options.getString('invoice_id');
			const claimsPath = path.join(__dirname, '../../../data/claims.json');

			// Load claims
			let claims = {};
			if (fs.existsSync(claimsPath)) {
				claims = JSON.parse(fs.readFileSync(claimsPath, 'utf8'));
			}

			// Check if invoice exists
			if (!claims[invoiceId]) {
				return await interaction.editReply({
					content: `❌ Invoice \`${invoiceId}\` not found in claims database.`,
				});
			}

			// Link ticket to invoice
			claims[invoiceId].ticketId = interaction.channel.id;
			claims[invoiceId].linkedAt = new Date().toISOString();

			// Save updated claims
			fs.writeFileSync(claimsPath, JSON.stringify(claims, null, 2));

			await interaction.editReply({
				content: `✅ Successfully linked this ticket to invoice \`${invoiceId}\`!\n\n**Product:** ${claims[invoiceId].product || 'Unknown'}\n**Amount:** $${claims[invoiceId].amount || 0}\n\nYou can now use \`/vouch\` to request customer feedback.`,
			});

			client.log.info(`Ticket ${interaction.channel.id} linked to invoice ${invoiceId} by ${interaction.user.tag}`);

		} catch (error) {
			client.log.error('Error in linkinvoice command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while linking the invoice.',
			}).catch(() => {});
		}
	}
};
