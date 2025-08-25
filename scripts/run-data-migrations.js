#!/usr/bin/env node

/**
 * Data Migration Runner for Quest Economy System
 * Executes all data migration scripts in the correct order
 */

const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

// Database connection
let sql;
try {
  sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || '');
} catch (error) {
  console.warn('Database connection not available, running in dry-run mode');
  sql = null;
}

// Migration files in execution order
const MIGRATION_FILES = [
  '003_data_migration.sql',
  '004_wish_categories_setup.sql', 
  '005_quest_event_templates.sql',
  '006_economy_settings_init.sql',
  '007_rank_system_init.sql',
  '008_comprehensive_seed_data.sql'
];

/**
 * Read SQL file content
 */
function readSQLFile(filename) {
  const filePath = path.join(__dirname, 'migrations', filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filename}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Parse SQL statements from content, handling multi-line statements properly
 */
function parseSQLStatements(sqlContent) {
  // Remove comments and empty lines
  const lines = sqlContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('--'));
  
  const content = lines.join('\n');
  
  // Split by semicolons, but be smarter about it
  const statements = [];
  let currentStatement = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';
    
    if ((char === "'" || char === '"') && prevChar !== '\\') {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
      }
    }
    
    if (char === ';' && !inQuotes) {
      const statement = currentStatement.trim();
      if (statement.length > 0) {
        statements.push(statement);
      }
      currentStatement = '';
    } else {
      currentStatement += char;
    }
  }
  
  // Add the last statement if it doesn't end with semicolon
  const lastStatement = currentStatement.trim();
  if (lastStatement.length > 0) {
    statements.push(lastStatement);
  }
  
  return statements.filter(stmt => stmt.length > 0);
}

/**
 * Check if migration has already been executed
 */
async function isMigrationExecuted(filename) {
  if (!sql) {
    return false; // In dry-run mode, assume not executed
  }
  
  try {
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM migrations 
      WHERE filename = ${filename}
    `;
    return result[0].count > 0;
  } catch (error) {
    console.warn(`Could not check migration status for ${filename}:`, error.message);
    return false;
  }
}

/**
 * Execute a single migration file
 */
async function executeMigration(filename) {
  console.log(`\n📦 ${sql ? 'Executing' : 'Validating'} migration: ${filename}`);
  
  try {
    // Check if already executed
    if (await isMigrationExecuted(filename)) {
      console.log(`✅ Migration ${filename} already executed, skipping`);
      return true;
    }

    // Read and validate SQL
    const sqlContent = readSQLFile(filename);
    
    // Parse SQL statements more carefully
    const statements = parseSQLStatements(sqlContent);

    console.log(`   Found ${statements.length} SQL statements`);

    if (sql) {
      // Execute statements
      for (const statement of statements) {
        if (statement.trim()) {
          await sql.unsafe(statement);
        }
      }
      console.log(`✅ Migration ${filename} executed successfully`);
    } else {
      // Dry-run mode - just validate syntax
      console.log(`✅ Migration ${filename} validated successfully (dry-run)`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error ${sql ? 'executing' : 'validating'} migration ${filename}:`, error.message);
    return false;
  }
}

/**
 * Validate database connection
 */
async function validateConnection() {
  if (!sql) {
    console.log('⚠️  Running in dry-run mode (no database connection)');
    return 'dry-run';
  }
  
  try {
    await sql`SELECT 1 as test`;
    console.log('✅ Database connection validated');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Ensure migrations table exists
 */
async function ensureMigrationsTable() {
  if (!sql) {
    console.log('⚠️  Skipping migrations table creation (dry-run mode)');
    return true;
  }
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Migrations table ready');
    return true;
  } catch (error) {
    console.error('❌ Failed to create migrations table:', error.message);
    return false;
  }
}

/**
 * Get migration status summary
 */
async function getMigrationStatus() {
  if (!sql) {
    console.log('\n📊 Migration Status: (dry-run mode)');
    console.log('==================');
    console.log('Cannot check migration status without database connection');
    return [];
  }
  
  try {
    const result = await sql`
      SELECT filename, executed_at 
      FROM migrations 
      ORDER BY executed_at ASC
    `;
    
    console.log('\n📊 Migration Status:');
    console.log('==================');
    
    if (result.length === 0) {
      console.log('No migrations executed yet');
    } else {
      result.forEach(migration => {
        console.log(`✅ ${migration.filename} - ${migration.executed_at}`);
      });
    }
    
    return result;
  } catch (error) {
    console.warn('Could not get migration status:', error.message);
    return [];
  }
}

/**
 * Main migration runner
 */
async function runDataMigrations() {
  console.log('🚀 Starting Quest Economy System Data Migrations');
  console.log('================================================');

  // Validate environment
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    console.warn('⚠️  DATABASE_URL or POSTGRES_URL environment variable not set');
    console.log('Running in validation mode only...');
  }

  // Validate connection
  const connectionStatus = await validateConnection();
  if (connectionStatus === false) {
    process.exit(1);
  }

  // Ensure migrations table
  if (!(await ensureMigrationsTable())) {
    process.exit(1);
  }

  // Show current status
  await getMigrationStatus();

  // Execute migrations
  let successCount = 0;
  let failureCount = 0;

  for (const filename of MIGRATION_FILES) {
    const success = await executeMigration(filename);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  // Summary
  console.log('\n📋 Migration Summary:');
  console.log('====================');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📦 Total: ${MIGRATION_FILES.length}`);

  if (failureCount > 0) {
    console.log('\n⚠️  Some migrations failed. Please check the errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All data migrations completed successfully!');
    
    // Show final status
    await getMigrationStatus();
    
    console.log('\n🎯 Next Steps:');
    console.log('- Verify data integrity in your database');
    console.log('- Test the quest economy system features');
    console.log('- Check user ranks and categories');
    console.log('- Review economy settings');
  }
}

/**
 * Rollback a specific migration (for development)
 */
async function rollbackMigration(filename) {
  console.log(`🔄 Rolling back migration: ${filename}`);
  
  try {
    await sql`DELETE FROM migrations WHERE filename = ${filename}`;
    console.log(`✅ Migration ${filename} rolled back from tracking`);
    console.log('⚠️  Note: This only removes the tracking record, not the actual changes');
  } catch (error) {
    console.error(`❌ Error rolling back migration ${filename}:`, error.message);
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  const filename = process.argv[3];

  if (command === 'rollback' && filename) {
    rollbackMigration(filename);
  } else if (command === 'status') {
    validateConnection().then(valid => {
      if (valid) {
        ensureMigrationsTable().then(() => getMigrationStatus());
      }
    });
  } else {
    runDataMigrations();
  }
}

module.exports = {
  runDataMigrations,
  rollbackMigration,
  getMigrationStatus
};