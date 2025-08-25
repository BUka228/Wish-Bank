#!/usr/bin/env node

/**
 * Migration Monitoring and Reporting System
 * 
 * This script provides real-time monitoring and detailed reporting
 * for the user migration process.
 * 
 * Usage:
 *   node scripts/migration-monitor.js [options]
 * 
 * Options:
 *   --watch          : Monitor migration progress in real-time
 *   --report         : Generate detailed migration report
 *   --export <format>: Export report (json, csv, html)
 *   --since <date>   : Show migrations since date (YYYY-MM-DD)
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class MigrationMonitor {
  constructor() {
    this.watch = process.argv.includes('--watch');
    this.report = process.argv.includes('--report');
    this.exportFormat = this.getArgValue('--export');
    this.sinceDate = this.getArgValue('--since');
    this.watchInterval = 5000; // 5 seconds
  }

  getArgValue(argName) {
    const argIndex = process.argv.indexOf(argName);
    return argIndex !== -1 && argIndex + 1 < process.argv.length 
      ? process.argv[argIndex + 1] 
      : null;
  }

  async getCurrentStats() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE legacy_migration_completed = true) as migrated_users,
          COUNT(*) FILTER (WHERE legacy_migration_completed = false) as pending_users,
          COALESCE(SUM(mana_balance), 0) as total_mana,
          COALESCE(AVG(mana_balance) FILTER (WHERE mana_balance > 0), 0) as avg_mana_per_migrated_user,
          COALESCE(MAX(mana_balance), 0) as max_mana_balance,
          COALESCE(MIN(mana_balance) FILTER (WHERE mana_balance > 0), 0) as min_mana_balance,
          COUNT(*) FILTER (WHERE mana_balance < 0) as negative_mana_users,
          COALESCE(SUM(green_balance + blue_balance + red_balance), 0) as total_legacy_balance_remaining
        FROM users
      `);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getMigrationTransactions(sinceDate = null) {
    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          t.*,
          u.name as user_name
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        WHERE t.transaction_source IN ('currency_converter', 'user_migration_system')
          AND t.reason LIKE '%Legacy currency conversion%'
      `;
      
      const params = [];
      
      if (sinceDate) {
        query += ' AND t.created_at >= $1';
        params.push(sinceDate);
      }
      
      query += ' ORDER BY t.created_at DESC';
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getMigrationErrors(sinceDate = null) {
    const client = await pool.connect();
    try {
      // Look for rollback transactions as indicators of errors
      let query = `
        SELECT 
          t.*,
          u.name as user_name
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        WHERE t.transaction_category = 'migration_rollback'
      `;
      
      const params = [];
      
      if (sinceDate) {
        query += ' AND t.created_at >= $1';
        params.push(sinceDate);
      }
      
      query += ' ORDER BY t.created_at DESC';
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getDataIntegrityIssues() {
    const client = await pool.connect();
    try {
      const issues = [];
      
      // Users with negative balances
      const negativeBalances = await client.query(`
        SELECT id, name, green_balance, blue_balance, red_balance, mana_balance
        FROM users 
        WHERE green_balance < 0 OR blue_balance < 0 OR red_balance < 0 OR mana_balance < 0
      `);
      
      for (const user of negativeBalances.rows) {
        issues.push({
          type: 'negative_balance',
          userId: user.id,
          userName: user.name,
          details: {
            green_balance: user.green_balance,
            blue_balance: user.blue_balance,
            red_balance: user.red_balance,
            mana_balance: user.mana_balance
          }
        });
      }
      
      // Users marked as migrated but with zero mana and non-zero legacy balances
      const inconsistentMigration = await client.query(`
        SELECT id, name, green_balance, blue_balance, red_balance, mana_balance
        FROM users 
        WHERE legacy_migration_completed = true 
          AND mana_balance = 0 
          AND (green_balance > 0 OR blue_balance > 0 OR red_balance > 0)
      `);
      
      for (const user of inconsistentMigration.rows) {
        issues.push({
          type: 'inconsistent_migration',
          userId: user.id,
          userName: user.name,
          details: {
            green_balance: user.green_balance,
            blue_balance: user.blue_balance,
            red_balance: user.red_balance,
            mana_balance: user.mana_balance
          }
        });
      }
      
      // Users with mana but not marked as migrated
      const orphanedMana = await client.query(`
        SELECT id, name, mana_balance
        FROM users 
        WHERE legacy_migration_completed = false AND mana_balance > 0
      `);
      
      for (const user of orphanedMana.rows) {
        issues.push({
          type: 'orphaned_mana',
          userId: user.id,
          userName: user.name,
          details: {
            mana_balance: user.mana_balance
          }
        });
      }
      
      return issues;
    } finally {
      client.release();
    }
  }

  async generateReport() {
    console.log('📊 Generating Migration Report');
    console.log('==============================\n');

    const stats = await this.getCurrentStats();
    const transactions = await this.getMigrationTransactions(this.sinceDate);
    const errors = await this.getMigrationErrors(this.sinceDate);
    const integrityIssues = await this.getDataIntegrityIssues();

    const report = {
      generatedAt: new Date().toISOString(),
      sinceDate: this.sinceDate,
      statistics: {
        totalUsers: parseInt(stats.total_users),
        migratedUsers: parseInt(stats.migrated_users),
        pendingUsers: parseInt(stats.pending_users),
        migrationProgress: ((parseInt(stats.migrated_users) / parseInt(stats.total_users)) * 100).toFixed(2) + '%',
        totalManaInSystem: parseInt(stats.total_mana),
        averageManaPerUser: parseFloat(stats.avg_mana_per_migrated_user).toFixed(2),
        maxManaBalance: parseInt(stats.max_mana_balance),
        minManaBalance: parseInt(stats.min_mana_balance),
        negativeManaUsers: parseInt(stats.negative_mana_users),
        totalLegacyBalanceRemaining: parseInt(stats.total_legacy_balance_remaining)
      },
      migrationActivity: {
        totalMigrationTransactions: transactions.length,
        recentMigrations: transactions.slice(0, 10).map(tx => ({
          userId: tx.user_id,
          userName: tx.user_name,
          manaAmount: tx.mana_amount,
          timestamp: tx.created_at,
          metadata: tx.metadata
        }))
      },
      errors: {
        totalErrors: errors.length,
        recentErrors: errors.slice(0, 10).map(tx => ({
          userId: tx.user_id,
          userName: tx.user_name,
          rolledBackMana: tx.mana_amount,
          timestamp: tx.created_at,
          metadata: tx.metadata
        }))
      },
      dataIntegrity: {
        totalIssues: integrityIssues.length,
        issuesByType: integrityIssues.reduce((acc, issue) => {
          acc[issue.type] = (acc[issue.type] || 0) + 1;
          return acc;
        }, {}),
        issues: integrityIssues
      }
    };

    // Console output
    console.log('📈 Migration Statistics:');
    console.log(`   Total Users: ${report.statistics.totalUsers}`);
    console.log(`   Migrated: ${report.statistics.migratedUsers} (${report.statistics.migrationProgress})`);
    console.log(`   Pending: ${report.statistics.pendingUsers}`);
    console.log(`   Total Mana: ${report.statistics.totalManaInSystem.toLocaleString()}`);
    console.log(`   Average Mana per User: ${report.statistics.averageManaPerUser}`);
    console.log(`   Legacy Balance Remaining: ${report.statistics.totalLegacyBalanceRemaining.toLocaleString()}`);

    console.log('\n🔄 Migration Activity:');
    console.log(`   Total Migration Transactions: ${report.migrationActivity.totalMigrationTransactions}`);
    
    if (report.migrationActivity.recentMigrations.length > 0) {
      console.log('   Recent Migrations:');
      report.migrationActivity.recentMigrations.forEach(migration => {
        console.log(`     - ${migration.userName || migration.userId}: ${migration.manaAmount} Mana (${new Date(migration.timestamp).toLocaleString()})`);
      });
    }

    console.log('\n❌ Errors:');
    console.log(`   Total Errors: ${report.errors.totalErrors}`);
    
    if (report.errors.recentErrors.length > 0) {
      console.log('   Recent Errors:');
      report.errors.recentErrors.forEach(error => {
        console.log(`     - ${error.userName || error.userId}: Rolled back ${error.rolledBackMana} Mana (${new Date(error.timestamp).toLocaleString()})`);
      });
    }

    console.log('\n🔍 Data Integrity:');
    console.log(`   Total Issues: ${report.dataIntegrity.totalIssues}`);
    
    if (Object.keys(report.dataIntegrity.issuesByType).length > 0) {
      console.log('   Issues by Type:');
      Object.entries(report.dataIntegrity.issuesByType).forEach(([type, count]) => {
        console.log(`     - ${type}: ${count}`);
      });
    }

    // Export if requested
    if (this.exportFormat) {
      await this.exportReport(report);
    }

    return report;
  }

  async exportReport(report) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `migration-report-${timestamp}`;

    switch (this.exportFormat.toLowerCase()) {
      case 'json':
        await fs.writeFile(`${filename}.json`, JSON.stringify(report, null, 2));
        console.log(`\n📄 Report exported to ${filename}.json`);
        break;

      case 'csv':
        const csvData = this.convertToCSV(report);
        await fs.writeFile(`${filename}.csv`, csvData);
        console.log(`\n📄 Report exported to ${filename}.csv`);
        break;

      case 'html':
        const htmlData = this.convertToHTML(report);
        await fs.writeFile(`${filename}.html`, htmlData);
        console.log(`\n📄 Report exported to ${filename}.html`);
        break;

      default:
        console.log(`\n⚠️  Unknown export format: ${this.exportFormat}`);
    }
  }

  convertToCSV(report) {
    let csv = 'Metric,Value\n';
    
    // Statistics
    Object.entries(report.statistics).forEach(([key, value]) => {
      csv += `${key},${value}\n`;
    });
    
    csv += '\nUser ID,User Name,Mana Amount,Timestamp,Type\n';
    
    // Migration transactions
    report.migrationActivity.recentMigrations.forEach(migration => {
      csv += `${migration.userId},${migration.userName || ''},${migration.manaAmount},${migration.timestamp},migration\n`;
    });
    
    // Errors
    report.errors.recentErrors.forEach(error => {
      csv += `${error.userId},${error.userName || ''},${error.rolledBackMana},${error.timestamp},rollback\n`;
    });
    
    return csv;
  }

  convertToHTML(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Migration Report - ${report.generatedAt}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin-bottom: 30px; }
        .stat { display: inline-block; margin: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .error { color: red; }
        .success { color: green; }
    </style>
</head>
<body>
    <h1>Migration Report</h1>
    <p>Generated: ${new Date(report.generatedAt).toLocaleString()}</p>
    
    <div class="section">
        <h2>Statistics</h2>
        <div class="stat">Total Users: <strong>${report.statistics.totalUsers}</strong></div>
        <div class="stat">Migrated: <strong>${report.statistics.migratedUsers} (${report.statistics.migrationProgress})</strong></div>
        <div class="stat">Pending: <strong>${report.statistics.pendingUsers}</strong></div>
        <div class="stat">Total Mana: <strong>${parseInt(report.statistics.totalManaInSystem).toLocaleString()}</strong></div>
    </div>
    
    <div class="section">
        <h2>Recent Migrations</h2>
        <table>
            <tr><th>User</th><th>Mana Amount</th><th>Timestamp</th></tr>
            ${report.migrationActivity.recentMigrations.map(m => 
              `<tr><td>${m.userName || m.userId}</td><td>${m.manaAmount}</td><td>${new Date(m.timestamp).toLocaleString()}</td></tr>`
            ).join('')}
        </table>
    </div>
    
    <div class="section">
        <h2>Data Integrity Issues</h2>
        <p>Total Issues: <span class="${report.dataIntegrity.totalIssues > 0 ? 'error' : 'success'}">${report.dataIntegrity.totalIssues}</span></p>
        ${Object.entries(report.dataIntegrity.issuesByType).map(([type, count]) => 
          `<p>${type}: ${count}</p>`
        ).join('')}
    </div>
</body>
</html>`;
  }

  async watchMigration() {
    console.log('👀 Watching migration progress...');
    console.log('Press Ctrl+C to stop\n');

    let lastStats = null;

    const displayStats = async () => {
      const stats = await this.getCurrentStats();
      const timestamp = new Date().toLocaleString();
      
      console.clear();
      console.log(`🔄 Migration Monitor - ${timestamp}`);
      console.log('='.repeat(50));
      
      console.log(`📊 Progress: ${stats.migrated_users}/${stats.total_users} (${((parseInt(stats.migrated_users) / parseInt(stats.total_users)) * 100).toFixed(2)}%)`);
      console.log(`💰 Total Mana: ${parseInt(stats.total_mana).toLocaleString()}`);
      console.log(`⏳ Pending: ${stats.pending_users}`);
      
      if (parseInt(stats.negative_mana_users) > 0) {
        console.log(`⚠️  Negative Mana Users: ${stats.negative_mana_users}`);
      }
      
      if (lastStats) {
        const migrationDelta = parseInt(stats.migrated_users) - parseInt(lastStats.migrated_users);
        const manaDelta = parseInt(stats.total_mana) - parseInt(lastStats.total_mana);
        
        if (migrationDelta > 0) {
          console.log(`📈 Since last check: +${migrationDelta} users migrated, +${manaDelta.toLocaleString()} Mana`);
        }
      }
      
      console.log('\n🔍 Data Integrity Check:');
      const integrityIssues = await this.getDataIntegrityIssues();
      if (integrityIssues.length === 0) {
        console.log('✅ No integrity issues detected');
      } else {
        console.log(`❌ ${integrityIssues.length} integrity issues detected`);
        const issuesByType = integrityIssues.reduce((acc, issue) => {
          acc[issue.type] = (acc[issue.type] || 0) + 1;
          return acc;
        }, {});
        Object.entries(issuesByType).forEach(([type, count]) => {
          console.log(`   - ${type}: ${count}`);
        });
      }
      
      lastStats = stats;
    };

    // Initial display
    await displayStats();
    
    // Set up interval
    const interval = setInterval(displayStats, this.watchInterval);
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.log('\n\n👋 Monitoring stopped');
      process.exit(0);
    });
  }

  async run() {
    try {
      if (this.watch) {
        await this.watchMigration();
      } else if (this.report || this.exportFormat) {
        await this.generateReport();
      } else {
        console.log('Migration Monitor');
        console.log('================');
        console.log('Usage:');
        console.log('  --watch          : Monitor migration progress in real-time');
        console.log('  --report         : Generate detailed migration report');
        console.log('  --export <format>: Export report (json, csv, html)');
        console.log('  --since <date>   : Show migrations since date (YYYY-MM-DD)');
      }
    } catch (error) {
      console.error('💥 Monitor failed:', error);
      throw error;
    } finally {
      await pool.end();
    }
  }
}

// Run the script
if (require.main === module) {
  const monitor = new MigrationMonitor();
  monitor.run().catch(error => {
    console.error('💥 Migration monitor failed:', error);
    process.exit(1);
  });
}

module.exports = MigrationMonitor;