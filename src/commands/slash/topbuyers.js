const { SlashCommand } = require('@eartharoid/dbf');
const { EmbedBuilder } = require('discord.js');

module.exports = class TopBuyersCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'View the top 10 customers by total spending',
			name: 'topbuyers',
		});
	}

	/**
	 * @param {import("discord.js").ChatInputCommandInteraction} interaction
	 */
	async run(interaction) {
		await interaction.deferReply();

		try {
			const client = this.client;

			if (!client.analytics) {
				return await interaction.editReply('❌ Analytics system is not available.');
			}

			// Get top 10 customers
			const topCustomers = await client.analytics.getTopCustomers(10);

			if (topCustomers.length === 0) {
				return await interaction.editReply('❌ No customer data available yet.');
			}

			// Create embed
			const embed = new EmbedBuilder()
				.setColor('#f1c40f')
				.setTitle('👑 Top 10 Customers by Spending')
				.setDescription('Ranked by lifetime purchase total')
				.setTimestamp();

			let description = '';
			for (let i = 0; i < topCustomers.length; i++) {
				const customer = topCustomers[i];
				const rank = i + 1;
				const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
				
				description += `${emoji} <@${customer.userId}>\n`;
				description += `   💰 **$${(customer.totalSpent / 100).toFixed(2)}** | 📦 ${customer.orderCount} orders\n`;
				if (customer.email) {
					const maskedEmail = customer.email.replace(/(.{2})(.*)(@.*)/, (match, start, middle, domain) => {
						return start + '*'.repeat(Math.min(middle.length, 5)) + domain;
					});
					description += `   📧 ${maskedEmail}\n`;
				}
				description += '\n';
			}

			embed.setDescription(description);

			// Add summary footer
			const totalSpent = topCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0);
			const totalOrders = topCustomers.reduce((sum, customer) => sum + customer.orderCount, 0);

			embed.setFooter({ 
				text: `Top 10 Total: $${(totalSpent / 100).toFixed(2)} | ${totalOrders} orders` 
			});

			await interaction.editReply({ embeds: [embed] });

		} catch (error) {
			client.log.error('Error in topbuyers command:', error);
			await interaction.editReply('❌ An error occurred while fetching customer data.');
		}
	}
};
