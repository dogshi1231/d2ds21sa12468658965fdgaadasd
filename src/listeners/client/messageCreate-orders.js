const { Listener } = require('@eartharoid/dbf');
const fs = require('fs');
const path = require('path');

module.exports = class MessageCreateOrdersListener extends Listener {
	constructor(client) {
		super(client, {
			emitter: client,
			event: 'messageCreate',
		});
	}

	/**
	 * @param {import('discord.js').Message} message
	 */
	async run(message) {
		// Ignore bot messages and DMs
		if (message.author.bot || !message.guild) return;

		// Only process messages with embeds
		if (message.embeds.length === 0) return;

		try {
			// Load configuration
			const configPath = path.join(process.cwd(), 'custom', 'product-costs.json');
			if (!fs.existsSync(configPath)) return;

			const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

			// Check if this is an order channel (if configured)
			if (config.orderChannelIds && config.orderChannelIds.length > 0) {
				if (!config.orderChannelIds.includes(message.channel.id)) {
					return; // Not an order channel
				}
			}

			// Process each embed
			for (const embed of message.embeds) {
				await this.processOrderEmbed(embed, message);
			}

		} catch (error) {
			this.client.log.debug('Error in order listener:', error);
		}
	}

	/**
	 * Process a potential order embed
	 * @param {import('discord.js').Embed} embed
	 * @param {import('discord.js').Message} message
	 */
	async processOrderEmbed(embed, message) {
		try {
			const client = this.client;

			// Skip if order analytics is not initialized
			if (!client.orderAnalytics) return;

			// Extract order data from embed
			const orderData = client.orderAnalytics.extractOrderData(embed);

			if (!orderData) {
				// Not a valid order embed
				return;
			}

			// Check if this order was already processed
			const analytics = client.orderAnalytics.getAnalytics();
			if (analytics.orders[orderData.invoiceId]) {
				this.client.log.debug(`Order ${orderData.invoiceId} already processed, skipping`);
				return;
			}

			// Process the order
			const processedOrder = await client.orderAnalytics.processOrder(orderData);

			this.client.log.success(`Processed order: ${orderData.invoiceId} - Profit: $${(processedOrder.profit / 100).toFixed(2)}`);

			// Log profit to designated channel
			await client.orderAnalytics.logProfit(processedOrder, message.guild.id);

		} catch (error) {
			this.client.log.error('Error processing order embed:', error);
		}
	}
};
