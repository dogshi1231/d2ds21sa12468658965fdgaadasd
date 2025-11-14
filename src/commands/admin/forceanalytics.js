const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forceanalytics')
        .setDescription('Force-send the analytics report right now')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     */
    async execute(interaction) {
        const client = interaction.client;

        // Make sure analytics exists
        if (!client.analytics || typeof client.analytics.postAnalyticsReport !== 'function') {
            return interaction.reply({
                content: '❌ Analytics system is not initialized on this bot.',
                ephemeral: true,
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            await client.analytics.postAnalyticsReport(interaction.guild.id);
            await interaction.editReply('✅ Analytics report has been posted.');
        } catch (error) {
            console.error('Error forcing analytics report:', error);
            await interaction.editReply('❌ Failed to post analytics report. Check console logs.');
        }
    },
};
