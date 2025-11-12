# Claim Command Configuration

The `/claim` command has been created and placed in `src/commands/slash/claim.js`.

## ⚙️ Configuration Required

Before the command will work properly, you need to configure the following IDs in the file `src/commands/slash/claim.js` (around line 28-31):

```javascript
// TODO: Replace these with actual channel and role IDs from your server
const ORDERS_CHANNEL_ID = '1234567890123456789'; // Replace with your #orders_raw channel ID
const BUYER_ROLE_ID = '1234567890123456789'; // Replace with your Buyer role ID
const MOD_LOG_CHANNEL_ID = '1234567890123456789'; // Replace with your mod log channel ID
```

### How to get Discord IDs:
1. Enable Developer Mode in Discord: User Settings → Advanced → Developer Mode
2. Right-click on the channel/role → Copy ID

## 📁 Data Files

The command uses two JSON files in the `data/` directory:

### `data/claims.json`
Stores claim records by invoice ID:
```json
{
  "69aa4e44-8daf-...": {
    "userId": "123456789012345678",
    "email": "user@email.com",
    "amount": 2499,
    "timestamp": "2025-11-11T22:00:00Z",
    "autoClaim": false
  }
}
```

### `data/profiles.json`
Links user IDs to their email and claim history:
```json
{
  "123456789012345678": {
    "email": "user@email.com",
    "claims": [
      {
        "invoiceId": "69aa4e44-8daf-...",
        "amount": 2499,
        "timestamp": "2025-11-11T22:00:00Z"
      }
    ]
  }
}
```

## 🚀 Features

The `/claim <invoiceId>` command:

1. ✅ Searches the last 25 messages in the configured orders channel for an embed containing the invoice ID
2. ✅ Verifies the invoice hasn't been claimed yet (checks `data/claims.json`)
3. ✅ Extracts email, product, and price from the embed
4. ✅ Links the email to the user ID (stores in both `claims.json` and `profiles.json`)
5. ✅ Assigns the Buyer role if not already given
6. ✅ Logs success to the configured mod log channel
7. ✅ Replies with masked email confirmation to the user

## 🔄 Next Steps

1. Open `src/commands/slash/claim.js`
2. Replace the placeholder IDs with your actual Discord channel/role IDs
3. Restart the bot
4. The `/claim` command should now appear and be functional

## 📝 Usage

Once configured, users can claim invoices with:
```
/claim invoiceid:69aa4e44-8daf-...
```

The command will:
- Show an ephemeral (private) message during processing
- Prevent duplicate claims
- Mask the email for privacy (e.g., `us****@email.com`)
- Send a beautiful embed confirmation to the user
- Log the claim to the mod channel for staff tracking
