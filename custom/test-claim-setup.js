// Test script for the claim system
// This script helps verify your configuration and data files

const fs = require('fs');
const path = require('path');

console.log('🔍 Claim System Configuration Test\n');

// Check config file
const configPath = path.join(__dirname, 'claim-config.json');
console.log('1. Checking claim-config.json...');
if (fs.existsSync(configPath)) {
	const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
	console.log('   ✅ Config file exists');
	console.log('   📋 Orders Channel ID:', config.ordersChannelId);
	console.log('   📋 Buyer Role ID:', config.buyerRoleId);
	console.log('   📋 Mod Log Channel ID:', config.modLogChannelId);
	console.log('   📋 Message Search Limit:', config.messageSearchLimit);
	
	if (config.ordersChannelId === '1234567890123456789' ||
	    config.buyerRoleId === '1234567890123456789' ||
	    config.modLogChannelId === '1234567890123456789') {
		console.log('   ⚠️  WARNING: You are still using placeholder IDs!');
		console.log('   ⚠️  Please update claim-config.json with your actual Discord IDs\n');
	} else {
		console.log('   ✅ Configuration looks good!\n');
	}
} else {
	console.log('   ❌ Config file not found at:', configPath);
	console.log('   ⚠️  The system will use default values\n');
}

// Check data directory
const dataDir = path.join(__dirname, '..', 'data');
console.log('2. Checking data directory...');
if (fs.existsSync(dataDir)) {
	console.log('   ✅ Data directory exists\n');
} else {
	console.log('   ⚠️  Data directory not found. Creating it...');
	fs.mkdirSync(dataDir, { recursive: true });
	console.log('   ✅ Created data directory\n');
}

// Check claims.json
const claimsPath = path.join(dataDir, 'claims.json');
console.log('3. Checking claims.json...');
if (fs.existsSync(claimsPath)) {
	const claims = JSON.parse(fs.readFileSync(claimsPath, 'utf8'));
	const claimCount = Object.keys(claims).length;
	console.log(`   ✅ Claims file exists with ${claimCount} claim(s)\n`);
} else {
	console.log('   ⚠️  Claims file not found. Creating it...');
	fs.writeFileSync(claimsPath, '{}', 'utf8');
	console.log('   ✅ Created claims.json\n');
}

// Check profiles.json
const profilesPath = path.join(dataDir, 'profiles.json');
console.log('4. Checking profiles.json...');
if (fs.existsSync(profilesPath)) {
	const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
	const profileCount = Object.keys(profiles).length;
	console.log(`   ✅ Profiles file exists with ${profileCount} profile(s)\n`);
} else {
	console.log('   ⚠️  Profiles file not found. Creating it...');
	fs.writeFileSync(profilesPath, '{}', 'utf8');
	console.log('   ✅ Created profiles.json\n');
}

// Check claim.js
const claimCommandPath = path.join(__dirname, 'claim.js');
console.log('5. Checking claim.js command file...');
if (fs.existsSync(claimCommandPath)) {
	console.log('   ✅ Claim command file exists\n');
} else {
	console.log('   ❌ Claim command file not found at:', claimCommandPath);
	console.log('   ⚠️  The claim command will not work!\n');
}

console.log('✅ Configuration test complete!\n');
console.log('📋 Next steps:');
console.log('   1. Update claim-config.json with your Discord channel and role IDs');
console.log('   2. Restart your bot to register the /claim command');
console.log('   3. Test the command with a real or test invoice ID');
console.log('\n💡 To get Discord IDs:');
console.log('   1. Enable Developer Mode in Discord (Settings → Advanced)');
console.log('   2. Right-click on channels/roles and select "Copy ID"');
