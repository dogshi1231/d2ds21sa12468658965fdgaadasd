const { Listener } = require('@eartharoid/dbf');
const { ChannelType } = require('discord.js');

module.exports = class extends Listener {
	constructor(client, options) {
		super(client, {
			...options,
			emitter: client,
			event: 'voiceStateUpdate',
		});
	}

	/**
	 * @param {import("discord.js").VoiceState} oldState
	 * @param {import("discord.js").VoiceState} newState
	 */
	async run(oldState, newState) {
		/** @type {import("client")} */
		const client = this.client;

		// Check if user joined a voice channel (wasn't in VC before, now is)
		if (!oldState.channel && newState.channel) {
			// User joined a voice channel
			if (client.analytics) {
				client.analytics.trackVCJoin();
			}

			client.log.debug(`User ${newState.member.user.tag} joined VC: ${newState.channel.name}`);
		}
	}
};
