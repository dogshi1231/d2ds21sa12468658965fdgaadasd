const { Listener } = require('@eartharoid/dbf');
const fs = require('fs');
const path = require('path');

module.exports = class OrderCreateListener extends Listener {
	constructor(client, options) {
		super(client, {
			...options,
			emitter: client,
			event: 'messageCreate',
		});
	}

	/**
	 * @param {import("discord.js").Message} message
	 */
	async run(message) {
		/** @type {import("client")} */
		const client = this.client;

		// Ignore DMs and bot messages
		if (!message.guild || message.author.bot) return;

		try {
			// Load config
			const configPath = path.join(process.cwd(), 'custom', 'claim-config.json');
			if (!fs.existsSync(configPath)) return;
			
			const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
			const ORDERS_CHANNEL_ID = config.ordersChannelId;

			// Only process messages in orders channel
			if (message.channel.id !== ORDERS_CHANNEL_ID) return;

			// Check if message has embeds (invoices)
			if (message.embeds.length === 0) return;

			const embed = message.embeds[0];
			const embedData = embed.toJSON();
			const embedString = JSON.stringify(embedData);

			// Extract email from embed
			let email = null;
			const embedDescription = embed.description || '';
			const embedTitle = embed.title || '';
			const embedText = embedDescription + ' ' + embedTitle;

			// Check fields for email
			if (embed.fields) {
				for (const field of embed.fields) {
					const fieldName = field.name.toLowerCase();
					const fieldValue = field.value;
					
					if (fieldName.includes('email') || fieldName.includes('e-mail')) {
						email = fieldValue.trim();
						break;
					}
				}
			}

			// Try to find email in description if not found in fields
			if (!email) {
				const emailMatch = embedText.match(/[\w.-]+@[\w.-]+\.\w+/);
				if (emailMatch) {
					email = emailMatch[0];
				}
			}

			if (!email) return;

			// Extract invoice ID
			let invoiceId = null;
			const invoiceMatch = embedString.match(/Invoice ID[:\s]*([a-f0-9-]{36})/i) || 
			                     embedString.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
			if (invoiceMatch) {
				invoiceId = invoiceMatch[1] || invoiceMatch[0];
			}

			if (!invoiceId) return;

			// Load profiles
			const profilesPath = path.join(process.cwd(), 'data', 'profiles.json');
			let profiles = {};
			if (fs.existsSync(profilesPath)) {
				profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
			}

			// Find user by email
			let linkedUserId = null;
			for (const [userId, profile] of Object.entries(profiles)) {
				if (profile.email && profile.email.toLowerCase() === email.toLowerCase()) {
					linkedUserId = userId;
					break;
				}
			}

			if (!linkedUserId) return; // No existing customer found

			client.log.info(`Auto-claim detected: Invoice ${invoiceId} matches email ${email} for user ${linkedUserId}`);

			// Extract product and price
			let product = null;
			let price = null;

			if (embed.fields) {
				for (const field of embed.fields) {
					const fieldName = field.name.toLowerCase();
					const fieldValue = field.value;
					
					if (fieldName.includes('product') || fieldName.includes('item')) {
						product = fieldValue.trim();
					}
					if (fieldName.includes('price') || fieldName.includes('amount') || fieldName.includes('total')) {
						const priceMatch = fieldValue.match(/[\d,.]+/);
						if (priceMatch) {
							price = parseFloat(priceMatch[0].replace(/,/g, '')) * 100; // Convert to cents
						}
					}
				}
			}

			// Try to extract product from description
			if (!product && embedDescription) {
				const lines = embedDescription.split('\n');
				if (lines.length > 0 && lines[0].trim()) {
					product = lines[0].trim();
				}
			}

			// Load claims
			const claimsPath = path.join(process.cwd(), 'data', 'claims.json');
			let claims = {};
			if (fs.existsSync(claimsPath)) {
				claims = JSON.parse(fs.readFileSync(claimsPath, 'utf8'));
			}

			// Check if already claimed
			if (claims[invoiceId]) return;

			// Auto-claim the invoice
			const timestamp = new Date().toISOString();
			claims[invoiceId] = {
				userId: linkedUserId,
				email: email,
				amount: price || 0,
				product: product || 'N/A',
				timestamp: timestamp,
				autoClaim: true, // Mark as auto-claimed
			};

			// Update profile
			if (!profiles[linkedUserId].claims) {
				profiles[linkedUserId].claims = [];
			}
			profiles[linkedUserId].claims.push({
				invoiceId: invoiceId,
				amount: price || 0,
				timestamp: timestamp,
			});

			// Save data
			fs.writeFileSync(claimsPath, JSON.stringify(claims, null, 2));
			fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));

			client.log.info(`✅ Auto-claimed invoice ${invoiceId} for user ${linkedUserId} (${email})`);

			// Assign buyer role
			try {
				const member = await message.guild.members.fetch(linkedUserId).catch(() => null);
				if (member) {
					const buyerRole = await message.guild.roles.fetch(config.buyerRoleId).catch(() => null);
					if (buyerRole && !member.roles.cache.has(config.buyerRoleId)) {
						await member.roles.add(buyerRole);
					}
				}
			} catch (error) {
				client.log.debug('Failed to assign buyer role:', error.message);
			}

			// Send notification to mod log
			try {
				const modChannel = await client.channels.fetch(config.modLogChannelId).catch(() => null);
				if (modChannel) {
					const { EmbedBuilder } = require('discord.js');
					const notificationEmbed = new EmbedBuilder()
						.setColor(0x5865F2)
						.setTitle('🤖 Auto-Claim')
						.setDescription(`Invoice automatically claimed for returning customer`)
						.addFields(
							{ name: 'User', value: `<@${linkedUserId}>`, inline: true },
							{ name: 'Email', value: email.replace(/(.{3})(.*)(@.*)/, '$1***$3'), inline: true },
							{ name: 'Invoice ID', value: invoiceId, inline: false },
							{ name: 'Product', value: product || 'N/A', inline: true },
							{ name: 'Amount', value: price ? `$${(price / 100).toFixed(2)}` : 'N/A', inline: true },
						)
						.setTimestamp();
					
					await modChannel.send({ embeds: [notificationEmbed] });
				}
			} catch (error) {
				client.log.debug('Failed to send mod log notification:', error.message);
			}

		} catch (error) {
			client.log.debug('Error in order auto-claim listener:', error);
		}
	}
};
