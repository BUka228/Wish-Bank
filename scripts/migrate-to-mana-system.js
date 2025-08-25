#!/usr/bin/env node

/**
 * Migration Script: Convert Legacy Currency System to Mana
 * 
 * This script migrates all users from the old three-currency system 
 * (green, blue, red wishes) to the new unified Mana system.
 * 
 * Usage:
 *   node scripts/migrate-to-mana-system.js [options]
 * 
 * Options:
 *   --dry-run    : Show what would be migrated without making changes
 *   --user-id    : Migrate specific user only
 *   --batch-size : Number of users to process in each batch (default: 100)
 *   --rollback   : Rollback migration for specified user
 */

const { Pool } = require('pg');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Conversion rates (matching TypeScript constants)
const LEGACY_CONVERSION_RATES = {
  green: 10,   // 1 green wish = 10 mana
  blue: 100,   // 1 blue wish = 100 mana  
  red: 1000    // 1 red wish = 1000 mana
};

class MigrationScript {
  constructor() {
    this.dryRun = process.argv.includes('--dry-run');
    this.rollback = process.argv.includes('--rollback');
    this.batchSize = this.getArgValue('--batch-size') || 100;
    this.specificUserId = this.getArgValue('--user-id');
  }

  getArgValue(argName) {
    const argIndex = process.argv.indexOf(argName);
    return argIndex !== -1 && argIndex + 1 < process.argv.length 
      ? process.argv[argIndex + 1] 
      : null;
  }

  convertBalancesToMana(user) {
    const greenMana = user.green_balance * LEGACY_CONVERSION_RATES.green;
    const blueMana = user.blue_balance * LEGACY_CONVERSION_RATES.blue;
    const redMana = user.red_balance * LEGACY_CONVERSION_RATES.red;
    
    return greenMana + blueMana + redMana;
  }

  async validateUserData(userId) {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      
      if (result.rows.length === 0) {
        return { isValid: false, error: 'User not found' };
      }

      const user = result.rows[0];
      const errors = [];

      if (user.green_balance < 0) errors.push('Negative green balance');
      if (user.blue_balance < 0) errors.push('Negative blue balance');
      if (user.red_balance < 0) errors.push('Negative red balance');

      return {
        isValid: errors.length === 0,
        error: errors.join(', '),
        user,
        calculatedMana: this.convertBalancesToMana(user)
      };
    } finally {
      client.release();
    }
  }

  async migrateUser(userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get user data
      const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Check if already migrated
      if (user.legacy_migration_completed) {
        console.log(`  ⚠️  User ${userId} already migrated, skipping`);
        await client.query('COMMIT');
        return { skipped: true };
      }

      // Calculate Mana conversion
      const totalMana = this.convertBalancesToMana(user);

      if (this.dryRun) {
        console.log(`  📊 Would convert: Green(${user.green_balance}) + Blue(${user.blue_balance}) + Red(${user.red_balance}) = ${totalMana} Mana`);
        await client.query('ROLLBACK');
        return { dryRun: true, totalMana };
      }

      // Create migration transaction record
      await client.query(`
        INSERT INTO transactions (
          user_id, type, wish_type, amount, mana_amount, reason, 
          transaction_category, transaction_source, experience_gained
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        userId,
        'credit',
        'green',
        user.green_balance + user.blue_balance + user.red_balance,
        totalMana,
        'Legacy currency conversion to Mana',
        'migration',
        'currency_converter',
        0
      ]);

      // Update user with Mana balance
      await client.query(`
        UPDATE users 
        SET mana_balance = $1, 
            legacy_migration_completed = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [totalMana, true, userId]);

      await client.query('COMMIT');

      return { 
        success: true, 
        totalMana,
        originalBalances: {
          green: user.green_balance,
          blue: user.blue_balance,
          red: user.red_balance
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async rollbackUser(userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      if (!user.legacy_migration_completed) {
        console.log(`  ⚠️  User ${userId} was not migrated, nothing to rollback`);
        await client.query('COMMIT');
        return { notMigrated: true };
      }

      if (this.dryRun) {
        console.log(`  📊 Would rollback: Reset mana_balance to 0, legacy_migration_completed to false`);
        await client.query('ROLLBACK');
        return { dryRun: true };
      }

      // Reset user to pre-migration state
      await client.query(`
        UPDATE users 
        SET mana_balance = 0,
            legacy_migration_completed = false,
            updated_at = NOW()
        WHERE id = $1
      `, [userId]);

      // Create rollback transaction record
      await client.query(`
        INSERT INTO transactions (
          user_id, type, wish_type, amount, mana_amount, reason, 
          transaction_category, transaction_source, experience_gained
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        userId,
        'debit',
        'green',
        0,
        user.mana_balance,
        'Rollback of legacy currency conversion',
        'migration_rollback',
        'currency_converter',
        0
      ]);

      await client.query('COMMIT');

      return { success: true, rolledBackMana: user.mana_balance };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUsers() {
    const client = await pool.connect();
    try {
      let query = 'SELECT id, name, green_balance, blue_balance, red_balance, legacy_migration_completed FROM users';
      let params = [];

      if (this.specificUserId) {
        query += ' WHERE id = $1';
        params = [this.specificUserId];
      } else {
        query += ' ORDER BY created_at ASC';
      }

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getMigrationStats() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE legacy_migration_completed = true) as migrated_users,
          COUNT(*) FILTER (WHERE legacy_migration_completed = false) as pending_users,
          COALESCE(SUM(mana_balance), 0) as total_mana
        FROM users
      `);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async run() {
    console.log('🚀 Mana System Migration Script');
    console.log('================================');
    
    if (this.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made');
    }
    
    if (this.rollback) {
      console.log('⏪ ROLLBACK MODE - Reversing migrations');
    }

    try {
      // Get initial stats
      const initialStats = await this.getMigrationStats();
      console.log('\n📊 Current Status:');
      console.log(`   Total Users: ${initialStats.total_users}`);
      console.log(`   Migrated: ${initialStats.migrated_users}`);
      console.log(`   Pending: ${initialStats.pending_users}`);
      console.log(`   Total Mana in System: ${initialStats.total_mana}`);

      // Get users to process
      const users = await this.getUsers();
      
      if (users.length === 0) {
        console.log('\n✅ No users found to process');
        return;
      }

      console.log(`\n🔄 Processing ${users.length} user(s)...`);

      let successful = 0;
      let failed = 0;
      let skipped = 0;
      let totalManaProcessed = 0;

      // Process users in batches
      for (let i = 0; i < users.length; i += this.batchSize) {
        const batch = users.slice(i, i + this.batchSize);
        console.log(`\n📦 Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(users.length / this.batchSize)}`);

        for (const user of batch) {
          try {
            console.log(`\n👤 Processing user: ${user.name || user.id}`);

            // Validate user data
            const validation = await this.validateUserData(user.id);
            if (!validation.isValid) {
              console.log(`  ❌ Validation failed: ${validation.error}`);
              failed++;
              continue;
            }

            // Process user
            let result;
            if (this.rollback) {
              result = await this.rollbackUser(user.id);
            } else {
              result = await this.migrateUser(user.id);
            }

            if (result.skipped || result.notMigrated) {
              skipped++;
            } else if (result.success || result.dryRun) {
              successful++;
              if (result.totalMana) {
                totalManaProcessed += result.totalMana;
              }
              
              if (result.success) {
                if (this.rollback) {
                  console.log(`  ✅ Rollback completed (${result.rolledBackMana} Mana removed)`);
                } else {
                  console.log(`  ✅ Migration completed (${result.totalMana} Mana converted)`);
                }
              }
            }

          } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
            failed++;
          }
        }
      }

      // Final summary
      console.log('\n🎯 Migration Summary:');
      console.log(`   Successful: ${successful}`);
      console.log(`   Failed: ${failed}`);
      console.log(`   Skipped: ${skipped}`);
      console.log(`   Total Mana Processed: ${totalManaProcessed}`);

      if (!this.dryRun) {
        const finalStats = await this.getMigrationStats();
        console.log('\n📊 Final Status:');
        console.log(`   Total Users: ${finalStats.total_users}`);
        console.log(`   Migrated: ${finalStats.migrated_users}`);
        console.log(`   Pending: ${finalStats.pending_users}`);
        console.log(`   Total Mana in System: ${finalStats.total_mana}`);
      }

    } catch (error) {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    } finally {
      await pool.end();
    }

    console.log('\n✨ Migration script completed!');
  }
}

// Run the script
if (require.main === module) {
  const migration = new MigrationScript();
  migration.run().catch(console.error);
}

module.exports = MigrationScript;