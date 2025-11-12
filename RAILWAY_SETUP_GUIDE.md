# 🚀 Railway Bot Setup Guide

## ✅ Current Status
Your bot is **RUNNING SUCCESSFULLY** on Railway! The errors you're seeing are because the bot hasn't been configured in your Discord server yet.

## 🔧 Fix the Errors - Setup Instructions

### Step 1: Set PUBLIC_BOT Environment Variable

The warning in your logs says:
```
Your bot is public, but public features are disabled. Set the `PUBLIC_BOT` environment variable to `true`
```

**To fix this:**

1. Go to Railway project: https://railway.app
2. Click on your bot service
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Add:
   - **Variable**: `PUBLIC_BOT`
   - **Value**: `true`
6. Click **Add**

The bot will automatically redeploy.

---

### Step 2: Get Your Railway Domain

Your bot needs a public domain to access the web settings panel.

1. In Railway, click on your bot service
2. Go to **Settings** tab
3. Scroll to **Networking** section
4. Click **Generate Domain** (if not already done)
5. Copy the generated domain (e.g., `humble-celebration-production.up.railway.app`)

---

### Step 3: Update HTTP_EXTERNAL Variable

1. Go back to **Variables** tab
2. Find the `HTTP_EXTERNAL` variable
3. Click **Edit**
4. Update the value to: `https://YOUR-RAILWAY-DOMAIN` (use the domain from Step 2)
   - Example: `https://humble-celebration-production.up.railway.app`
5. Save

The bot will redeploy again.

---

### Step 4: Access the Settings Panel

1. Open your browser and go to: `https://YOUR-RAILWAY-DOMAIN/settings`
2. Click **Login with Discord**
3. Authorize the application
4. You'll be redirected to the settings panel

---

### Step 5: Configure Your Server

In the settings panel:

1. **Select your Discord server** from the dropdown
2. **Create ticket categories**:
   - Click "Add Category"
   - Name it (e.g., "General Support", "Purchase Help", "Tech Support")
   - Set staff roles who can manage tickets
   - Configure category settings
3. **Set up ticket channels**:
   - Choose which channels should have ticket creation panels
   - Customize the ticket creation message
4. **Configure staff roles**:
   - Set which roles can claim tickets
   - Set which roles can view tickets
5. **Save all changes**

---

### Step 6: Test Commands in Discord

Now go back to Discord and try:

- `/help` - Should now show all commands organized by category
- `/new` - Should create a new ticket (after you've set up categories)
- `/claim` - Should work in tickets
- `/analytics` - Should show stats

---

## 🐛 Understanding the Previous Errors

The errors you saw were:
1. **"Cannot read properties of null (reading 'locale')"** - Bot couldn't find guild settings because server wasn't configured
2. **"Cannot read properties of undefined (reading 'includes')"** - Staff roles weren't defined yet

These will disappear after completing the setup above!

---

## 📊 Verify Bot is Working

Check the Railway logs again after setup. You should see:
- ✅ "Connected to Discord as 'Solana#1299'"
- ✅ "Published 39 commands"
- ✅ No more errors when using commands

---

## 🆘 If You Still Have Issues

1. **Check Railway logs**:
   - Railway Dashboard → Your Service → Deployments → Latest → View Logs

2. **Verify environment variables** are all set correctly:
   - DB_CONNECTION_URL ✓
   - DISCORD_TOKEN ✓
   - HTTP_EXTERNAL ✓ (should be your Railway domain)
   - PUBLIC_BOT ✓ (should be "true")
   - SUPER ✓ (your Discord user ID)

3. **Check bot permissions in Discord**:
   - Bot needs Administrator permission
   - Or at minimum: Manage Channels, Manage Roles, Send Messages, Embed Links, Attach Files

---

## 🎉 Next Steps After Setup

Once the bot is configured:

1. **Test ticket creation**: Use `/new` command
2. **Set up custom features**:
   - Edit `/custom/claim-config.json` for claim settings
   - Edit `/custom/vouch-config.json` for vouch system
   - Edit `/custom/analytics-config.json` for analytics
3. **Monitor logs**: Check Railway logs for any issues
4. **Add staff members**: Assign staff roles in Discord

---

## 📝 Important Notes

- **Database**: Your PostgreSQL database is persistent - data won't be lost
- **Files**: Any files in `/data/` are **NOT persistent** on Railway (ephemeral filesystem)
  - JSON files like `claims.json`, `profiles.json` will reset on redeploy
  - Consider migrating to database storage for production
- **Logs**: Railway keeps logs for 7 days on free tier

---

## 🔗 Useful Links

- Railway Dashboard: https://railway.app/project/YOUR-PROJECT-ID
- Settings Panel: https://YOUR-RAILWAY-DOMAIN/settings
- Bot Status: https://YOUR-RAILWAY-DOMAIN/status
- Documentation: Check RAILWAY_DEPLOYMENT.md for full details

---

Your bot is **successfully deployed**! Just needs configuration. Good luck! 🚀
