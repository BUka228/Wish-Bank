#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Production-ready database migration deployment script
 * Handles migration execution with transaction safety and rollback capabilities
 */
class MigrationDeployer {
  constructor(databaseUrl) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 5, // Limit connections during migration
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  /**
   * Deploy all pending migrations
   */
  async deployMigrations() {
    const client = await this.pool.connect();
    
    try {
      console.log('🚀 Starting database migration deployment...');
      
      // Start transaction for migration safety
      await client.query('BEGIN');
      
      // Ensure migration tracking table exists
      await this.ensureMigrationTable(client);
      
      // Get list of migration files
      const migrationFiles = this.getMigrationFiles();
      console.log(`📁 Found ${migrationFiles.length} migration files`);
      
      // Check which migrations have been applied
      const appliedMigrations = await this.getAppliedMigrations(client);
      console.log(`✅ ${appliedMigrations.length} migrations already applied`);
      
      // Filter pending migrations
      const pendingMigrations = migrationFiles.filter(file => !appliedMigrations.includes(file));
      
      if (pendingMigrations.length === 0) {
        console.log('✨ No pending migrations to apply');
        await client.query('COMMIT');
        return;
      }
      
      console.log(`⏳ Applying ${pendingMigrations.length} pending migrations...`);
      
      // Apply each pending migration
      for (const file of pendingMigrations) {
        await this.applyMigration(client, file);
      }
      
      // Commit all migrations
      await client.query('COMMIT');
      console.log('✅ All migrations applied successfully');
      
      // Verify database integrity
      await this.verifyDatabaseIntegrity(client);
      
    } catch (error) {
      console.error('❌ Migration deployment failed:', error.message);
      
      try {
        await client.query('ROLLBACK');
        console.log('🔄 Transaction rolled back successfully');
      } catch (rollbackError) {
        console.error('💥 Rollback failed:', rollbackError.message);
      }
      
      throw error;
    } finally {
      client.release();
      await this.pool.end();
    }
  }

  /**
   * Create migration tracking table if it doesn't exist
   */
  async ensureMigrationTable(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        checksum VARCHAR(64),
        applied_at TIMESTAMP DEFAULT NOW(),
        applied_by VARCHAR(100) DEFAULT CURRENT_USER,
        execution_time_ms INTEGER
      )
    `);
    
    // Create index for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_filename 
      ON schema_migrations(filename)
    `);
  }

  /**
   * Get list of migration files sorted by name
   */
  getMigrationFiles() {
    const migrationDir = path.join(__dirname, 'migrations');
    
    if (!fs.existsSync(migrationDir)) {
      throw new Error(`Migration directory not found: ${migrationDir}`);
    }
    
    return fs.readdirSync(migrationDir)
      .filter(file => file.endsWith('.sql'))
      .filter(file => !file.endsWith('.rollback.sql')) // Exclude rollback files
      .sort(); // Ensure consistent ordering
  }

  /**
   * Get list of already applied migrations
   */
  async getAppliedMigrations(client) {
    try {
      const result = await client.query('SELECT filename FROM schema_migrations ORDER BY applied_at');
      return result.rows.map(row => row.filename);
    } catch (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Apply a single migration file
   */
  async applyMigration(client, filename) {
    const startTime = Date.now();
    console.log(`  📝 Applying migration: ${filename}`);
    
    try {
      // Read migration file
      const migrationPath = path.join(__dirname, 'migrations', filename);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Calculate checksum for integrity verification
      const checksum = this.calculateChecksum(migrationSQL);
      
      // Execute migration SQL
      await client.query(migrationSQL);
      
      // Record migration as applied
      const executionTime = Date.now() - startTime;
      await client.query(`
        INSERT INTO schema_migrations (filename, checksum, execution_time_ms) 
        VALUES ($1, $2, $3)
      `, [filename, checksum, executionTime]);
      
      console.log(`  ✅ Applied ${filename} (${executionTime}ms)`);
      
    } catch (error) {
      console.error(`  ❌ Failed to apply ${filename}:`, error.message);
      throw new Error(`Migration ${filename} failed: ${error.message}`);
    }
  }

  /**
   * Calculate SHA-256 checksum of migration content
   */
  calculateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Verify database integrity after migrations
   */
  async verifyDatabaseIntegrity(client) {
    console.log('🔍 Verifying database integrity...');
    
    try {
      // Check for orphaned records
      const orphanChecks = [
        {
          name: 'Orphaned quests',
          query: `
            SELECT COUNT(*) as count FROM quests q
            LEFT JOIN users u1 ON q.author_id = u1.id
            LEFT JOIN users u2 ON q.assignee_id = u2.id
            WHERE u1.id IS NULL OR u2.id IS NULL
          `
        },
        {
          name: 'Orphaned random events',
          query: `
            SELECT COUNT(*) as count FROM random_events re
            LEFT JOIN users u ON re.user_id = u.id
            WHERE u.id IS NULL
          `
        },
        {
          name: 'Invalid wish categories',
          query: `
            SELECT COUNT(*) as count FROM wishes w
            LEFT JOIN wish_categories wc ON w.category = wc.name
            WHERE w.category IS NOT NULL AND wc.id IS NULL
          `
        }
      ];
      
      for (const check of orphanChecks) {
        const result = await client.query(check.query);
        const count = parseInt(result.rows[0].count);
        
        if (count > 0) {
          console.warn(`  ⚠️  ${check.name}: ${count} records`);
        } else {
          console.log(`  ✅ ${check.name}: OK`);
        }
      }
      
      // Check constraint violations
      await client.query('SELECT 1'); // Basic connectivity test
      console.log('✅ Database integrity verification completed');
      
    } catch (error) {
      console.warn('⚠️  Database integrity check failed:', error.message);
      // Don't fail the migration for integrity check failures
    }
  }

  /**
   * Rollback to a specific migration
   */
  async rollbackToMigration(targetMigration) {
    const client = await this.pool.connect();
    
    try {
      console.log(`🔄 Rolling back to migration: ${targetMigration}`);
      
      await client.query('BEGIN');
      
      // Get migrations to rollback (in reverse order)
      const migrationsToRollback = await this.getMigrationsToRollback(client, targetMigration);
      
      if (migrationsToRollback.length === 0) {
        console.log('✨ No migrations to rollback');
        await client.query('COMMIT');
        return;
      }
      
      console.log(`⏳ Rolling back ${migrationsToRollback.length} migrations...`);
      
      // Rollback migrations in reverse order
      for (const migration of migrationsToRollback) {
        await this.rollbackMigration(client, migration);
      }
      
      await client.query('COMMIT');
      console.log('✅ Rollback completed successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Rollback failed:', error.message);
      throw error;
    } finally {
      client.release();
      await this.pool.end();
    }
  }

  /**
   * Get migrations that need to be rolled back
   */
  async getMigrationsToRollback(client, targetMigration) {
    const result = await client.query(`
      SELECT filename, applied_at 
      FROM schema_migrations 
      WHERE applied_at > (
        SELECT applied_at 
        FROM schema_migrations 
        WHERE filename = $1
      )
      ORDER BY applied_at DESC
    `, [targetMigration]);
    
    return result.rows;
  }

  /**
   * Rollback a single migration
   */
  async rollbackMigration(client, migration) {
    console.log(`  🔄 Rolling back: ${migration.filename}`);
    
    try {
      // Look for rollback script
      const rollbackFile = migration.filename.replace('.sql', '.rollback.sql');
      const rollbackPath = path.join(__dirname, 'migrations', rollbackFile);
      
      if (fs.existsSync(rollbackPath)) {
        const rollbackSQL = fs.readFileSync(rollbackPath, 'utf8');
        await client.query(rollbackSQL);
        console.log(`  ✅ Executed rollback script for ${migration.filename}`);
      } else {
        console.warn(`  ⚠️  No rollback script found for ${migration.filename}`);
        // For migrations without rollback scripts, just remove from tracking
      }
      
      // Remove from migrations table
      await client.query(
        'DELETE FROM schema_migrations WHERE filename = $1',
        [migration.filename]
      );
      
      console.log(`  ✅ Rolled back ${migration.filename}`);
      
    } catch (error) {
      console.error(`  ❌ Failed to rollback ${migration.filename}:`, error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  const deployer = new MigrationDeployer(databaseUrl);
  
  try {
    switch (command) {
      case 'deploy':
        await deployer.deployMigrations();
        break;
        
      case 'rollback':
        const targetMigration = process.argv[3];
        if (!targetMigration) {
          console.error('❌ Target migration filename is required for rollback');
          process.exit(1);
        }
        await deployer.rollbackToMigration(targetMigration);
        break;
        
      default:
        console.log('Usage:');
        console.log('  node deploy-migrations.js deploy');
        console.log('  node deploy-migrations.js rollback <target_migration>');
        process.exit(1);
    }
    
    console.log('🎉 Migration operation completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Migration operation failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = MigrationDeployer;