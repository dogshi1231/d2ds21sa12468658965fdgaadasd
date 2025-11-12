const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

class ProfileManager {
	constructor(client) {
		this.client = client;
		this.dataDir = path.join(__dirname, '../data');
		this.profilesPath = path.join(this.dataDir, 'profiles.json');
		this.customersPath = path.join(this.dataDir, 'customers.json');
		
		// Ensure data directory exists
		if (!fs.existsSync(this.dataDir)) {
			fs.mkdirSync(this.dataDir, { recursive: true });
		}
		
		// Load data files
		this.profiles = this.loadJSON(this.profilesPath, {});
		this.customers = this.loadJSON(this.customersPath, {});
	}

	/**
	 * Load JSON file with fallback
	 */
	loadJSON(filepath, defaultValue) {
		try {
			if (fs.existsSync(filepath)) {
				const data = fs.readFileSync(filepath, 'utf8');
				return JSON.parse(data);
			}
		} catch (error) {
			this.client.log.error(`Error loading ${filepath}:`, error);
		}
		return defaultValue;
	}

	/**
	 * Save JSON file
	 */
	saveJSON(filepath, data) {
		try {
			fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
			return true;
		} catch (error) {
			this.client.log.error(`Error saving ${filepath}:`, error);
			return false;
		}
	}

	/**
	 * Initialize or get customer profile
	 */
	getCustomerProfile(userId) {
		if (!this.customers[userId]) {
			this.customers[userId] = {
				userId,
				emails: [],
				invoices: [],
				totalSpent: 0,
				firstPurchase: null,
				lastPurchase: null,
				lastProduct: null,
				tickets: {
					total: 0,
					lastTicketDate: null,
					ticketIds: [],
				},
				support: {
					hwidResets: 0,
					replacements: 0,
					keySwaps: 0,
				},
				warnings: [],
				joinedDate: new Date().toISOString(),
			};
		}
		return this.customers[userId];
	}

	/**
	 * Record a purchase claim
	 */
	recordPurchase(userId, email, invoiceId, amount, product) {
		const profile = this.getCustomerProfile(userId);
		
		// Add email if not already recorded
		if (email && !profile.emails.includes(email)) {
			profile.emails.push(email);
		}
		
		// Add invoice
		if (!profile.invoices.some(inv => inv.invoiceId === invoiceId)) {
			profile.invoices.push({
				invoiceId,
				amount,
				product: product || 'Unknown Product',
				timestamp: new Date().toISOString(),
			});
			
			// Update totals
			profile.totalSpent += amount;
			profile.lastPurchase = new Date().toISOString();
			profile.lastProduct = product || 'Unknown Product';
			
			if (!profile.firstPurchase) {
				profile.firstPurchase = profile.lastPurchase;
			}
		}
		
		this.saveJSON(this.customersPath, this.customers);
		this.client.log.info(`Recorded purchase for user ${userId}: ${invoiceId} ($${(amount / 100).toFixed(2)})`);
	}

	/**
	 * Record ticket creation
	 */
	recordTicket(userId, ticketId) {
		const profile = this.getCustomerProfile(userId);
		
		profile.tickets.total += 1;
		profile.tickets.lastTicketDate = new Date().toISOString();
		
		if (!profile.tickets.ticketIds.includes(ticketId)) {
			profile.tickets.ticketIds.push(ticketId);
		}
		
		this.saveJSON(this.customersPath, this.customers);
		this.client.log.debug(`Recorded ticket ${ticketId} for user ${userId}`);
	}

	/**
	 * Record HWID reset
	 */
	recordHwidReset(userId) {
		const profile = this.getCustomerProfile(userId);
		profile.support.hwidResets += 1;
		this.saveJSON(this.customersPath, this.customers);
		this.client.log.debug(`Recorded HWID reset for user ${userId}`);
	}

	/**
	 * Record replacement
	 */
	recordReplacement(userId) {
		const profile = this.getCustomerProfile(userId);
		profile.support.replacements += 1;
		this.saveJSON(this.customersPath, this.customers);
		this.client.log.debug(`Recorded replacement for user ${userId}`);
	}

	/**
	 * Record key swap
	 */
	recordKeySwap(userId) {
		const profile = this.getCustomerProfile(userId);
		profile.support.keySwaps += 1;
		this.saveJSON(this.customersPath, this.customers);
		this.client.log.debug(`Recorded key swap for user ${userId}`);
	}

	/**
	 * Add warning to customer profile
	 */
	addWarning(userId, reason, issuedBy) {
		const profile = this.getCustomerProfile(userId);
		
		profile.warnings.push({
			reason,
			issuedBy,
			timestamp: new Date().toISOString(),
			active: true,
		});
		
		this.saveJSON(this.customersPath, this.customers);
		this.client.log.info(`Added warning to user ${userId}: ${reason}`);
	}

	/**
	 * Remove/deactivate warning
	 */
	removeWarning(userId, warningIndex) {
		const profile = this.getCustomerProfile(userId);
		
		if (profile.warnings[warningIndex]) {
			profile.warnings[warningIndex].active = false;
			profile.warnings[warningIndex].removedAt = new Date().toISOString();
			this.saveJSON(this.customersPath, this.customers);
			return true;
		}
		
		return false;
	}

	/**
	 * Generate profile embed
	 */
	async generateProfileEmbed(guild, userId) {
		const profile = this.getCustomerProfile(userId);
		const user = await this.client.users.fetch(userId).catch(() => null);
		
		if (!user) {
			return null;
		}

		const embed = new EmbedBuilder()
			.setColor(0x5865F2)
			.setTitle(`📋 Customer Profile`)
			.setAuthor({
				name: user.tag,
				iconURL: user.displayAvatarURL(),
			})
			.setThumbnail(user.displayAvatarURL());

		// Basic Info
		const emails = profile.emails.length > 0 
			? profile.emails.map(e => `\`${e}\``).join(', ')
			: 'None';
		
		embed.addFields({
			name: '📧 Email(s)',
			value: emails,
			inline: false,
		});

		// Purchase Info
		const invoiceCount = profile.invoices.length;
		const totalSpent = `$${(profile.totalSpent / 100).toFixed(2)}`;
		const firstPurchase = profile.firstPurchase 
			? `<t:${Math.floor(new Date(profile.firstPurchase).getTime() / 1000)}:D>`
			: 'Never';
		const lastProduct = profile.lastProduct || 'None';

		embed.addFields(
			{ name: '🧾 Invoices Claimed', value: `${invoiceCount}`, inline: true },
			{ name: '💸 Total Spent', value: totalSpent, inline: true },
			{ name: '🗓️ First Purchase', value: firstPurchase, inline: true },
		);

		if (profile.lastProduct) {
			embed.addFields({
				name: '🎮 Last Product',
				value: profile.lastProduct,
				inline: false,
			});
		}

		// Ticket History
		const lastTicket = profile.tickets.lastTicketDate
			? `<t:${Math.floor(new Date(profile.tickets.lastTicketDate).getTime() / 1000)}:R>`
			: 'Never';

		embed.addFields({
			name: '🎟️ Support History',
			value: `**Tickets:** ${profile.tickets.total} (Last: ${lastTicket})\n` +
				   `**🔁 HWID Resets:** ${profile.support.hwidResets}\n` +
				   `**🔄 Replacements:** ${profile.support.replacements}\n` +
				   `**🔑 Key Swaps:** ${profile.support.keySwaps}`,
			inline: false,
		});

		// Warnings
		const activeWarnings = profile.warnings.filter(w => w.active);
		if (activeWarnings.length > 0) {
			const warningText = activeWarnings
				.slice(-3) // Last 3 warnings
				.map((w, i) => {
					const date = new Date(w.timestamp);
					return `${i + 1}. **${w.reason}** (<t:${Math.floor(date.getTime() / 1000)}:R>)`;
				})
				.join('\n');

			embed.addFields({
				name: `🚫 Warnings (${activeWarnings.length})`,
				value: warningText,
				inline: false,
			});
		}

		// Invoice History (last 5)
		if (profile.invoices.length > 0) {
			const invoiceHistory = profile.invoices
				.slice(-5)
				.reverse()
				.map((inv, i) => {
					const date = new Date(inv.timestamp);
					return `${i + 1}. \`${inv.invoiceId.substring(0, 8)}...\` — **${inv.product}** ($${(inv.amount / 100).toFixed(2)})`;
				})
				.join('\n');

			embed.addFields({
				name: '📦 Recent Purchases',
				value: invoiceHistory,
				inline: false,
			});
		}

		embed.setFooter({ text: `Customer since ${new Date(profile.joinedDate).toLocaleDateString()}` });
		embed.setTimestamp();

		return embed;
	}

	/**
	 * Search customer by email
	 */
	findCustomerByEmail(email) {
		for (const [userId, profile] of Object.entries(this.customers)) {
			if (profile.emails.includes(email)) {
				return userId;
			}
		}
		return null;
	}

	/**
	 * Get all customers sorted by total spent
	 */
	getTopCustomers(limit = 10) {
		return Object.values(this.customers)
			.sort((a, b) => b.totalSpent - a.totalSpent)
			.slice(0, limit);
	}
}

module.exports = ProfileManager;
