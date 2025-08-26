/**
 * Remove In-App Notifications Migration Script
 * This script removes all in-app notification related database tables
 * since the system now uses Telegram-only notifications
 */

const fs = require('fs');
const path = require('path');

async function runNotificationCleanupMigration() {
  try {
    // Import database connection
    const { sql } = require('../lib/db-pool');
    
    console.log('🧹 Starting in-app notification cleanup migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '015_remove_in_app_notifications.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL commands (basic splitting by semicolon)
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📋 Found ${commands.length} SQL commands to execute`);
    
    // Execute each command
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`⏳ Executing command ${i + 1}/${commands.length}...`);
      
      try {
        await sql.unsafe(command);
        console.log(`✅ Command ${i + 1} completed successfully`);
      } catch (error) {
        // Some commands may fail if tables don't exist, which is okay
        if (error.message.includes('does not exist') || error.message.includes('already exists')) {
          console.log(`⚠️  Command ${i + 1} skipped (resource already in correct state): ${error.message}`);
        } else {
          console.error(`❌ Command ${i + 1} failed:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('✅ In-app notification cleanup migration completed successfully!');
    console.log('📱 System is now configured for Telegram-only notifications');
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    
    try {
      // Check that notification tables are gone
      const result = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('in_app_notifications', 'notification_settings', 'delayed_notifications')
      `;
      
      if (result.length === 0) {
        console.log('✅ All notification tables successfully removed');
      } else {
        console.log('⚠️  Some notification tables still exist:', result.map(r => r.table_name));
      }
      
      // Check that telegram_id column exists
      const telegramColumn = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'telegram_id'
      `;
      
      if (telegramColumn.length > 0) {
        console.log('✅ telegram_id column exists in users table');
      } else {
        console.log('⚠️  telegram_id column not found in users table');
      }
      
    } catch (verifyError) {
      console.log('⚠️  Verification failed, but migration may have succeeded:', verifyError.message);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runNotificationCleanupMigration()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runNotificationCleanupMigration };