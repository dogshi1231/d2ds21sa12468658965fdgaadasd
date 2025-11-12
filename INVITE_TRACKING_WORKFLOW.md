# 📊 Invite Tracking System - Visual Workflow

## 🔄 Complete System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        BOT STARTUP                               │
│                                                                  │
│  1. src/client.js creates InviteTracker instance                │
│  2. src/listeners/client/ready.js calls initialize()            │
│  3. InviteTracker fetches all server invites                    │
│  4. Caches invite codes + usage counts                          │
│  5. Schedules daily summary task (every 24h)                    │
│                                                                  │
│  Status: ✅ System Ready to Track                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   NEW MEMBER JOINS SERVER                        │
│                                                                  │
│  Discord Event: guildMemberAdd                                  │
│         ↓                                                        │
│  Listener: src/listeners/client/guildMemberAdd-invite.js        │
│         ↓                                                        │
│  Calls: client.inviteTracker.trackMemberJoin(member)            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    INVITE DETECTION LOGIC                        │
│                                                                  │
│  1. Fetch current invite states from Discord                    │
│  2. Compare with cached states (before join)                    │
│  3. Find invite with +1 usage count                            │
│  4. Identify: code, inviter ID, uses                           │
│                                                                  │
│  Algorithm: newInvite.uses > oldInvite.uses = USED             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    RECORD JOIN TO DATABASE                       │
│                                                                  │
│  File: data/inviteLogs.json                                     │
│                                                                  │
│  joins: [                                                        │
│    {                                                             │
│      id: "join_timestamp_random",                               │
│      userId: "123456789",           ← New member                │
│      username: "Customer#1234",                                 │
│      inviteCode: "summer2024",      ← Detected code             │
│      inviterId: "987654321",        ← Credit this person        │
│      joinedAt: "2025-11-12T...",                                │
│      guildId: "111222333",                                      │
│      purchases: []                   ← Empty initially          │
│    }                                                             │
│  ]                                                               │
│                                                                  │
│  stats: {                                                        │
│    "987654321": {                    ← Inviter stats            │
│      totalJoins: 1,                  ← Increment                │
│      totalRevenue: 0,                ← No purchase yet          │
│      uniquePurchasers: [],                                      │
│      invites: ["summer2024"]         ← Track codes used         │
│    }                                                             │
│  }                                                               │
│                                                                  │
│  Status: ✅ Join Recorded                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ⏱️ Time passes...
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  MEMBER MAKES A PURCHASE                         │
│                                                                  │
│  1. Member claims invoice in ticket                             │
│  2. OrderAnalytics.processOrder() extracts:                     │
│     - userId (Discord ID)                                       │
│     - orderAmount ($$$)                                         │
│     - invoiceId                                                 │
│     - product name                                              │
│         ↓                                                        │
│  3. Calls: inviteTracker.linkInviteToOrder()                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  PURCHASE ATTRIBUTION LOGIC                      │
│                                                                  │
│  1. Search inviteLogs.json for join record with userId         │
│  2. Extract inviterId from that record                          │
│  3. Update inviter's stats:                                     │
│                                                                  │
│     stats["987654321"]: {                                       │
│       totalJoins: 127,                                          │
│       totalRevenue: 4250.00,          ← Add order amount        │
│       uniquePurchasers: ["123..."],   ← Add userId if new       │
│       invites: ["summer2024"]                                   │
│     }                                                            │
│                                                                  │
│  4. Add purchase to join record:                                │
│     purchases: [                                                │
│       {                                                          │
│         invoiceId: "INV-001",                                   │
│         product: "Premium Loader",                              │
│         amount: 25.00,                                          │
│         timestamp: "2025-11-12..."                              │
│       }                                                          │
│     ]                                                            │
│                                                                  │
│  Status: ✅ Purchase Linked to Inviter                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│               CONVERSION RATE AUTO-CALCULATED                    │
│                                                                  │
│  Formula: (uniquePurchasers.length / totalJoins) × 100         │
│                                                                  │
│  Example:                                                        │
│    totalJoins: 127                                              │
│    uniquePurchasers: 43                                         │
│    conversionRate: (43 / 127) × 100 = 33.9%                    │
│                                                                  │
│  Rating: 🔥 Elite Converter (50%+ is elite)                     │
└─────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════
                          COMMAND FLOWS
════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                    .invitesummary [period]                       │
│                                                                  │
│  1. Parse time period (24h, 7d, 30d)                           │
│  2. Filter joins within time range                              │
│  3. Count:                                                       │
│     - Total joins                                               │
│     - Users with purchases (new customers)                      │
│     - Total revenue in period                                   │
│  4. Calculate conversion rate                                    │
│  5. Find top inviter for period                                 │
│  6. Get top 5 all-time inviters                                 │
│  7. Generate embed with stats + leaderboard                     │
│                                                                  │
│  Output: 📊 Summary embed                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  .conversiontrack [@user]                        │
│                                                                  │
│  1. Identify target user (mention, ID, or self)                │
│  2. Load stats[userId] from inviteLogs.json                     │
│  3. Calculate:                                                   │
│     - Conversion rate                                           │
│     - Average per customer                                      │
│     - Performance rating                                        │
│  4. Generate progress bar visualization                         │
│  5. Find user's rank among all inviters                         │
│  6. Create detailed performance embed                           │
│                                                                  │
│  Output: 📈 Performance analysis embed                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│               .invitetop [joins/revenue/customers]               │
│                                                                  │
│  1. Choose sorting metric (default: joins)                      │
│  2. Load all inviter stats                                      │
│  3. Sort by selected metric:                                    │
│     - joins: totalJoins descending                              │
│     - revenue: totalRevenue descending                          │
│     - customers: uniquePurchasers.length descending             │
│     - conversion: conversionRate descending                     │
│  4. Take top 10 inviters                                        │
│  5. Add medals for top 3 (🥇🥈🥉)                                │
│  6. Calculate server totals                                     │
│  7. Generate leaderboard embed                                  │
│                                                                  │
│  Output: 🏆 Leaderboard embed                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  .invitelog [@user] [page]                       │
│                                                                  │
│  1. Identify target user                                        │
│  2. Filter joins where inviterId = targetUserId                │
│  3. Sort by joinedAt (newest first)                            │
│  4. Paginate (10 per page)                                      │
│  5. For each join, show:                                        │
│     - Username                                                   │
│     - Join date                                                  │
│     - Invite code used                                          │
│     - Purchase status (💰 or 👤)                                │
│     - Total spent                                               │
│  6. Calculate overview stats                                    │
│  7. Generate paginated log embed                                │
│                                                                  │
│  Output: 📋 Invite log embed with pagination                     │
└─────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════
                      AUTOMATED FEATURES
════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                   DAILY SUMMARY REPORT                           │
│                                                                  │
│  Trigger: Every 24 hours (setInterval)                          │
│           Also runs on bot startup (optional)                   │
│                                                                  │
│  Process:                                                        │
│    1. Get stats for last 24 hours                              │
│    2. Count joins, customers, revenue                           │
│    3. Find top inviter                                          │
│    4. Generate summary embed                                    │
│    5. Post to configured analytics channel                      │
│                                                                  │
│  Configuration:                                                  │
│    - analyticsChannelId in invite-config.json                   │
│    - dailySummaryEnabled toggle                                 │
│                                                                  │
│  Output: 📥 Daily report in #invite-analytics                    │
└─────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════
                        DATA PERSISTENCE
════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                    FILE: inviteLogs.json                         │
│                                                                  │
│  Purpose: Permanent storage of all join + purchase data         │
│  Location: data/inviteLogs.json                                 │
│                                                                  │
│  Structure:                                                      │
│  {                                                               │
│    "joins": [                     ← All join records            │
│      { userId, inviteCode, inviterId, ... }                     │
│    ],                                                            │
│    "stats": {                     ← Per-inviter aggregates      │
│      "inviterId": {                                             │
│        totalJoins: 127,                                         │
│        totalRevenue: 4250.00,                                   │
│        uniquePurchasers: ["id1", "id2"],                        │
│        invites: ["code1", "code2"]                              │
│      }                                                           │
│    }                                                             │
│  }                                                               │
│                                                                  │
│  Auto-creates on first run                                      │
│  Never deleted (permanent history)                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   FILE: inviteCache.json                         │
│                                                                  │
│  Purpose: Cache current Discord invite states                   │
│  Location: data/inviteCache.json                                │
│                                                                  │
│  Structure:                                                      │
│  {                                                               │
│    "guilds": {                                                  │
│      "guildId": {                                               │
│        "inviteCode": {                                          │
│          uses: 45,              ← Current usage count           │
│          inviterId: "userId",                                   │
│          code: "summer2024"                                     │
│        }                                                         │
│      }                                                           │
│    },                                                            │
│    "lastUpdated": "2025-11-12..."                               │
│  }                                                               │
│                                                                  │
│  Updates on every join                                          │
│  Used for invite detection                                      │
└─────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════
                     INTEGRATION POINTS
════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                    WITH ORDER ANALYTICS                          │
│                                                                  │
│  File: custom/order-analytics.js                                │
│  Method: processOrder()                                         │
│                                                                  │
│  Flow:                                                           │
│    Order processed                                              │
│         ↓                                                        │
│    User linked to invoice                                       │
│         ↓                                                        │
│    inviteTracker.linkInviteToOrder(                            │
│      userId,                                                    │
│      amount,                                                    │
│      invoiceId,                                                 │
│      product                                                    │
│    )                                                            │
│         ↓                                                        │
│    Inviter credited automatically                               │
│                                                                  │
│  Status: ✅ Fully integrated                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  WITH DISCORD.JS CLIENT                          │
│                                                                  │
│  File: src/client.js                                            │
│                                                                  │
│  Initialization:                                                │
│    const InviteTracker = require('../custom/invite-tracker');  │
│    this.inviteTracker = new InviteTracker(this);               │
│                                                                  │
│  Intents:                                                        │
│    ✅ GuildInvites - Required for invite.fetch()                │
│    ✅ GuildMembers - Required for join events                   │
│                                                                  │
│  Status: ✅ Fully initialized                                    │
└─────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════
                     PERFORMANCE RATINGS
════════════════════════════════════════════════════════════════════

Conversion Rate → Rating:

50%+ ────────────────────── 🔥 Elite Converter
                            "Exceptional performance!"

30-49% ──────────────────── ⭐ Strong Performer
                            "Above average conversion!"

15-29% ──────────────────── 📈 Good Progress
                            "Solid conversion rate!"

5-14% ───────────────────── 📊 Building Up
                            "Keep growing!"

0-5% ────────────────────── 🌱 Early Stage
                            "Just getting started!"

════════════════════════════════════════════════════════════════════
                         QUICK REFERENCE
════════════════════════════════════════════════════════════════════

Commands:
  .invitesummary [24h/7d/30d]        → Overall statistics
  .conversiontrack [@user]           → User performance
  .invitetop [metric]                → Leaderboard
  .invitelog [@user] [page]          → Detailed logs

Metrics:
  joins        → Total users invited
  revenue      → Money generated
  customers    → Unique purchasers
  conversion   → Purchase rate %

Files:
  custom/invite-tracker.js           → Core system
  custom/invite-config.json          → Configuration
  data/inviteLogs.json               → Permanent data
  data/inviteCache.json              → Invite states

Configuration:
  analyticsChannelId                 → Daily report destination
  dailySummaryEnabled                → Toggle auto reports
  trackingEnabled                    → Master switch

════════════════════════════════════════════════════════════════════
                      SYSTEM STATUS: ✅ READY
════════════════════════════════════════════════════════════════════
