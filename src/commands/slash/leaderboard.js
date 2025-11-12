const { SlashCommand } = require('@eartharoid/dbf');
const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = class LeaderboardSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'Post the staff performance leaderboard',
			dmPermission: false,
			name: 'leaderboard',
			options: [
				{
					name: 'public',
					description: 'Post publicly in the leaderboard channel (staff only)',
					required: false,
					type: 5, // BOOLEAN
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

		const isPublic = interaction.options.getBoolean('public') || false;

		await interaction.deferReply({ flags: isPublic ? 0 : MessageFlags.Ephemeral });

		try {
			// Check if user is staff for public posting
			if (isPublic) {
				const { isStaff } = require('../../lib/users');
				if (!await isStaff(interaction.guild, interaction.member.id)) {
					return await interaction.editReply({
						content: '❌ Only staff members can post the public leaderboard.',
					});
				}
			}

			// Get all staff data
			const leaderboardData = client.rewards.getLeaderboardData(interaction.guild);

			// Create leaderboard embed
			const leaderboardEmbed = new EmbedBuilder()
				.setColor(0xFFD700) // Gold color
				.setTitle('🏆 Staff Leaderboard — All Time')
				.setDescription('Top performing staff members based on earnings and tickets handled.')
				.setThumbnail(interaction.guild.iconURL())
				.setTimestamp();

			// Top 5 by earnings
			if (leaderboardData.byEarnings.length > 0) {
				const earningsText = await Promise.all(
					leaderboardData.byEarnings.slice(0, 5).map(async (entry, index) => {
						const user = await client.users.fetch(entry.staffId).catch(() => null);
						const username = user ? user.username : 'Unknown User';
						const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
						return `${medal} **${username}** — $${(entry.totalEarned / 100).toFixed(2)}`;
					})
				);

				leaderboardEmbed.addFields({
					name: '💰 Top Earners',
					value: earningsText.join('\n') || 'No data yet',
					inline: false,
				});
			} else {
				leaderboardEmbed.addFields({
					name: '💰 Top Earners',
					value: 'No earnings data yet',
					inline: false,
				});
			}

			// Top 5 by vouches
			if (leaderboardData.byVouches.length > 0) {
				const vouchesText = await Promise.all(
					leaderboardData.byVouches.slice(0, 5).map(async (entry, index) => {
						const user = await client.users.fetch(entry.staffId).catch(() => null);
						const username = user ? user.username : 'Unknown User';
						const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
						return `${medal} **${username}** — ${entry.vouches} vouches`;
					})
				);

				leaderboardEmbed.addFields({
					name: '⭐ Most Vouches',
					value: vouchesText.join('\n') || 'No data yet',
					inline: false,
				});
			}

			// Top 5 by tickets handled
			if (leaderboardData.byTickets.length > 0) {
				const ticketsText = await Promise.all(
					leaderboardData.byTickets.slice(0, 5).map(async (entry, index) => {
						const user = await client.users.fetch(entry.staffId).catch(() => null);
						const username = user ? user.username : 'Unknown User';
						const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
						return `${medal} **${username}** — ${entry.tickets} tickets`;
					})
				);

				leaderboardEmbed.addFields({
					name: '🎟️ Most Tickets',
					value: ticketsText.join('\n') || 'No data yet',
					inline: false,
				});
			}

			// Add total stats
			const totalEarnings = leaderboardData.byEarnings.reduce((sum, e) => sum + e.totalEarned, 0);
			const totalVouches = leaderboardData.byVouches.reduce((sum, e) => sum + e.vouches, 0);
			const totalTickets = leaderboardData.byTickets.reduce((sum, e) => sum + e.tickets, 0);

			leaderboardEmbed.addFields({
				name: '📊 Overall Stats',
				value: `💰 Total Paid: $${(totalEarnings / 100).toFixed(2)}\n⭐ Total Vouches: ${totalVouches}\n🎟️ Total Tickets: ${totalTickets}`,
				inline: false,
			});

			leaderboardEmbed.setFooter({ 
				text: 'Keep up the excellent work! Updated in real-time.' 
			});

			// Post to leaderboard channel if public
			if (isPublic) {
				const leaderboardChannelId = '1381097783204777984';
				const leaderboardChannel = await client.channels.fetch(leaderboardChannelId).catch(() => null);
				
				if (leaderboardChannel) {
					await leaderboardChannel.send({ embeds: [leaderboardEmbed] });
					await interaction.editReply({
						content: `✅ Leaderboard posted to <#${leaderboardChannelId}>!`,
					});
				} else {
					await interaction.editReply({
						content: '❌ Could not find the leaderboard channel.',
					});
				}
			} else {
				await interaction.editReply({ embeds: [leaderboardEmbed] });
			}

		} catch (error) {
			client.log.error('Error in leaderboard command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while generating the leaderboard.',
			}).catch(() => {});
		}
	}
};
