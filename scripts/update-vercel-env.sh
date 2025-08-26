#!/bin/bash

# Script to update Vercel environment variables
# Usage: ./scripts/update-vercel-env.sh

echo "🚀 Updating Vercel environment variables..."

# Set DATABASE_URL
echo "📊 Setting DATABASE_URL..."
vercel env add DATABASE_URL production <<< "postgres://neondb_owner:npg_XleQA3qiIfE0@ep-purple-meadow-a61byft8-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require"
vercel env add DATABASE_URL preview <<< "postgres://neondb_owner:npg_XleQA3qiIfE0@ep-purple-meadow-a61byft8-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require"

# Set ADMIN_TELEGRAM_ID
echo "👤 Setting ADMIN_TELEGRAM_ID..."
vercel env add ADMIN_TELEGRAM_ID production <<< "507387437"
vercel env add ADMIN_TELEGRAM_ID preview <<< "507387437"

echo "⚠️  Don't forget to set TELEGRAM_BOT_TOKEN manually:"
echo "vercel env add TELEGRAM_BOT_TOKEN production"
echo "vercel env add TELEGRAM_BOT_TOKEN preview"

echo ""
echo "🔄 After setting all variables, redeploy:"
echo "vercel --prod"

echo ""
echo "✅ Environment variables update script completed!"