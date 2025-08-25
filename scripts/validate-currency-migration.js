#!/usr/bin/env node

/**
 * Validation Script: Currency Migration Data Integrity
 * 
 * This script validates data integrity before and after currency migration.
 * It checks for inconsistencies, negative balances, and migration completeness.
 * 
 * Usage:
 *   node scripts/validate-currency-migration.js [options]
 * 
 * Options:
 *   --pre-migration  : Validate data before migration
 *   --post-migration : Validate data after migration
 *   --user-id        : Validate specific user only
 *   --fix-issues     : Attempt to fix detected issues
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Conversion rates
const LEGACY_CONVERSION_RATES = {
  green: 10,
  blue: 100,
  red: 1000
};

class MigrationValidator {
  constructor() {
    this.preMigration = process.argv.includes('--pre-migration');
    this.postMigration = process.argv.includes('--post-migration');
    this.fixIssues = process.argv.includes('--fix-issues');
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

  async validatePreMigration() {
    console.log('🔍 Pre-Migration Validation');
    console.log('===========================');

    const client = await pool.connect();
    const issues = [];
    
    try {
      // Get users to validate
      let query = 'SELECT * FROM users';
      let params = [];
      
      if (this.specificUserId) {
        query += ' WHERE id = $1';
        params = [this.specificUserId];
      }
      
      const result = await client.query(query, params);
      const users = result.rows;

      console.log(`\n📊 Validating ${users.length} user(s)...`);

      for (const user of users) {
        const userIssues = [];

        // Check for negative balances
        if (user.green_balance < 0) {
          userIssues.push(`Negative green balance: ${user.green_balance}`);
        }
        if (user.blue_balance < 0) {
          userIssues.push(`Negative blue balance: ${user.blue_balance}`);
        }
        if (user.red_balance < 0) {
          userIssues.push(`Negative red balance: ${user.red_balance}`);
        }

        // Check for already migrated users
        if (user.legacy_migration_completed) {
          userIssues.push('User already marked as migrated');
        }

        // Check for existing mana balance
        if (user.mana_balance > 0) {
          userIssues.push(`User has existing mana balance: ${user.mana_balance}`);
        }

        // Calculate expected mana
        const expectedMana = this.convertBalancesToMana(user);
        
        // Warn about large conversions
        if (expectedMana > 100000) {
          userIssues.push(`Large conversion detected: ${expectedMana} Mana`);
        }

        if (userIssues.length > 0) {
          issues.push({
            userId: user.id,
            userName: user.name,
            issues: userIssues,
            currentBalances: {
              green: user.green_balance,
              blue: user.blue_balance,
              red: user.red_balance,
              mana: user.mana_balance
            },
            expectedMana
          });
        }
      }

      // Report findings
      if (issues.length === 0) {
        console.log('\n✅ All users passed pre-migration validation');
      } else {
        console.log(`\n⚠️  Found ${issues.length} user(s) with issues:`);
        
        for (const issue of issues) {
          console.log(`\n👤 User: ${issue.userName || issue.userId}`);
          console.log(`   Current: Green(${issue.currentBalances.green}) Blue(${issue.currentBalances.blue}) Red(${issue.currentBalances.red}) Mana(${issue.currentBalances.mana})`);
          console.log(`   Expected Mana: ${issue.expectedMana}`);
          console.log(`   Issues:`);
          issue.issues.forEach(iss => console.log(`     - ${iss}`));
        }

        if (this.fixIssues) {
          console.log('\n🔧 Attempting to fix issues...');
          await this.fixPreMigrationIssues(issues);
        }
      }

    } finally {
      client.release();
    }

    return issues;
  }

  async validatePostMigration() {
    console.log('🔍 Post-Migration Validation');
    console.log('============================');

    const client = await pool.connect();
    const issues = [];
    
    try {
      // Get migrated users
      let query = 'SELECT * FROM users WHERE legacy_migration_completed = true';
      let params = [];
      
      if (this.specificUserId) {
        query += ' AND id = $1';
        params = [this.specificUserId];
      }
      
      const result = await client.query(query, params);
      const users = result.rows;

      console.log(`\n📊 Validating ${users.length} migrated user(s)...`);

      for (const user of users) {
        const userIssues = [];

        // Calculate expected mana from original balances
        const expectedMana = this.convertBalancesToMana(user);
        
        // Check if mana balance matches expected conversion
        if (user.mana_balance !== expectedMana) {
          userIssues.push(`Mana balance mismatch: expected ${expectedMana}, got ${user.mana_balance}`);
        }

        // Check for negative mana balance
        if (user.mana_balance < 0) {
          userIssues.push(`Negative mana balance: ${user.mana_balance}`);
        }

        // Verify migration transaction exists
        const txResult = await client.query(`
          SELECT * FROM transactions 
          WHERE user_id = $1 
            AND transaction_source = 'currency_converter'
            AND reason = 'Legacy currency conversion to Mana'
        `, [user.id]);

        if (txResult.rows.length === 0) {
          userIssues.push('Migration transaction not found');
        } else {
          const tx = txResult.rows[0];
          if (tx.mana_amount !== user.mana_balance) {
            userIssues.push(`Transaction mana amount (${tx.mana_amount}) doesn't match user balance (${user.mana_balance})`);
          }
        }

        if (userIssues.length > 0) {
          issues.push({
            userId: user.id,
            userName: user.name,
            issues: userIssues,
            currentBalances: {
              green: user.green_balance,
              blue: user.blue_balance,
              red: user.red_balance,
              mana: user.mana_balance
            },
            expectedMana
          });
        }
      }

      // Check for users that should be migrated but aren't
      const unmigrated = await client.query(`
        SELECT COUNT(*) as count FROM users 
        WHERE legacy_migration_completed = false
          AND (green_balance > 0 OR blue_balance > 0 OR red_balance > 0)
      `);

      if (parseInt(unmigrated.rows[0].count) > 0) {
        console.log(`\n⚠️  Found ${unmigrated.rows[0].count} users with balances that haven't been migrated`);
      }

      // Report findings
      if (issues.length === 0) {
        console.log('\n✅ All migrated users passed post-migration validation');
      } else {
        console.log(`\n❌ Found ${issues.length} user(s) with post-migration issues:`);
        
        for (const issue of issues) {
          console.log(`\n👤 User: ${issue.userName || issue.userId}`);
          console.log(`   Current: Green(${issue.currentBalances.green}) Blue(${issue.currentBalances.blue}) Red(${issue.currentBalances.red}) Mana(${issue.currentBalances.mana})`);
          console.log(`   Expected Mana: ${issue.expectedMana}`);
          console.log(`   Issues:`);
          issue.issues.forEach(iss => console.log(`     - ${iss}`));
        }

        if (this.fixIssues) {
          console.log('\n🔧 Attempting to fix issues...');
          await this.fixPostMigrationIssues(issues);
        }
      }

    } finally {
      client.release();
    }

    return issues;
  }

  async fixPreMigrationIssues(issues) {
    const client = await pool.connect();
    
    try {
      for (const issue of issues) {
        console.log(`\n🔧 Fixing issues for user: ${issue.userName || issue.userId}`);
        
        let needsUpdate = false;
        const updates = [];
        const values = [];
        let paramIndex = 1;

        // Fix negative balances by setting them to 0
        if (issue.currentBalances.green < 0) {
          updates.push(`green_balance = $${paramIndex++}`);
          values.push(0);
          needsUpdate = true;
          console.log(`   - Fixed negative green balance`);
        }
        
        if (issue.currentBalances.blue < 0) {
          updates.push(`blue_balance = $${paramIndex++}`);
          values.push(0);
          needsUpdate = true;
          console.log(`   - Fixed negative blue balance`);
        }
        
        if (issue.currentBalances.red < 0) {
          updates.push(`red_balance = $${paramIndex++}`);
          values.push(0);
          needsUpdate = true;
          console.log(`   - Fixed negative red balance`);
        }

        // Reset mana balance if it exists
        if (issue.currentBalances.mana > 0) {
          updates.push(`mana_balance = $${paramIndex++}`);
          values.push(0);
          needsUpdate = true;
          console.log(`   - Reset existing mana balance`);
        }

        // Reset migration flag if set
        if (issue.issues.some(iss => iss.includes('already marked as migrated'))) {
          updates.push(`legacy_migration_completed = $${paramIndex++}`);
          values.push(false);
          needsUpdate = true;
          console.log(`   - Reset migration flag`);
        }

        if (needsUpdate) {
          values.push(issue.userId);
          const query = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`;
          await client.query(query, values);
          console.log(`   ✅ User updated successfully`);
        }
      }
    } finally {
      client.release();
    }
  }

  async fixPostMigrationIssues(issues) {
    const client = await pool.connect();
    
    try {
      for (const issue of issues) {
        console.log(`\n🔧 Fixing issues for user: ${issue.userName || issue.userId}`);
        
        // Fix mana balance mismatch
        if (issue.issues.some(iss => iss.includes('Mana balance mismatch'))) {
          await client.query(`
            UPDATE users 
            SET mana_balance = $1, updated_at = NOW() 
            WHERE id = $2
          `, [issue.expectedMana, issue.userId]);
          
          console.log(`   - Fixed mana balance: ${issue.currentBalances.mana} → ${issue.expectedMana}`);
        }

        // Fix negative mana balance
        if (issue.currentBalances.mana < 0) {
          await client.query(`
            UPDATE users 
            SET mana_balance = 0, updated_at = NOW() 
            WHERE id = $1
          `, [issue.userId]);
          
          console.log(`   - Fixed negative mana balance`);
        }

        console.log(`   ✅ User fixed successfully`);
      }
    } finally {
      client.release();
    }
  }

  async getOverallStats() {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE legacy_migration_completed = true) as migrated_users,
          COUNT(*) FILTER (WHERE legacy_migration_completed = false) as pending_users,
          COALESCE(SUM(green_balance), 0) as total_green,
          COALESCE(SUM(blue_balance), 0) as total_blue,
          COALESCE(SUM(red_balance), 0) as total_red,
          COALESCE(SUM(mana_balance), 0) as total_mana,
          COUNT(*) FILTER (WHERE green_balance < 0 OR blue_balance < 0 OR red_balance < 0) as negative_balance_users,
          COUNT(*) FILTER (WHERE mana_balance < 0) as negative_mana_users
        FROM users
      `);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async run() {
    console.log('🔍 Currency Migration Validator');
    console.log('===============================');
    
    if (this.fixIssues) {
      console.log('🔧 FIX MODE - Issues will be automatically corrected');
    }

    try {
      // Show overall statistics
      const stats = await this.getOverallStats();
      console.log('\n📊 Overall Statistics:');
      console.log(`   Total Users: ${stats.total_users}`);
      console.log(`   Migrated: ${stats.migrated_users}`);
      console.log(`   Pending: ${stats.pending_users}`);
      console.log(`   Total Legacy Balances: Green(${stats.total_green}) Blue(${stats.total_blue}) Red(${stats.total_red})`);
      console.log(`   Total Mana: ${stats.total_mana}`);
      
      if (parseInt(stats.negative_balance_users) > 0) {
        console.log(`   ⚠️  Users with negative legacy balances: ${stats.negative_balance_users}`);
      }
      
      if (parseInt(stats.negative_mana_users) > 0) {
        console.log(`   ⚠️  Users with negative mana: ${stats.negative_mana_users}`);
      }

      let issues = [];

      // Run appropriate validation
      if (this.preMigration) {
        issues = await this.validatePreMigration();
      } else if (this.postMigration) {
        issues = await this.validatePostMigration();
      } else {
        console.log('\n⚠️  Please specify --pre-migration or --post-migration');
        return;
      }

      // Summary
      console.log('\n🎯 Validation Summary:');
      if (issues.length === 0) {
        console.log('   ✅ No issues found - data integrity is good');
      } else {
        console.log(`   ⚠️  Found ${issues.length} user(s) with issues`);
        
        if (this.fixIssues) {
          console.log('   🔧 Issues have been automatically fixed');
        } else {
          console.log('   💡 Run with --fix-issues to automatically correct problems');
        }
      }

    } catch (error) {
      console.error('\n💥 Validation failed:', error);
      process.exit(1);
    } finally {
      await pool.end();
    }

    console.log('\n✨ Validation completed!');
  }
}

// Run the script
if (require.main === module) {
  const validator = new MigrationValidator();
  validator.run().catch(console.error);
}

module.exports = MigrationValidator;