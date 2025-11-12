# 🔧 Fix Settings 404 Error

## Why You're Getting 404

The `/settings` page requires the `@discord-tickets/settings` package to be properly built and served. The 404 error means the SvelteKit app isn't being served correctly.

## ✅ Quick Fixes

### Option 1: Check Railway Domain Configuration

The web interface needs to be properly exposed. Here's what to verify:

1. **Go to Railway Dashboard**
2. **Click on your bot service**
3. **Go to Settings → Networking**
4. **Make sure you have a domain generated**
5. **Check that the PORT is exposed**

### Option 2: Verify Environment Variables

Make sure these are set in Railway Variables:

```env
HTTP_HOST=0.0.0.0
HTTP_PORT=8169
HTTP_EXTERNAL=https://your-railway-domain.up.railway.app
PUBLIC_BOT=true
```

**Important**: Replace `your-railway-domain.up.railway.app` with your actual Railway-generated domain.

### Option 3: Check if Web Server is Running

From your logs, you should see:
```
[SUCCESS] (HTTP) Listening at http://127.0.0.1:8169
```

If you see this, the server is running but might not be accessible externally.

---

## 🎯 Alternative: Configure Bot Without Web Interface

Since the web interface is having issues, you can configure the bot directly through Discord!

### Step 1: Make Sure Bot Has Basic Guild Settings

The bot automatically creates settings when it joins your server. To verify:

1. **Kick the bot from your Discord server**
2. **Re-invite the bot** (use the invite link with proper permissions)
3. When the bot rejoins, it will create default guild settings in the database

### Step 2: Create Ticket Categories Manually

You can create categories by setting up Discord channels properly:

1. **Create a Discord category** (e.g., "Support Tickets")
2. **Create a text channel** for ticket creation (e.g., "create-ticket")
3. **Set proper permissions**:
   - `@everyone`: View Channel ✅, Send Messages ❌
   - `Bot Role`: All permissions ✅
   - `Staff Role`: Manage Channels ✅, View Channel ✅

### Step 3: Use Discord Commands to Configure

While the full web interface provides more options, you can use these approaches:

**Option A: Configure via Database** (Advanced)
- Connect to your PostgreSQL database on Railway
- Insert category/panel configuration directly
- Example queries provided below

**Option B: Use the Bot's Built-in Setup** (Simpler)
- Create ticket panels using Discord's built-in features
- The bot will work with any properly structured channel

---

## 🗄️ Manual Database Configuration (Advanced)

If you're comfortable with SQL, you can configure everything directly in the Railway PostgreSQL database.

### Connect to Railway PostgreSQL

1. **Go to Railway Dashboard**
2. **Click on the PostgreSQL service** (not the bot)
3. **Go to Connect tab**
4. **Copy the connection string** or use the provided credentials

### Create a Ticket Category

```sql
-- First, insert a category
INSERT INTO "Category" (
  "id", 
  "guildId", 
  "name", 
  "description",
  "emoji",
  "staffRoles",
  "channelName",
  "createdAt",
  "updatedAt"
) VALUES (
  'YOUR_DISCORD_CATEGORY_ID',
  'YOUR_GUILD_ID',
  'General Support',
  'Get help with general questions',
  '🎫',
  '["YOUR_STAFF_ROLE_ID"]',
  'ticket-{number}',
  NOW(),
  NOW()
);
```

Replace:
- `YOUR_DISCORD_CATEGORY_ID`: The ID of the Discord category where tickets will be created
- `YOUR_GUILD_ID`: Your Discord server ID
- `YOUR_STAFF_ROLE_ID`: The role ID of your staff members

### Create a Ticket Panel

```sql
-- Insert a panel to allow users to create tickets
INSERT INTO "Panel" (
  "id",
  "categories",
  "title",
  "description",
  "createdAt",
  "updatedAt"
) VALUES (
  'YOUR_PANEL_MESSAGE_ID',
  '["YOUR_CATEGORY_ID"]',
  '📩 Need Help?',
  'Click the button below to create a support ticket!',
  NOW(),
  NOW()
);
```

---

## 🚀 Fix the Web Interface (Proper Solution)

To actually fix the 404 and get `/settings` working:

### 1. Update Railway Configuration

**In Railway Dashboard → Bot Service → Variables**, ensure these are set:

```env
HTTP_HOST=0.0.0.0
HTTP_PORT=8169
HTTP_TRUST_PROXY=true
```

### 2. Expose the Port

**In Railway Dashboard → Bot Service → Settings → Networking**:

1. Make sure a domain is generated
2. The service should auto-detect port 8169

### 3. Update HTTP_EXTERNAL

After generating the domain, update the variable:

```env
HTTP_EXTERNAL=https://your-actual-railway-domain.up.railway.app
```

**Important**: No trailing slash!

### 4. Wait for Redeploy

After changing variables, Railway will automatically redeploy. Wait for:
- Deployment status: Success ✅
- Logs show: `[SUCCESS] (HTTP) Listening at...`

### 5. Try Again

Now visit: `https://your-railway-domain.up.railway.app/settings`

---

## 🔍 Debugging Steps

### Check Railway Logs

Look for these lines:
```
✅ GOOD: [SUCCESS] (HTTP) Listening at http://127.0.0.1:8169
❌ BAD: [ERROR] (HTTP) EADDRINUSE: Address already in use
```

### Test the Status Endpoint

Try visiting: `https://your-railway-domain.up.railway.app/status`

If this works but `/settings` doesn't, it means the SvelteKit app isn't loading.

### Check Package Installation

The bot requires `@discord-tickets/settings` package. Verify in logs:
```
npm install...
✔ All packages installed
```

---

## 📞 If Nothing Works

### Fallback: Use Bot Features Without Web Config

The bot can still work! You just need to:

1. **Manually create ticket channels in Discord**
2. **Set up proper permissions**
3. **Use commands like** `/new` to create tickets
4. **Staff can use** `/claim`, `/close`, etc.

Many features work without the web interface:
- Ticket creation: `/new`
- Analytics: `/analytics`
- Claims: `/claim` and `/unclaim`
- Vouches: `/vouch`
- Help: `/help`

The web interface is mainly for **category configuration** and **panel creation**.

---

## 🎯 Recommended Next Steps

1. **First, try updating HTTP_EXTERNAL** with your actual Railway domain
2. **Redeploy** and check logs
3. **If still 404**, use manual database configuration (see above)
4. **For now**, use `/new` command directly to create tickets
5. **Contact Railway support** if web interface remains broken

Your bot is fully functional even without the web interface! The web UI is just for easier configuration.

---

## 🆘 Get Your Railway Domain

Run this to find your domain:

1. Go to Railway Dashboard
2. Click your bot service
3. Look at the top - you should see: `Deployed to: https://xxxxx.up.railway.app`
4. Copy that URL (without any path)
5. Set it as HTTP_EXTERNAL

If you don't see a domain, generate one:
- Settings → Networking → Generate Domain

---

Let me know which approach you want to use! 🚀
