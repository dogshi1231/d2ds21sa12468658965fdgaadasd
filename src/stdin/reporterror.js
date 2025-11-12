const { StdinCommand } = require('@eartharoid/dbf');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = class ReportErrorCommand extends StdinCommand {
	constructor(client) {
		super(client, {
			aliases: ['errorstats', 'erroranalytics'],
			description: 'View error usage analytics',
			id: 'reporterror',
		});
	}

	/**
	 * @param {string} input
	 */
	async run(input) {
		const client = this.client;
		const channelId = input.trim();

		if (!channelId) {
			client.log.warn('Usage: .reporterror <channelId>');
			return;
		}

		try {
			// Load analytics
			const analyticsPath = path.join(process.cwd(), 'data', 'error_analytics.json');
			
			if (!fs.existsSync(analyticsPath)) {
				client.log.warn('No error analytics data found yet');
				return;
			}

			const analytics = JSON.parse(fs.readFileSync(analyticsPath, 'utf-8'));

			// Get the channel
			const channel = await client.channels.fetch(channelId);
			if (!channel) {
				client.log.error(`Channel ${channelId} not found`);
				return;
			}

			// Load error solutions for names
			const errorsPath = path.join(process.cwd(), 'custom', 'error-solutions.json');
			const errorSolutions = JSON.parse(fs.readFileSync(errorsPath, 'utf-8'));

			// Sort errors by count
			const sortedErrors = Object.entries(analytics)
				.sort((a, b) => b[1].count - a[1].count);

			// Calculate totals
			const totalViews = sortedErrors.reduce((sum, [, data]) => sum + data.count, 0);
			const totalUniqueUsers = new Set(
				sortedErrors.flatMap(([, data]) => data.users)
			).size;

			// Create analytics embed
			const embed = new EmbedBuilder()
				.setColor('#5865F2')
				.setTitle('📊 Error Solutions Analytics')
				.setDescription(
					`**Total Views:** ${totalViews}\n` +
					`**Unique Users:** ${totalUniqueUsers}\n` +
					`**Tracked Errors:** ${sortedErrors.length}`
				)
				.setTimestamp();

			// Add field for each error
			if (sortedErrors.length > 0) {
				const topErrors = sortedErrors.slice(0, 10); // Top 10
				
				for (const [errorType, data] of topErrors) {
					const solution = errorSolutions[errorType];
					const errorName = solution ? solution.title : errorType;
					const percentage = ((data.count / totalViews) * 100).toFixed(1);
					const lastAccessed = data.lastAccessed 
						? new Date(data.lastAccessed).toLocaleDateString() 
						: 'Never';

					embed.addFields({
						name: errorName,
						value: 
							`**Views:** ${data.count} (${percentage}%)\n` +
							`**Unique Users:** ${data.users.length}\n` +
							`**Last Accessed:** ${lastAccessed}`,
						inline: true,
					});
				}
			} else {
				embed.addFields({
					name: 'No Data',
					value: 'No error analytics have been recorded yet.',
				});
			}

			embed.setFooter({ text: 'Analytics are automatically tracked when users select errors' });

			await channel.send({ embeds: [embed] });
			client.log.success(`Sent error analytics to channel ${channelId}`);

		} catch (error) {
			client.log.error('Error generating analytics report:', error);
		}
	}
};
