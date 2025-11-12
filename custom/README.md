# Custom Folder - Invoice Claim System

This folder contains configuration and testing files for the Invoice Claim System.

## 📁 Files in This Folder

### `claim.js`
**Backup copy of the main claim command.**

This is a reference copy of the claim command implementation. The actual command that runs is located at:
- `../src/commands/slash/claim.js`

If you need to restore the command, copy this file to the location above.

---

### `claim-config.json`
**⚠️ Configuration file - REQUIRES SETUP**

This file contains the Discord channel and role IDs needed for the claim system to work.

**Current Status:** 🟡 Contains placeholder values  
**Action Required:** Update with your actual Discord IDs

```json
{
  "ordersChannelId": "YOUR_ORDERS_CHANNEL_ID",
  "buyerRoleId": "YOUR_BUYER_ROLE_ID",
  "modLogChannelId": "YOUR_MOD_LOG_CHANNEL_ID",
  "messageSearchLimit": 25
}
```

**How to get IDs:**
1. Enable Developer Mode in Discord (Settings → Advanced)
2. Right-click channel/role → Copy ID
3. Paste the 18-19 digit ID into this file

**Required IDs:**
- **ordersChannelId**: The channel where invoice embeds are posted (#orders_raw)
- **buyerRoleId**: The role to assign to users who claim invoices
- **modLogChannelId**: The channel where claim logs should be sent

**Optional Settings:**
- **messageSearchLimit**: How many messages to search (default: 25)

---

### `test-claim-setup.js`
**Testing script to verify your configuration.**

Run this script to check if everything is set up correctly:

```bash
node custom/test-claim-setup.js
```

**What it checks:**
1. ✅ Configuration file exists
2. ✅ IDs are not placeholder values
3. ✅ Data directory exists
4. ✅ JSON data files are created/accessible
5. ✅ Main command file exists

**When to run:**
- After updating `claim-config.json`
- Before starting the bot
- When troubleshooting issues
- After making any configuration changes

---

## 🚀 Quick Setup

1. **Update Configuration**
   ```bash
   # Edit claim-config.json with your Discord IDs
   ```

2. **Test Configuration**
   ```bash
   node custom/test-claim-setup.js
   ```

3. **Start Bot**
   ```bash
   npm start
   ```

4. **Use Command**
   ```
   /claim <invoiceId>
   ```

---

## 📊 Data Storage

The claim system stores data in:
- `../data/claims.json` - All claimed invoices
- `../data/profiles.json` - User profiles and claim history

These files are automatically created when the first claim is made.

---

## 🔧 Maintenance

### Backup Command File
If the main command file gets corrupted or modified:
```bash
cp custom/claim.js src/commands/slash/claim.js
```

### Reset Data
To clear all claims (⚠️ Use with caution):
```bash
echo {} > data/claims.json
echo {} > data/profiles.json
```

### Update Configuration
Simply edit `claim-config.json` and restart the bot.

---

## 📚 Documentation

For detailed documentation, see:
- `../CHECKLIST.md` - Setup checklist
- `../CLAIM_QUICKSTART.md` - Quick start guide
- `../CLAIM_SETUP.md` - Full documentation
- `../IMPLEMENTATION_SUMMARY.md` - Technical overview
- `../WORKFLOW_DIAGRAM.md` - Visual workflow

---

## ⚠️ Important Notes

- The configuration file is read each time a claim is processed
- Changes to `claim-config.json` take effect immediately (no restart needed)
- Invalid IDs will cause the command to fail with an error message
- The test script does not connect to Discord (safe to run anytime)

---

## 🎯 Status Check

**Configuration Status:** 🟡 Needs Setup  
**Next Step:** Edit `claim-config.json` with your Discord IDs

Run the test script to verify!

---

**Part of Discord Tickets Invoice Claim System**  
**Last Updated:** November 11, 2025
