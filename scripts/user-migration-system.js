#!/usr/bin/env node

/**
 * Comprehensive User Migration System for Mana Economy
 * 
 * This script provides a complete migration system with:
 * - Pre-migration data integrity checks
 * - Batch processing with progress tracking
 * - Automatic rollback on critical errors
 * - Detailed logging and monitoring
 * - Post-migration validation
 * 
 * Usage:
 *   node scripts/user-migration-system.js [options]
 * 
 * Options:
 *   --dry-run           : Show what would be migrated without making changes
 *   --batch-size <n>    : Number of users to process in each batch (default: 50)
 *   --user-id <id>      : Migrate specific user only
 *   --rollback          : Rollback migration for all users or specific user
 *   --validate-only     : Only run validation checks without migration
 *   --auto-fix          : Automatically fix data integrity issues
 *   --log-level <level> : Set logging level (debug, info, warn, error)
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Migration constants
const LEGACY_CONVERSION_RATES = {
  green: 10,   // 1 green wish = 10 mana
  blue: 100,   // 1 blue wish = 100 mana  
  red: 1000    // 1 red wish = 1000 mana
};

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class UserMigrationSystem {
  constructor() {
    this.dryRun = process.argv.includes('--dry-run');
    this.rollback = process.argv.includes('--rollback');
    this.validateOnly = process.argv.includes('--validate-only');
    this.autoFix = process.argv.includes('--auto-fix');
    this.batchSize = parseInt(this.getArgValue('--batch-size')) || 50;
    this.specificUserId = this.getArgValue('--user-id');
    this.logLevel = this.getArgValue('--log-level') || 'info';
    
    // Initialize logging
    this.logFile = path.join(__dirname, `migration-${new Date().toISOString().split('T')[0]}.log`);
    this.stats = {
      startTime: new Date(),
      totalUsers: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      rolledBack: 0,
      totalManaConverted: 0,
      errors: []
    };
  }

  getArgValue(argName) {
    const argIndex = process.argv.indexOf(argName);
    return argIndex !== -1 && argIndex + 1 < process.argv.length 
      ? process.argv[argIndex + 1] 
      : null;
  }

  async log(level, message, data = null) {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.logLevel]) {
      return;
    }

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

  convertBalancesToMana(user) {
    const greenMana = user.green_balance * LEGACY_CONVERSION_RATES.green;
    const blueMana = user.blue_balance * LEGACY_CONVERSION_RATES.blue;
    const redMana = user.red_balance * LEGACY_CONVERSION_RATES.red;
    
    return greenMana + blueMana + redMana;
  }

  async validateDataIntegrity(userId = null) {
    await this.log('info', 'Starting data integrity validation', { userId });
    
    const client = await pool.connect();
    const issues = [];
    
    try {
      let query = 'SELECT * FROM users';
      let params = [];
      
      if (userId) {
        query += ' WHERE id = $1';
        params = [userId];
      }
      
      const result = await client.query(query, params);
      const users = result.rows;

      await this.log('info', `Validating ${users.length} user(s)`);

      for (const user of users) {
        const userIssues = [];

        // Check for negative balances
        if (user.green_balance < 0) {
          userIssues.push({ type: 'negative_balance', field: 'green_balance', value: user.green_balance });
        }
        if (user.blue_balance < 0) {
          userIssues.push({ type: 'negative_balance', field: 'blue_balance', value: user.blue_balance });
        }
        if (user.red_balance < 0) {
          userIssues.push({ type: 'negative_balance', field: 'red_balance', value: user.red_balance });
        }

        // Check for inconsistent migration state
        if (user.legacy_migration_completed && user.mana_balance === 0) {
          const expectedMana = this.convertBalancesToMana(user);
          if (expectedMana > 0) {
            userIssues.push({ 
              type: 'migration_inconsistency', 
              message: 'Marked as migrated but has zero mana with non-zero legacy balances',
              expectedMana 
            });
          }
        }

        // Check for orphaned mana
        if (!user.legacy_migration_completed && user.mana_balance > 0) {
          userIssues.push({ 
            type: 'orphaned_mana', 
            message: 'Has mana balance but not marked as migrated',
            manaBalance: user.mana_balance 
          });
        }

        // Calculate expected mana
        const expectedMana = this.convertBalancesToMana(user);
        
        // Warn about large conversions
        if (expectedMana > 100000) {
          userIssues.push({ 
            type: 'large_conversion', 
            message: `Large conversion detected: ${expectedMana} Mana`,
            expectedMana 
          });
        }

        if (userIssues.length > 0) {
          issues.push({
            userId: user.id,
            userName: user.name,
            issues: userIssues,
            currentState: {
              green_balance: user.green_balance,
              blue_balance: user.blue_balance,
              red_balance: user.red_balance,
              mana_balance: user.mana_balance,
              legacy_migration_completed: user.legacy_migration_completed
            },
            expectedMana
          });
        }
      }

      await this.log('info', `Validation completed. Found ${issues.length} user(s) with issues`);
      
      if (issues.length > 0) {
        await this.log('warn', 'Data integrity issues found', { issueCount: issues.length });
        
        for (const issue of issues) {
          await this.log('warn', `User ${issue.userName || issue.userId} has issues`, {
            userId: issue.userId,
            issues: issue.issues,
            currentState: issue.currentState
          });
        }
      }

      return { isValid: issues.length === 0, issues };

    } finally {
      client.release();
    }
  }

  async fixDataIntegrityIssues(issues) {
    await this.log('info', `Attempting to fix ${issues.length} data integrity issues`);
    
    const client = await pool.connect();
    let fixedCount = 0;
    
    try {
      await client.query('BEGIN');

      for (const issue of issues) {
        await this.log('debug', `Fixing issues for user ${issue.userId}`, { issues: issue.issues });
        
        let needsUpdate = false;
        const updates = [];
        const values = [];
        let paramIndex = 1;

        for (const userIssue of issue.issues) {
          switch (userIssue.type) {
            case 'negative_balance':
              updates.push(`${userIssue.field} = $${paramIndex++}`);
              values.push(0);
              needsUpdate = true;
              await this.log('debug', `Fixed negative ${userIssue.field} for user ${issue.userId}`);
              break;

            case 'migration_inconsistency':
              // Reset migration state to allow proper migration
              updates.push(`legacy_migration_completed = $${paramIndex++}`);
              values.push(false);
              updates.push(`mana_balance = $${paramIndex++}`);
              values.push(0);
              needsUpdate = true;
              await this.log('debug', `Reset migration state for user ${issue.userId}`);
              break;

            case 'orphaned_mana':
              // Reset orphaned mana
              updates.push(`mana_balance = $${paramIndex++}`);
              values.push(0);
              needsUpdate = true;
              await this.log('debug', `Reset orphaned mana for user ${issue.userId}`);
              break;
          }
        }

        if (needsUpdate) {
          values.push(issue.userId);
          updates.push(`updated_at = NOW()`);
          const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
          await client.query(query, values);
          fixedCount++;
          await this.log('info', `Fixed data integrity issues for user ${issue.userId}`);
        }
      }

      await client.query('COMMIT');
      await this.log('info', `Successfully fixed ${fixedCount} users`);
      
      return fixedCount;

    } catch (error) {
      await client.query('ROLLBACK');
      await this.log('error', 'Failed to fix data integrity issues', { error: error.message });
      throw error;
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
        await this.log('debug', `User ${userId} already migrated, skipping`);
        await client.query('COMMIT');
        return { skipped: true, reason: 'already_migrated' };
      }

      // Calculate Mana conversion
      const totalMana = this.convertBalancesToMana(user);

      if (this.dryRun) {
        await this.log('info', `[DRY RUN] Would migrate user ${userId}`, {
          originalBalances: {
            green: user.green_balance,
            blue: user.blue_balance,
            red: user.red_balance
          },
          convertedMana: totalMana
        });
        await client.query('ROLLBACK');
        return { dryRun: true, totalMana };
      }

      // Create migration transaction record
      await client.query(`
        INSERT INTO transactions (
          user_id, type, wish_type, amount, mana_amount, reason, 
          transaction_category, transaction_source, experience_gained,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        userId,
        'credit',
        'green',
        user.green_balance + user.blue_balance + user.red_balance,
        totalMana,
        'Legacy currency conversion to Mana',
        'migration',
        'user_migration_system',
        0,
        JSON.stringify({
          original_balances: {
            green: user.green_balance,
            blue: user.blue_balance,
            red: user.red_balance
          },
          conversion_rates: LEGACY_CONVERSION_RATES,
          migration_timestamp: new Date().toISOString()
        })
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

      await this.log('info', `Successfully migrated user ${userId}`, {
        originalBalances: {
          green: user.green_balance,
          blue: user.blue_balance,
          red: user.red_balance
        },
        convertedMana: totalMana
      });

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
      await this.log('error', `Failed to migrate user ${userId}`, { error: error.message });
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
        await this.log('debug', `User ${userId} was not migrated, nothing to rollback`);
        await client.query('COMMIT');
        return { notMigrated: true };
      }

      if (this.dryRun) {
        await this.log('info', `[DRY RUN] Would rollback user ${userId}`, {
          currentMana: user.mana_balance
        });
        await client.query('ROLLBACK');
        return { dryRun: true };
      }

      // Get original migration transaction for audit trail
      const migrationTxResult = await client.query(`
        SELECT * FROM transactions 
        WHERE user_id = $1
          AND transaction_source IN ('currency_converter', 'user_migration_system')
          AND reason = 'Legacy currency conversion to Mana'
        ORDER BY created_at DESC 
        LIMIT 1
      `, [userId]);

      // Reset user to pre-migration state
      await client.query(`
        UPDATE users 
        SET mana_balance = 0,
            legacy_migration_completed = $2,
            updated_at = NOW()
        WHERE id = $1
      `, [userId, false]);

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
        user.mana_balance,
        'Rollback of legacy currency conversion',
        'migration_rollback',
        'user_migration_system',
        0,
        JSON.stringify({
          rolled_back_mana: user.mana_balance,
          rollback_timestamp: new Date().toISOString(),
          original_migration_tx: migrationTxResult.rows[0]?.id || null
        })
      ]);

      await client.query('COMMIT');

      await this.log('info', `Successfully rolled back user ${userId}`, {
        rolledBackMana: user.mana_balance
      });

      return { success: true, rolledBackMana: user.mana_balance };

    } catch (error) {
      await client.query('ROLLBACK');
      await this.log('error', `Failed to rollback user ${userId}`, { error: error.message });
      throw error;
    } finally {
      client.release();
    }
  }

  async getUsers() {
    const client = await pool.connect();
    try {
      let query, params;
      
      if (this.specificUserId) {
        query = 'SELECT * FROM users WHERE id = $1';
        params = [this.specificUserId];
      } else if (this.rollback) {
        query = 'SELECT * FROM users WHERE legacy_migration_completed = true ORDER BY created_at ASC';
        params = [];
      } else {
        query = 'SELECT * FROM users WHERE legacy_migration_completed = false ORDER BY created_at ASC';
        params = [];
      }

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getMigrationStatistics() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE legacy_migration_completed = true) as migrated_users,
          COUNT(*) FILTER (WHERE legacy_migration_completed = false) as pending_users,
          COALESCE(SUM(mana_balance), 0) as total_mana,
          COALESCE(AVG(mana_balance), 0) as avg_mana_per_user,
          COALESCE(SUM(green_balance), 0) as total_green_remaining,
          COALESCE(SUM(blue_balance), 0) as total_blue_remaining,
          COALESCE(SUM(red_balance), 0) as total_red_remaining
        FROM users
      `);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async processBatch(users, batchNumber, totalBatches) {
    await this.log('info', `Processing batch ${batchNumber}/${totalBatches} (${users.length} users)`);
    
    const batchResults = {
      successful: 0,
      failed: 0,
      skipped: 0,
      rolledBack: 0,
      totalManaProcessed: 0
    };

    for (const user of users) {
      try {
        let result;
        
        if (this.rollback) {
          result = await this.rollbackUser(user.id);
          if (result.success) {
            batchResults.rolledBack++;
            this.stats.rolledBack++;
          } else if (result.notMigrated) {
            batchResults.skipped++;
            this.stats.skipped++;
          }
        } else {
          result = await this.migrateUser(user.id);
          if (result.success || result.dryRun) {
            batchResults.successful++;
            this.stats.successful++;
            if (result.totalMana) {
              batchResults.totalManaProcessed += result.totalMana;
              this.stats.totalManaConverted += result.totalMana;
            }
          } else if (result.skipped) {
            batchResults.skipped++;
            this.stats.skipped++;
          }
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
        
        await this.log('error', `Failed to process user ${user.name || user.id}`, {
          userId: user.id,
          error: error.message
        });
      }
    }

    await this.log('info', `Batch ${batchNumber} completed`, batchResults);
    return batchResults;
  }

  async checkCriticalErrors() {
    // Check if error rate is too high (>10%)
    const errorRate = this.stats.totalUsers > 0 ? (this.stats.failed / this.stats.totalUsers) * 100 : 0;
    
    if (errorRate > 10) {
      await this.log('error', `Critical error rate detected: ${errorRate.toFixed(2)}%`, {
        totalUsers: this.stats.totalUsers,
        failed: this.stats.failed,
        errorRate
      });
      return true;
    }

    return false;
  }

  async performRollback() {
    await this.log('warn', 'Performing emergency rollback due to critical errors');
    
    // Get all migrated users
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT id FROM users WHERE legacy_migration_completed = true');
      const migratedUsers = result.rows;
      
      await this.log('info', `Rolling back ${migratedUsers.length} migrated users`);
      
      for (const user of migratedUsers) {
        try {
          await this.rollbackUser(user.id);
        } catch (error) {
          await this.log('error', `Failed to rollback user ${user.id}`, { error: error.message });
        }
      }
      
    } finally {
      client.release();
    }
  }

  async run() {
    await this.log('info', '🚀 Starting User Migration System');
    await this.log('info', 'Configuration', {
      dryRun: this.dryRun,
      rollback: this.rollback,
      validateOnly: this.validateOnly,
      autoFix: this.autoFix,
      batchSize: this.batchSize,
      specificUserId: this.specificUserId,
      logLevel: this.logLevel
    });

    try {
      // Step 1: Get initial statistics
      const initialStats = await this.getMigrationStatistics();
      await this.log('info', 'Initial migration statistics', initialStats);

      // Step 2: Validate data integrity
      const validation = await this.validateDataIntegrity(this.specificUserId);
      
      if (!validation.isValid) {
        if (this.autoFix) {
          await this.fixDataIntegrityIssues(validation.issues);
          // Re-validate after fixes
          const revalidation = await this.validateDataIntegrity(this.specificUserId);
          if (!revalidation.isValid) {
            throw new Error('Data integrity issues could not be automatically fixed');
          }
        } else {
          await this.log('error', 'Data integrity validation failed. Use --auto-fix to attempt automatic correction');
          if (!this.validateOnly) {
            throw new Error('Cannot proceed with migration due to data integrity issues');
          }
        }
      }

      if (this.validateOnly) {
        await this.log('info', 'Validation completed successfully');
        return;
      }

      // Step 3: Get users to process
      const users = await this.getUsers();
      this.stats.totalUsers = users.length;
      
      if (users.length === 0) {
        await this.log('info', 'No users found to process');
        return;
      }

      await this.log('info', `Found ${users.length} user(s) to process`);

      // Step 4: Process users in batches
      const totalBatches = Math.ceil(users.length / this.batchSize);
      
      for (let i = 0; i < users.length; i += this.batchSize) {
        const batch = users.slice(i, i + this.batchSize);
        const batchNumber = Math.floor(i / this.batchSize) + 1;
        
        await this.processBatch(batch, batchNumber, totalBatches);
        
        // Check for critical errors after each batch
        if (!this.dryRun && await this.checkCriticalErrors()) {
          await this.log('error', 'Critical error threshold exceeded, initiating rollback');
          await this.performRollback();
          throw new Error('Migration aborted due to critical errors');
        }
        
        // Small delay between batches to avoid overwhelming the database
        if (batchNumber < totalBatches) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Step 5: Final statistics and validation
      const finalStats = await this.getMigrationStatistics();
      await this.log('info', 'Final migration statistics', finalStats);

      // Step 6: Post-migration validation (if not dry run)
      if (!this.dryRun && !this.rollback) {
        await this.log('info', 'Running post-migration validation');
        const postValidation = await this.validateDataIntegrity();
        if (!postValidation.isValid) {
          await this.log('warn', 'Post-migration validation found issues', {
            issueCount: postValidation.issues.length
          });
        }
      }

      // Step 7: Generate summary report
      this.stats.endTime = new Date();
      this.stats.duration = this.stats.endTime - this.stats.startTime;
      
      await this.log('info', '🎯 Migration Summary', {
        duration: `${Math.round(this.stats.duration / 1000)}s`,
        totalUsers: this.stats.totalUsers,
        successful: this.stats.successful,
        failed: this.stats.failed,
        skipped: this.stats.skipped,
        rolledBack: this.stats.rolledBack,
        totalManaConverted: this.stats.totalManaConverted,
        errorCount: this.stats.errors.length
      });

      if (this.stats.errors.length > 0) {
        await this.log('warn', 'Errors encountered during migration', {
          errors: this.stats.errors
        });
      }

    } catch (error) {
      await this.log('error', 'Migration system failed', { error: error.message });
      throw error;
    } finally {
      await pool.end();
    }

    await this.log('info', '✨ Migration system completed');
  }
}

// Run the script
if (require.main === module) {
  const migrationSystem = new UserMigrationSystem();
  migrationSystem.run().catch(error => {
    console.error('💥 Migration system failed:', error);
    process.exit(1);
  });
}

module.exports = UserMigrationSystem;