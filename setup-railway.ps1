# Quick Railway Setup Script
# Run this in PowerShell to prepare your bot for Railway deployment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Discord Bot Railway Deployment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is installed
$gitInstalled = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitInstalled) {
    Write-Host "❌ Git is not installed. Please install Git from https://git-scm.com/" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Git is installed" -ForegroundColor Green

# Check if in correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Please run this script from the bot directory" -ForegroundColor Red
    exit 1
}

Write-Host "✅ In bot directory" -ForegroundColor Green
Write-Host ""

# Initialize git if needed
if (-not (Test-Path ".git")) {
    Write-Host "📦 Initializing Git repository..." -ForegroundColor Yellow
    git init
    git branch -M main
    Write-Host "✅ Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "✅ Git already initialized" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Create a GitHub repository at: https://github.com/new" -ForegroundColor White
Write-Host ""
Write-Host "2. Run these commands (replace YOUR_USERNAME and YOUR_REPO):" -ForegroundColor White
Write-Host "   git add ." -ForegroundColor Yellow
Write-Host "   git commit -m 'Initial commit'" -ForegroundColor Yellow
Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git" -ForegroundColor Yellow
Write-Host "   git push -u origin main" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Go to Railway: https://railway.app" -ForegroundColor White
Write-Host "   - Click 'New Project'" -ForegroundColor White
Write-Host "   - Select 'Deploy from GitHub repo'" -ForegroundColor White
Write-Host "   - Choose your repository" -ForegroundColor White
Write-Host ""
Write-Host "4. Add PostgreSQL database:" -ForegroundColor White
Write-Host "   - Click '+ New' → Database → PostgreSQL" -ForegroundColor White
Write-Host ""
Write-Host "5. Set environment variables (see RAILWAY_DEPLOYMENT.md)" -ForegroundColor White
Write-Host ""
Write-Host "📖 Read RAILWAY_DEPLOYMENT.md for detailed instructions!" -ForegroundColor Cyan
Write-Host ""

# Check for sensitive files
Write-Host "🔍 Checking for sensitive files..." -ForegroundColor Yellow
$sensitiveFiles = @(".env", "*.db", "*.sqlite")
$foundSensitive = $false

foreach ($pattern in $sensitiveFiles) {
    if (Test-Path $pattern) {
        Write-Host "⚠️  Found: $pattern (will be ignored by .gitignore)" -ForegroundColor Yellow
        $foundSensitive = $true
    }
}

if ($foundSensitive) {
    Write-Host ""
    Write-Host "✅ These files are in .gitignore and won't be committed" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Setup complete! Ready to push to GitHub." -ForegroundColor Green
