const { Menu } = require('@eartharoid/dbf');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = class ErrorSelectMenu extends Menu {
	constructor(client, options) {
		super(client, {
			...options,
			id: 'error_select',
		});
	}

	/**
	 * @param {import("discord.js").StringSelectMenuInteraction} interaction
	 */
	async run(interaction) {
		/** @type {import("client")} */
		const client = this.client;

		await interaction.deferUpdate();

		try {
			// Load error solutions
			const errorsPath = path.join(process.cwd(), 'custom', 'error-solutions.json');
			const errorSolutions = JSON.parse(fs.readFileSync(errorsPath, 'utf-8'));

			const selectedError = interaction.values[0];
			const solution = errorSolutions[selectedError];

			if (!solution) {
				await interaction.followUp({
					content: '❌ Error solution not found.',
					ephemeral: true,
				});
				return;
			}

			// Log analytics
			this.logErrorUsage(selectedError, interaction.user.id);

			// Create solution embed
			const embed = new EmbedBuilder()
				.setColor(solution.color)
				.setTitle(solution.title)
				.setDescription(solution.description)
				.addFields({
					name: '📋 Fix Instructions',
					value: solution.fixes.map((fix, index) => `${index + 1}. ${fix}`).join('\n\n'),
				})
				.setFooter({ text: 'Still having issues? Create a ticket for personalized support.' })
				.setTimestamp();

			if (solution.externalLink) {
				embed.addFields({
					name: '🔗 Additional Resources',
					value: `[Click here for more information](${solution.externalLink})`,
				});
			}

			// Recreate the select menu to keep it available
			const selectMenu = new StringSelectMenuBuilder()
				.setCustomId(JSON.stringify({ action: 'error_select' }))
				.setPlaceholder('Select another error to view its solution')
				.addOptions([
					{
						label: 'VPN / Proxy Detected',
						description: 'Loader detected a VPN or proxy connection',
						value: 'vpn_proxy',
						emoji: '🛡️',
					},
					{
						label: 'Driver Initialization Failed',
						description: 'Driver failed to load properly',
						value: 'driver_failed',
						emoji: '🔧',
					},
					{
						label: 'Invalid Product Key',
						description: 'Your product key is not valid or expired',
						value: 'invalid_key',
						emoji: '🔑',
					},
					{
						label: 'No Response from Loader',
						description: 'Loader is frozen or not responding',
						value: 'no_response',
						emoji: '⏳',
					},
					{
						label: 'HWID Mismatch',
						description: 'Hardware ID does not match your key',
						value: 'hwid_mismatch',
						emoji: '💻',
					},
					{
						label: 'Windows Defender Issues',
						description: 'Defender is blocking the loader',
						value: 'defender_issues',
						emoji: '🛡️',
					},
					{
						label: 'Loader Closed Automatically',
						description: 'Loader closes immediately after opening',
						value: 'auto_close',
						emoji: '⚠️',
					},
				]);

			const row = new ActionRowBuilder().addComponents(selectMenu);

			// Update the message with the solution
			await interaction.editReply({
				embeds: [embed],
				components: [row],
			});

		} catch (error) {
			client.log.error('Error in error_select menu:', error);
		}
	}

	/**
	 * Log error usage for analytics
	 * @param {string} errorType
	 * @param {string} userId
	 */
	logErrorUsage(errorType, userId) {
		try {
			const analyticsPath = path.join(process.cwd(), 'data', 'error_analytics.json');
			let analytics = {};

			if (fs.existsSync(analyticsPath)) {
				analytics = JSON.parse(fs.readFileSync(analyticsPath, 'utf-8'));
			}

			if (!analytics[errorType]) {
				analytics[errorType] = {
					count: 0,
					users: [],
					lastAccessed: null,
				};
			}

			analytics[errorType].count++;
			analytics[errorType].lastAccessed = new Date().toISOString();
			
			// Track unique users (don't duplicate)
			if (!analytics[errorType].users.includes(userId)) {
				analytics[errorType].users.push(userId);
			}

			fs.writeFileSync(analyticsPath, JSON.stringify(analytics, null, 2));
		} catch (error) {
			this.client.log.error('Error logging analytics:', error);
		}
	}
};
