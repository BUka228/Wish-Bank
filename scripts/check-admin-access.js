#!/usr/bin/env node

// Script to check admin access for @nikirO1
// Usage: node scripts/check-admin-access.js

const { neon } = require('@neondatabase/serverless');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

if (!process.env.ADMIN_TELEGRAM_ID) {
  console.error('❌ ADMIN_TELEGRAM_ID environment variable is not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID;

async function checkAdminAccess() {
  try {
    console.log('🔍 Checking admin access configuration...\n');
    
    console.log(`👤 Admin Telegram ID: ${ADMIN_TELEGRAM_ID}`);
    
    // Check if user exists in database
    const userResult = await sql`
      SELECT id, telegram_id, name, username, created_at 
      FROM users 
      WHERE telegram_id = ${ADMIN_TELEGRAM_ID}
    `;
    
    if (userResult.length === 0) {
      console.log('❌ Admin user not found in database');
      console.log('   The user needs to open the app at least once to be created');
      return;
    }
    
    const adminUser = userResult[0];
    console.log('✅ Admin user found in database:');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Username: ${adminUser.username || 'N/A'}`);
    console.log(`   Created: ${adminUser.created_at}`);
    
    // Check admin audit log table exists
    try {
      const auditResult = await sql`
        SELECT COUNT(*) as count FROM admin_audit_log WHERE admin_user_id = ${adminUser.id}
      `;
      console.log(`📋 Admin audit log entries: ${auditResult[0].count}`);
    } catch (error) {
      console.log('⚠️  Admin audit log table may not exist yet');
    }
    
    // Test admin validation function
    console.log('\n🧪 Testing admin validation...');
    
    const isAdmin = adminUser.telegram_id === ADMIN_TELEGRAM_ID;
    console.log(`   Telegram ID match: ${isAdmin ? '✅' : '❌'}`);
    
    if (isAdmin) {
      console.log('🎉 Admin access is properly configured!');
      console.log('\n📱 Admin panel should be accessible at:');
      console.log('   /admin/control-panel');
      console.log('   /admin/mana');
    } else {
      console.log('❌ Admin access is NOT properly configured');
    }
    
    // Check if in_app_notifications table exists
    try {
      await sql`SELECT 1 FROM in_app_notifications LIMIT 1`;
      console.log('✅ in_app_notifications table exists');
    } catch (error) {
      console.log('❌ in_app_notifications table does not exist');
      console.log('   Run migrations to create this table');
    }
    
  } catch (error) {
    console.error('💥 Error checking admin access:', error.message);
    process.exit(1);
  }
}

checkAdminAccess();