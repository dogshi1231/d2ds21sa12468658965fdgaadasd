const { Listener } = require('@eartharoid/dbf');

module.exports = class GuildMemberAddInviteListener extends Listener {
	constructor(client) {
		super(client, {
			emitter: client,
			event: 'guildMemberAdd',
		});
	}

	/**
	 * @param {import('discord.js').GuildMember} member
	 */
	async run(member) {
		try {
			// Skip bots
			if (member.user.bot) return;

			const client = this.client;

			// Use new InviteTracker system if available
			if (client.inviteTracker) {
				await client.inviteTracker.trackMemberJoin(member);
			}

			// Maintain backward compatibility with old order analytics system
			if (client.orderAnalytics && client.orderAnalytics.trackInviteJoin) {
				// Fetch current invites to find which was used (for legacy system)
				const newInvites = await member.guild.invites.fetch();
				const guildId = member.guild.id;

				// Get cached invites from InviteTracker
				if (client.inviteTracker && client.inviteTracker.inviteCache) {
					const oldInvites = client.inviteTracker.inviteCache.get(guildId);

					if (oldInvites) {
						// Find which invite was used
						const usedInvite = newInvites.find(invite => {
							const oldInvite = oldInvites.get(invite.code);
							return oldInvite && invite.uses > oldInvite.uses;
						});

						if (usedInvite && usedInvite.inviter) {
							// Track in legacy order analytics
							client.orderAnalytics.trackInviteJoin(
								member.user.id,
								usedInvite.inviter.id,
								usedInvite.code
							);
						}
					}
				}
			}

		} catch (error) {
			this.client.log.error('Error tracking invite join:', error);
		}
	}
};
