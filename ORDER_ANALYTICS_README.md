# Order Analytics System

## Overview
Comprehensive profit tracking, customer analytics, and invite-to-sale conversion monitoring.

## Features

### 1. **Automatic Order Processing**
- Extracts invoice ID, product name, email, and price from order embeds
- Calculates profit based on configurable product costs
- Logs profit to designated channel with color-coded embeds
- Tracks all orders in `data/order_analytics.json`

### 2. **Invoice-User Linking**
- When users claim invoices with `/claim`, they're linked to their Discord ID
- Future orders with matching emails automatically credit the correct user
- Staff earnings continue to be tracked correctly via vouch system

### 3. **Invite Tracking**
- Monitors which users joined via which invites
- Links purchases to the inviter
- Calculates invite-to-profit ratio
- Rewards inviters for bringing in customers

### 4. **Customer Analytics**
- Tracks top customers by total spending
- Aggregates purchases by email
- Shows average order value per customer
- Links customers to Discord accounts when available

## Configuration

### Product Costs (`custom/product-costs.json`)

Update this file with your actual product costs:

```json
{
  "products": {
    "1 Day": {
      "cost": 100,
      "category": "subscription"
    },
    "1 Week": {
      "cost": 500,
      "category": "subscription"
    },
    "1 Month": {
      "cost": 1500,
      "category": "subscription"
    },
    "Lifetime": {
      "cost": 5000,
      "category": "subscription"
    }
  },
  "categories": {
    "subscription": {
      "defaultCost": 1000
    },
    "service": {
      "defaultCost": 0
    }
  },
  "profitChannelId": "1437178768752902145",
  "orderChannelIds": []
}
```

**Important:** All costs are in cents (e.g., 1500 = $15.00)

### Configuration Options:

- **`products`**: Exact product name matches for cost lookup
- **`categories`**: Fallback costs when product name doesn't match exactly
- **`profitChannelId`**: Channel where profit logs are posted
- **`orderChannelIds`**: (Optional) Array of channel IDs to monitor for orders. Leave empty to monitor all channels.

## Commands

### Staff Commands

#### `/orderanalytics`
View comprehensive profit and revenue statistics:
- Total orders, revenue, profit, and costs
- Average order value and profit margin
- Recent orders list

#### `/topinviters`
View top inviters ranked by profit generated:
- Total invites per user
- Total profit from invited members' purchases
- Average profit per invite
- Invite-to-sale conversion tracking

#### `/topcustomers`
View top customers by total spending:
- Total amount spent per customer
- Number of orders per customer
- Average order value
- Discord account linking status

### Customer Commands

#### `/claim <invoiceId>`
Claim an invoice to link it to your Discord account:
- Links your email to your Discord ID
- Enables automatic credit for future purchases
- Required for vouch system participation

## Data Files

All data is stored in JSON files in the `data/` directory:

- **`order_analytics.json`**: All order records with profit calculations
- **`invoice_links.json`**: Mapping of Discord users to emails and invoices
- **`invite_tracking.json`**: Invite usage and profit tracking
- **`customers.json`**: Customer profiles with purchase history
- **`claims.json`**: Invoice claim records
- **`profiles.json`**: Legacy email-to-user mapping

## Order Detection

The system automatically detects orders by monitoring messages with embeds in configured channels (or all channels if none specified).

### Supported Embed Formats:

The system looks for these fields in embeds:
- **Invoice ID**: Fields containing "invoice" and ("id" or "#")
- **Product**: Fields containing "product", "item", or "package"
- **Email**: Fields containing "email" or "customer"
- **Price**: Fields containing "price", "total", or "amount"

### Example Order Embed:
```
Title: New Purchase
Fields:
  - Invoice ID: ABC123
  - Product: 1 Month Key
  - Email: customer@example.com
  - Price: $24.99
```

## Profit Logging

Profit logs are automatically posted to the configured channel with:
- **Green** embed: High profit margin (>30%)
- **Orange** embed: Medium profit margin (10-30%)
- **Red** embed: Low profit margin (<10%)

Each log includes:
- Invoice ID and product name
- Sale price, cost, and calculated profit
- Profit margin percentage
- Customer email and Discord mention (if linked)
- Inviter mention (if tracked)

## Invite Tracking

Invite tracking requires the `GuildInvites` intent (already configured).

**How it works:**
1. Bot caches all invites on startup
2. When a member joins, it detects which invite was used
3. When that member makes a purchase, the inviter gets credit
4. View stats with `/topinviters`

## Integration with Existing Systems

### Vouch System
- When users claim invoices, they're linked for vouch tracking
- Staff rewards continue to work correctly
- Email matching ensures proper credit

### Profile System
- All purchases update customer profiles
- Purchase history includes order analytics data
- Staff can view profiles with `/profile <user>`

### Support Requests
- HWID resets and replacements are logged separately
- Customer purchase history helps staff make decisions
- Warning system integrated with profiles

## Tips

1. **Update Product Costs Regularly**: Keep `product-costs.json` current for accurate profit tracking
2. **Monitor Profit Channel**: Review profit logs to identify unprofitable products
3. **Use Top Customers**: Reward your best customers with special perks
4. **Track Inviters**: Incentivize invites by rewarding high-performing inviters
5. **Review Analytics**: Use `/orderanalytics` regularly to monitor business health

## Troubleshooting

### Orders Not Being Detected
- Check that order embeds contain required fields (invoice ID and price)
- Verify `orderChannelIds` is configured correctly or empty to monitor all channels
- Check logs for extraction errors

### Invites Not Tracking
- Ensure bot has `Manage Server` permission to view invites
- Verify `GuildInvites` intent is enabled in Discord Developer Portal
- Check that invites are cached on startup (look for log message)

### Profit Calculations Wrong
- Verify all costs in `product-costs.json` are in cents
- Check product name matching (partial matches are supported)
- Review fallback category costs

### Users Not Getting Linked
- Make sure users run `/claim` with the correct invoice ID
- Check that email in order embed matches claim email
- Verify invoice exists in recent messages (last 25 by default)

## Example Workflow

1. **Customer makes purchase** → Order embed posted
2. **Bot detects order** → Extracts data and calculates profit
3. **Profit logged** → Posted to profit channel with full details
4. **Customer claims invoice** → `/claim ABC123` links Discord ID to email
5. **Future purchases** → Automatically credited to user
6. **Ticket created** → Staff can see purchase history
7. **Vouch given** → Staff receives proper rewards
8. **Analytics reviewed** → `/orderanalytics`, `/topcustomers`, `/topinviters`

## Support

If you encounter issues or need help configuring the system, create a ticket in the support channel.
