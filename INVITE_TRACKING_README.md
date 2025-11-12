# 📊 Invite Tracking & Analytics System

## Overview
Complete invite tracking system that monitors which invites bring users to your server, tracks their purchase behavior, and provides detailed conversion analytics for your staff and invite creators.

---

## 🎯 Features

### 1. **Automatic Invite Tracking**
- Tracks which invite code each user joined with
- Records the invite creator for attribution
- Stores join timestamps and guild information
- Works across multiple guilds

### 2. **Purchase Attribution**
- Links customer orders to their invite source
- Credits revenue to invite creators automatically
- Tracks unique purchasers per inviter
- Calculates conversion rates

### 3. **Conversion Analytics**
- Real-time conversion rate calculations
- Revenue tracking per inviter
- Unique purchaser counting
- Performance ratings and badges

### 4. **Daily Reports**
- Automated 24-hour summaries
- Posts to designated analytics channel
- Shows top performers automatically
- Configurable schedule

---

## 📁 Files Created

### Core System
- **`custom/invite-tracker.js`** - Main InviteTracker manager class
- **`custom/invite-config.json`** - Configuration file
- **`data/inviteLogs.json`** - Join records and statistics
- **`data/inviteCache.json`** - Cached invite states

### Integration
- **`src/listeners/client/guildMemberAdd-invite.js`** - Join event handler (updated)
- **`custom/order-analytics.js`** - Order linking integration (updated)
- **`src/client.js`** - InviteTracker initialization (updated)
- **`src/listeners/client/ready.js`** - System startup (updated)

### Commands
- **`src/stdin/invitesummary.js`** - Summary statistics command
- **`src/stdin/conversiontrack.js`** - User conversion tracking
- **`src/stdin/invitetop.js`** - Top inviters leaderboard
- **`src/stdin/invitelog.js`** - Detailed invite log viewer

---

## ⚙️ Configuration

Edit **`custom/invite-config.json`**:

```json
{
  "analyticsChannelId": "YOUR_CHANNEL_ID_HERE",
  "dailySummaryEnabled": true,
  "trackingEnabled": true
}
```

### Settings:
- **`analyticsChannelId`**: Channel where daily reports are posted
- **`dailySummaryEnabled`**: Enable/disable automated daily reports
- **`trackingEnabled`**: Master switch for invite tracking

---

## 📊 Commands

### `.invitesummary [period]`
Shows overall invite statistics for a time period.

**Usage:**
```
.invitesummary          # Last 24 hours (default)
.invitesummary 7d       # Last 7 days
.invitesummary 30d      # Last 30 days
```

**Shows:**
- Total joins in period
- New customers (users who made purchases)
- Conversion rate percentage
- Revenue generated
- Top inviter for the period
- Top 5 inviters all-time

**Example Output:**
```
📊 Overall Statistics:
• Total joins: 56
• New customers: 19
• Conversion rate: 33.9%
• Revenue generated: $1,247.50

🏆 Top Inviter (This Period):
StaffMember#1234
└ 14 joins • $395.00 revenue

🌟 Top 5 Inviters (All Time):
🥇 StaffMember#1234
   └ 127 joins • 43 customers • $4,250.00
🥈 InviteKing#5678
   └ 98 joins • 31 customers • $3,100.50
...
```

---

### `.conversiontrack [@user]`
Detailed conversion analysis for a specific user.

**Usage:**
```
.conversiontrack                # Your own stats
.conversiontrack @StaffMember   # Specific user stats
.conversiontrack 123456789      # By user ID
```

**Shows:**
- Total joins brought by their invites
- Number of customers generated
- Conversion rate with visual progress bar
- Total revenue attributed
- Average revenue per customer
- Performance rating and badge
- Active invite codes
- Rank among all inviters

**Performance Ratings:**
- 🔥 **Elite Converter** (50%+ conversion)
- ⭐ **Strong Performer** (30-49%)
- 📈 **Good Progress** (15-29%)
- 📊 **Building Up** (5-14%)
- 🌱 **Early Stage** (<5%)

**Example Output:**
```
📈 Performance Metrics:

Total Joins: 127
Customers Generated: 43
Conversion Rate: 🔥 33.9%

💰 Revenue Generated:
Total: $4,250.00
Avg per customer: $98.84

Conversion Progress:
████████████████░░░░ 33.9%

Rating: 🔥 Elite Converter - Exceptional performance!

Active Invite Codes: 3
`summer2024`, `promo-special`, `vip-access`
```

---

### `.invitetop [metric]`
Leaderboard of top inviters by various metrics.

**Usage:**
```
.invitetop              # By total joins (default)
.invitetop revenue      # By revenue generated
.invitetop customers    # By unique purchasers
.invitetop conversion   # By conversion rate
```

**Metrics:**
- **joins** - Total users invited
- **revenue** - Total money generated
- **customers** - Unique purchasers
- **conversion** - Conversion rate percentage

**Shows:**
- Top 10 inviters
- Medals for top 3 (🥇🥈🥉)
- Relevant stats per metric
- Server totals at bottom

**Example Output:**
```
🏆 Top Inviters - Revenue Generated

🥇 StaffMember#1234
   💵 $4,250.00 revenue • 127 joins • 43 customers

🥈 InviteKing#5678
   💵 $3,100.50 revenue • 98 joins • 31 customers

🥉 PromoGuru#9012
   💵 $2,875.25 revenue • 85 joins • 28 customers

4. MemberFour#3456
   💵 $1,950.00 revenue • 67 joins • 19 customers

...

📊 Server Totals
534 joins • 182 customers • $15,320.75 revenue • 34.1% conversion
```

---

### `.invitelog [@user] [page]`
Lists all users who joined via a specific user's invites.

**Usage:**
```
.invitelog                  # Your invite log
.invitelog @StaffMember     # Specific user's log
.invitelog @Staff 2         # Page 2 of their log
```

**Shows:**
- All users invited by the target user
- Join dates for each user
- Invite code used
- Purchase status (💰 customer or 👤 non-customer)
- Total spending per customer
- Paginated view (10 per page)

**Example Output:**
```
📊 Overview
Total Invited: 127 | Customers: 43 | Revenue: $4,250.00

Members (1-10 of 127)

1. 💰 Customer#1234
   └ Joined: Nov 10, 2025 • Code: `summer2024` • $150.00

2. 👤 Member#5678
   └ Joined: Nov 09, 2025 • Code: `summer2024`

3. 💰 Buyer#9012
   └ Joined: Nov 08, 2025 • Code: `promo-special` • $89.99

...

Page 1/13 • Use .invitelog @user [page] to navigate
```

---

## 🔄 Automated Features

### Daily Summary Report
Posted automatically every 24 hours to your analytics channel.

**Includes:**
- Total joins in last 24 hours
- New customers count
- Conversion rate
- Revenue generated
- Top inviter with their stats

**Example:**
```
📥 Daily Invite Report
Period: Last 24 Hours

📊 Statistics:
• Total joins: 56
• New customers: 19
• Conversion rate: 33.9%
• Revenue generated: $1,247.50

🏆 Top Inviter:
StaffMember#1234 - 14 joins, $395.00 revenue
```

---

## 🔗 Integration Flow

### 1. Member Joins
```
User joins server
    ↓
Bot compares invite usage counts
    ↓
Identifies which invite was used
    ↓
Records to inviteLogs.json:
  - User ID
  - Invite code
  - Inviter user ID
  - Join timestamp
    ↓
Updates inviter's totalJoins counter
```

### 2. Purchase Made
```
Customer claims invoice in ticket
    ↓
Order analytics extracts user ID
    ↓
InviteTracker checks inviteLogs.json
    ↓
Finds original invite creator
    ↓
Links purchase to inviter:
  - Adds to uniquePurchasers array
  - Increases totalRevenue
  - Records purchase in join record
    ↓
Inviter's conversion rate updates automatically
```

### 3. Statistics Calculation
```
Command triggered (.conversiontrack, .invitetop, etc.)
    ↓
InviteTracker loads inviteLogs.json
    ↓
Calculates real-time metrics:
  - Conversion rate = uniquePurchasers / totalJoins
  - Average per customer = totalRevenue / uniquePurchasers
  - Rankings by selected metric
    ↓
Generates embed with visuals
    ↓
Sends to user
```

---

## 📊 Data Structure

### inviteLogs.json
```json
{
  "joins": [
    {
      "id": "join_1699999999999_abc123",
      "userId": "123456789012345678",
      "username": "Customer#1234",
      "inviteCode": "summer2024",
      "inviterId": "987654321098765432",
      "joinedAt": "2025-11-12T10:30:00.000Z",
      "guildId": "111222333444555666",
      "purchases": [
        {
          "invoiceId": "INV-001",
          "product": "Premium Loader",
          "amount": 25.00,
          "timestamp": "2025-11-12T11:45:00.000Z"
        }
      ]
    }
  ],
  "stats": {
    "987654321098765432": {
      "totalJoins": 127,
      "totalRevenue": 4250.00,
      "uniquePurchasers": [
        "123456789012345678",
        "234567890123456789"
      ],
      "invites": ["summer2024", "promo-special"]
    }
  }
}
```

### inviteCache.json
```json
{
  "guilds": {
    "111222333444555666": {
      "summer2024": {
        "uses": 45,
        "inviterId": "987654321098765432",
        "code": "summer2024"
      }
    }
  },
  "lastUpdated": "2025-11-12T12:00:00.000Z"
}
```

---

## 🚀 Usage Tips

### For Server Owners
1. **Set Analytics Channel**: Update `analyticsChannelId` in `invite-config.json`
2. **Create Custom Invites**: Give staff unique invite codes to track
3. **Monitor Performance**: Check `.invitetop revenue` weekly
4. **Reward Top Performers**: Use conversion data for bonuses

### For Staff
1. **Check Your Stats**: Run `.conversiontrack` regularly
2. **Share Your Code**: Promote your invite link
3. **Track Growth**: Use `.invitelog` to see who you invited
4. **Improve Conversion**: Focus on welcoming new members

### Best Practices
- Create descriptive invite codes (e.g., `staff-john`, `promo-fall`)
- Never delete invites - it breaks tracking
- Check daily summaries for trends
- Use conversion rate to evaluate marketing campaigns

---

## 🛠️ Technical Details

### Intents Required
- `GuildInvites` ✅ (already enabled)
- `GuildMembers` ✅ (already enabled)

### How Invite Detection Works
1. Bot caches all invites and their usage counts on startup
2. When member joins, bot fetches current invite states
3. Compares old vs new usage counts
4. The invite with +1 usage is the one used
5. Updates cache with new states

### Performance Considerations
- Invite cache stored in memory + disk
- JSON files auto-create if missing
- Statistics calculated on-demand
- Daily summaries run once per 24h
- Minimal database load

---

## 🔧 Troubleshooting

### "No tracked invite found"
- User joined before tracking was enabled
- Invite was created via vanity URL or widget
- Bot didn't have GuildInvites intent when they joined

### "User not found"
- User left the server
- User ID is invalid
- Bot lacks access to user

### Daily reports not posting
- Check `analyticsChannelId` is correct
- Verify bot has Send Messages permission in channel
- Ensure `dailySummaryEnabled: true` in config

### Stats seem wrong
- Stats only track from when system was enabled
- Check if user deleted and recreated invites
- Verify order claiming is working properly

---

## 📈 Performance Metrics

Track your server's overall invite performance:

- **High-performing servers**: 30%+ conversion rate
- **Average servers**: 15-30% conversion
- **Growing servers**: 5-15% conversion
- **New servers**: 0-5% conversion

**Improvement strategies:**
- Welcome new members immediately
- Guide them through purchase process
- Offer first-time buyer discounts
- Create engaging community

---

## 🎯 Example Workflows

### Monthly Staff Review
```bash
.invitetop revenue        # See who generated most income
.conversiontrack @Staff   # Check individual performance
.invitelog @Staff         # Review specific invites
```

### Marketing Campaign Tracking
```bash
# Create campaign-specific invite: "black-friday-2024"
# After campaign:
.invitesummary 7d         # Check campaign impact
.invitetop customers      # See who brought most buyers
```

### New Staff Onboarding
```bash
# Give new staff custom invite code
.conversiontrack @NewStaff  # Monitor their progress
# Coach based on conversion rate
```

---

## ✅ Summary

The invite tracking system provides:
- **Attribution**: Know who brought each member
- **Analytics**: Detailed conversion and revenue metrics
- **Automation**: Daily reports with zero manual work
- **Motivation**: Performance tracking encourages growth
- **Insights**: Data-driven decisions for marketing

All data is persistent, all commands are real-time, and the system integrates seamlessly with your existing order analytics and ticket systems.

---

*System ready to track invites, attribute purchases, and measure your growth! 🚀*
