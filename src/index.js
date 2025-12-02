/**
 * Discord Tickets
 * Copyright (C) 2022 Isaac Saunders
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * @name discord-tickets/bot
 * @description An open-source Discord bot for ticket management
 * @copyright 2022 Isaac Saunders
 * @license GNU-GPLv3
 */

/* eslint-disable no-console */

const pkg = require('../package.json');
const banner = require('./lib/banner');
banner(pkg.version); // print big title

const semver = require('semver');
const { colours } = require('leeks.js');
const path = require('path');

// check node version
if (!semver.satisfies(process.versions.node, pkg.engines.node)) {
	console.log('\x07' + colours.redBright(`Error: Your current Node.js version, ${process.versions.node}, does not meet the requirement "${pkg.engines.node}". Please update to version ${semver.minVersion(pkg.engines.node).version} or higher.`));
	process.exit(1);
}

// check cwd
const base_dir = path.resolve(path.join(__dirname, '../'));
const cwd = path.resolve(process.cwd());
if (base_dir !== cwd) {
	console.log('\x07' + colours.yellowBright('Warning: The current working directory is not the same as the base directory.'));
	if (!process.env.DOCKER) {
		console.log(colours.yellowBright('This may result in unexpected behaviour, particularly with missing environment variables.'));
	}
	console.log('  Base directory:    ' + colours.gray(base_dir));
	console.log('  Current directory: ' + colours.gray(cwd));
	console.log(colours.blueBright('  Learn more at https://lnk.earth/dt-cwd.'));
}

process.env.NODE_ENV ??= 'production'; // make sure NODE_ENV is set
require('./env').load(); // load and check environment variables

const fs = require('fs');
const YAML = require('yaml');
const logger = require('./lib/logger');
const dns = require('node:dns');
const dnsPromises = require('node:dns').promises;

// create a Logger using the default config
// and set listeners as early as possible.
let config = YAML.parse(fs.readFileSync(path.join(__dirname, 'user/config.yml'), 'utf8'));
let log = logger(config);

function exit(signal) {
	log.notice(`Received ${signal}`);
	client.destroy();
	process.exit(0);
}

process.on('SIGTERM', () => exit('SIGTERM'));

process.on('SIGINT', () => exit('SIGINT'));

process.on('uncaughtException', (error, origin) => {
	log.notice(`Discord Tickets v${pkg.version} on Node.js ${process.version} (${process.platform})`);
	log.warn(origin === 'uncaughtException' ? 'Uncaught exception' : 'Unhandled promise rejection' + ` (${error.name})`);
	log.error(error);
});

process.on('warning', warning => log.warn(warning.stack || warning));

// Optional: override DNS servers if the host resolver is problematic
try {
	const dnsEnv = (process.env.DNS_SERVERS || '').trim();
	if (dnsEnv) {
		const servers = dnsEnv.split(',').map(s => s.trim()).filter(Boolean);
		if (servers.length) {
			dns.setServers(servers);
			log.info('DNS servers set: ' + servers.join(', '));
		}
	} else {
		// Default to common public resolvers if not specified
		dns.setServers(['8.8.8.8', '1.1.1.1']);
		log.info('DNS servers set (default): 8.8.8.8, 1.1.1.1');
	}
	// Prefer IPv4 when dual-stack results are returned
	if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
} catch (e) {
	log.warn('Failed to set DNS servers: ' + (e?.message || String(e)));
}

// DNS preflight for Sellhub base to surface resolver issues early
(async () => {
	try {
		const base = (process.env.SELLHUB_API_BASE || 'https://dash.sellhub.cx/api/sellhub').trim();
		const host = new URL(base).hostname;
		const a = await dnsPromises.resolve(host);
		log.info(`[DNS] ${host} -> ${Array.isArray(a) ? a.join(', ') : String(a)}`);
	} catch (e) {
		log.warn(`[DNS] Preflight failed: ${e?.message || String(e)}`);
	}
})();

// INIT Sentry if required ENV vars are set
const sentryEnabled = !!process.env.SENTRY_DSN;
if(sentryEnabled) {
	log.info('Enabling Sentry');
	require('./sentry-init.js');
}

const Client = require('./client');
const http = require('./http');

// the `user` directory may or may not exist depending on if sqlite is being used.
// copy any files that don't already exist
fs.cpSync(path.join(__dirname, 'user'), './user', {
	force: false,
	recursive: true,
});

// initialise the framework and client,
// which also loads the custom config and creates a new Logger.
const client = new Client(config, log);

// allow any config changes to affect the above listeners
// as long as these `client` properties are not reassigned.
config = client.config;
log = client.log;

// Initialize shared core backend (Phase 2)
try {
	const { AnalyticsEngine } = require('./core/analytics/engine');
	const { SellhubAPI } = require('./core/sellhub/api');
	const db = require('./core/database');

	// Do not override custom analytics (used by listeners); expose core as analyticsEngine
	client.analyticsEngine = new AnalyticsEngine({ client, db });
	const SELLHUB_API_KEY = (process.env.SELLHUB_API_KEY || process.env.SELLHUB_KEY || '').trim();
	const SELLHUB_API_BASE = (process.env.SELLHUB_API_BASE || '').trim();
	if (SELLHUB_API_KEY) {
		const options = {};
		if (SELLHUB_API_BASE) options.baseUrl = SELLHUB_API_BASE;
		client.sellhub = new SellhubAPI(SELLHUB_API_KEY, options);
		log.info('Sellhub API initialized');
	} else {
		log.debug('SELLHUB_KEY not set; Sellhub API disabled');
	}
	log.info('AnalyticsEngine initialized');
} catch (e) {
	log.warn('Core backend init failed:', e.message);
}

// start the bot and then the web server
client.login().then(() => {
	http(client);

	// Auto-publish slash commands on headless hosts (Railgun/Railway)
	(async () => {
		if (process.env.PUBLISH_COMMANDS_ON_START === '1') {
			try {
				if (client.commands?.publish) {
					const res = await client.commands.publish();
					log.info(`Published slash commands${res?.size ? ` (${res.size})` : ''}`);
				} else if (client.application?.commands) {
					let defs = client.commands?.commands
						?.map(c => c.data?.toJSON?.() ?? c.data)
						?.filter(Boolean) ?? [];

					// Sanitize and inspect unexpected fields that Discord may reject
					const stripKeys = ['oauth2_install_params', 'install_params', 'redirect_uris'];
					defs = defs.map(d => {
						try {
							const clone = JSON.parse(JSON.stringify(d));
							for (const k of stripKeys) if (k in clone) delete clone[k];
							return clone;
						} catch { return d; }
					});
					// Log any suspicious keys (without blocking)
					for (const d of defs) {
						if (d && (d.redirect_uris || d.oauth2_install_params || d.install_params)) {
							log.warn(`Command ${d.name} contains install-related fields that will be stripped before publish.`);
						}
					}
					await client.application.commands.set(defs);
					log.info(`Published slash commands via Discord API (${defs.length})`);
				}
			} catch (err) {
				log.error('Slash command publish failed:', err);
				// Fallback: publish commands individually to isolate the culprit
				try {
					let defs = client.commands?.commands
						?.map(c => c.data?.toJSON?.() ?? c.data)
						?.filter(Boolean) ?? [];
					const stripKeys = ['oauth2_install_params', 'install_params', 'redirect_uris'];
					for (const def of defs) {
						let clean = def;
						try {
							clean = JSON.parse(JSON.stringify(def));
							for (const k of stripKeys) if (k in clean) delete clean[k];
						} catch {}
						try {
							await client.application.commands.create(clean);
							log.info(`Published command: ${clean?.name || '(unknown)'}`);
						} catch (e) {
							log.error(`Failed to publish command ${clean?.name || '(unknown)'}:`, e?.rawError || e?.message || e);
						}
					}
				} catch (e2) {
					log.error('Per-command publish fallback also failed:', e2);
				}
			}
		}
	})();
});
