# ✅ Invoice Claim System - Implementation Checklist

## 🎯 Setup Checklist

### Phase 1: Configuration (Required)

- [ ] **Get Discord IDs**
  - [ ] Enable Developer Mode in Discord
    - Path: Settings → Advanced → Developer Mode ✅
  - [ ] Copy Orders Channel ID
    - Right-click #orders_raw → Copy ID
  - [ ] Copy Buyer Role ID
    - Right-click Buyer role → Copy ID
  - [ ] Copy Mod Log Channel ID
    - Right-click mod log channel → Copy ID

- [ ] **Update Configuration File**
  - [ ] Open `custom/claim-config.json`
  - [ ] Replace `ordersChannelId` with your channel ID
  - [ ] Replace `buyerRoleId` with your role ID
  - [ ] Replace `modLogChannelId` with your channel ID
  - [ ] (Optional) Adjust `messageSearchLimit` if needed

### Phase 2: Testing (Recommended)

- [ ] **Run Test Script**
  ```bash
  node custom/test-claim-setup.js
  ```
  - [ ] Config file exists ✓
  - [ ] IDs are not placeholders ✓
  - [ ] Data directory exists ✓
  - [ ] JSON files created ✓
  - [ ] Command file exists ✓

- [ ] **Verify Bot Permissions**
  - [ ] Read Messages/View Channels (orders channel)
  - [ ] Read Message History (orders channel)
  - [ ] Manage Roles (to assign Buyer role)
  - [ ] Send Messages (mod log channel)
  - [ ] Embed Links (all channels)

### Phase 3: Deployment

- [ ] **Start the Bot**
  ```bash
  npm start
  ```
  - [ ] Bot starts without errors
  - [ ] No configuration warnings in console
  - [ ] Command registers successfully

- [ ] **Wait for Command Registration**
  - [ ] Wait 1-2 minutes for Discord to sync commands
  - [ ] Check if `/claim` appears in command list

### Phase 4: Testing

- [ ] **Test the Command**
  - [ ] Type `/claim` in Discord
  - [ ] Command appears in autocomplete
  - [ ] Enter a test invoice ID
  - [ ] Command responds (even if invoice not found)

- [ ] **Test with Real Invoice** (if available)
  - [ ] Find a real invoice ID in #orders_raw
  - [ ] Run `/claim <invoiceId>`
  - [ ] Verify success response
  - [ ] Check you received Buyer role
  - [ ] Check mod log channel for entry
  - [ ] Verify `data/claims.json` was updated
  - [ ] Verify `data/profiles.json` was updated

- [ ] **Test Duplicate Prevention**
  - [ ] Try claiming the same invoice again
  - [ ] Should receive "already claimed" error

---

## 📋 Verification Checklist

### Files Created ✓

- [x] `src/commands/slash/claim.js` - Main command
- [x] `custom/claim.js` - Backup copy
- [x] `custom/claim-config.json` - Configuration
- [x] `custom/test-claim-setup.js` - Test script
- [x] `CLAIM_SETUP.md` - Full documentation
- [x] `CLAIM_QUICKSTART.md` - Quick guide
- [x] `IMPLEMENTATION_SUMMARY.md` - Technical summary
- [x] `WORKFLOW_DIAGRAM.md` - Visual workflow
- [x] `CHECKLIST.md` - This file

### Data Files (Auto-Created)

- [ ] `data/claims.json` - Created on first claim
- [ ] `data/profiles.json` - Created on first claim

---

## 🧪 Test Cases

### Test Case 1: Valid Claim
- **Input:** `/claim <valid-invoice-id>`
- **Expected:** 
  - ✅ Success message with masked email
  - ✅ Buyer role assigned
  - ✅ Mod log entry created
  - ✅ Data files updated

### Test Case 2: Duplicate Claim
- **Input:** `/claim <already-claimed-id>`
- **Expected:**
  - ❌ Error: "Already claimed by @user"

### Test Case 3: Invalid Invoice
- **Input:** `/claim invalid-id-123`
- **Expected:**
  - ❌ Error: "Invoice not found"

### Test Case 4: Wrong Configuration
- **Input:** `/claim` with wrong channel IDs
- **Expected:**
  - ❌ Error: "Channel not found"

---

## 🔍 Validation Steps

### After First Successful Claim

1. **Check User**
   - [ ] User has Buyer role
   - [ ] User received confirmation message

2. **Check Mod Log**
   - [ ] Log entry exists in mod channel
   - [ ] Contains user mention
   - [ ] Contains invoice ID
   - [ ] Contains full email (unmasked)
   - [ ] Contains product name
   - [ ] Contains amount
   - [ ] Contains timestamp

3. **Check Data Files**
   - [ ] `data/claims.json` has entry for invoice
   - [ ] Entry has userId
   - [ ] Entry has email
   - [ ] Entry has amount
   - [ ] Entry has timestamp
   - [ ] Entry has autoClaim: false

   - [ ] `data/profiles.json` has entry for user
   - [ ] Profile has email
   - [ ] Profile has claims array
   - [ ] Claim in array has invoiceId
   - [ ] Claim in array has amount
   - [ ] Claim in array has timestamp

4. **Check Console Logs**
   - [ ] No errors logged
   - [ ] Claim processed successfully

---

## ⚠️ Troubleshooting Checklist

If command doesn't work, check:

- [ ] Configuration file has correct IDs (18-19 digits)
- [ ] IDs are not placeholder values (1234567890123456789)
- [ ] Bot is running and online
- [ ] Bot has all required permissions
- [ ] Bot's role is above Buyer role in hierarchy
- [ ] Orders channel exists and bot can access it
- [ ] Mod log channel exists and bot can access it
- [ ] No syntax errors in console
- [ ] Command registered successfully (wait 1-2 min)

---

## 📊 Expected Outcomes

### User Experience
- [x] Command is ephemeral (only user sees response)
- [x] Email is masked for privacy
- [x] Clear success/error messages
- [x] Fast response time (< 3 seconds)

### Mod Experience
- [x] All claims logged to mod channel
- [x] Full details visible (unmasked email)
- [x] Timestamp for audit trail
- [x] User mention for easy contact

### Data Integrity
- [x] No duplicate claims possible
- [x] All claims stored permanently
- [x] User profiles track claim history
- [x] JSON files are valid and readable

---

## 🎉 Success Criteria

System is fully operational when:

- ✅ `/claim` command appears in Discord
- ✅ Valid claims are processed successfully
- ✅ Duplicate claims are rejected
- ✅ Buyer role is assigned automatically
- ✅ Mod logs are created correctly
- ✅ Data files are updated properly
- ✅ Email masking works correctly
- ✅ No errors in console logs

---

## 📝 Configuration Example

Your `custom/claim-config.json` should look like this (with real IDs):

```json
{
  "ordersChannelId": "987654321098765432",
  "buyerRoleId": "876543210987654321",
  "modLogChannelId": "765432109876543210",
  "messageSearchLimit": 25
}
```

**Note:** These are example IDs. Use your actual Discord IDs!

---

## 🚀 Quick Start Summary

1. ✅ Get Discord IDs (3 required)
2. ✅ Update `custom/claim-config.json`
3. ✅ Run `node custom/test-claim-setup.js`
4. ✅ Start bot with `npm start`
5. ✅ Test `/claim <invoiceId>` command
6. ✅ Verify success in mod log & data files

---

## 📞 Need Help?

- **Configuration issues?** → Check `CLAIM_QUICKSTART.md`
- **Technical details?** → Check `CLAIM_SETUP.md`
- **How it works?** → Check `WORKFLOW_DIAGRAM.md`
- **Implementation info?** → Check `IMPLEMENTATION_SUMMARY.md`

---

**Current Status:** 🟡 Awaiting Configuration

**Next Step:** Update `custom/claim-config.json` with your Discord IDs

**Last Updated:** November 11, 2025
