# 📊 Staff Balance & Leaderboard System - Quick Reference

## ✅ System Overview

The staff performance tracking system is **fully implemented** and ready to use!

### 🎯 Features Implemented:
- ✅ `/sbal` - Personal staff stats dashboard
- ✅ `/leaderboard` - Public leaderboard with rankings
- ✅ Automatic tracking of earnings, vouches, and tickets
- ✅ Rank badges based on performance
- ✅ Real-time leaderboard updates

---

## 📱 Commands

### `/sbal` - Staff Balance
**Who:** Staff members only  
**Privacy:** Always private (ephemeral)

**Shows:**
- 💰 Total Earnings (all-time)
- 💳 Current Balance
- 🎟️ Tickets Handled
- ⭐ Total Vouches Received
- 📊 Average Earnings per Vouch
- 🏆 Performance Rank (Beginner → Elite)
- 🕓 Last 5 Payouts with dates

**Rank System:**
- 🌟 **Beginner**: $0 - $9.99
- 🥉 **Bronze**: $10 - $49.99
- 🥈 **Silver**: $50 - $99.99
- 🥇 **Gold**: $100 - $249.99
- 💎 **Diamond**: $250 - $499.99
- 🏆 **Elite**: $500+

**Example Output:**
```
📄 Staff Profile — John

💰 Total Earnings: $78.50
💳 Current Balance: $78.50
🎟️ Tickets Handled: 14 tickets
⭐ Total Vouches: 12 reviews
📊 Avg per Vouch: $6.54
🏆 Rank: 🥈 Silver

🕓 Last 5 Payouts:
1. $12.50 — Vouch from ticket general-support - 5⭐ (Nov 10)
2. $5.00 — Vouch from ticket billing-inquiry - 4⭐ (Nov 10)
3. $6.25 — Vouch from ticket tech-support - 5⭐ (Nov 9)
4. $20.00 — Vouch from ticket urgent-help - 5⭐ (Nov 8)
5. $3.00 — Vouch from ticket quick-question - 3⭐ (Nov 7)
```

---

### `/leaderboard [public:true/false]`
**Who:** Anyone can view, staff can post publicly  
**Default:** Private preview  
**With `public:true`:** Posts to leaderboard channel

**Shows:**
1. 💰 **Top 5 Earners** (by total earnings)
2. ⭐ **Top 5 by Vouches** (most reviews received)
3. 🎟️ **Top 5 by Tickets** (most tickets handled)
4. 📊 **Overall Stats** (team totals)

**Leaderboard Channel:** `1381097783204777984`

**Example Output:**
```
🏆 Staff Leaderboard — All Time

Top performing staff members based on earnings and tickets handled.

💰 Top Earners:
🥇 John — $145.00
🥈 Amy — $92.50
🥉 Hex — $78.25
4️⃣ Sarah — $65.00
5️⃣ Mike — $54.75

⭐ Most Vouches:
🥇 Amy — 34 vouches
🥈 John — 28 vouches
🥉 Hex — 24 vouches
4️⃣ Sarah — 20 vouches
5️⃣ Mike — 18 vouches

🎟️ Most Tickets:
🥇 Amy — 38 tickets
🥈 John — 32 tickets
🥉 Hex — 28 tickets
4️⃣ Sarah — 24 tickets
5️⃣ Mike — 20 tickets

📊 Overall Stats:
💰 Total Paid: $435.50
⭐ Total Vouches: 124
🎟️ Total Tickets: 142
```

---

## 🔧 Technical Details

### Data Sources:
1. **`data/staff_balances.json`** - Earnings, vouches, payout history
2. **`data/audit_log.json`** - All vouch transactions and tickets
3. **`data/claims.json`** - Invoice claims (for ticket counting)

### Tracking Logic:
- **Earnings**: Tracked when vouches are processed (5% commission)
- **Vouches**: Incremented each time customer submits review
- **Tickets**: Counted from audit log (vouch + force_vouch entries)

### Leaderboard Sorting:
- **By Earnings**: `totalEarned` (descending)
- **By Vouches**: `vouches` count (descending)
- **By Tickets**: Count from audit log (descending)

---

## 🎯 Usage Scenarios

### Scenario 1: Staff Checks Performance
```
Staff: /sbal
Bot: [Shows earnings, rank, recent payouts]
```

### Scenario 2: Preview Leaderboard
```
Anyone: /leaderboard
Bot: [Shows leaderboard privately]
```

### Scenario 3: Post Public Leaderboard
```
Staff: /leaderboard public:true
Bot: ✅ Leaderboard posted to #leaderboard-channel
```

---

## 📈 How Stats Update

### When `/vouch` is completed:
1. ✅ Staff balance increases by 5% of purchase
2. ✅ Vouch count increments by 1
3. ✅ Ticket count increments by 1
4. ✅ Transaction logged to history
5. ✅ Leaderboard automatically reflects changes

### When `/force` is used:
1. ✅ Staff balance increases by 5% of purchase
2. ✅ Ticket count increments by 1
3. ✅ Vouch count stays same (no customer review)
4. ✅ Transaction logged as "force_vouch"

---

## 🧪 Testing

Run the test script:
```bash
node custom/test-leaderboard.js
```

**Expected Output:**
```
✅ /sbal command exists
✅ /leaderboard command exists
✅ RewardsManager methods working
```

---

## 🚀 Quick Start

1. **Restart bot** to load new commands:
   ```bash
   npm start
   ```

2. **Staff checks their stats:**
   ```
   /sbal
   ```

3. **Post public leaderboard:**
   ```
   /leaderboard public:true
   ```

4. **Preview leaderboard:**
   ```
   /leaderboard
   ```

---

## 💡 Tips

- **Motivate staff**: Post leaderboard weekly/monthly
- **Recognize top performers**: Use leaderboard for bonuses
- **Track progress**: Staff can check `/sbal` anytime
- **Public recognition**: Leaderboard shows top 5 in each category
- **Fair ranking**: Separate categories prevent gaming system

---

**System Status:** ✅ Fully Operational  
**Version:** 1.0.0  
**Last Updated:** November 11, 2025
