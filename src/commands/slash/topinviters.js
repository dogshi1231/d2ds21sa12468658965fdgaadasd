const { SlashCommand } = require('@eartharoid/dbf');
const { MessageFlags, EmbedBuilder } = require('discord.js');

module.exports = class TopInvitersSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'View top inviters by profit generated (staff only)',
			dmPermission: false,
			name: 'topinviters',
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

			// Get top inviters
			const topInviters = client.orderAnalytics.getTopInviters(10);

			if (topInviters.length === 0) {
				return await interaction.editReply({
					content: '📊 No invite tracking data available yet. Invite tracking starts when members join via invites.',
				});
			}

			// Create leaderboard embed
			const embed = new EmbedBuilder()
				.setColor('#9b59b6')
				.setTitle('🎯 Top Inviters by Profit Generated')
				.setDescription('Ranked by total profit from invited members\' purchases')
				.setTimestamp();

			// Add top inviters
			const leaderboardText = topInviters.map((inviter, index) => {
				const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
				const profit = (inviter.totalProfit / 100).toFixed(2);
				const avgProfitPerInvite = inviter.totalInvites > 0 
					? (inviter.totalProfit / inviter.totalInvites / 100).toFixed(2) 
					: '0.00';

				return `${medal} <@${inviter.userId}>\n` +
					`├ **Total Invites:** ${inviter.totalInvites}\n` +
					`├ **Total Profit:** $${profit}\n` +
					`└ **Avg Profit/Invite:** $${avgProfitPerInvite}`;
			}).join('\n\n');

			embed.addFields({
				name: '🏆 Leaderboard',
				value: leaderboardText,
				inline: false,
			});

			// Calculate totals
			const totalInvites = topInviters.reduce((sum, inv) => sum + inv.totalInvites, 0);
			const totalProfit = topInviters.reduce((sum, inv) => sum + inv.totalProfit, 0);

			embed.addFields({
				name: '📊 Statistics',
				value: 
					`**Total Tracked Invites:** ${totalInvites}\n` +
					`**Total Profit Generated:** $${(totalProfit / 100).toFixed(2)}\n` +
					`**Avg Profit per Invite:** $${totalInvites > 0 ? (totalProfit / totalInvites / 100).toFixed(2) : '0.00'}`,
				inline: false,
			});

			embed.setFooter({ text: 'Profit is tracked when invited members make purchases' });

			await interaction.editReply({ embeds: [embed] });

		} catch (error) {
			client.log.error('Error in topinviters command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while fetching top inviters.',
			}).catch(() => {});
		}
	}
};
