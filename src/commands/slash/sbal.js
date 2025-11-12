const { SlashCommand } = require('@eartharoid/dbf');
const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = class SbalSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'View your staff balance and performance stats',
			dmPermission: false,
			name: 'sbal',
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

			// Get staff balance data
			const balanceData = client.rewards.getStaffBalance(interaction.user.id);

			// Count tickets handled (from ticket claims)
			const ticketsHandled = client.rewards.getStaffTicketCount(interaction.user.id);

			// Create embed
			const statsEmbed = new EmbedBuilder()
				.setColor(0x5865F2)
				.setAuthor({ 
					name: `Staff Profile — ${interaction.user.username}`,
					iconURL: interaction.user.displayAvatarURL()
				})
				.setThumbnail(interaction.user.displayAvatarURL())
				.addFields(
					{ name: '💰 Total Earnings', value: `$${(balanceData.totalEarned / 100).toFixed(2)}`, inline: true },
					{ name: '💳 Current Balance', value: `$${(balanceData.balance / 100).toFixed(2)}`, inline: true },
					{ name: '🎟️ Tickets Handled', value: `${ticketsHandled} tickets`, inline: true },
					{ name: '⭐ Total Vouches', value: `${balanceData.vouches} reviews`, inline: true },
					{ name: '📊 Avg per Vouch', value: balanceData.vouches > 0 ? `$${(balanceData.totalEarned / balanceData.vouches / 100).toFixed(2)}` : '$0.00', inline: true },
					{ name: '🏆 Rank', value: this.getRankEmoji(balanceData.totalEarned / 100), inline: true },
				)
				.setFooter({ text: 'Keep up the great work! Your dedication is valued.' })
				.setTimestamp();

			// Show last 5 payouts if available
			if (balanceData.history && balanceData.history.length > 0) {
				const recentPayouts = balanceData.history
					.slice(-5)
					.reverse()
					.map((h, index) => {
						const date = new Date(h.timestamp);
						const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
						return `${index + 1}. **$${(h.amount / 100).toFixed(2)}** — ${h.reason} (${dateStr})`;
					})
					.join('\n');

				statsEmbed.addFields({
					name: '🕓 Last 5 Payouts',
					value: recentPayouts || 'No payout history yet',
				});
			} else {
				statsEmbed.addFields({
					name: '🕓 Recent Activity',
					value: 'No payout history yet. Complete vouches to earn rewards!',
				});
			}

			await interaction.editReply({ embeds: [statsEmbed] });

		} catch (error) {
			client.log.error('Error in sbal command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while fetching your stats.',
			}).catch(() => {});
		}
	}

	getRankEmoji(totalEarned) {
		if (totalEarned >= 500) return '🏆 Elite';
		if (totalEarned >= 250) return '💎 Diamond';
		if (totalEarned >= 100) return '🥇 Gold';
		if (totalEarned >= 50) return '🥈 Silver';
		if (totalEarned >= 10) return '🥉 Bronze';
		return '🌟 Beginner';
	}
};
