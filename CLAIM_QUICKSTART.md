# Quick Start Guide - Invoice Claim System

## 🚀 5-Minute Setup

### Step 1: Configure IDs (Required)
Edit `custom/claim-config.json`:

```json
{
  "ordersChannelId": "YOUR_ORDERS_CHANNEL_ID",
  "buyerRoleId": "YOUR_BUYER_ROLE_ID",
  "modLogChannelId": "YOUR_MOD_LOG_CHANNEL_ID",
  "messageSearchLimit": 25
}
```

**How to get Discord IDs:**
1. Discord Settings → Advanced → Enable "Developer Mode"
2. Right-click channel/role → "Copy ID"

### Step 2: Test Setup (Optional but Recommended)
```bash
node custom/test-claim-setup.js
```

### Step 3: Restart Bot
```bash
npm start
```

### Step 4: Use the Command
```
/claim 69aa4e44-8daf-4c8e-9b5e-123456789abc
```

---

## 📋 What It Does

✅ Searches last 25 messages in #orders_raw  
✅ Verifies invoice hasn't been claimed  
✅ Extracts email, product, price from embed  
✅ Links email to Discord user ID  
✅ Assigns "Buyer" role automatically  
✅ Logs to mod channel  
✅ Replies with masked email confirmation  

---

## 🗂️ Data Files

### `data/claims.json`
Stores all claimed invoices
```json
{
  "invoice-id": {
    "userId": "123456789",
    "email": "user@email.com",
    "amount": 2499,
    "timestamp": "2025-11-11T22:00:00Z",
    "autoClaim": false
  }
}
```

### `data/profiles.json`
Stores user profiles
```json
{
  "123456789": {
    "email": "user@email.com",
    "claims": [
      {
        "invoiceId": "invoice-id",
        "amount": 2499,
        "timestamp": "2025-11-11T22:00:00Z"
      }
    ]
  }
}
```

---

## ⚠️ Common Issues

### "Invoice not found"
- Invoice might be older than 25 messages
- Increase `messageSearchLimit` in config
- Verify invoice ID is correct

### "Orders channel not found"
- Check channel ID in `claim-config.json`
- Ensure bot has "Read Messages" permission

### "Could not extract email"
- Your embed format might be different
- Check embed field names match: "email", "product", "price"
- Customize extraction logic in the code if needed

### Command doesn't appear
- Restart the bot
- Wait 1-2 minutes for Discord to sync
- Check for errors in console

---

## 🔐 Required Bot Permissions

- ✅ Read Messages/View Channels
- ✅ Read Message History
- ✅ Manage Roles
- ✅ Send Messages
- ✅ Embed Links

---

## 📞 Need Help?

1. Run: `node custom/test-claim-setup.js`
2. Check bot console logs for errors
3. Verify all IDs are correct (18-19 digits)
4. Ensure bot has proper permissions

---

## 📚 Full Documentation

See `CLAIM_SETUP.md` for complete documentation including:
- Detailed feature explanations
- Customization options
- Troubleshooting guide
- Email masking configuration
- Embed field detection customization

---

**Built for Discord Tickets v4.0+**
