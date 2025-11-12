# Vouch & Rewards System V2

## How It Works

### 1. Claiming Invoices
- **Anywhere**: Use `/claim invoiceid:xxx` in any channel (orders channel, ticket, etc.)
- **In Ticket**: If claimed in a ticket channel, it auto-links to that ticket
- **Email Link**: System saves the email → user ID link in `profiles.json`

### 2. Automatic Linking When Vouching
When a customer uses `/vouch` in a ticket:
1. Bot checks if invoice is directly linked to ticket (via `ticketId`)
2. If not found, searches for invoices by customer's email from their profile
3. Auto-links the most recent invoice with matching email to the ticket
4. Tracks how many times this invoice has been vouched

### 3. Reward Percentages
- **First Vouch**: 5% of purchase amount
- **Repeat Vouches**: 1% of purchase amount

This prevents abuse while still rewarding staff for follow-up support on the same purchase.

### 4. Visual Indicators
- **First Vouch**: 🟢 Green embed, "New Vouch"
- **Repeat Vouch**: 🔄 Orange embed, "Repeat Vouch", shows vouch count

## Example Flow

### Scenario 1: Direct Link (Claim in Ticket)
```
1. Customer creates ticket
2. Staff helps, customer claims invoice in ticket: /claim invoiceid:abc123
   → Invoice auto-linked to ticket (ticketId saved)
3. Staff requests vouch: /vouch
4. Customer submits 5⭐ review
5. Staff receives 5% reward ($4.00 → $0.20)
```

### Scenario 2: Email-Based Link (Claim Elsewhere)
```
1. Customer claims invoice in #orders: /claim invoiceid:abc123
   → Email linked to user ID in profiles.json
2. Customer creates ticket later
3. Staff helps and requests vouch: /vouch
4. Bot finds invoice by customer's email, auto-links to ticket
5. Customer submits 5⭐ review
6. Staff receives 5% reward ($4.00 → $0.20)
```

### Scenario 3: Repeat Support
```
1. Customer already vouched once for invoice abc123 (5% paid)
2. Customer needs more help, opens new ticket
3. Staff helps and requests vouch: /vouch
4. Bot finds same invoice, sees vouchedCount = 1
5. Customer submits 5⭐ review
6. Staff receives 1% reward ($4.00 → $0.04)
7. Vouch embed shows "🔄 Repeat Vouch • Vouch #2"
```

## Data Structure

### claims.json
```json
{
  "abc123": {
    "userId": "123456789",
    "email": "customer@example.com",
    "amount": 400,
    "product": "Bo6 External",
    "timestamp": "2025-11-12T00:00:00.000Z",
    "autoClaim": false,
    "ticketId": "987654321",
    "linkedAt": "2025-11-12T00:05:00.000Z",
    "vouchedCount": 1,
    "lastVouchedAt": "2025-11-12T00:10:00.000Z"
  }
}
```

### profiles.json
```json
{
  "123456789": {
    "email": "customer@example.com",
    "claims": [
      {
        "invoiceId": "abc123",
        "amount": 400,
        "timestamp": "2025-11-12T00:00:00.000Z"
      }
    ]
  }
}
```

## Benefits

1. **Flexible Claiming**: Customers can claim anywhere, not just in tickets
2. **Automatic Linking**: No manual `/linkinvoice` needed - email lookup handles it
3. **Repeat Support**: Staff still rewarded for follow-up help at reduced rate
4. **Abuse Prevention**: Can't farm rewards by requesting multiple vouches for same invoice
5. **Transparency**: Clear visual indicators show first vs repeat vouches
