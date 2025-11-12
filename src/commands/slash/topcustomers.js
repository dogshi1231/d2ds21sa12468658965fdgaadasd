const { SlashCommand } = require('@eartharoid/dbf');
const { MessageFlags, EmbedBuilder } = require('discord.js');

module.exports = class TopCustomersSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'View top customers by total purchases (staff only)',
			dmPermission: false,
			name: 'topcustomers',
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

			// Get top customers
			const topCustomers = client.orderAnalytics.getTopCustomers(10);

			if (topCustomers.length === 0) {
				return await interaction.editReply({
					content: '📊 No customer data available yet. Customer tracking starts when orders are processed.',
				});
			}

			// Create leaderboard embed
			const embed = new EmbedBuilder()
				.setColor('#f39c12')
				.setTitle('👑 Top Customers by Total Purchases')
				.setDescription('Ranked by total amount spent')
				.setTimestamp();

			// Add top customers
			const leaderboardText = topCustomers.map((customer, index) => {
				const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
				const totalSpent = (customer.totalSpent / 100).toFixed(2);
				const avgOrderValue = (customer.totalSpent / customer.totalOrders / 100).toFixed(2);

				// Mask email for privacy
				const maskedEmail = customer.email.replace(/(.{2})(.*)(@.*)/, (match, start, middle, domain) => {
					return start + '*'.repeat(Math.min(middle.length, 4)) + domain;
				});

				const userMention = customer.userId ? `<@${customer.userId}>` : maskedEmail;

				return `${medal} ${userMention}\n` +
					`├ **Total Spent:** $${totalSpent}\n` +
					`├ **Total Orders:** ${customer.totalOrders}\n` +
					`└ **Avg Order Value:** $${avgOrderValue}`;
			}).join('\n\n');

			embed.addFields({
				name: '🏆 Leaderboard',
				value: leaderboardText,
				inline: false,
			});

			// Calculate totals
			const totalRevenue = topCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
			const totalOrders = topCustomers.reduce((sum, c) => sum + c.totalOrders, 0);
			const linkedCustomers = topCustomers.filter(c => c.userId).length;

			embed.addFields({
				name: '📊 Statistics',
				value: 
					`**Total Revenue (Top 10):** $${(totalRevenue / 100).toFixed(2)}\n` +
					`**Total Orders (Top 10):** ${totalOrders}\n` +
					`**Linked to Discord:** ${linkedCustomers}/10\n` +
					`**Avg Order Value:** $${totalOrders > 0 ? (totalRevenue / totalOrders / 100).toFixed(2) : '0.00'}`,
				inline: false,
			});

			embed.setFooter({ text: 'Customers are automatically tracked from order embeds' });

			await interaction.editReply({ embeds: [embed] });

		} catch (error) {
			client.log.error('Error in topcustomers command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while fetching top customers.',
			}).catch(() => {});
		}
	}
};
