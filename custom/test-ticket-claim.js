/**
 * Test script to verify ticket claim system configuration
 */

const fs = require('fs');
const path = require('path');

console.log('\n🧪 Testing Ticket Claim System Configuration\n');

// Test 1: Check if claim-config.json exists and is valid
console.log('📋 Test 1: Configuration File');
try {
	const configPath = path.join(__dirname, 'claim-config.json');
	if (!fs.existsSync(configPath)) {
		console.log('   ❌ claim-config.json not found');
	} else {
		const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
		console.log('   ✅ Configuration loaded');
		console.log('   - Orders Channel:', config.ordersChannelId);
		console.log('   - Buyer Role:', config.buyerRoleId);
		console.log('   - Mod Log Channel:', config.modLogChannelId);
		console.log('   - Staff Role:', config.staffRoleId);
		
		if (config.staffRoleId === 'YOUR_STAFF_ROLE_ID') {
			console.log('   ⚠️  Warning: staffRoleId needs to be updated with real Discord ID');
		}
	}
} catch (error) {
	console.log('   ❌ Error reading config:', error.message);
}

// Test 2: Check if TicketClaimManager exists
console.log('\n📋 Test 2: TicketClaimManager Class');
try {
	const TicketClaimManager = require('./tickets.js');
	console.log('   ✅ TicketClaimManager loaded');
	
	// Test instantiation
	const mockClient = {
		log: {
			info: () => {},
			error: () => {},
			debug: () => {},
			warn: () => {},
		}
	};
	const manager = new TicketClaimManager(mockClient);
	console.log('   ✅ TicketClaimManager instantiated');
	console.log('   - Inactivity timeout:', manager.INACTIVITY_TIMEOUT / 1000 / 60, 'minutes');
} catch (error) {
	console.log('   ❌ Error loading TicketClaimManager:', error.message);
}

// Test 3: Check button handler files
console.log('\n📋 Test 3: Button Handler Files');
try {
	const claimButtonPath = path.join(__dirname, '../src/buttons/claim_ticket.js');
	const unclaimButtonPath = path.join(__dirname, '../src/buttons/unclaim_ticket.js');
	
	if (fs.existsSync(claimButtonPath)) {
		const ClaimButton = require(claimButtonPath);
		console.log('   ✅ claim_ticket.js exists');
		
		const mockClient = { log: { info: () => {}, error: () => {}, debug: () => {}, warn: () => {} } };
		const button = new ClaimButton(mockClient, {});
		console.log('   - Button ID:', button.id);
		console.log('   - Has run method:', typeof button.run === 'function');
	} else {
		console.log('   ❌ claim_ticket.js not found');
	}
	
	if (fs.existsSync(unclaimButtonPath)) {
		const UnclaimButton = require(unclaimButtonPath);
		console.log('   ✅ unclaim_ticket.js exists');
		
		const mockClient = { log: { info: () => {}, error: () => {}, debug: () => {}, warn: () => {} } };
		const button = new UnclaimButton(mockClient, {});
		console.log('   - Button ID:', button.id);
		console.log('   - Has run method:', typeof button.run === 'function');
	} else {
		console.log('   ❌ unclaim_ticket.js not found');
	}
} catch (error) {
	console.log('   ❌ Error loading buttons:', error.message);
}

// Test 4: Check /addclaimbutton command
console.log('\n📋 Test 4: AddClaimButton Command');
try {
	const commandPath = path.join(__dirname, '../src/commands/slash/addclaimbutton.js');
	if (fs.existsSync(commandPath)) {
		const Command = require(commandPath);
		console.log('   ✅ addclaimbutton.js exists');
		
		const mockClient = { log: { info: () => {}, error: () => {}, debug: () => {}, warn: () => {} } };
		const cmd = new Command(mockClient, {});
		console.log('   - Command name:', cmd.name);
		console.log('   - Has run method:', typeof cmd.run === 'function');
	} else {
		console.log('   ❌ addclaimbutton.js not found');
	}
} catch (error) {
	console.log('   ❌ Error loading command:', error.message);
}

// Test 5: Check data directory
console.log('\n📋 Test 5: Data Storage');
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
	console.log('   ℹ️  Data directory will be created on first use');
} else {
	console.log('   ✅ Data directory exists');
}

const ticketClaimsPath = path.join(dataDir, 'ticket_claims.json');
if (fs.existsSync(ticketClaimsPath)) {
	const claims = JSON.parse(fs.readFileSync(ticketClaimsPath, 'utf8'));
	console.log('   ✅ ticket_claims.json exists');
	console.log('   - Active claims:', Object.keys(claims).length);
} else {
	console.log('   ℹ️  ticket_claims.json will be created on first claim');
}

console.log('\n✨ Configuration test complete!\n');
console.log('📝 Next steps:');
console.log('   1. Update staffRoleId in custom/claim-config.json (if needed)');
console.log('   2. Restart the bot with: npm start');
console.log('   3. Create a test ticket and use /addclaimbutton');
console.log('   4. Click the Claim Ticket button to test\n');
