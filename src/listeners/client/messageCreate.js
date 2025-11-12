const { Listener } = require('@eartharoid/dbf');
const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle: { Success },
	ChannelType,
	ComponentType,
	EmbedBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} = require('discord.js');
const {
	getCommonGuilds,
	isStaff,
} = require('../../lib/users');
const ms = require('ms');
const emoji = require('node-emoji');

module.exports = class extends Listener {
	constructor(client, options) {
		super(client, {
			...options,
			emitter: client,
			event: 'messageCreate',
		});
	}

	/**
 	 * @param {import('@prisma/client').Guild} settings
	 * @param {import("discord.js").ButtonInteraction|import("discord.js").SelectMenuInteraction} interaction
	 */
	async useGuild(settings, interaction, topic) {
		const getMessage = this.client.i18n.getLocale(settings.locale);
		if (settings.categories.length === 0) {
			interaction.update({
				components: [],
				embeds: [
					new EmbedBuilder()
						.setColor(settings.errorColour)
						.setTitle(getMessage('misc.no_categories.title'))
						.setDescription(getMessage('misc.no_categories.description', { url: `${process.env.HTTP_EXTERNAL}/settings/${interaction.guildId}` })),
				],
			});
		} else if (settings.categories.length === 1) {
			await this.client.tickets.create({
				categoryId: settings.categories[0].id,
				interaction,
				topic,
			});
		} else {
			await interaction.update({
				components: [
					new ActionRowBuilder()
						.setComponents(
							new StringSelectMenuBuilder()
								.setCustomId(JSON.stringify({
									action: 'create',
									topic,
								}))
								.setPlaceholder(getMessage('menus.category.placeholder'))
								.setOptions(
									settings.categories.map(category =>
										new StringSelectMenuOptionBuilder()
											.setValue(String(category.id))
											.setLabel(category.name)
											.setDescription(category.description)
											.setEmoji(emoji.hasEmoji(category.emoji) ? emoji.get(category.emoji) : { id: category.emoji }),
									),
								),
						),
				],
			});
			interaction.message.awaitMessageComponent({
				componentType: ComponentType.SelectMenu,
				filter: () => true,
				time: ms('30s'),
			})
				.then(async () => {
					interaction.message.delete();
				})
				.catch(error => {
					if (error) this.client.log.error(error);
					interaction.message.delete();
				});
		}

	}

	/**
	 * @param {import("discord.js").Message} message
	 */
	async run(message) {
		/** @type {import("client")} */
		const client = this.client;

		if (message.channel.type === ChannelType.DM) {
			if (message.author.bot) return false;
			const commonGuilds = await getCommonGuilds(client, message.author.id);
			if (commonGuilds.size === 0) {
				return false;
			} else if (commonGuilds.size === 1) {
				const settings = await client.prisma.guild.findUnique({
					select: {
						categories: true,
						errorColour: true,
						locale: true,
						primaryColour: true,
					},
					where: { id: commonGuilds.at(0).id },
				});
				const getMessage = client.i18n.getLocale(settings.locale);
				const sent = await message.reply({
					components: [
						new ActionRowBuilder()
							.setComponents(
								new ButtonBuilder()
									.setCustomId(message.id)
									.setStyle(Success)
									.setLabel(getMessage('buttons.confirm_open.text'))
									.setEmoji(getMessage('buttons.confirm_open.emoji')),
							),
					],
					embeds: [
						new EmbedBuilder()
							.setColor(settings.primaryColour)
							.setTitle(getMessage('dm.confirm_open.title'))
							.setDescription(message.content),
					],
				});
				sent.awaitMessageComponent({
					componentType: ComponentType.Button,
					filter: () => true,
					time: ms('30s'),
				})
					.then(async interaction => await this.useGuild(settings, interaction, message.content))
					.catch(error => {
						if (error) client.log.error(error);
						sent.delete();
					});
			} else {
				const getMessage = client.i18n.getLocale();
				const sent = await message.reply({
					components: [
						new ActionRowBuilder()
							.setComponents(
								new StringSelectMenuBuilder()
									.setCustomId(message.id)
									.setPlaceholder(getMessage('menus.guild.placeholder'))
									.setOptions(
										commonGuilds.map(g =>
											new StringSelectMenuOptionBuilder()
												.setValue(String(g.id))
												.setLabel(g.name),
										),
									),
							),

					],
				});
				sent.awaitMessageComponent({
					componentType: ComponentType.SelectMenu,
					filter: () => true,
					time: ms('30s'),
				})
					.then(async interaction => {
						const settings = await client.prisma.guild.findUnique({
							select: {
								categories: true,
								errorColour: true,
								locale: true,
								primaryColour: true,
							},
							where: { id: interaction.values[0] },
						});
						await this.useGuild(settings, interaction, message.content);
					})
					.catch(error => {
						if (error) client.log.error(error);
						sent.delete();
					});
			}
		} else {
			const settings = await client.prisma.guild.findUnique({ where: { id: message.guild.id } });
			if (!settings) return;
			const getMessage = client.i18n.getLocale(settings.locale);
			let ticket = await client.prisma.ticket.findUnique({ where: { id: message.channel.id } });

			if (ticket) {
				// Handle ticket claim inactivity timer
				if (client.ticketClaims) {
					await client.ticketClaims.handleMessage(message);
				}

				// archive messages (skip bot embeds/system messages)
				if (settings.archive && (!message.author.bot || message.content)) {
					client.tickets.archiver.saveMessage(ticket.id, message)
						.catch(error => {
							client.log.warn('Failed to archive message', message.id);
							client.log.error(error);
							message.react('❌').catch(client.log.error);
						});
				}

				if (!message.author.bot) {
					// update user's message count
					client.prisma.user.upsert({
						create: {
							id: message.author.id,
							messageCount: 1,
						},
						update: { messageCount: { increment: 1 } },
						where: { id: message.author.id },
					}).catch(client.log.error);

					// set first and last message timestamps
					const data = { lastMessageAt: new Date() };
					const userIsStaff = await isStaff(message.guild, message.author.id);
					if (
						ticket.firstResponseAt === null &&
						userIsStaff
					) data.firstResponseAt = new Date();
					ticket = await client.prisma.ticket.update({
						data,
						where: { id: ticket.id },
					});

					// Track staff activity for inactivity monitoring
					if (userIsStaff && client.staffManager) {
						await client.staffManager.recordActivity(message.author.id, 'ticket_message');
					}

					// Track message in analytics (all messages, not just staff)
					if (client.analytics) {
						client.analytics.trackMessage(message.author.id);
					}

					// if the ticket was set as stale, unset it
					if (client.tickets.$stale.has(ticket.id)) {
						const $ticket = client.tickets.$stale.get(ticket.id);
						$ticket.messages++;
						if ($ticket.messages >= 5) {
							await message.channel.messages.delete($ticket.message.id);
							client.tickets.$stale.delete(ticket.id);
						} else {
							client.tickets.$stale.set(ticket.id, $ticket);
						}
					}
				}

				if (process.env.PUBLIC_BOT !== 'true' &&
					!message.author.bot &&
					!await isStaff(message.channel.guild, message.author.id)
				) {
					const key = `offline/${message.channel.id}`;
					let online = 0;
					for (const [, member] of message.channel.members) {
						if (member.user.bot) continue;
						if (!await isStaff(message.channel.guild, member.id)) continue;
						if (member.presence && member.presence !== 'offline') online++;
					}
					if (online === 0 && ! await client.keyv.has(key)) {
						await message.channel.send({
							embeds: [
								new EmbedBuilder()
									.setColor(settings.primaryColour)
									.setTitle(getMessage('ticket.offline.title'))
									.setDescription(getMessage('ticket.offline.description')),
							],
						});
						client.keyv.set(key, Date.now(), ms('1h'));
					}
				}
			}

			// auto-tag
			if (
				!message.author.bot &&
				(
					(settings.autoTag === 'all') ||
					(settings.autoTag === 'ticket' && ticket) ||
					(settings.autoTag === '!ticket' && !ticket) ||
					(settings.autoTag.includes(message.channel.id))
				)
			) {
				const cacheKey = `cache/guild-tags:${message.guild.id}`;
				let tags = await client.keyv.get(cacheKey);
				if (!tags) {
					tags = await client.prisma.tag.findMany({
						select: {
							content: true,
							id: true,
							name: true,
							regex: true,
						},
						where: { guildId: message.guild.id },
					});
					client.keyv.set(cacheKey, tags, ms('1h'));
				}

				const tag = tags.find(tag => tag.regex && message.content.match(new RegExp(tag.regex, 'mi')));
				if (tag) {
					await message.reply({
						embeds: [
							new EmbedBuilder()
								.setColor(settings.primaryColour)
								.setDescription(tag.content),
						],
					});
				}

			}
		}

		// ===== AUTO-CLAIM WATCHER =====
		// Monitor orders channel for automatic invoice claiming
		if (message.guild && !message.author.bot && message.embeds.length > 0) {
			try {
				const fs = require('fs');
				const path = require('path');
				
				// Load configuration
				const configPath = path.join(process.cwd(), 'custom', 'claim-config.json');
				if (!fs.existsSync(configPath)) return;
				
				const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
				
				// Check if this is the orders channel
				if (message.channel.id !== config.ordersChannelId) return;
				
				// Load data files
				const claimsPath = path.join(process.cwd(), 'data', 'claims.json');
				const profilesPath = path.join(process.cwd(), 'data', 'profiles.json');
				
				let claims = {};
				let profiles = {};
				
				if (fs.existsSync(claimsPath)) {
					claims = JSON.parse(fs.readFileSync(claimsPath, 'utf8'));
				}
				
				if (fs.existsSync(profilesPath)) {
					profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
				}
				
				// Process each embed in the message
				for (const embed of message.embeds) {
					let invoiceId = null;
					let email = null;
					let product = null;
					let price = null;
					
					// Extract invoice ID and data from embed
					const embedData = embed.toJSON();
					const embedString = JSON.stringify(embedData);
					
					// Try to find invoice ID (common patterns)
					const invoicePatterns = [
						/invoice[:\s]+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
						/id[:\s]+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
						/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
					];
					
					for (const pattern of invoicePatterns) {
						const match = embedString.match(pattern);
						if (match) {
							invoiceId = match[1] || match[0];
							break;
						}
					}
					
					if (!invoiceId) continue;
					
					// Check if already claimed
					if (claims[invoiceId]) continue;
					
					// Extract email, product, and price
					if (embed.fields) {
						for (const field of embed.fields) {
							const fieldName = field.name.toLowerCase();
							const fieldValue = field.value;
							
							if (fieldName.includes('email') || fieldName.includes('e-mail')) {
								email = fieldValue.trim();
							}
							if (fieldName.includes('product') || fieldName.includes('item')) {
								product = fieldValue.trim();
							}
							if (fieldName.includes('price') || fieldName.includes('amount') || fieldName.includes('total')) {
								const priceMatch = fieldValue.match(/[\d,.]+/);
								if (priceMatch) {
									price = parseFloat(priceMatch[0].replace(/,/g, '')) * 100;
								}
							}
						}
					}
					
					// Also check description and title
					const embedDescription = embed.description || '';
					const embedTitle = embed.title || '';
					const embedText = embedDescription + ' ' + embedTitle;
					
					if (!email) {
						const emailMatch = embedText.match(/[\w.-]+@[\w.-]+\.\w+/);
						if (emailMatch) {
							email = emailMatch[0];
						}
					}
					
					if (!email) continue;
					
					// Find user with this email in profiles
					let userId = null;
					for (const [uid, profile] of Object.entries(profiles)) {
						if (profile.email && profile.email.toLowerCase() === email.toLowerCase()) {
							userId = uid;
							break;
						}
					}
					
					// If no user found with this email, skip auto-claim
					if (!userId) {
						client.log.debug(`Auto-claim skipped for invoice ${invoiceId}: email ${email} not linked to any user`);
						continue;
					}
					
					// Auto-claim the invoice
					const timestamp = new Date().toISOString();
					
					claims[invoiceId] = {
						userId: userId,
						email: email,
						amount: price || 0,
						timestamp: timestamp,
						autoClaim: true, // Mark as auto-claimed
					};
					
					// Update user profile
					if (!profiles[userId].claims) {
						profiles[userId].claims = [];
					}
					profiles[userId].claims.push({
						invoiceId: invoiceId,
						amount: price || 0,
						timestamp: timestamp,
						autoClaim: true,
					});
					
					// Calculate lifetime spend
					let lifetimeSpend = 0;
					for (const claim of profiles[userId].claims) {
						lifetimeSpend += claim.amount || 0;
					}
					profiles[userId].lifetimeSpend = lifetimeSpend;
					
					// Save data files
					fs.writeFileSync(claimsPath, JSON.stringify(claims, null, 2));
					fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
					
					// Assign Buyer role if missing
					try {
						const member = await message.guild.members.fetch(userId);
						const buyerRole = await message.guild.roles.fetch(config.buyerRoleId);
						
						if (buyerRole && !member.roles.cache.has(config.buyerRoleId)) {
							await member.roles.add(buyerRole);
							client.log.info(`Auto-assigned Buyer role to ${member.user.tag} for invoice ${invoiceId}`);
						}
					} catch (error) {
						client.log.error('Failed to assign Buyer role during auto-claim:', error);
					}
					
					// Log to mod channel
					try {
						const modLogChannel = await message.guild.channels.fetch(config.modLogChannelId);
						
						if (modLogChannel && modLogChannel.isTextBased()) {
							const logEmbed = new EmbedBuilder()
								.setColor(0x00aaff)
								.setTitle('🤖 Invoice Auto-Claimed')
								.addFields(
									{ name: 'User', value: `<@${userId}>`, inline: true },
									{ name: 'Invoice ID', value: `\`${invoiceId}\``, inline: true },
									{ name: 'Email', value: email, inline: true },
									{ name: 'Product', value: product || 'N/A', inline: true },
									{ name: 'Amount', value: price ? `$${(price / 100).toFixed(2)}` : 'N/A', inline: true },
									{ name: 'Lifetime Spend', value: `$${(lifetimeSpend / 100).toFixed(2)}`, inline: true },
									{ name: 'Type', value: '🤖 Automatic', inline: true },
								)
								.setFooter({ text: 'Auto-claimed based on linked email' })
								.setTimestamp();
							
							await modLogChannel.send({ embeds: [logEmbed] });
						}
					} catch (error) {
						client.log.error('Failed to log auto-claim to mod channel:', error);
					}
					
					// Notify the user via DM (optional)
					try {
						const member = await message.guild.members.fetch(userId);
						const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (match, start, middle, domain) => {
							return start + '*'.repeat(middle.length) + domain;
						});
						
						const dmEmbed = new EmbedBuilder()
							.setColor(0x00aaff)
							.setTitle('🤖 Purchase Automatically Linked')
							.setDescription(`A new purchase has been automatically linked to your account!`)
							.addFields(
								{ name: 'Invoice ID', value: `\`${invoiceId}\``, inline: true },
								{ name: 'Email', value: maskedEmail, inline: true },
								{ name: 'Product', value: product || 'N/A', inline: true },
								{ name: 'Amount', value: price ? `$${(price / 100).toFixed(2)}` : 'N/A', inline: true },
								{ name: 'Total Lifetime Spend', value: `$${(lifetimeSpend / 100).toFixed(2)}`, inline: true },
							)
							.setFooter({ text: 'This was automatically detected based on your email address' })
							.setTimestamp();
						
						await member.send({ embeds: [dmEmbed] }).catch(() => {
							// User has DMs disabled, that's okay
							client.log.debug(`Could not DM user ${userId} about auto-claim`);
						});
					} catch (error) {
						client.log.debug('Could not send auto-claim DM:', error.message);
					}
					
					client.log.info(`Auto-claimed invoice ${invoiceId} for user ${userId} (${email})`);
				}
			} catch (error) {
				client.log.error('Error in auto-claim watcher:', error);
			}
		}
	}
};
