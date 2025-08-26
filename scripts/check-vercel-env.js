#!/usr/bin/env node

// Script to check and validate Vercel environment variables
// Usage: node scripts/check-vercel-env.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Vercel environment variables...\n');

// Load local environment variables for comparison
require('dotenv').config({ path: '.env.local' });

const requiredVars = [
  'TELEGRAM_BOT_TOKEN',
  'ADMIN_TELEGRAM_ID',
  'DATABASE_URL'
];

const localVars = {};
requiredVars.forEach(varName => {
  localVars[varName] = process.env[varName];
});

console.log('📋 Local environment variables:');
requiredVars.forEach(varName => {
  const value = localVars[varName];
  if (value) {
    if (varName === 'DATABASE_URL') {
      console.log(`  ${varName}: ${value.substring(0, 30)}...`);
    } else if (varName === 'TELEGRAM_BOT_TOKEN') {
      console.log(`  ${varName}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`  ${varName}: ${value}`);
    }
  } else {
    console.log(`  ${varName}: ❌ NOT SET`);
  }
});

console.log('\n🚀 To update Vercel environment variables, run:');
console.log('vercel env add TELEGRAM_BOT_TOKEN');
console.log('vercel env add ADMIN_TELEGRAM_ID');
console.log('vercel env add DATABASE_URL');

console.log('\n📝 Or use the Vercel dashboard:');
console.log('https://vercel.com/dashboard -> Your Project -> Settings -> Environment Variables');

console.log('\n⚠️  Make sure to set the environment variables for:');
console.log('- Production');
console.log('- Preview');
console.log('- Development');

console.log('\n🔄 After updating, redeploy your application:');
console.log('vercel --prod');

// Check if we can connect to the database
if (localVars.DATABASE_URL && localVars.DATABASE_URL !== 'your_neon_database_url_here') {
  console.log('\n🔌 Testing database connection...');
  try {
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(localVars.DATABASE_URL);
    
    // Test connection
    sql`SELECT 1 as test`.then(() => {
      console.log('✅ Database connection successful');
    }).catch(error => {
      console.log('❌ Database connection failed:', error.message);
    });
  } catch (error) {
    console.log('❌ Database connection test failed:', error.message);
  }
} else {
  console.log('\n⚠️  DATABASE_URL is not properly configured');
}

// Check admin configuration
if (localVars.ADMIN_TELEGRAM_ID && localVars.ADMIN_TELEGRAM_ID !== 'your_admin_telegram_id_here') {
  console.log(`\n👤 Admin configured for Telegram ID: ${localVars.ADMIN_TELEGRAM_ID}`);
  console.log('   This should be @nikirO1\'s Telegram ID');
} else {
  console.log('\n⚠️  ADMIN_TELEGRAM_ID is not properly configured');
}