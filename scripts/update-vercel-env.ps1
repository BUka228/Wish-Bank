# PowerShell script to update Vercel environment variables
# Usage: .\scripts\update-vercel-env.ps1

Write-Host "🚀 Updating Vercel environment variables..." -ForegroundColor Green

# Set DATABASE_URL
Write-Host "📊 Setting DATABASE_URL..." -ForegroundColor Yellow
$databaseUrl = "postgres://neondb_owner:npg_XleQA3qiIfE0@ep-purple-meadow-a61byft8-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require"

Write-Host "Setting DATABASE_URL for production..." -ForegroundColor Cyan
echo $databaseUrl | vercel env add DATABASE_URL production

Write-Host "Setting DATABASE_URL for preview..." -ForegroundColor Cyan
echo $databaseUrl | vercel env add DATABASE_URL preview

# Set ADMIN_TELEGRAM_ID
Write-Host "👤 Setting ADMIN_TELEGRAM_ID..." -ForegroundColor Yellow
$adminTelegramId = "507387437"

Write-Host "Setting ADMIN_TELEGRAM_ID for production..." -ForegroundColor Cyan
echo $adminTelegramId | vercel env add ADMIN_TELEGRAM_ID production

Write-Host "Setting ADMIN_TELEGRAM_ID for preview..." -ForegroundColor Cyan
echo $adminTelegramId | vercel env add ADMIN_TELEGRAM_ID preview

Write-Host ""
Write-Host "⚠️  Don't forget to set TELEGRAM_BOT_TOKEN manually:" -ForegroundColor Red
Write-Host "vercel env add TELEGRAM_BOT_TOKEN production" -ForegroundColor White
Write-Host "vercel env add TELEGRAM_BOT_TOKEN preview" -ForegroundColor White

Write-Host ""
Write-Host "🔄 After setting all variables, redeploy:" -ForegroundColor Yellow
Write-Host "vercel --prod" -ForegroundColor White

Write-Host ""
Write-Host "✅ Environment variables update script completed!" -ForegroundColor Green