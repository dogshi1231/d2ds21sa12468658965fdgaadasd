const { SlashCommand } = require('@eartharoid/dbf');
const { ApplicationCommandOptionType, MessageFlags } = require('discord.js');

module.exports = class ProcessOrderSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'Manually process an order from a message (staff only)',
			dmPermission: false,
			name: 'processorder',
			options: [
				{
					description: 'The message ID containing the order embed',
					name: 'messageid',
					required: true,
					type: ApplicationCommandOptionType.String,
				},
				{
					description: 'The channel containing the message (defaults to current channel)',
					name: 'channel',
					required: false,
					type: ApplicationCommandOptionType.Channel,
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
			// Check if user is staff
			const { isStaff } = require('../../lib/users');
			if (!await isStaff(interaction.guild, interaction.member.id)) {
				return await interaction.editReply({
					content: '❌ This command is only available to staff members.',
				});
			}

			// Check if order analytics is initialized
			if (!client.orderAnalytics) {
				return await interaction.editReply({
					content: '❌ Order analytics system is not initialized.',
				});
			}

			const messageId = interaction.options.getString('messageid', true);
			const channel = interaction.options.getChannel('channel') || interaction.channel;

			if (!channel.isTextBased()) {
				return await interaction.editReply({
					content: '❌ The specified channel is not a text channel.',
				});
			}

			// Fetch the message
			const message = await channel.messages.fetch(messageId).catch(() => null);

			if (!message) {
				return await interaction.editReply({
					content: `❌ Could not find message \`${messageId}\` in ${channel}.`,
				});
			}

			if (message.embeds.length === 0) {
				return await interaction.editReply({
					content: '❌ The specified message does not contain any embeds.',
				});
			}

			// Process each embed
			let processedCount = 0;
			let skippedCount = 0;
			const results = [];

			for (const embed of message.embeds) {
				const orderData = client.orderAnalytics.extractOrderData(embed);

				if (!orderData) {
					skippedCount++;
					continue;
				}

				// Check if already processed
				const analytics = client.orderAnalytics.getAnalytics();
				if (analytics.orders[orderData.invoiceId]) {
					results.push(`⚠️ Invoice \`${orderData.invoiceId}\` already processed`);
					skippedCount++;
					continue;
				}

				// Process the order
				const processedOrder = await client.orderAnalytics.processOrder(orderData);
				processedCount++;

				results.push(
					`✅ Processed invoice \`${orderData.invoiceId}\`\n` +
					`   Product: ${orderData.product || 'Unknown'}\n` +
					`   Profit: $${(processedOrder.profit / 100).toFixed(2)} (${processedOrder.profitMargin}%)`
				);

				// Log profit
				await client.orderAnalytics.logProfit(processedOrder, interaction.guild.id);
			}

			// Send summary
			const summary = [
				`**Order Processing Summary**`,
				``,
				`✅ Processed: ${processedCount}`,
				`⚠️ Skipped: ${skippedCount}`,
				``,
				...results,
			].join('\n');

			await interaction.editReply({ content: summary });

		} catch (error) {
			client.log.error('Error in processorder command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while processing the order.',
			}).catch(() => {});
		}
	}
};
