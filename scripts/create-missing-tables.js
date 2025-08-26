#!/usr/bin/env node

// Script to manually create missing tables
// Usage: DATABASE_URL="your_url" node scripts/create-missing-tables.js

const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function createMissingTables() {
  try {
    console.log('🔧 Creating missing tables...\n');
    
    // Create in_app_notifications table
    console.log('📋 Creating in_app_notifications table...');
    await sql`
      CREATE TABLE IF NOT EXISTS in_app_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        data JSONB DEFAULT '{}',
        read BOOLEAN DEFAULT false,
        priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        action_url TEXT,
        read_at TIMESTAMP
      )
    `;
    console.log('✅ in_app_notifications table created');
    
    // Create admin_audit_log table
    console.log('📋 Creating admin_audit_log table...');
    await sql`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action_type VARCHAR(100) NOT NULL,
        old_values JSONB,
        new_values JSONB,
        reason TEXT NOT NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ admin_audit_log table created');
    
    // Create indexes
    console.log('📋 Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_unread ON in_app_notifications(user_id, read, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_in_app_notifications_type ON in_app_notifications(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_in_app_notifications_expires ON in_app_notifications(expires_at) WHERE expires_at IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user ON admin_audit_log(admin_user_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user ON admin_audit_log(target_user_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_type ON admin_audit_log(action_type, created_at DESC)`;
    console.log('✅ Indexes created');
    
    // Verify tables exist
    console.log('\n🔍 Verifying tables...');
    const tables = ['in_app_notifications', 'admin_audit_log'];
    
    for (const table of tables) {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${table}
        )
      `;
      
      if (result[0].exists) {
        console.log(`✅ Table '${table}' exists`);
      } else {
        console.log(`❌ Table '${table}' still missing`);
      }
    }
    
    console.log('\n🎉 Missing tables creation completed!');
    
  } catch (error) {
    console.error('💥 Error creating tables:', error.message);
    process.exit(1);
  }
}

createMissingTables();