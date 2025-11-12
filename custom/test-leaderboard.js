/**
 * Test script for leaderboard and staff balance features
 */

const fs = require('fs');
const path = require('path');

console.log('\n📊 Testing Leaderboard & Staff Balance System\n');

// Test 1: Check commands
console.log('📋 Test 1: Commands');
const commands = ['sbal', 'leaderboard'];
for (const cmdName of commands) {
	try {
		const cmdPath = path.join(__dirname, `../src/commands/slash/${cmdName}.js`);
		if (fs.existsSync(cmdPath)) {
			console.log(`   ✅ /${cmdName} command exists`);
		} else {
			console.log(`   ❌ /${cmdName}.js not found`);
		}
	} catch (error) {
		console.log(`   ❌ /${cmdName} - Error: ${error.message}`);
	}
}

// Test 2: Check RewardsManager methods
console.log('\n📋 Test 2: RewardsManager Methods');
try {
	const RewardsManager = require('./rewards.js');
	const mockClient = {
		log: { info: () => {}, error: () => {}, debug: () => {}, warn: () => {} },
		channels: { fetch: () => Promise.resolve(null) },
		application: { fetch: () => Promise.resolve({ owner: { id: '123' } }) },
	};
	const manager = new RewardsManager(mockClient);

	console.log('   ✅ RewardsManager loaded');
	console.log('   ✅ getStaffBalance method:', typeof manager.getStaffBalance === 'function' ? 'exists' : 'missing');
	console.log('   ✅ getStaffTicketCount method:', typeof manager.getStaffTicketCount === 'function' ? 'exists' : 'missing');
	console.log('   ✅ getLeaderboardData method:', typeof manager.getLeaderboardData === 'function' ? 'exists' : 'missing');

	// Test getStaffBalance
	const balance = manager.getStaffBalance('123456789');
	console.log('\n   📊 Test Balance Data:');
	console.log('      - Balance:', balance.balance);
	console.log('      - Total Earned:', balance.totalEarned);
	console.log('      - Vouches:', balance.vouches);

	// Test getLeaderboardData with mock guild
	const mockGuild = { id: 'test' };
	const leaderboard = manager.getLeaderboardData(mockGuild);
	console.log('\n   📊 Test Leaderboard Data:');
	console.log('      - Top earners:', leaderboard.byEarnings.length);
	console.log('      - Top by vouches:', leaderboard.byVouches.length);
	console.log('      - Top by tickets:', leaderboard.byTickets.length);

} catch (error) {
	console.log('   ❌ Error:', error.message);
}

// Test 3: Check staff_balances.json
console.log('\n📋 Test 3: Staff Balance Data');
const balancesPath = path.join(__dirname, '../data/staff_balances.json');
if (fs.existsSync(balancesPath)) {
	try {
		const content = fs.readFileSync(balancesPath, 'utf8');
		if (content.trim().length === 0) {
			console.log('   ℹ️  staff_balances.json is empty (no staff data yet)');
		} else {
			const balances = JSON.parse(content);
			const staffCount = Object.keys(balances).length;
			console.log(`   ✅ staff_balances.json loaded - ${staffCount} staff members`);
			
			if (staffCount > 0) {
				const totalEarnings = Object.values(balances).reduce((sum, staff) => sum + (staff.totalEarned || 0), 0);
				const totalVouches = Object.values(balances).reduce((sum, staff) => sum + (staff.vouches || 0), 0);
				console.log(`   📊 Total earnings across all staff: $${totalEarnings.toFixed(2)}`);
				console.log(`   📊 Total vouches: ${totalVouches}`);
			}
		}
	} catch (error) {
		console.log('   ⚠️  Error reading staff_balances.json:', error.message);
	}
} else {
	console.log('   ℹ️  staff_balances.json will be created on first vouch');
}

// Test 4: Check audit log
console.log('\n📋 Test 4: Audit Log');
const auditPath = path.join(__dirname, '../data/audit_log.json');
if (fs.existsSync(auditPath)) {
	try {
		const content = fs.readFileSync(auditPath, 'utf8');
		if (content.trim().length === 0) {
			console.log('   ℹ️  audit_log.json is empty (no transactions yet)');
		} else {
			const audit = JSON.parse(content);
			console.log(`   ✅ audit_log.json loaded - ${audit.length} transactions`);
			
			if (audit.length > 0) {
				const vouches = audit.filter(e => e.type === 'vouch').length;
				const forceVouches = audit.filter(e => e.type === 'force_vouch').length;
				console.log(`   📊 Regular vouches: ${vouches}`);
				console.log(`   📊 Force vouches: ${forceVouches}`);
			}
		}
	} catch (error) {
		console.log('   ⚠️  Error reading audit_log.json:', error.message);
	}
} else {
	console.log('   ℹ️  audit_log.json will be created on first transaction');
}

console.log('\n✨ Leaderboard system test complete!\n');
console.log('📝 Commands Available:');
console.log('   /sbal - View your staff balance and stats (staff only)');
console.log('   /leaderboard - View leaderboard (anyone)');
console.log('   /leaderboard public:true - Post to leaderboard channel (staff only)\n');
console.log('📍 Leaderboard Channel: 1381097783204777984\n');
console.log('🎯 Usage Examples:');
console.log('   1. Staff member: /sbal → See your earnings, vouches, tickets');
console.log('   2. Anyone: /leaderboard → Preview leaderboard privately');
console.log('   3. Staff: /leaderboard public:true → Post to public channel\n');
