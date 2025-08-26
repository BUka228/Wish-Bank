#!/usr/bin/env node

// Fix Admin Panel Database Issues
// This script ensures all required tables and columns exist for the admin panel

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Use environment variable or default to local
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_URL environment variable is required');
  console.error('Make sure .env.local file exists and contains DATABASE_URL');
  process.exit(1);
}

console.log('🔗 Using database:', DATABASE_URL.substring(0, 50) + '...');
const sql = neon(DATABASE_URL);

async function fixAdminPanelDB() {
  try {
    console.log('🔧 Fixing admin panel database issues...');
    
    // 1. Ensure mana_balance column exists in users table
    console.log('📝 Adding mana_balance column to users table...');
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mana_balance INTEGER DEFAULT 0
    `;
    console.log('✅ mana_balance column ensured');
    
    // 2. Ensure admin_audit_log table exists
    console.log('📝 Creating admin_audit_log table...');
    await sql`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(100) NOT NULL,
        old_values JSONB,
        new_values JSONB,
        reason TEXT NOT NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user_id ON admin_audit_log(admin_user_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user_id ON admin_audit_log(target_user_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_type ON admin_audit_log(action_type)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC)
    `;
    console.log('✅ admin_audit_log table ensured');
    
    // 3. Ensure shared_wishes table exists
    console.log('📝 Creating shared_wishes table...');
    await sql`
      CREATE TABLE IF NOT EXISTS shared_wishes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wish_id UUID NOT NULL REFERENCES wishes(id) ON DELETE CASCADE,
        created_by_admin UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_global BOOLEAN DEFAULT TRUE,
        target_users UUID[] DEFAULT '{}',
        participation_count INTEGER DEFAULT 0,
        completion_progress INTEGER DEFAULT 0 CHECK (completion_progress >= 0 AND completion_progress <= 100),
        collective_reward INTEGER DEFAULT 0,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}',
        
        -- Constraints
        CONSTRAINT shared_wishes_collective_reward_positive CHECK (collective_reward >= 0),
        CONSTRAINT shared_wishes_participation_count_positive CHECK (participation_count >= 0),
        CONSTRAINT shared_wishes_expires_future CHECK (expires_at IS NULL OR expires_at > created_at)
      )
    `;
    console.log('✅ shared_wishes table ensured');
    
    // 4. Ensure shared_wish_participants table exists
    console.log('📝 Creating shared_wish_participants table...');
    await sql`
      CREATE TABLE IF NOT EXISTS shared_wish_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shared_wish_id UUID NOT NULL REFERENCES shared_wishes(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        participation_status VARCHAR(20) DEFAULT 'active' CHECK (participation_status IN ('active', 'completed', 'opted_out')),
        progress_contribution INTEGER DEFAULT 0 CHECK (progress_contribution >= 0),
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        
        -- Unique constraint to prevent duplicate participation
        UNIQUE(shared_wish_id, user_id)
      )
    `;
    console.log('✅ shared_wish_participants table ensured');
    
    // 5. Create indexes for performance
    console.log('📝 Creating performance indexes...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_shared_wishes_wish_id ON shared_wishes(wish_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_shared_wishes_created_by_admin ON shared_wishes(created_by_admin)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_shared_wishes_is_global ON shared_wishes(is_global)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_shared_wish_participants_shared_wish_id ON shared_wish_participants(shared_wish_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_shared_wish_participants_user_id ON shared_wish_participants(user_id)
    `;
    console.log('✅ Performance indexes created');
    
    // 6. Verify tables exist
    console.log('\n🔍 Verifying tables exist...');
    const tables = ['users', 'admin_audit_log', 'shared_wishes', 'shared_wish_participants'];
    
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
        console.log(`❌ Table '${table}' missing`);
      }
    }
    
    // 7. Verify columns exist
    console.log('\n🔍 Verifying columns exist...');
    const columns = [
      { table: 'users', column: 'mana_balance' }
    ];
    
    for (const { table, column } of columns) {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = ${table} AND column_name = ${column}
        )
      `;
      
      if (result[0].exists) {
        console.log(`✅ Column '${table}.${column}' exists`);
      } else {
        console.log(`❌ Column '${table}.${column}' missing`);
      }
    }
    
    console.log('\n🎉 Admin panel database fixes completed successfully!');
    
  } catch (error) {
    console.error('💥 Database fix failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the fixes
fixAdminPanelDB();