const { StdinCommand } = require('@eartharoid/dbf');
const fs = require('fs');
const path = require('path');

module.exports = class VouchCommand extends StdinCommand {
	constructor(client) {
		super(client, {
			aliases: ['review', 'rate'],
			description: 'Send a vouch request to the customer in a ticket',
			id: 'vouch',
		});
	}

	/**
	 * @param {string} input
	 */
	async run(input) {
		const client = this.client;
		const channelId = input.trim();

		if (!channelId) {
			client.log.warn('Usage: .vouch <channelId>');
			return;
		}

		try {
			// Check if vouch system is initialized
			if (!client.vouchSystem) {
				client.log.error('Vouch system not initialized');
				return;
			}

			// Get the channel
			const channel = await client.channels.fetch(channelId);
			if (!channel) {
				client.log.error(`Channel ${channelId} not found`);
				return;
			}

			// Check if it's a ticket
			const ticket = await client.prisma.ticket.findUnique({
				where: { id: channelId },
				include: { 
					guild: true,
					category: true,
				},
			});

			if (!ticket) {
				client.log.error(`Channel ${channelId} is not a ticket`);
				return;
			}

			// Get customer ID from ticket
			const customerId = ticket.openerId || ticket.createdById;
			if (!customerId) {
				client.log.error('Could not find customer ID from ticket');
				return;
			}

			// Find who claimed this ticket
			let staffId = null;
			const ticketClaimsPath = path.join(process.cwd(), 'data', 'ticket_claims.json');
			
			if (fs.existsSync(ticketClaimsPath)) {
				const claims = JSON.parse(fs.readFileSync(ticketClaimsPath, 'utf-8'));
				const claim = claims[channelId];
				
				if (claim && claim.claimerId) {
					staffId = claim.claimerId;
				}
			}

			if (!staffId) {
				client.log.error('No staff member found for this ticket. Ticket must be claimed first.');
				return;
			}

			// Try to find invoice/order data
			let invoiceId = null;
			let product = null;
			let amount = null;

			// Check claims.json for invoice linked to this ticket
			const claimsPath = path.join(process.cwd(), 'data', 'claims.json');
			if (fs.existsSync(claimsPath)) {
				const claims = JSON.parse(fs.readFileSync(claimsPath, 'utf-8'));
				
				for (const [invId, claimData] of Object.entries(claims)) {
					if (claimData.ticketId === channelId) {
						invoiceId = invId;
						product = claimData.product;
						amount = claimData.amount;
						break;
					}
				}
			}

			// Get user objects
			const customerUser = await client.users.fetch(customerId);
			const staffUser = await client.users.fetch(staffId);

			// Send vouch request
			await client.vouchSystem.sendVouchRequest({
				customerId,
				customerUser,
				staffId,
				staffUser,
				ticketId: channelId,
				channelId,
				invoiceId,
				product,
				amount,
			});

			client.log.success(`Vouch request sent to ${customerUser.tag} in ticket ${channelId}`);

		} catch (error) {
			client.log.error('Error in vouch command:', error);
		}
	}
};
