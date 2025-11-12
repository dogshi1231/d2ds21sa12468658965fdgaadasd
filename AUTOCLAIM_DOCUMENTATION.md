# 🤖 Auto-Claim System Documentation

## Overview

The auto-claim system automatically monitors your orders channel and links new purchases to existing users based on their email addresses.

## How It Works

```
New Order Posted → Bot Detects Embed → Extracts Email → Finds Matching User → Auto-Claims Invoice → Updates Data → Assigns Role → Notifies User
```

## Features

✅ **Automatic Detection** - Monitors #orders_raw channel in real-time  
✅ **Email Matching** - Links orders to users who have previously claimed with that email  
✅ **Lifetime Spend Tracking** - Calculates total amount spent by each user  
✅ **Role Assignment** - Automatically assigns Buyer role if missing  
✅ **Mod Logging** - Logs all auto-claims to mod channel  
✅ **User Notification** - Sends DM to user about the auto-claim  
✅ **Duplicate Prevention** - Won't auto-claim already claimed invoices  

---

## Setup

### Prerequisites

1. User must have claimed at least one invoice manually using `/claim`
2. Their email must be stored in `data/profiles.json`
3. The orders channel must be configured in `custom/claim-config.json`

### Configuration

Auto-claim uses the same configuration as manual claims:
```json
{
  "ordersChannelId": "YOUR_ORDERS_CHANNEL_ID",
  "buyerRoleId": "YOUR_BUYER_ROLE_ID",
  "modLogChannelId": "YOUR_MOD_LOG_CHANNEL_ID",
  "messageSearchLimit": 100
}
```

---

## User Flow

### First Purchase (Manual)
```
1. User sees invoice in #orders_raw
2. User runs /claim <invoiceId>
3. System links email to their Discord ID
4. Stored in data/profiles.json
```

### Subsequent Purchases (Automatic)
```
1. New invoice posted in #orders_raw
2. Bot detects embed with same email
3. Automatically links to user
4. User receives DM notification
5. Mod log shows auto-claim
6. Lifetime spend updated
```

---

## Data Structure

### Auto-Claim Entry in `claims.json`
```json
{
  "invoice-id-here": {
    "userId": "123456789012345678",
    "email": "user@email.com",
    "amount": 2499,
    "timestamp": "2025-11-11T22:00:00Z",
    "autoClaim": true  ← Marked as automatic
  }
}
```

### Profile Entry in `profiles.json`
```json
{
  "123456789012345678": {
    "email": "user@email.com",
    "lifetimeSpend": 7497,  ← Total of all claims
    "claims": [
      {
        "invoiceId": "first-invoice",
        "amount": 2499,
        "timestamp": "2025-11-10T22:00:00Z",
        "autoClaim": false
      },
      {
        "invoiceId": "second-invoice",
        "amount": 2499,
        "timestamp": "2025-11-11T10:00:00Z",
        "autoClaim": true  ← Auto-claimed
      },
      {
        "invoiceId": "third-invoice",
        "amount": 2499,
        "timestamp": "2025-11-11T22:00:00Z",
        "autoClaim": true  ← Auto-claimed
      }
    ]
  }
}
```

---

## What Gets Auto-Claimed

The system will automatically claim an invoice if:

✅ Posted in the configured orders channel  
✅ Contains an embed with invoice ID  
✅ Contains an email address  
✅ Email matches a user in `profiles.json`  
✅ Invoice hasn't been claimed yet  
✅ Bot can extract the invoice ID  

The system will NOT auto-claim if:

❌ Message is from a bot  
❌ No embed present  
❌ Email not found in embed  
❌ Email not linked to any user  
❌ Invoice already claimed  
❌ Posted in wrong channel  

---

## Notifications

### User Notification (DM)
```
🤖 Purchase Automatically Linked

A new purchase has been automatically linked to your account!

Invoice ID: abc-123-def
Email: us*****@email.com
Product: Premium Subscription
Amount: $24.99
Total Lifetime Spend: $74.97

This was automatically detected based on your email address
```

### Mod Log Notification
```
🤖 Invoice Auto-Claimed

User: @Username
Invoice ID: abc-123-def
Email: user@email.com (unmasked)
Product: Premium Subscription
Amount: $24.99
Lifetime Spend: $74.97
Type: 🤖 Automatic

Auto-claimed based on linked email
```

---

## Invoice ID Detection

The system looks for UUIDs in various formats:

```javascript
// Pattern 1: "Invoice: abc-123-def-456-ghi"
/invoice[:\s]+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i

// Pattern 2: "ID: abc-123-def-456-ghi"
/id[:\s]+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i

// Pattern 3: Just the UUID anywhere
/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
```

---

## Email Detection

The system extracts email from:

1. **Embed fields** with names containing:
   - "email"
   - "e-mail"

2. **Embed description/title** using regex:
   - `/[\w.-]+@[\w.-]+\.\w+/`

---

## Lifetime Spend Tracking

**Calculation:**
```javascript
lifetimeSpend = sum of all claim amounts (in cents)
```

**Example:**
```
Claim 1: $24.99 (2499 cents)
Claim 2: $49.99 (4999 cents)
Claim 3: $19.99 (1999 cents)
------------------------
Total:   $94.97 (9497 cents)
```

**Stored as:**
```json
{
  "lifetimeSpend": 9497
}
```

**Displayed as:**
```javascript
`$${(lifetimeSpend / 100).toFixed(2)}` // "$94.97"
```

---

## Testing Auto-Claim

### Test Scenario

1. **Setup:**
   - Start the bot
   - User claims one invoice manually: `/claim invoice-1`

2. **Post Test Order:**
   - Post a message with an embed in #orders_raw
   - Include the same email address
   - Include a new invoice ID

3. **Expected Result:**
   - Bot auto-claims within seconds
   - User receives DM
   - Mod log shows entry
   - `data/claims.json` updated
   - `data/profiles.json` updated with lifetime spend

---

## Troubleshooting

### Auto-Claim Not Working

**Check 1: Configuration**
```bash
node custom/test-claim-setup.js
```

**Check 2: User Has Profile**
- Open `data/profiles.json`
- Verify user ID exists
- Verify email is stored

**Check 3: Channel ID**
- Verify orders channel ID in config
- Bot has READ_MESSAGES permission

**Check 4: Console Logs**
Look for debug messages:
```
Auto-claim skipped for invoice xyz: email not linked
```

### Email Not Matching

- Check email is exact match (case-insensitive)
- Verify email format in embed
- Check for extra whitespace

### Invoice ID Not Detected

- Ensure invoice ID is a valid UUID format
- Check it's in the embed (not just plain text)
- Try different invoice ID patterns

---

## Comparison: Manual vs Auto

| Feature | Manual `/claim` | Auto-Claim |
|---------|----------------|------------|
| **User Action** | Required | None |
| **Speed** | Instant (on command) | Instant (on message) |
| **First Purchase** | ✅ Yes | ❌ No (needs profile) |
| **Subsequent Purchases** | Optional | ✅ Automatic |
| **Email Required** | ✅ Yes | ✅ Yes |
| **Role Assignment** | ✅ Yes | ✅ Yes |
| **Mod Log** | ✅ Green | 🔵 Blue |
| **User DM** | ❌ No | ✅ Yes |
| **Lifetime Tracking** | ✅ Yes | ✅ Yes |
| **Marked As** | `autoClaim: false` | `autoClaim: true` |

---

## Best Practices

### For Administrators

1. **Initial Setup**
   - Have users claim their first purchase manually
   - This creates their profile and links their email

2. **Monitoring**
   - Watch mod log channel for auto-claims
   - Verify lifetime spend calculations
   - Check for any errors in console

3. **Email Changes**
   - If user changes email, they'll need to `/claim` again
   - Old email won't auto-claim new purchases

### For Users

1. **First Purchase**
   - Use `/claim <invoiceId>` for first order
   - This links your email to your Discord account

2. **Future Purchases**
   - No action needed!
   - Orders auto-link to your account
   - You'll get a DM notification

---

## Performance

- **Latency:** < 1 second (real-time)
- **Resource Usage:** Minimal (event-driven)
- **Scaling:** Handles unlimited orders
- **Reliability:** Resilient to errors

---

## Security

✅ **Email Privacy** - Masked in user DMs  
✅ **No Duplicate Claims** - Checked before processing  
✅ **Error Handling** - Fails gracefully  
✅ **Permission Checks** - Verifies role permissions  
✅ **Data Validation** - Sanitizes all inputs  

---

## Future Enhancements

Potential improvements:
- [ ] Support multiple emails per user
- [ ] Configurable notification preferences
- [ ] Reward tiers based on lifetime spend
- [ ] Auto-upgrade roles at spend thresholds
- [ ] Analytics dashboard
- [ ] Export claims to CSV
- [ ] Webhook support for external systems

---

## Support

**File:** `src/listeners/client/messageCreate.js`  
**Lines:** Auto-claim logic at end of file  
**Config:** `custom/claim-config.json`  
**Data:** `data/claims.json` + `data/profiles.json`  

**Debug Logging:**
- Check console for `Auto-claimed invoice...` messages
- Check console for `Auto-claim skipped...` messages
- Check mod log channel for 🤖 entries

---

**Last Updated:** November 11, 2025  
**Feature Status:** ✅ Fully Operational
