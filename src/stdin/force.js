const { StdinCommand } = require('@eartharoid/dbf');
const fs = require('fs');
const path = require('path');

module.exports = class ForceCommand extends StdinCommand {
	constructor(client) {
		super(client, {
			aliases: ['forcevouch'],
			description: 'Force a vouch and give reward without customer confirmation (owner only)',
			id: 'force',
		});
	}

	/**
	 * @param {string} input
	 */
	async run(input, userId) {
		const client = this.client;
		
		// Check if user is a super admin (owner)
		if (!client.supers.includes(userId)) {
			client.log.warn(`User ${userId} attempted to use .force command without permission`);
			return;
		}

		const channelId = input.trim();

		if (!channelId) {
			client.log.warn('Usage: .force <channelId>');
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

			if (!amount) {
				client.log.warn('No invoice found for this ticket. Using default amount of $0.00');
				amount = 0;
			}

			// Process force vouch
			await client.vouchSystem.forceVouch({
				staffId,
				customerId,
				ticketId: channelId,
				invoiceId,
				product,
				amount,
				forcedBy: userId,
			});

			// Get staff user
			const staffUser = await client.users.fetch(staffId);
			const rewardAmount = amount > 0 ? `$${(amount * 0.05).toFixed(2)}` : '$0.00';

			client.log.success(
				`Force vouch processed by ${userId} for staff ${staffUser.tag}. ` +
				`Reward: ${rewardAmount}`
			);

		} catch (error) {
			client.log.error('Error in force command:', error);
		}
	}
};
