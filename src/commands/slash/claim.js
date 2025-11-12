const { SlashCommand } = require('@eartharoid/dbf');
const { ApplicationCommandOptionType, MessageFlags, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = class ClaimSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'Claim an invoice by providing the invoice ID',
			dmPermission: false,
			name: 'claim',
			options: [
				{
					description: 'The invoice ID to claim',
					name: 'invoiceid',
					required: true,
					type: ApplicationCommandOptionType.String,
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
			const invoiceId = interaction.options.getString('invoiceid', true);
			
			// ===== CONFIGURATION =====
			const configPath = path.join(__dirname, '../../../custom/claim-config.json');
			let config = {
				ordersChannelId: '1234567890123456789',
				buyerRoleId: '1234567890123456789',
				modLogChannelId: '1234567890123456789',
				messageSearchLimit: 25,
			};
			
			if (fs.existsSync(configPath)) {
				config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
			}
			
			const ORDERS_CHANNEL_ID = config.ordersChannelId;
			const BUYER_ROLE_ID = config.buyerRoleId;
			const MOD_LOG_CHANNEL_ID = config.modLogChannelId;
			const MESSAGE_SEARCH_LIMIT = config.messageSearchLimit || 25;
			
			// ===== LOAD DATA FILES =====
			const claimsPath = path.join(__dirname, '../../../data/claims.json');
			const profilesPath = path.join(__dirname, '../../../data/profiles.json');
			
			let claims = {};
			let profiles = {};
			
			if (fs.existsSync(claimsPath)) {
				claims = JSON.parse(fs.readFileSync(claimsPath, 'utf8'));
			}
			
			if (fs.existsSync(profilesPath)) {
				profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
			}
			
			// ===== CHECK IF ALREADY CLAIMED =====
			if (claims[invoiceId]) {
				return await interaction.editReply({
					content: `❌ This invoice has already been claimed by <@${claims[invoiceId].userId}> on ${new Date(claims[invoiceId].timestamp).toLocaleString()}.`,
				});
			}
			
			// ===== SEARCH FOR INVOICE IN #orders_raw =====
			const ordersChannel = await interaction.guild.channels.fetch(ORDERS_CHANNEL_ID);
			
			if (!ordersChannel || !ordersChannel.isTextBased()) {
				return await interaction.editReply({
					content: '❌ Orders channel not found or is not a text channel.',
				});
			}
			
			// Fetch last N messages (configured in claim-config.json)
			const messages = await ordersChannel.messages.fetch({ limit: MESSAGE_SEARCH_LIMIT });
			
			let invoiceEmbed = null;
			let invoiceMessage = null;
			
			// Search through messages for the invoice ID
			for (const message of messages.values()) {
				if (message.embeds.length > 0) {
					for (const embed of message.embeds) {
						const embedData = embed.toJSON();
						const embedString = JSON.stringify(embedData);
						
						// Check if this embed contains the invoice ID
						if (embedString.includes(invoiceId)) {
							invoiceEmbed = embed;
							invoiceMessage = message;
							break;
						}
					}
				}
				if (invoiceEmbed) break;
			}
			
			if (!invoiceEmbed) {
				return await interaction.editReply({
					content: `❌ Invoice ID \`${invoiceId}\` not found in the last 25 messages of <#${ORDERS_CHANNEL_ID}>.`,
				});
			}
			
			// ===== EXTRACT DATA FROM EMBED =====
			let email = null;
			let product = null;
			let price = null;
			
			// Try to extract from embed fields
			if (invoiceEmbed.fields) {
				for (const field of invoiceEmbed.fields) {
					const fieldName = field.name.toLowerCase();
					const fieldValue = field.value;
					
					if (fieldName.includes('email') || fieldName.includes('e-mail')) {
						email = fieldValue.trim();
					}
					if (fieldName.includes('product') || fieldName.includes('item')) {
						product = fieldValue.trim();
					}
					if (fieldName.includes('price') || fieldName.includes('amount') || fieldName.includes('total')) {
						// Extract numeric price (remove currency symbols, etc.)
						const priceMatch = fieldValue.match(/[\d,.]+/);
						if (priceMatch) {
							price = parseFloat(priceMatch[0].replace(/,/g, '')) * 100; // Convert to cents
						}
					}
				}
			}
			
			// Also check description and title
			const embedDescription = invoiceEmbed.description || '';
			const embedTitle = invoiceEmbed.title || '';
			const embedText = embedDescription + ' ' + embedTitle;
			
			// Try to extract product from description (e.g., "Bo6 External\n1x Month Key at $24.99")
			if (!product && embedDescription) {
				const lines = embedDescription.split('\n');
				if (lines.length > 0 && lines[0].trim()) {
					// First line is usually the product name
					product = lines[0].trim();
				}
			}
			
			// Try to find email in description if not found in fields
			if (!email) {
				const emailMatch = embedText.match(/[\w.-]+@[\w.-]+\.\w+/);
				if (emailMatch) {
					email = emailMatch[0];
				}
			}
			
			if (!email) {
				return await interaction.editReply({
					content: '❌ Could not extract email from the invoice embed. Please contact an administrator.',
				});
			}
			
			// ===== SAVE CLAIM DATA =====
			const timestamp = new Date().toISOString();
			
			claims[invoiceId] = {
				userId: interaction.user.id,
				email: email,
				amount: price || 0,
				product: product || 'N/A',
				timestamp: timestamp,
				autoClaim: false,
			};
			
			// Auto-link to ticket if claimed in a ticket channel
			try {
				const ticket = await client.prisma.ticket.findUnique({
					where: { id: interaction.channel.id },
				});
				
				if (ticket) {
					claims[invoiceId].ticketId = interaction.channel.id;
					claims[invoiceId].linkedAt = timestamp;
					client.log.info(`Auto-linked invoice ${invoiceId} to ticket ${interaction.channel.id}`);
				}
			} catch (error) {
				client.log.debug('Channel is not a ticket, skipping auto-link');
			}
			
			// Update profiles
			if (!profiles[interaction.user.id]) {
				profiles[interaction.user.id] = {
					email: email,
					claims: [],
				};
			}
			profiles[interaction.user.id].email = email;
			if (!profiles[interaction.user.id].claims) {
				profiles[interaction.user.id].claims = [];
			}
			profiles[interaction.user.id].claims.push({
				invoiceId: invoiceId,
				amount: price || 0,
				timestamp: timestamp,
			});
			
			// Write data files
			fs.writeFileSync(claimsPath, JSON.stringify(claims, null, 2));
			fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
			
			// ===== RECORD IN PROFILE MANAGER =====
			client.profileManager.recordPurchase(
				interaction.user.id,
				email,
				invoiceId,
				price || 0,
				product || 'Unknown Product'
			);
			
			// ===== LINK INVOICE TO USER IN ORDER ANALYTICS =====
			if (client.orderAnalytics) {
				client.orderAnalytics.linkInvoiceToUser(invoiceId, interaction.user.id, email);
			}
			
			// ===== ASSIGN BUYER ROLE =====
			try {
				const member = await interaction.guild.members.fetch(interaction.user.id);
				const buyerRole = await interaction.guild.roles.fetch(BUYER_ROLE_ID);
				
				if (buyerRole && !member.roles.cache.has(BUYER_ROLE_ID)) {
					await member.roles.add(buyerRole);
				}
			} catch (error) {
				client.log.error('Failed to assign Buyer role:', error);
			}
			
			// ===== LOG TO MOD CHANNEL =====
			try {
				const modLogChannel = await interaction.guild.channels.fetch(MOD_LOG_CHANNEL_ID);
				
				if (modLogChannel && modLogChannel.isTextBased()) {
					const logEmbed = new EmbedBuilder()
						.setColor(0x00ff00)
						.setTitle('✅ Invoice Claimed')
						.addFields(
							{ name: 'User', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
							{ name: 'Invoice ID', value: `\`${invoiceId}\``, inline: true },
							{ name: 'Email', value: email, inline: true },
							{ name: 'Product', value: product || 'N/A', inline: true },
							{ name: 'Amount', value: price ? `$${(price / 100).toFixed(2)}` : 'N/A', inline: true },
							{ name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
						)
						.setTimestamp();
					
					await modLogChannel.send({ embeds: [logEmbed] });
				}
			} catch (error) {
				client.log.error('Failed to log to mod channel:', error);
			}
			
			// ===== REPLY TO USER =====
			const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (match, start, middle, domain) => {
				return start + '*'.repeat(middle.length) + domain;
			});
			
			const successEmbed = new EmbedBuilder()
				.setColor(0x00ff00)
				.setTitle('✅ Invoice Claimed Successfully')
				.setDescription(`You have successfully claimed invoice \`${invoiceId}\``)
				.addFields(
					{ name: 'Linked Email', value: maskedEmail, inline: true },
					{ name: 'Product', value: product || 'N/A', inline: true },
					{ name: 'Amount', value: price ? `$${(price / 100).toFixed(2)}` : 'N/A', inline: true },
				)
				.setFooter({ text: 'Thank you for your purchase!' })
				.setTimestamp();
			
			// Add ticket link info if auto-linked
			if (claims[invoiceId].ticketId) {
				successEmbed.addFields({
					name: '🎫 Ticket Linked',
					value: `This invoice has been automatically linked to this ticket for vouch rewards.`,
					inline: false,
				});
			}
			
			await interaction.editReply({
				embeds: [successEmbed],
			});
			
		} catch (error) {
			client.log.error('Error in claim command:', error);
			
			await interaction.editReply({
				content: '❌ An error occurred while processing your claim. Please contact an administrator.',
			}).catch(() => {});
		}
	}
};
