#!/usr/bin/env node

/**
 * Migration Rollback System
 * 
 * This script provides comprehensive rollback capabilities for the Mana migration,
 * including selective rollbacks, batch rollbacks, and emergency rollbacks.
 * 
 * Usage:
 *   node scripts/migration-rollback-system.js [options]
 * 
 * Options:
 *   --user-id <id>      : Rollback specific user
 *   --batch-size <n>    : Number of users to rollback in each batch (default: 50)
 *   --all               : Rollback all migrated users
 *   --since <date>      : Rollback users migrated since date (YYYY-MM-DD)
 *   --dry-run           : Show what would be rolled back without making changes
 *   --emergency         : Emergency rollback mode (faster, less validation)
 *   --preserve-logs     : Keep migration transaction logs during rollback
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class MigrationRollbackSystem {
  constructor() {
    this.specificUserId = this.getArgValue('--user-id');
    this.batchSize = parseInt(this.getArgValue('--batch-size')) || 50;
    this.rollbackAll = process.argv.includes('--all');
    this.sinceDate = this.getArgValue('--since');
    this.dryRun = process.argv.includes('--dry-run');
    this.emergency = process.argv.includes('--emergency');
    this.preserveLogs = process.argv.includes('--preserve-logs');
    
    this.stats = {
      startTime: new Date(),
      totalUsers: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      totalManaRolledBack: 0,
      errors: []
    };
    
    // Initialize logging
    this.logFile = path.join(__dirname, `rollback-${new Date().toISOString().split('T')[0]}.log`);
  }

  getArgValue(argName) {
    const argIndex = process.argv.indexOf(argName);
    return argIndex !== -1 && argIndex + 1 < process.argv.length 
      ? process.argv[argIndex + 1] 
      : null;
  }

  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      data
    };

    // Console output with colors
    const colors = {
      debug: '\x1b[36m',   // Cyan
      info: '\x1b[32m',    // Green
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'
    };

    console.log(`${colors[level]}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }

    // File logging
    try {
      await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  async getUsersToRollback() {
    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM users WHERE legacy_migration_completed = true';
      const params = [];
      let paramIndex = 1;

      if (this.specificUserId) {
        query += ` AND id = $${paramIndex++}`;
        params.push(this.specificUserId);
      } else if (this.sinceDate) {
        // Find users migrated since the specified date
        query += ` AND id IN (
          SELECT DISTINCT user_id FROM transactions 
          WHERE transaction_source IN ('currency_converter', 'user_migration_system')
            AND reason = 'Legacy currency conversion to Mana'
            AND created_at >= $${paramIndex++}
        )`;
        params.push(this.sinceDate);
      }

      query += ' ORDER BY created_at ASC';

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async validateRollbackEligibility(userId) {
    const client = await pool.connect();
    try {
      // Get user data
      const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return { eligible: false, reason: 'User not found' };
      }

      const user = userResult.rows[0];

      // Check if user was actually migrated
      if (!user.legacy_migration_completed) {
        return { eligible: false, reason: 'User was not migrated' };
      }

      // Check if user has spent mana since migration
      const spendingResult = await client.query(`
        SELECT COUNT(*) as spending_count, COALESCE(SUM(mana_amount), 0) as total_spent
        FROM transactions 
        WHERE user_id = $1 
          AND type = 'debit' 
          AND mana_amount > 0
          AND transaction_source != 'user_migration_system'
          AND created_at > (
            SELECT created_at FROM transactions 
            WHERE user_id = $1 
              AND transaction_source IN ('currency_converter', 'user_migration_system')
              AND reason = 'Legacy currency conversion to Mana'
            ORDER BY created_at DESC LIMIT 1
          )
      `, [userId]);

      const spendingData = spendingResult.rows[0];
      const hasSpentMana = parseInt(spendingData.spending_count) > 0;
      const totalSpent = parseInt(spendingData.total_spent);

      if (hasSpentMana && !this.emergency) {
        return { 
          eligible: false, 
          reason: `User has spent ${totalSpent} Mana since migration`,
          spentMana: totalSpent
        };
      }

      // Get original migration transaction
      const migrationTxResult = await client.query(`
        SELECT * FROM transactions 
        WHERE user_id = $1
          AND transaction_source IN ('currency_converter', 'user_migration_system')
          AND reason = 'Legacy currency conversion to Mana'
        ORDER BY created_at DESC 
        LIMIT 1
      `, [userId]);

      if (migrationTxResult.rows.length === 0) {
        return { eligible: false, reason: 'Original migration transaction not found' };
      }

      return { 
        eligible: true, 
        user,
        migrationTransaction: migrationTxResult.rows[0],
        hasSpentMana,
        totalSpent
      };

    } finally {
      client.release();
    }
  }

  async rollbackUser(userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate rollback eligibility
      const validation = await this.validateRollbackEligibility(userId);
      if (!validation.eligible) {
        await this.log('warn', `Skipping user ${userId}: ${validation.reason}`);
        await client.query('COMMIT');
        return { skipped: true, reason: validation.reason };
      }

      const { user, migrationTransaction, hasSpentMana, totalSpent } = validation;

      if (this.dryRun) {
        await this.log('info', `[DRY RUN] Would rollback user ${userId}`, {
          currentMana: user.mana_balance,
          originalMigrationMana: migrationTransaction.mana_amount,
          hasSpentMana,
          totalSpent
        });
        await client.query('ROLLBACK');
        return { dryRun: true, manaToRollback: user.mana_balance };
      }

      // In emergency mode, we might need to handle users who have spent mana
      let adjustedManaBalance = user.mana_balance;
      if (this.emergency && hasSpentMana) {
        await this.log('warn', `Emergency rollback: User ${userId} has spent ${totalSpent} Mana since migration`);
        // In emergency mode, we still reset to 0 but log the discrepancy
        adjustedManaBalance = user.mana_balance;
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
          transaction_category, transaction_source, experience_gained,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        userId,
        'debit',
        'green',
        0,
        adjustedManaBalance,
        'Rollback of legacy currency conversion',
        'migration_rollback',
        'migration_rollback_system',
        0,
        JSON.stringify({
          rolled_back_mana: adjustedManaBalance,
          original_migration_mana: migrationTransaction.mana_amount,
          rollback_timestamp: new Date().toISOString(),
          original_migration_tx_id: migrationTransaction.id,
          emergency_mode: this.emergency,
          had_spent_mana: hasSpentMana,
          total_spent_since_migration: totalSpent,
          rollback_reason: this.emergency ? 'emergency_rollback' : 'standard_rollback'
        })
      ]);

      // Optionally remove migration transaction logs
      if (!this.preserveLogs) {
        await client.query(`
          DELETE FROM transactions 
          WHERE id = $1
        `, [migrationTransaction.id]);
        
        await this.log('debug', `Removed original migration transaction for user ${userId}`);
      }

      await client.query('COMMIT');

      await this.log('info', `Successfully rolled back user ${userId}`, {
        rolledBackMana: adjustedManaBalance,
        originalMigrationMana: migrationTransaction.mana_amount,
        hadSpentMana: hasSpentMana
      });

      return { 
        success: true, 
        rolledBackMana: adjustedManaBalance,
        originalMigrationMana: migrationTransaction.mana_amount,
        hadSpentMana
      };

    } catch (error) {
      await client.query('ROLLBACK');
      await this.log('error', `Failed to rollback user ${userId}`, { error: error.message });
      throw error;
    } finally {
      client.release();
    }
  }

  async processBatch(users, batchNumber, totalBatches) {
    await this.log('info', `Processing rollback batch ${batchNumber}/${totalBatches} (${users.length} users)`);
    
    const batchResults = {
      successful: 0,
      failed: 0,
      skipped: 0,
      totalManaRolledBack: 0
    };

    for (const user of users) {
      try {
        const result = await this.rollbackUser(user.id);
        
        if (result.success || result.dryRun) {
          batchResults.successful++;
          this.stats.successful++;
          if (result.rolledBackMana || result.manaToRollback) {
            const manaAmount = result.rolledBackMana || result.manaToRollback;
            batchResults.totalManaRolledBack += manaAmount;
            this.stats.totalManaRolledBack += manaAmount;
          }
        } else if (result.skipped) {
          batchResults.skipped++;
          this.stats.skipped++;
        }

      } catch (error) {
        batchResults.failed++;
        this.stats.failed++;
        this.stats.errors.push({
          userId: user.id,
          userName: user.name,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        await this.log('error', `Failed to rollback user ${user.name || user.id}`, {
          userId: user.id,
          error: error.message
        });
      }
    }

    await this.log('info', `Batch ${batchNumber} completed`, batchResults);
    return batchResults;
  }

  async getPreRollbackStats() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE legacy_migration_completed = true) as migrated_users,
          COUNT(*) FILTER (WHERE legacy_migration_completed = false) as non_migrated_users,
          COALESCE(SUM(mana_balance), 0) as total_mana,
          COUNT(*) FILTER (WHERE mana_balance > 0) as users_with_mana
        FROM users
      `);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async validatePostRollback() {
    await this.log('info', 'Running post-rollback validation');
    
    const client = await pool.connect();
    try {
      // Check for users still marked as migrated
      const stillMigrated = await client.query(`
        SELECT COUNT(*) as count FROM users WHERE legacy_migration_completed = true
      `);
      
      // Check for users with mana balance but not migrated
      const orphanedMana = await client.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(mana_balance), 0) as total_orphaned_mana
        FROM users WHERE legacy_migration_completed = false AND mana_balance > 0
      `);
      
      // Check rollback transaction count
      const rollbackTxCount = await client.query(`
        SELECT COUNT(*) as count FROM transactions 
        WHERE transaction_category = 'migration_rollback'
          AND transaction_source = 'migration_rollback_system'
      `);

      const validation = {
        stillMigratedUsers: parseInt(stillMigrated.rows[0].count),
        orphanedManaUsers: parseInt(orphanedMana.rows[0].count),
        totalOrphanedMana: parseInt(orphanedMana.rows[0].total_orphaned_mana),
        rollbackTransactions: parseInt(rollbackTxCount.rows[0].count)
      };

      await this.log('info', 'Post-rollback validation results', validation);

      if (validation.stillMigratedUsers > 0) {
        await this.log('warn', `${validation.stillMigratedUsers} users still marked as migrated`);
      }

      if (validation.orphanedManaUsers > 0) {
        await this.log('warn', `${validation.orphanedManaUsers} users have orphaned mana (${validation.totalOrphanedMana} total)`);
      }

      return validation;

    } finally {
      client.release();
    }
  }

  async run() {
    await this.log('info', '🔄 Starting Migration Rollback System');
    await this.log('info', 'Configuration', {
      specificUserId: this.specificUserId,
      rollbackAll: this.rollbackAll,
      sinceDate: this.sinceDate,
      dryRun: this.dryRun,
      emergency: this.emergency,
      preserveLogs: this.preserveLogs,
      batchSize: this.batchSize
    });

    try {
      // Validate parameters
      if (!this.specificUserId && !this.rollbackAll && !this.sinceDate) {
        throw new Error('Must specify --user-id, --all, or --since parameter');
      }

      // Get pre-rollback statistics
      const preStats = await this.getPreRollbackStats();
      await this.log('info', 'Pre-rollback statistics', preStats);

      // Get users to rollback
      const users = await this.getUsersToRollback();
      this.stats.totalUsers = users.length;
      
      if (users.length === 0) {
        await this.log('info', 'No users found to rollback');
        return;
      }

      await this.log('info', `Found ${users.length} user(s) to rollback`);

      // Confirm rollback in non-emergency mode
      if (!this.emergency && !this.dryRun) {
        await this.log('warn', `About to rollback ${users.length} users. This will remove ${preStats.total_mana} Mana from the system.`);
        // In a real implementation, you might want to add a confirmation prompt here
      }

      // Process users in batches
      const totalBatches = Math.ceil(users.length / this.batchSize);
      
      for (let i = 0; i < users.length; i += this.batchSize) {
        const batch = users.slice(i, i + this.batchSize);
        const batchNumber = Math.floor(i / this.batchSize) + 1;
        
        await this.processBatch(batch, batchNumber, totalBatches);
        
        // Small delay between batches to avoid overwhelming the database
        if (batchNumber < totalBatches && !this.emergency) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Post-rollback validation
      if (!this.dryRun) {
        await this.validatePostRollback();
      }

      // Generate summary
      this.stats.endTime = new Date();
      this.stats.duration = this.stats.endTime - this.stats.startTime;
      
      await this.log('info', '🎯 Rollback Summary', {
        duration: `${Math.round(this.stats.duration / 1000)}s`,
        totalUsers: this.stats.totalUsers,
        successful: this.stats.successful,
        failed: this.stats.failed,
        skipped: this.stats.skipped,
        totalManaRolledBack: this.stats.totalManaRolledBack,
        errorCount: this.stats.errors.length
      });

      if (this.stats.errors.length > 0) {
        await this.log('warn', 'Errors encountered during rollback', {
          errors: this.stats.errors
        });
      }

    } catch (error) {
      await this.log('error', 'Rollback system failed', { error: error.message });
      throw error;
    } finally {
      await pool.end();
    }

    await this.log('info', '✨ Rollback system completed');
  }
}

// Run the script
if (require.main === module) {
  const rollbackSystem = new MigrationRollbackSystem();
  rollbackSystem.run().catch(error => {
    console.error('💥 Rollback system failed:', error);
    process.exit(1);
  });
}

module.exports = MigrationRollbackSystem;