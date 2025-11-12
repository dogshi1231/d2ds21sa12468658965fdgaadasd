# Bot Command Guide

This guide documents all available commands for the Discord bot, including slash commands, user commands, message commands, and console (stdin) commands.

---

## 📋 Table of Contents

- [Slash Commands (Discord)](#slash-commands-discord)
  - [🎫 Ticket Management](#-ticket-management)
  - [💰 Analytics & Stats](#-analytics--stats)
  - [👥 Staff Management](#-staff-management)
  - [🛠️ Customer Support](#-customer-support)
  - [⚠️ Moderation](#-moderation)
- [Console Commands (stdin)](#console-commands-stdin)
  - [🔧 System Management](#-system-management)
  - [📊 Analytics & Tracking](#-analytics--tracking)
  - [🛠️ Support Tools](#-support-tools)

---

## Slash Commands (Discord)

These commands are used in Discord by typing `/` followed by the command name.

### 🎫 Ticket Management

#### `/new`
**Description:** Create a new support ticket  
**Usage:** `/new`  
**Permissions:** All users  
**Details:** Opens a ticket creation panel where users can select their issue type and provide details.

---

#### `/close`
**Description:** Close a ticket  
**Usage:** `/close [reason]`  
**Permissions:** Staff, ticket creator  
**Details:** Closes the current ticket. Staff can provide an optional reason.

---

#### `/force-close`
**Description:** Forcefully close a ticket  
**Usage:** `/force-close <ticket>`  
**Permissions:** Staff only  
**Details:** Forces a ticket to close even if it's in an unusual state. Used for stuck tickets.

---

#### `/add`
**Description:** Add a user to a ticket  
**Usage:** `/add <user>`  
**Permissions:** Staff only  
**Details:** Grants a user access to view and participate in a ticket.

---

#### `/remove`
**Description:** Remove a user from a ticket  
**Usage:** `/remove <user>`  
**Permissions:** Staff only  
**Details:** Removes a user's access to a ticket.

---

#### `/move`
**Description:** Move a ticket to a different category  
**Usage:** `/move <category>`  
**Permissions:** Staff only  
**Details:** Transfers the ticket to another category for better organization.

---

#### `/priority`
**Description:** Set ticket priority  
**Usage:** `/priority <level>`  
**Permissions:** Staff only  
**Details:** Sets the priority level of a ticket (low, medium, high, urgent).

---

#### `/transfer`
**Description:** Transfer ticket ownership  
**Usage:** `/transfer <user>`  
**Permissions:** Staff only  
**Details:** Transfers the ticket to another staff member.

---

#### `/rename`
**Description:** Rename a ticket  
**Usage:** `/rename <new-name>`  
**Permissions:** Staff only  
**Details:** Changes the name of the ticket channel.

---

#### `/topic`
**Description:** Change ticket topic  
**Usage:** `/topic <topic>`  
**Permissions:** Staff only  
**Details:** Updates the ticket's topic or subject matter.

---

#### `/transcript`
**Description:** Generate ticket transcript  
**Usage:** `/transcript`  
**Permissions:** Staff only  
**Details:** Creates a full transcript of all messages in the ticket.

---

#### `/tickets`
**Description:** List all tickets  
**Usage:** `/tickets [user]`  
**Permissions:** Staff only  
**Details:** Shows all open tickets or all tickets for a specific user.

---

#### `/tag`
**Description:** Use a tag/saved response  
**Usage:** `/tag <tag-name>`  
**Permissions:** Staff only  
**Details:** Sends a pre-configured response. Useful for common questions.

---

### 💰 Analytics & Stats

#### `/analytics`
**Description:** View real-time analytics and statistics  
**Usage:** `/analytics`  
**Permissions:** All users  
**Details:** Displays comprehensive analytics including:
- Today's orders and revenue
- Top product sold
- Invite conversion rates
- Staff activity (tickets claimed, vouches)
- Top 5 customers by spending
- Top 5 staff by earnings
- Recent orders
- Most common product

---

#### `/topbuyers`
**Description:** View the top 10 customers by total spending  
**Usage:** `/topbuyers`  
**Permissions:** All users  
**Details:** Shows a leaderboard of the top 10 customers with:
- Lifetime total spent
- Order count
- Medal emojis for top 3 (🥇🥈🥉)
- Masked email addresses

---

#### `/orderanalytics`
**Description:** View order and profit analytics (staff only)  
**Usage:** `/orderanalytics`  
**Permissions:** Staff only  
**Details:** Shows detailed order analytics including profit margins by product type.

---

#### `/topcustomers`
**Description:** View top customers by total purchases (staff only)  
**Usage:** `/topcustomers`  
**Permissions:** Staff only  
**Details:** Lists the top spending customers with detailed purchase history.

---

#### `/topinviters`
**Description:** View top inviters by profit generated (staff only)  
**Usage:** `/topinviters`  
**Permissions:** Staff only  
**Details:** Shows members who brought in the most customers via invites.

---

### 👥 Staff Management

#### `/claim`
**Description:** Claim an invoice by providing the invoice ID  
**Usage:** `/claim <invoice-id>`  
**Permissions:** Staff only  
**Details:** Claims an invoice/order for tracking purposes. Staff earn rewards for completed orders.

---

#### `/addclaimbutton`
**Description:** Add a claim button to this ticket  
**Usage:** `/addclaimbutton`  
**Permissions:** Staff only  
**Details:** Manually adds a claim button to the ticket. (Note: Claim buttons are automatically sent on ticket creation)

---

#### `/vouch`
**Description:** Request a vouch from the customer (use in claimed tickets only)  
**Usage:** `/vouch`  
**Permissions:** Staff only  
**Details:** Sends a vouch request to the customer in a claimed ticket. Successful vouches earn staff rewards.

---

#### `/force`
**Description:** Force vouch reward without customer input (owner only)  
**Usage:** `/force <ticket-channel-id>`  
**Permissions:** Bot owner only  
**Details:** Manually awards vouch rewards, bypassing the customer vouch system.

---

#### `/balance`
**Description:** Check your staff reward balance  
**Usage:** `/balance [user]`  
**Permissions:** All users (staff for other users)  
**Details:** Shows your current reward balance from vouches and completed orders. Moderators can check other staff members' balances.

---

#### `/sbal`
**Description:** View your staff balance and performance stats  
**Usage:** `/sbal`  
**Permissions:** Staff only  
**Details:** Displays detailed performance statistics including vouches, tickets claimed, and earnings.

---

#### `/leaderboard`
**Description:** Post the staff performance leaderboard  
**Usage:** `/leaderboard [post:true/false]`  
**Permissions:** All users (staff to post publicly)  
**Details:** Shows staff rankings by performance. Staff can post it publicly in the leaderboard channel.

---

#### `/vouchstats`
**Description:** View vouch statistics for a staff member  
**Usage:** `/vouchstats [user]`  
**Permissions:** All users  
**Details:** Shows detailed vouch statistics including success rate and total vouches for yourself or another staff member.

---

#### `/linkinvoice`
**Description:** Link this ticket to an invoice for vouch rewards  
**Usage:** `/linkinvoice <invoice-id>`  
**Permissions:** Staff only  
**Details:** Links the current ticket to an invoice ID, enabling vouch rewards upon ticket completion.

---

### 🛠️ Customer Support

#### `/hwid`
**Description:** Request an HWID reset for your device  
**Usage:** `/hwid`  
**Permissions:** All users  
**Details:** Opens a modal to request a Hardware ID reset. Users can request resets based on configured cooldown periods.

---

#### `/replacement`
**Description:** Request a product replacement  
**Usage:** `/replacement`  
**Permissions:** All users  
**Details:** Opens a replacement request form for defective or non-working products.

---

#### `/checkresets`
**Description:** Check support request history for a user (staff only)  
**Usage:** `/checkresets <user>`  
**Permissions:** Staff only  
**Details:** Views a user's HWID reset and support action history.

---

#### `/supportaction`
**Description:** Log a support action for a customer  
**Usage:** `/supportaction <user> <action-type> [notes]`  
**Permissions:** Staff only  
**Details:** Logs support actions like HWID resets, replacements, refunds, etc. Action types:
- HWID Reset
- Replacement
- Refund
- Key Reissue
- Technical Support
- Account Issue
- Other

---

#### `/profile`
**Description:** View a customer's profile and purchase history  
**Usage:** `/profile <user>`  
**Permissions:** Staff only  
**Details:** Shows comprehensive customer information including:
- Total purchases
- Order history
- Last purchase date
- Customer since date
- Warnings and notes

---

#### `/processorder`
**Description:** Manually process an order from a message (staff only)  
**Usage:** `/processorder <messageid> [channel]`  
**Permissions:** Staff only  
**Details:** Manually processes an order embed for analytics tracking. Useful if automatic processing failed.

---

### ⚠️ Moderation

#### `/warn`
**Description:** Issue a warning to a customer  
**Usage:** `/warn <user> <reason>`  
**Permissions:** Staff only  
**Details:** Issues a formal warning to a customer. Warnings are tracked in their profile.

---

#### `/release`
**Description:** Release/unclaim a ticket  
**Usage:** `/release`  
**Permissions:** Staff only  
**Details:** Releases a claimed ticket, making it available for other staff to claim.

---

#### `/help`
**Description:** Show help information  
**Usage:** `/help`  
**Permissions:** All users  
**Details:** Displays bot help and command information.

---

## Console Commands (stdin)

These commands are typed directly into the bot's console/terminal window. They're used for bot administration and debugging.

### 🔧 System Management

#### `help`
**Description:** Show available console commands  
**Usage:** Type `help` in the console  
**Details:** Lists all available stdin commands.

---

#### `exit`
**Description:** Gracefully shut down the bot  
**Usage:** Type `exit` in the console  
**Details:** Properly closes all connections and shuts down the bot.

---

#### `reload`
**Description:** Reload commands and listeners  
**Usage:** Type `reload` in the console  
**Details:** Reloads all command and listener modules without restarting the bot.

---

#### `sync`
**Description:** Sync slash commands with Discord  
**Usage:** Type `sync` in the console  
**Details:** Forces a sync of all slash commands with Discord's API.

---

#### `version`
**Description:** Show bot version information  
**Usage:** Type `version` in the console  
**Details:** Displays the current bot version and system information.

---

#### `eval`
**Description:** Evaluate JavaScript code  
**Usage:** Type `eval <code>` in the console  
**Details:** Executes JavaScript code in the bot's context. **DANGEROUS - Owner only.**

---

#### `npx`
**Description:** Execute npx commands  
**Usage:** Type `npx <command>` in the console  
**Details:** Runs npx commands directly from the console.

---

#### `settings`
**Description:** View or modify bot settings  
**Usage:** Type `settings` in the console  
**Details:** Shows current configuration settings.

---

#### `commands`
**Description:** List all loaded commands  
**Usage:** Type `commands` in the console  
**Details:** Shows all loaded slash commands, user commands, and message commands.

---

### 📊 Analytics & Tracking

#### `invitelog`
**Description:** View recent invite activity  
**Usage:** Type `invitelog` in the console  
**Details:** Shows recent server joins and which invite was used.

---

#### `invitesummary`
**Description:** View invite tracking summary  
**Usage:** Type `invitesummary` in the console  
**Details:** Displays summary statistics for invite tracking.

---

#### `invitetop`
**Description:** View top inviters  
**Usage:** Type `invitetop` in the console  
**Details:** Shows members with the most invites.

---

#### `conversiontrack`
**Description:** Track invite conversion rates  
**Usage:** Type `conversiontrack` in the console  
**Details:** Shows how many invited users became customers.

---

### 🛠️ Support Tools

#### `profile`
**Description:** View user profile from console  
**Usage:** Type `profile <user-id>` in the console  
**Details:** Shows customer profile information directly in the console.

---

#### `vouch`
**Description:** Manage vouches from console  
**Usage:** Type `vouch` in the console  
**Details:** View and manage vouch system from the console.

---

#### `resets`
**Description:** View HWID reset information  
**Usage:** Type `resets` in the console  
**Details:** Shows HWID reset statistics and recent requests.

---

#### `error`
**Description:** View error management menu  
**Usage:** Type `error` in the console  
**Details:** Opens an interactive menu for managing common errors and solutions.

---

#### `reporterror`
**Description:** Report a bot error  
**Usage:** Type `reporterror` in the console  
**Details:** Creates an error report for debugging.

---

#### `allfix`
**Description:** View all available fixes  
**Usage:** Type `allfix` in the console  
**Details:** Shows all error solutions and fixes.

---

#### `dcontrol`
**Description:** Discord control panel  
**Usage:** Type `dcontrol` in the console  
**Details:** Opens a control panel for managing Discord-related features.

---

#### `force`
**Description:** Force operations from console  
**Usage:** Type `force` in the console  
**Details:** Forces certain operations that might be stuck.

---

#### `toolsupport`
**Description:** Support tool management  
**Usage:** Type `toolsupport` in the console  
**Details:** Manages support tools and features.

---

#### `updates`
**Description:** Check for bot updates  
**Usage:** Type `updates` in the console  
**Details:** Checks for available updates to the bot.

---

#### `vpn`
**Description:** VPN detection management  
**Usage:** Type `vpn` in the console  
**Details:** Manages VPN detection features.

---

#### `runtimes`
**Description:** View runtime statistics  
**Usage:** Type `runtimes` in the console  
**Details:** Shows bot uptime and performance metrics.

---

#### `swarn`
**Description:** Issue staff warning  
**Usage:** Type `swarn` in the console  
**Details:** Issues warnings to staff members from the console.

---

#### `rwarning`
**Description:** Remove a warning  
**Usage:** Type `rwarning` in the console  
**Details:** Removes previously issued warnings.

---

#### `suid-time`
**Description:** Set UID time  
**Usage:** Type `suid-time` in the console  
**Details:** Manages UID time settings.

---

## 🔄 Automatic Features

### Auto-Claim Button
When a ticket is created, a claim button is **automatically sent** in the ticket. Staff don't need to use `/addclaimbutton` unless the button was deleted.

### Analytics Reports
The bot automatically posts analytics reports to the configured channel every 24 hours at midnight UTC, including:
- Daily orders and revenue
- Invite conversion rates
- Staff performance
- Voice channel engagement
- Top customers and products

### Staff Monitoring
The bot automatically tracks staff activity including:
- Inactive staff (3+ days without tickets/vouches)
- Tickets claimed
- Vouches received
- Revenue generated per staff member

### Invite Tracking
Automatically tracks:
- Who invited each new member
- Conversion from invite to purchase
- Top converters by profit

---

## 📝 Notes

- **Permissions:** Commands marked "Staff only" require staff role permissions configured in the bot settings.
- **Ephemeral:** Most staff commands send responses that only the command user can see.
- **Cooldowns:** Support request commands (HWID, replacement) have cooldown periods to prevent abuse.
- **Analytics:** All orders, vouches, invites, and staff actions are automatically tracked for analytics.

---

## 🆘 Need Help?

If you need assistance with any command:
1. Use `/help` in Discord
2. Use `help` in the bot console
3. Check the command descriptions above
4. Contact the bot administrator

---

**Last Updated:** November 12, 2025  
**Bot Version:** 4.0.48 (Discord Tickets)
