/**
 * Test script for vouch/rewards system
 */

const fs = require('fs');
const path = require('path');

console.log('\n🎁 Testing Vouch & Rewards System Configuration\n');

// Test 1: Check RewardsManager
console.log('📋 Test 1: RewardsManager Class');
try {
	const RewardsManager = require('./rewards.js');
	console.log('   ✅ RewardsManager loaded');
	
	const mockClient = {
		log: { info: () => {}, error: () => {}, debug: () => {}, warn: () => {} },
		channels: { fetch: () => Promise.resolve(null) },
		application: { fetch: () => Promise.resolve({ owner: { id: '123' } }) },
	};
	const manager = new RewardsManager(mockClient);
	console.log('   ✅ RewardsManager instantiated');
	console.log('   - Reward percentage:', manager.config.rewardPercentage + '%');
} catch (error) {
	console.log('   ❌ Error:', error.message);
}

// Test 2: Check configuration
console.log('\n📋 Test 2: Vouch Configuration');
try {
	const configPath = path.join(__dirname, 'vouch-config.json');
	if (!fs.existsSync(configPath)) {
		console.log('   ❌ vouch-config.json not found');
	} else {
		const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
		console.log('   ✅ Configuration loaded');
		console.log('   - Vouches Channel:', config.vouchesChannelId);
		console.log('   - Reward Percentage:', config.rewardPercentage + '%');
		console.log('   - Mod Log Channel:', config.modLogChannelId);
		
		if (config.vouchesChannelId === 'YOUR_VOUCHES_CHANNEL_ID') {
			console.log('   ⚠️  Warning: vouchesChannelId needs real Discord channel ID');
		}
		if (config.modLogChannelId === 'YOUR_MOD_LOG_CHANNEL_ID') {
			console.log('   ⚠️  Warning: modLogChannelId needs real Discord channel ID');
		}
	}
} catch (error) {
	console.log('   ❌ Error:', error.message);
}

// Test 3: Check commands
console.log('\n📋 Test 3: Vouch Commands');
const commands = ['vouch', 'balance', 'linkinvoice', 'force'];
for (const cmdName of commands) {
	try {
		const cmdPath = path.join(__dirname, `../src/commands/slash/${cmdName}.js`);
		if (fs.existsSync(cmdPath)) {
			const Command = require(cmdPath);
			const mockClient = { log: { info: () => {}, error: () => {}, debug: () => {}, warn: () => {} } };
			const cmd = new Command(mockClient, {});
			console.log(`   ✅ /${cmdName} - ${cmd.description}`);
		} else {
			console.log(`   ❌ /${cmdName}.js not found`);
		}
	} catch (error) {
		console.log(`   ❌ /${cmdName} - Error: ${error.message}`);
	}
}

// Test 4: Check button and modal handlers
console.log('\n📋 Test 4: Interaction Handlers');
try {
	const buttonPath = path.join(__dirname, '../src/buttons/open_vouch_modal.js');
	if (fs.existsSync(buttonPath)) {
		console.log('   ✅ open_vouch_modal button handler exists');
	} else {
		console.log('   ❌ open_vouch_modal.js not found');
	}
	
	const modalPath = path.join(__dirname, '../src/modals/vouch_submit.js');
	if (fs.existsSync(modalPath)) {
		console.log('   ✅ vouch_submit modal handler exists');
	} else {
		console.log('   ❌ vouch_submit.js not found');
	}
} catch (error) {
	console.log('   ❌ Error:', error.message);
}

// Test 5: Check data directory
console.log('\n📋 Test 5: Data Storage');
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
	console.log('   ℹ️  Data directory will be created on first use');
} else {
	console.log('   ✅ Data directory exists');
	
	const files = [
		{ name: 'staff_balances.json', desc: 'Staff reward balances' },
		{ name: 'audit_log.json', desc: 'Reward audit log' },
		{ name: 'claims.json', desc: 'Invoice claims (for linking)' },
	];
	
	for (const file of files) {
		const filePath = path.join(dataDir, file.name);
		if (fs.existsSync(filePath)) {
			try {
				const content = fs.readFileSync(filePath, 'utf8');
				if (content.trim().length === 0) {
					console.log(`   ℹ️  ${file.name} is empty, will be initialized on first use`);
				} else {
					const data = JSON.parse(content);
					const count = Array.isArray(data) ? data.length : Object.keys(data).length;
					console.log(`   ✅ ${file.name} - ${count} entries`);
				}
			} catch (error) {
				console.log(`   ⚠️  ${file.name} exists but has invalid JSON`);
			}
		} else {
			console.log(`   ℹ️  ${file.name} will be created on first use`);
		}
	}
}

console.log('\n✨ Vouch system configuration test complete!\n');
console.log('📝 Next steps:');
console.log('   1. Update vouchesChannelId in custom/vouch-config.json');
console.log('   2. Update modLogChannelId in custom/vouch-config.json');
console.log('   3. Restart the bot: npm start');
console.log('   4. In a claimed ticket, use /linkinvoice <invoice_id>');
console.log('   5. Use /vouch to request customer feedback');
console.log('   6. Customer receives DM with review form');
console.log('   7. Staff gets 5% reward credited to balance\n');
console.log('📚 Commands:');
console.log('   /vouch - Request customer feedback (in claimed tickets)');
console.log('   /balance - Check your reward balance');
console.log('   /linkinvoice <id> - Link ticket to invoice');
console.log('   /force <ticket_id> - Force vouch without customer (owner only)\n');
