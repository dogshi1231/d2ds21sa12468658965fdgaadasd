const { SlashCommand } = require('@eartharoid/dbf');
const { ApplicationCommandOptionType, MessageFlags, EmbedBuilder } = require('discord.js');

module.exports = class VouchStatsSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'View vouch statistics for a staff member',
			dmPermission: false,
			name: 'vouchstats',
			options: [
				{
					description: 'The staff member to view stats for (leave empty for yourself)',
					name: 'user',
					required: false,
					type: ApplicationCommandOptionType.User,
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
			// Check if vouch system is initialized
			if (!client.vouchSystem) {
				return await interaction.editReply({
					content: '❌ Vouch system is not initialized.',
				});
			}

			const targetUser = interaction.options.getUser('user') || interaction.user;

			// Get staff stats
			const stats = client.vouchSystem.getStaffStats(targetUser.id);

			if (!stats || stats.totalVouches === 0) {
				return await interaction.editReply({
					content: `📊 ${targetUser.username} has no vouch statistics yet.`,
				});
			}

			// Create rating breakdown bar chart
			const maxRating = Math.max(...Object.values(stats.ratingBreakdown));
			const ratingBars = [5, 4, 3, 2, 1].map(rating => {
				const count = stats.ratingBreakdown[rating] || 0;
				const percentage = stats.totalVouches > 0 ? (count / stats.totalVouches * 100).toFixed(1) : 0;
				const barLength = maxRating > 0 ? Math.round((count / maxRating) * 10) : 0;
				const bar = '█'.repeat(barLength) + '░'.repeat(10 - barLength);
				return `${'⭐'.repeat(rating)} ${bar} ${count} (${percentage}%)`;
			}).join('\n');

			// Create stats embed
			const embed = new EmbedBuilder()
				.setColor('#f39c12')
				.setTitle(`⭐ Vouch Statistics - ${targetUser.username}`)
				.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
				.addFields(
					{
						name: '📊 Overall Stats',
						value: 
							`**Total Vouches:** ${stats.totalVouches}\n` +
							`**Average Rating:** ${'⭐'.repeat(Math.round(stats.averageRating))} (${stats.averageRating}/5.0)\n` +
							`**Total Earned:** $${(stats.totalEarned / 100).toFixed(2)}`,
						inline: false,
					},
					{
						name: '📈 Rating Breakdown',
						value: ratingBars,
						inline: false,
					}
				)
				.setFooter({ text: 'Vouches are customer reviews after ticket completion' })
				.setTimestamp();

			// Add performance badge
			const avgRating = parseFloat(stats.averageRating);
			let badge = '';
			if (avgRating >= 4.8) badge = '🏆 Elite Support';
			else if (avgRating >= 4.5) badge = '💎 Outstanding';
			else if (avgRating >= 4.0) badge = '⭐ Excellent';
			else if (avgRating >= 3.5) badge = '👍 Good';
			else badge = '📊 Developing';

			embed.setDescription(`**Performance Badge:** ${badge}`);

			await interaction.editReply({ embeds: [embed] });

		} catch (error) {
			client.log.error('Error in vouchstats command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while fetching vouch statistics.',
			}).catch(() => {});
		}
	}
};
