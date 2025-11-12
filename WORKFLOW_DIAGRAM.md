# 🔄 Invoice Claim System - Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER RUNS /claim <invoiceId>                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Bot defers reply (ephemeral - only user sees)          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LOAD CONFIGURATION                                │
│  • Read custom/claim-config.json                                    │
│  • Get ordersChannelId, buyerRoleId, modLogChannelId               │
│  • Get messageSearchLimit (default: 25)                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LOAD EXISTING DATA                                │
│  • Read data/claims.json (all claimed invoices)                     │
│  • Read data/profiles.json (all user profiles)                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              CHECK IF INVOICE ALREADY CLAIMED                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
           ✅ ALREADY                  ❌ NOT CLAIMED
            CLAIMED                      (Continue)
                │                         │
                ▼                         ▼
    ┌───────────────────────┐  ┌───────────────────────────────────┐
    │ Reply: "❌ Already    │  │   SEARCH ORDERS CHANNEL            │
    │ claimed by @user"     │  │ • Fetch ordersChannelId           │
    │ [END]                 │  │ • Get last N messages             │
    └───────────────────────┘  │ • Search for invoiceId in embeds  │
                               └────────────┬──────────────────────┘
                                            │
                               ┌────────────┴────────────┐
                               │                         │
                          ✅ FOUND                   ❌ NOT FOUND
                               │                         │
                               ▼                         ▼
              ┌──────────────────────────┐   ┌───────────────────────┐
              │ EXTRACT DATA FROM EMBED  │   │ Reply: "❌ Invoice   │
              │ • Email                  │   │ not found"            │
              │ • Product                │   │ [END]                 │
              │ • Price                  │   └───────────────────────┘
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │ Email Found?             │
              └──────────┬───────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
       ✅ YES                      ❌ NO
            │                         │
            ▼                         ▼
   ┌────────────────────┐  ┌───────────────────────────┐
   │ SAVE CLAIM DATA    │  │ Reply: "❌ Could not     │
   │                    │  │ extract email"            │
   │ claims.json:       │  │ [END]                     │
   │ {                  │  └───────────────────────────┘
   │   "invoice-id": {  │
   │     userId: "...", │
   │     email: "...",  │
   │     amount: 2499,  │
   │     timestamp: "..."│
   │     autoClaim: false│
   │   }                │
   │ }                  │
   └─────────┬──────────┘
             │
             ▼
   ┌────────────────────┐
   │ UPDATE USER PROFILE│
   │                    │
   │ profiles.json:     │
   │ {                  │
   │   "userId": {      │
   │     email: "...",  │
   │     claims: [...]  │
   │   }                │
   │ }                  │
   └─────────┬──────────┘
             │
             ▼
   ┌────────────────────┐
   │ WRITE FILES        │
   │ • Save claims.json │
   │ • Save profiles.json│
   └─────────┬──────────┘
             │
             ▼
   ┌────────────────────┐
   │ ASSIGN BUYER ROLE  │
   │ • Fetch member     │
   │ • Fetch role       │
   │ • Add role to user │
   └─────────┬──────────┘
             │
             ▼
   ┌────────────────────────────────┐
   │ LOG TO MOD CHANNEL             │
   │ Embed with:                    │
   │ • User                         │
   │ • Invoice ID                   │
   │ • Full email (unmasked)        │
   │ • Product                      │
   │ • Amount                       │
   │ • Timestamp                    │
   └─────────┬──────────────────────┘
             │
             ▼
   ┌────────────────────────────────┐
   │ REPLY TO USER (Ephemeral)      │
   │ ✅ Invoice Claimed Successfully│
   │ • Masked email: us*****@x.com  │
   │ • Product name                 │
   │ • Amount paid                  │
   │ • "Thank you" message          │
   └─────────┬──────────────────────┘
             │
             ▼
   ┌────────────────────┐
   │   ✅ SUCCESS       │
   │   [END]            │
   └────────────────────┘
```

---

## 📊 Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Discord    │────▶│     Bot      │────▶│   Config     │
│   Command    │     │   Handler    │     │   File       │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Search     │
                     │   Channel    │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Extract    │
                     │   Data       │
                     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
      ┌──────────┐   ┌──────────┐   ┌──────────┐
      │ claims   │   │ profiles │   │   User   │
      │  .json   │   │  .json   │   │  Role    │
      └──────────┘   └──────────┘   └──────────┘
              │             │             │
              └─────────────┼─────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
      ┌──────────┐   ┌──────────┐   ┌──────────┐
      │   Mod    │   │   User   │   │  Console │
      │  Log     │   │  Reply   │   │   Log    │
      └──────────┘   └──────────┘   └──────────┘
```

---

## 🔍 Field Extraction Process

```
┌─────────────────────────────────────────────┐
│         EMBED RECEIVED                      │
│  {                                          │
│    title: "Invoice #123",                   │
│    description: "...",                      │
│    fields: [                                │
│      { name: "Email", value: "user@x.com" },│
│      { name: "Product", value: "Premium" }, │
│      { name: "Price", value: "$24.99" }     │
│    ]                                        │
│  }                                          │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│     FIELD NAME DETECTION                    │
│  • email|e-mail    → Extract email          │
│  • product|item    → Extract product        │
│  • price|amount    → Extract price          │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│     VALUE PROCESSING                        │
│  • Email: Trim whitespace                   │
│  • Product: Trim whitespace                 │
│  • Price: Extract numbers, convert to cents │
│    "$24.99" → 2499                          │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│     FALLBACK DETECTION                      │
│  If email not in fields:                    │
│    • Check description                      │
│    • Check title                            │
│    • Use regex: [\w.-]+@[\w.-]+\.\w+        │
└─────────────────────────────────────────────┘
```

---

## 🛡️ Security & Privacy Flow

```
┌──────────────┐
│ User Command │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Ephemeral   │ ◀── Only user can see
│   Reply      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Email Mask   │ ◀── user@email.com → us*****@email.com
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  User Sees   │
│ Masked Email │
└──────────────┘

       │
       ├─────────────────────────┐
       │                         │
       ▼                         ▼
┌──────────────┐        ┌──────────────┐
│   Mod Log    │        │    JSON      │
│  Full Email  │        │  Full Email  │
│  (Admins)    │        │  (Local)     │
└──────────────┘        └──────────────┘
```

---

## 📝 File Structure

```
bot/
├── src/
│   └── commands/
│       └── slash/
│           └── claim.js ✨ (Main command)
│
├── custom/
│   ├── claim.js ✨ (Backup copy)
│   ├── claim-config.json ⚙️ (Configuration)
│   └── test-claim-setup.js 🧪 (Test script)
│
├── data/
│   ├── claims.json 💾 (All claims)
│   └── profiles.json 👤 (User profiles)
│
└── Documentation:
    ├── CLAIM_SETUP.md 📚 (Full docs)
    ├── CLAIM_QUICKSTART.md 🚀 (Quick start)
    ├── IMPLEMENTATION_SUMMARY.md 📋 (Summary)
    └── WORKFLOW_DIAGRAM.md 🔄 (This file)
```

---

## ⚙️ Configuration Flow

```
Bot Start
    │
    ▼
Load claim.js command
    │
    ▼
User runs /claim
    │
    ▼
Check: custom/claim-config.json exists?
    │
    ├── ✅ Yes → Load config values
    │   └── Use: ordersChannelId, buyerRoleId, etc.
    │
    └── ❌ No → Use default placeholders
        └── Returns error: "Channel not found"
```

---

## 🎯 Success Path

```
/claim <invoiceId>
    ↓
✅ Invoice found
    ↓
✅ Not claimed yet
    ↓
✅ Email extracted
    ↓
✅ Data saved
    ↓
✅ Role assigned
    ↓
✅ Logged to mods
    ↓
✅ User notified
    ↓
SUCCESS! 🎉
```

---

## ❌ Error Paths

```
1. Already Claimed:
   /claim → Check claims.json → ❌ Found → "Already claimed by @user"

2. Invoice Not Found:
   /claim → Search channel → ❌ Not found → "Invoice not found"

3. No Email:
   /claim → Extract data → ❌ No email → "Could not extract email"

4. Channel Error:
   /claim → Fetch channel → ❌ Error → "Channel not found"

5. Generic Error:
   /claim → Try-Catch → ❌ Error → "An error occurred"
```

---

**Visual Guide for the Invoice Claim System**  
Last Updated: November 11, 2025
