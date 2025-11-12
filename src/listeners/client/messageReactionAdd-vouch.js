const { Listener } = require('@eartharoid/dbf');

module.exports = class MessageReactionAddVouchListener extends Listener {
	constructor(client) {
		super(client, {
			emitter: client,
			event: 'messageReactionAdd',
		});
	}

	/**
	 * @param {import('discord.js').MessageReaction} reaction
	 * @param {import('discord.js').User} user
	 */
	async run(reaction, user) {
		// Ignore bot reactions
		if (user.bot) return;

		try {
			const client = this.client;

			// Check if vouch system is initialized
			if (!client.vouchSystem) return;

			// Fetch full message if partial
			if (reaction.partial) {
				await reaction.fetch();
			}

			// Process vouch reaction
			await client.vouchSystem.processVouchReaction(reaction, user);

		} catch (error) {
			this.client.log.error('Error in messageReactionAdd (vouch):', error);
		}
	}
};
