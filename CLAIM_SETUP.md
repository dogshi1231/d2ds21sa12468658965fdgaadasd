# 🎫 Invoice Claim System

A custom slash command for Discord Tickets that allows users to claim invoices and link their purchases to their Discord accounts.

## 📋 Features

- ✅ **Invoice Claiming**: Users can claim invoices using `/claim <invoiceId>`
- 🔍 **Automatic Search**: Searches the last 25 messages in a designated orders channel
- 🚫 **Duplicate Prevention**: Prevents invoices from being claimed twice
- 📧 **Email Extraction**: Automatically extracts email, product, and price from embeds
- 👤 **Profile Linking**: Links Discord user ID to email address
- 🎭 **Role Assignment**: Automatically assigns the "Buyer" role
- 📊 **Mod Logging**: Logs all claims to a moderator channel
- 🔒 **Privacy**: Masks email addresses in user-facing responses

## 📁 Files

- `custom/claim.js` - Main command file
- `custom/claim-config.json` - Configuration file
- `data/claims.json` - Stores all claimed invoices
- `data/profiles.json` - Stores user profiles and claim history

## 🚀 Setup

### 1. Configure Channel and Role IDs

Edit `custom/claim-config.json` and replace the placeholder IDs:

```json
{
  "ordersChannelId": "YOUR_ORDERS_CHANNEL_ID",
  "buyerRoleId": "YOUR_BUYER_ROLE_ID",
  "modLogChannelId": "YOUR_MOD_LOG_CHANNEL_ID",
  "messageSearchLimit": 25
}
```

#### How to get Discord IDs:
1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click on a channel or role and select "Copy ID"

### 2. Ensure Data Files Exist

The system will automatically create these files if they don't exist:
- `data/claims.json`
- `data/profiles.json`

### 3. Register the Command

The command should automatically register when you start the bot. If not, ensure that the `custom/` folder is being loaded by your bot's command handler.

## 📖 Usage

### For Users

```
/claim <invoiceId>
```

**Example:**
```
/claim 69aa4e44-8daf-4c8e-9b5e-123456789abc
```

**What happens:**
1. ✅ Bot searches for the invoice in the orders channel
2. ✅ Verifies the invoice hasn't been claimed
3. ✅ Extracts email, product, and price information
4. ✅ Links your Discord account to the email
5. ✅ Assigns you the Buyer role
6. ✅ Logs the claim to the mod channel
7. ✅ Sends you a confirmation with a masked email

### For Administrators

Monitor claims in your designated mod log channel. Each claim includes:
- User who claimed it
- Invoice ID
- Email address
- Product name
- Amount paid
- Timestamp

## 📊 Data Structure

### claims.json

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

### profiles.json

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

## 🔧 Customization

### Embed Field Detection

The command automatically detects email, product, and price from embed fields. It looks for:

- **Email**: Fields containing "email" or "e-mail" in the name
- **Product**: Fields containing "product" or "item" in the name
- **Price**: Fields containing "price", "amount", or "total" in the name

If your embed uses different field names, you can modify the detection logic in `claim.js`:

```javascript
if (fieldName.includes('your-custom-field-name')) {
    // Your custom extraction logic
}
```

### Email Masking

By default, emails are masked as `us*****@email.com`. You can adjust the masking in the code:

```javascript
const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (match, start, middle, domain) => {
    return start + '*'.repeat(middle.length) + domain;
});
```

### Search Limit

By default, the bot searches the last 25 messages. You can change this in `claim-config.json`:

```json
{
  "messageSearchLimit": 50
}
```

## ⚠️ Troubleshooting

### "Orders channel not found"
- Verify the channel ID in `claim-config.json` is correct
- Ensure the bot has permission to read the channel

### "Could not extract email from the invoice embed"
- Check that your invoice embeds contain an email field
- Verify the field name matches the detection patterns
- Add custom detection logic if needed

### "Invoice ID not found"
- The invoice might be older than the search limit
- Increase `messageSearchLimit` in the config
- Ensure the invoice ID is spelled correctly

### Command doesn't appear
- Restart the bot to register the command
- Check that the `custom/` folder is in your bot's command loading path
- Verify there are no syntax errors in `claim.js`

## 🔐 Permissions Required

The bot needs the following permissions:
- ✅ Read Messages/View Channels (for orders channel)
- ✅ Read Message History (to search for invoices)
- ✅ Manage Roles (to assign Buyer role)
- ✅ Send Messages (to log to mod channel)
- ✅ Embed Links (to send embed responses)

## 📝 Notes

- Claims are stored locally in JSON files
- Email addresses are linked to Discord user IDs
- Each invoice can only be claimed once
- The system is ephemeral (responses only visible to the user)
- Errors are logged to the bot's standard logging system

## 🔄 Future Enhancements

Potential features to add:
- Auto-claim based on email verification
- Unclaim command for administrators
- Claim history lookup
- Database integration instead of JSON files
- Webhook support for external payment systems
- Multi-server support

## 📞 Support

If you encounter issues or need help:
1. Check the troubleshooting section above
2. Review your configuration files
3. Check bot logs for error messages
4. Ensure all IDs are correct and the bot has proper permissions

---

**Created for Discord Tickets v4.0**  
**Last Updated: November 11, 2025**
