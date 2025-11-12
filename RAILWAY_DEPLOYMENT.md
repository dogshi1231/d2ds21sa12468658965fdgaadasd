# 🚂 Railway Deployment Guide

This guide will help you deploy your Discord bot to Railway.app via GitHub.

---

## 📋 Prerequisites

1. **GitHub Account** - Create one at [github.com](https://github.com)
2. **Railway Account** - Sign up at [railway.app](https://railway.app) (use GitHub to sign in)
3. **Discord Bot Token** - Get from [Discord Developer Portal](https://discord.com/developers/applications)

---

## 🔧 Step 1: Prepare Your Repository

### 1.1 Update .gitignore

Make sure your `.gitignore` file includes:
```
# Environment files
*.env*
!.env.example

# Database files
*.db*
*.sqlite*

# Logs
*.log
logs/

# User data
/user/
/data/
/prisma/data/

# Node modules
node_modules/
```

### 1.2 Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Create a new repository (can be private or public)
3. Don't initialize with README (you already have files)

### 1.3 Push Your Code to GitHub

Open PowerShell in your bot directory and run:

```powershell
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Discord Tickets Bot"

# Add remote (replace with YOUR repository URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**⚠️ IMPORTANT:** Make sure `.env` is in `.gitignore` BEFORE pushing to GitHub!

---

## 🚀 Step 2: Deploy to Railway

### 2.1 Create New Project

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository from the list
5. Railway will detect the Dockerfile automatically

### 2.2 Configure Environment Variables

After deployment starts, click on your service, then go to the **Variables** tab and add:

#### Required Variables:
```
DISCORD_TOKEN=your_bot_token_here
DISCORD_SECRET=your_bot_secret_here
DB_PROVIDER=postgresql
DB_CONNECTION_URL=${{DATABASE_URL}}
ENCRYPTION_KEY=generate_one_with_keygen
SUPER=your_discord_user_id
NODE_ENV=production
PUBLISH_COMMANDS=true
HTTP_HOST=0.0.0.0
HTTP_PORT=8169
```

#### For HTTP_EXTERNAL:
1. Go to **Settings** tab
2. Click **"Generate Domain"** under Networking
3. Copy the generated URL (e.g., `https://your-app-name.up.railway.app`)
4. Add variable: `HTTP_EXTERNAL=https://your-app-name.up.railway.app`

### 2.3 Add PostgreSQL Database (Recommended)

1. Click **"+ New"** in your project
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will automatically create a `DATABASE_URL` variable
4. Your bot will use `${{DATABASE_URL}}` as the connection string

**Note:** SQLite doesn't work well on Railway because the filesystem is ephemeral. Use PostgreSQL!

### 2.4 Generate Encryption Key

To generate a secure encryption key:

```powershell
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Copy the output and use it for `ENCRYPTION_KEY`.

---

## 📊 Step 3: Database Setup

### 3.1 Update Prisma Schema

Railway will automatically run Prisma migrations on deploy, but you need to ensure your schema uses PostgreSQL:

The bot already has PostgreSQL schema files in `db/postgresql/`. Make sure your `DB_PROVIDER` is set to `postgresql`.

### 3.2 Run Migrations (if needed)

Railway will handle this automatically, but if you need to manually run migrations:

1. Click on your service
2. Go to **"Deployments"** tab
3. Click the **"..."** menu on latest deployment
4. Select **"View Logs"**
5. Check for successful migration messages

---

## ✅ Step 4: Verify Deployment

### 4.1 Check Logs

1. Go to your Railway project
2. Click on your service
3. View the **Deployments** logs
4. Look for: `Connected to Discord as "YourBot#1234"`

### 4.2 Test Your Bot

1. Go to your Discord server
2. Try `/help` command
3. Create a test ticket with `/new`
4. Verify all features work

---

## 🔄 Step 5: Automatic Deployments

Railway automatically redeploys when you push to GitHub:

```powershell
# Make changes to your code
git add .
git commit -m "Updated feature X"
git push

# Railway will automatically detect and redeploy!
```

---

## ⚙️ Important Configuration Notes

### Environment-Specific Settings

**For Production (Railway):**
- Use PostgreSQL database (not SQLite)
- Set `NODE_ENV=production`
- Use generated Railway domain for `HTTP_EXTERNAL`
- Keep `DISABLE_ENCRYPTION=false` for security

**Database Migration:**
If you're migrating from SQLite to PostgreSQL, you'll need to:
1. Export your data using `npm run db.dump`
2. Update schema to PostgreSQL
3. Import data using `npm run db.restore`

### File Storage

Railway's filesystem is **ephemeral** (resets on each deploy). To persist data:

1. **Database Data** - Store in PostgreSQL (handled automatically)
2. **User Files** - Store in cloud storage (S3, Cloudinary, etc.)
3. **Logs** - Use Railway's built-in logging

### Custom Data Files

Files that need to persist across deploys:
- `data/claims.json`
- `data/profiles.json`
- `data/order-analytics.json`
- `data/inviteCache.json`
- `data/staffActivity.json`
- `data/vouches.json`
- `data/dailyStats.json`

**Solution:** Consider moving these to PostgreSQL tables or use Redis for caching.

---

## 🐛 Troubleshooting

### Bot Won't Start

**Check logs for:**
- Database connection errors
- Missing environment variables
- Port binding issues

**Common fixes:**
1. Verify all required env variables are set
2. Check `DATABASE_URL` is accessible
3. Ensure `HTTP_PORT` matches Railway settings

### Database Connection Failed

**Solution:**
1. Make sure PostgreSQL database is added to project
2. Verify `DB_CONNECTION_URL=${{DATABASE_URL}}`
3. Check `DB_PROVIDER=postgresql`

### Commands Not Showing

**Solution:**
1. Set `PUBLISH_COMMANDS=true`
2. Wait 5-10 minutes for Discord to sync
3. Check bot has proper permissions in server

### HTTP Server Not Accessible

**Solution:**
1. Generate domain in Railway settings
2. Update `HTTP_EXTERNAL` with the Railway domain
3. Ensure `HTTP_HOST=0.0.0.0` (not 127.0.0.1)

---

## 💾 Migrating Data to PostgreSQL

If you have existing data in SQLite:

### Option 1: Manual Export/Import

```powershell
# Backup current data
npm run db.dump

# After switching to PostgreSQL
npm run db.restore
```

### Option 2: Database Migration Tool

Use Prisma's migration tools to convert schemas.

---

## 📈 Monitoring & Logs

### View Logs
1. Railway Dashboard → Your Service → Deployments
2. Click on latest deployment
3. View real-time logs

### Health Checks
The Dockerfile includes a health check endpoint at `/status`

Railway automatically monitors this endpoint.

---

## 🔒 Security Best Practices

1. ✅ Never commit `.env` file to GitHub
2. ✅ Use strong encryption keys
3. ✅ Enable encryption (set `DISABLE_ENCRYPTION=false`)
4. ✅ Use PostgreSQL for production (not SQLite)
5. ✅ Keep Discord token secret
6. ✅ Use environment variables for all sensitive data
7. ✅ Make repository private if it contains sensitive data

---

## 💰 Railway Pricing

- **Free Tier:** $5 credit/month (enough for small bots)
- **Hobby Plan:** $5/month for additional credits
- **Pro Plan:** $20/month for larger projects

Your bot should run fine on the free tier for development/small servers.

---

## 🆘 Need Help?

- **Railway Docs:** https://docs.railway.app
- **Discord.js Guide:** https://discordjs.guide
- **Prisma Docs:** https://www.prisma.io/docs
- **Discord Tickets:** https://discordtickets.app

---

## 📝 Quick Reference

### Required Environment Variables
```env
DISCORD_TOKEN=
DISCORD_SECRET=
DB_PROVIDER=postgresql
DB_CONNECTION_URL=${{DATABASE_URL}}
ENCRYPTION_KEY=
SUPER=
NODE_ENV=production
PUBLISH_COMMANDS=true
HTTP_EXTERNAL=https://your-domain.up.railway.app
HTTP_PORT=8169
HTTP_HOST=0.0.0.0
```

### Railway Dashboard URLs
- Dashboard: https://railway.app/dashboard
- Project Settings: Click project → Settings
- Environment Variables: Click service → Variables
- Deployment Logs: Click service → Deployments

---

**🎉 Your bot is now deployed on Railway!**

Remember to star ⭐ the Discord Tickets repository at https://github.com/discord-tickets/bot
