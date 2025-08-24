// Migration Runner Script
// Executes database migrations in order
// Usage: node scripts/run-migrations.js

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

// Create migrations tracking table
async function createMigrationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

// Get list of executed migrations
async function getExecutedMigrations() {
  const result = await sql`SELECT filename FROM migrations ORDER BY id`;
  return result.map(row => row.filename);
}

// Mark migration as executed
async function markMigrationExecuted(filename) {
  await sql`INSERT INTO migrations (filename) VALUES (${filename})`;
}

// Execute a single migration file
async function executeMigration(filename, content) {
  console.log(`🔄 Executing migration: ${filename}`);
  
  try {
    // Split the content by semicolons and execute each statement
    const statements = content
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        await sql.unsafe(statement);
      }
    }
    
    await markMigrationExecuted(filename);
    console.log(`✅ Migration completed: ${filename}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`);
    console.error(error.message);
    throw error;
  }
}

// Main migration runner
async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Create migrations tracking table
    await createMigrationsTable();
    
    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log(`📋 Found ${executedMigrations.length} previously executed migrations`);
    
    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`📁 Found ${migrationFiles.length} migration files`);
    
    // Execute pending migrations
    let executedCount = 0;
    for (const filename of migrationFiles) {
      if (!executedMigrations.includes(filename)) {
        const filePath = path.join(migrationsDir, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        await executeMigration(filename, content);
        executedCount++;
      } else {
        console.log(`⏭️  Skipping already executed migration: ${filename}`);
      }
    }
    
    if (executedCount === 0) {
      console.log('✨ All migrations are up to date!');
    } else {
      console.log(`🎉 Successfully executed ${executedCount} new migrations!`);
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };