const { SlashCommand } = require('@eartharoid/dbf');
const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = class BalanceSlashCommand extends SlashCommand {
	constructor(client, options) {
		super(client, {
			...options,
			description: 'Check your staff reward balance',
			dmPermission: false,
			name: 'balance',
			options: [
				{
					name: 'user',
					description: 'Check another staff member\'s balance (moderators only)',
					required: false,
					type: 6, // USER
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
			const targetUser = interaction.options.getUser('user') || interaction.user;

			// If checking someone else's balance, verify permission
			if (targetUser.id !== interaction.user.id) {
				const { isStaff } = require('../../lib/users');
				if (!await isStaff(interaction.guild, interaction.member.id)) {
					return await interaction.editReply({
						content: '❌ You don\'t have permission to check other users\' balances.',
					});
				}
			}

			// Get balance data
			const balanceData = client.rewards.getStaffBalance(targetUser.id);

			// Create embed
			const balanceEmbed = new EmbedBuilder()
				.setColor(0x00ff00)
				.setTitle(`💰 ${targetUser.username}'s Balance`)
				.setThumbnail(targetUser.displayAvatarURL())
				.addFields(
					{ name: 'Current Balance', value: `$${(balanceData.balance / 100).toFixed(2)}`, inline: true },
					{ name: 'Total Earned', value: `$${(balanceData.totalEarned / 100).toFixed(2)}`, inline: true },
					{ name: 'Total Vouches', value: `${balanceData.vouches}`, inline: true },
				)
				.setFooter({ text: 'Earn rewards by providing excellent support!' })
				.setTimestamp();

			// Show recent history if available
			if (balanceData.history && balanceData.history.length > 0) {
				const recentHistory = balanceData.history
					.slice(-5)
					.reverse()
					.map(h => {
						const date = new Date(h.timestamp);
						return `+$${(h.amount / 100).toFixed(2)} - ${h.reason} (<t:${Math.floor(date.getTime() / 1000)}:R>)`;
					})
					.join('\n');

				balanceEmbed.addFields({
					name: 'Recent History',
					value: recentHistory || 'No history yet',
				});
			}

			await interaction.editReply({ embeds: [balanceEmbed] });

		} catch (error) {
			client.log.error('Error in balance command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while fetching the balance.',
			}).catch(() => {});
		}
	}
};
