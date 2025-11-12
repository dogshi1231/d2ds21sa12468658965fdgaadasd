# 🎁 Vouch & Rewards System Documentation

## Overview
The vouch system allows staff members to request customer feedback after completing support tickets. Staff earn 5% of the purchase price as a reward when customers submit positive reviews.

## Features
- ⭐ 1-5 star rating system
- 💬 Optional customer comments
- 💰 Automatic 5% reward calculation
- 📊 Staff balance tracking
- 📝 Comprehensive audit logging
- 🔗 Invoice-to-ticket linking
- 👑 Force vouch for owner (when customer doesn't respond)

## Setup

### 1. Configuration
Edit `custom/vouch-config.json`:
```json
{
  "vouchesChannelId": "1234567890", // Channel where vouches are posted
  "rewardPercentage": 5,            // Percentage of sale given as reward
  "modLogChannelId": "1234567890"   // Channel for staff reward logs
}
```

### 2. Restart Bot
```bash
npm start
```

### 3. Verify Loading
Check startup logs for:
```
[INFO] (COMMANDS) Loaded "vouch" slash command
[INFO] (COMMANDS) Loaded "balance" slash command
[INFO] (COMMANDS) Loaded "linkinvoice" slash command
[INFO] (COMMANDS) Loaded "force" slash command
[INFO] (BUTTONS) Loaded "open_vouch_modal" button
[INFO] (MODALS) Loaded "vouch_submit" modal
```

## Workflow

### Standard Flow (Customer Responds)

1. **Staff claims ticket** using `/addclaimbutton` → Click "Claim Ticket"
2. **Staff links invoice** using `/linkinvoice <invoice_id>`
3. **Staff resolves issue** and helps customer
4. **Staff requests vouch** using `/vouch`
5. **Customer receives DM** with review button
6. **Customer clicks button** and modal opens
7. **Customer enters rating** (1-5) and optional comment
8. **Customer submits** modal
9. **System posts vouch** to #vouches channel
10. **Staff gets reward** (5% of purchase) credited to balance
11. **Audit log updated** with transaction details

### Timeout Flow (Customer Doesn't Respond)

1. Staff uses `/vouch`
2. Customer doesn't respond within 15 minutes
3. **Bot owner** uses `/force <ticket_id>` 
4. Staff gets reward without public vouch

## Commands

### `/vouch`
**Who can use:** Staff members (in claimed tickets only)
**Purpose:** Request customer feedback
**Requirements:**
- Must be in a ticket channel
- Ticket must be claimed
- Ticket must be linked to an invoice (use `/linkinvoice` first)
- Only the claimer can request vouch

**Example:**
```
/vouch
```

**Result:**
- Customer receives DM with review form
- 15-minute timeout starts
- Staff notified of request status

---

### `/balance [user]`
**Who can use:** All staff members (own balance), Moderators (any user's balance)
**Purpose:** Check reward balance and history
**Parameters:**
- `user` (optional): Check another staff member's balance

**Example:**
```
/balance
/balance @John
```

**Shows:**
- Current balance
- Total earned
- Total vouches received
- Recent transaction history (last 5)

---

### `/linkinvoice <invoice_id>`
**Who can use:** Staff members (in tickets)
**Purpose:** Link current ticket to an invoice for reward calculation
**Requirements:**
- Must be in a ticket channel
- Invoice must exist in claims database
- Must be claimed via `/claim` command first

**Example:**
```
/linkinvoice INV-12345
```

**Result:**
- Ticket linked to invoice
- Product and amount displayed
- Ready for `/vouch` command

---

### `/force <ticket_id>`
**Who can use:** Bot owner only
**Purpose:** Manually credit staff without customer vouch
**Use case:** Customer doesn't respond to vouch request after 15 minutes
**Parameters:**
- `ticket_id`: The ticket channel ID

**Example:**
```
/force 1234567890123456789
```

**Result:**
- Staff credited with 5% reward
- No public vouch posted
- Logged in audit as "force_vouch"

## Data Storage

### `data/staff_balances.json`
```json
{
  "123456789": {
    "balance": 150,
    "totalEarned": 150,
    "vouches": 3,
    "history": [
      {
        "amount": 50,
        "reason": "Vouch from ticket general-support - 5⭐",
        "timestamp": "2025-11-11T23:30:00.000Z"
      }
    ]
  }
}
```

### `data/audit_log.json`
```json
[
  {
    "type": "vouch",
    "staffId": "123456789",
    "customerId": "987654321",
    "ticketId": "1234567890",
    "rating": 5,
    "comment": "Amazing support!",
    "product": "Spoofer - 1 Week",
    "cost": 1000,
    "rewardAmount": 50,
    "invoiceId": "INV-12345",
    "timestamp": "2025-11-11T23:30:00.000Z"
  }
]
```

### `data/claims.json` (Extended)
Existing invoice claims are extended with:
```json
{
  "INV-12345": {
    "userId": "987654321",
    "email": "customer@example.com",
    "amount": 1000,
    "product": "Spoofer - 1 Week",
    "timestamp": "2025-11-11T22:00:00.000Z",
    "ticketId": "1234567890",  // NEW: Added by /linkinvoice
    "linkedAt": "2025-11-11T23:00:00.000Z"  // NEW
  }
}
```

## Vouch Embed Format

Posted to `#vouches` channel:
```
🟢 New Vouch
⭐️ ⭐ ⭐ ⭐ ⭐  (5 stars)
🎁 Product: Spoofer - 1 Week
🧑‍💻 Staff: @John
💬 Review: "Amazing support, fast and helpful! Highly recommend."
━━━━━━━━━━━━━━━━━━━━━
Invoice: INV-12345
```

## Reward Calculation

```javascript
const rewardPercentage = 5; // From config
const purchaseAmount = 1000; // From linked invoice
const rewardAmount = Math.floor(purchaseAmount * (rewardPercentage / 100));
// Result: $50 credited to staff balance
```

## Security & Permissions

### `/vouch` - Staff only, must be claimer
- Verifies user has staff role
- Checks ticket is claimed
- Confirms user is the claimer

### `/balance` - Staff can see own, moderators see all
- Anyone can check their own balance
- Moderators can check others' balances

### `/linkinvoice` - Staff only
- Must have staff role
- Can only link invoices in ticket channels

### `/force` - Bot owner only
- Hardcoded check for application owner ID
- Used for exceptional cases only

## Troubleshooting

### "This ticket must be claimed before requesting a vouch"
**Solution:** Use `/addclaimbutton` and click "Claim Ticket" first

### "Could not find cost data for this ticket"
**Solution:** Use `/linkinvoice <invoice_id>` to link the ticket to an invoice

### "Only the bot owner can force vouches"
**Solution:** This command is restricted to the bot owner for manual overrides

### Customer didn't receive DM
**Reasons:**
- Customer has DMs disabled
- Customer blocked the bot
- Customer left the server

**Solution:** Ask customer to enable DMs or use `/force <ticket_id>` after 15 minutes

### Vouch posted but no reward credited
**Check:**
1. Is the invoice linked? (`/linkinvoice` command used?)
2. Does the invoice have a valid `amount` field?
3. Check `data/staff_balances.json` for the entry
4. Review `data/audit_log.json` for errors

## Integration with Existing Systems

### Works With:
- ✅ Ticket claim system (`custom/tickets.js`)
- ✅ Invoice claim system (`/claim` command)
- ✅ Auto-claim watcher (for linking invoices)

### Requires:
- Claims database with invoice data
- Ticket claim manager (for verification)
- Discord Tickets bot framework

## Testing

Run the test script:
```bash
cd bot
node custom/test-vouch-system.js
```

Expected output:
```
✅ RewardsManager loaded
✅ Configuration loaded
✅ All commands present
✅ Button and modal handlers exist
✅ Data storage initialized
```

## Future Enhancements

- [ ] Leaderboard command (`/leaderboard`)
- [ ] Withdraw command (`/withdraw <amount>`)
- [ ] Monthly statistics
- [ ] Auto-DM reminder if customer hasn't responded
- [ ] Customizable reward percentages per product
- [ ] Bonus multipliers for exceptional service (5-star only)

## Support

If you encounter issues:
1. Check bot logs for errors
2. Verify configuration in `custom/vouch-config.json`
3. Ensure all channel IDs are correct
4. Run test script: `node custom/test-vouch-system.js`
5. Check data files in `data/` directory for corruption

---

**Created:** November 11, 2025
**Version:** 1.0.0
**Compatible with:** Discord Tickets v4.0.48
