# 🚂 Railway Quick Start

## 1️⃣ Push to GitHub

```bash
# Initialize git (if needed)
git init
git branch -M main

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Add your repository (replace with yours!)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push
git push -u origin main
```

## 2️⃣ Deploy on Railway

1. Go to **railway.app**
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository

## 3️⃣ Add Database

1. Click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**

## 4️⃣ Set Variables

Click your service → **Variables** tab → Add:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_SECRET=your_oauth_secret
DB_PROVIDER=postgresql
DB_CONNECTION_URL=${{DATABASE_URL}}
ENCRYPTION_KEY=generate_with_node_command
SUPER=your_discord_user_id
NODE_ENV=production
PUBLISH_COMMANDS=true
HTTP_HOST=0.0.0.0
HTTP_PORT=8169
HTTP_EXTERNAL=https://your-railway-domain.up.railway.app
```

## 5️⃣ Generate Domain

1. Settings tab → **Networking**
2. Click **"Generate Domain"**
3. Copy domain → Update `HTTP_EXTERNAL` variable

## 6️⃣ Generate Encryption Key

```powershell
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## ✅ Done!

Check **Deployments** tab for logs and verify bot is online!

---

**Need more help?** Read `RAILWAY_DEPLOYMENT.md` for detailed instructions.
