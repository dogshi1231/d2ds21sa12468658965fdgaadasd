# Railway Deployment Checklist

Use this checklist to ensure you don't miss any steps when deploying to Railway.

## 📋 Pre-Deployment Checklist

### Local Setup
- [ ] `.gitignore` updated (includes `.env`, `*.db*`, `/data/`)
- [ ] `.env.example` created with all required variables
- [ ] `railway.json` configuration file present
- [ ] All custom data files backed up
- [ ] Bot tested locally and working

### GitHub Setup
- [ ] GitHub account created
- [ ] New repository created on GitHub
- [ ] Repository is private (if contains sensitive data)
- [ ] Git initialized in project folder
- [ ] All files committed to git
- [ ] Code pushed to GitHub repository

### Railway Account
- [ ] Railway account created at railway.app
- [ ] Connected GitHub account to Railway
- [ ] Payment method added (for credits beyond free tier)

## 🚀 Deployment Checklist

### Railway Project Setup
- [ ] New project created in Railway
- [ ] Repository selected for deployment
- [ ] Dockerfile detected automatically
- [ ] Service deployed successfully

### Database Setup
- [ ] PostgreSQL database added to project
- [ ] `DATABASE_URL` variable automatically created
- [ ] Database is healthy (check status indicator)

### Environment Variables
Required variables set:
- [ ] `DISCORD_TOKEN` - Bot token from Discord Developer Portal
- [ ] `DISCORD_SECRET` - OAuth2 secret from Discord Developer Portal
- [ ] `DB_PROVIDER=postgresql`
- [ ] `DB_CONNECTION_URL=${{DATABASE_URL}}`
- [ ] `ENCRYPTION_KEY` - Generated with keygen
- [ ] `SUPER` - Your Discord user ID
- [ ] `NODE_ENV=production`
- [ ] `PUBLISH_COMMANDS=true`
- [ ] `HTTP_HOST=0.0.0.0`
- [ ] `HTTP_PORT=8169`
- [ ] `HTTP_EXTERNAL` - Your Railway domain

Optional variables:
- [ ] `SENTRY_DSN` (for error tracking)
- [ ] Any custom analytics or API keys

### Networking
- [ ] Public domain generated in Railway settings
- [ ] `HTTP_EXTERNAL` updated with Railway domain
- [ ] Health check endpoint working (`/status`)

## ✅ Post-Deployment Checklist

### Verify Bot is Running
- [ ] Check Railway deployment logs
- [ ] Look for "Connected to Discord" message
- [ ] Bot shows as online in Discord server
- [ ] Bot responds to mentions

### Test Core Features
- [ ] `/help` command works
- [ ] `/new` creates a ticket
- [ ] Ticket claim button appears automatically
- [ ] Claiming tickets works properly
- [ ] `/analytics` shows data
- [ ] `/profile` retrieves customer data
- [ ] Vouch system functional
- [ ] HWID request system works

### Test Staff Features
- [ ] `/balance` shows staff rewards
- [ ] `/leaderboard` displays correctly
- [ ] `/topbuyers` shows customer data
- [ ] Order processing works
- [ ] Invite tracking functional

### Database Verification
- [ ] Prisma migrations completed successfully
- [ ] Database tables created
- [ ] Data persists across deployments
- [ ] No database connection errors in logs

### Automated Features
- [ ] Analytics reports scheduled (24h)
- [ ] Staff inactivity monitoring active (6h)
- [ ] Invite tracking working
- [ ] Daily stats reset at midnight UTC

## 🔧 Troubleshooting Steps

If something doesn't work:
- [ ] Check Railway deployment logs for errors
- [ ] Verify all environment variables are set correctly
- [ ] Ensure database is connected and healthy
- [ ] Confirm bot has proper Discord permissions
- [ ] Check if commands are published (`PUBLISH_COMMANDS=true`)
- [ ] Review health check status in Railway
- [ ] Verify domain is accessible

## 📊 Monitoring Setup

- [ ] Check deployment logs regularly
- [ ] Monitor bot uptime
- [ ] Watch for error patterns
- [ ] Set up alerts (optional)
- [ ] Monitor database usage
- [ ] Track Railway credit usage

## 🔄 Continuous Deployment

For automatic deployments on code changes:
- [ ] Push changes to GitHub main branch
- [ ] Railway automatically detects changes
- [ ] Wait for new deployment to complete
- [ ] Verify changes in logs
- [ ] Test updated features

## 💾 Data Migration (if applicable)

If migrating from local SQLite:
- [ ] Export data with `npm run db.dump`
- [ ] Update DB_PROVIDER to postgresql
- [ ] Deploy to Railway
- [ ] Import data with `npm run db.restore`
- [ ] Verify all data transferred correctly

## 📝 Documentation

- [ ] Update repository README with Railway deployment info
- [ ] Document any custom configuration
- [ ] Note any environment-specific settings
- [ ] Save backup of environment variables
- [ ] Document database schema changes

## ✨ Final Verification

- [ ] Bot stable for 24+ hours
- [ ] No critical errors in logs
- [ ] All features functional
- [ ] Performance acceptable
- [ ] Database responding quickly
- [ ] Automated tasks running on schedule

---

## 🎉 Deployment Complete!

Once all items are checked, your bot is successfully deployed on Railway!

**Important Reminders:**
- Keep your `.env` and secrets secure
- Monitor Railway credits/usage
- Regular backups of important data
- Update bot regularly for security patches
- Test changes locally before pushing to production

---

**Need Help?**
- Railway Docs: https://docs.railway.app
- Discord Tickets: https://discordtickets.app
- Railway Deployment Guide: See RAILWAY_DEPLOYMENT.md
