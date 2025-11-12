const { Listener } = require('@eartharoid/dbf');

module.exports = class ReadyInviteCacheListener extends Listener {
	constructor(client) {
		super(client, {
			emitter: client,
			event: 'ready',
			once: true,
		});
	}

	async run() {
		try {
			const client = this.client;

			// Initialize invite tracker cache if available
			if (!client.inviteTracker) return;

			// Cache invites for all guilds
			for (const guild of client.guilds.cache.values()) {
				try {
					const invites = await guild.invites.fetch();
					inviteListener.inviteCache.set(guild.id, invites);
					client.log.info(`Cached ${invites.size} invites for guild ${guild.name}`);
				} catch (error) {
					client.log.warn(`Failed to cache invites for guild ${guild.name}:`, error.message);
				}
			}

		} catch (error) {
			this.client.log.error('Error caching invites on ready:', error);
		}
	}
};
