// Migration Validation Script
// Validates SQL syntax and structure of migration files
// Usage: node scripts/validate-migrations.js

const fs = require('fs');
const path = require('path');

function validateMigrationFile(filename, content) {
  const errors = [];
  const warnings = [];

  // Check file naming convention
  if (!/^\d{3}_[a-z_]+\.sql$/.test(filename)) {
    errors.push(`Invalid filename format: ${filename}. Should be like "001_migration_name.sql"`);
  }

  // Check for required SQL patterns
  const requiredPatterns = [
    { pattern: /CREATE TABLE IF NOT EXISTS/i, message: 'Use "CREATE TABLE IF NOT EXISTS" for safety' },
    { pattern: /ALTER TABLE.*ADD COLUMN IF NOT EXISTS/i, message: 'Use "ADD COLUMN IF NOT EXISTS" for safety' }
  ];

  // Check for dangerous patterns
  const dangerousPatterns = [
    { pattern: /DROP TABLE(?!\s+IF\s+EXISTS)/i, message: 'Use "DROP TABLE IF EXISTS" instead of "DROP TABLE"' },
    { pattern: /DROP COLUMN(?!\s+IF\s+EXISTS)/i, message: 'Consider using "DROP COLUMN IF EXISTS" or avoid dropping columns' }
  ];

  // Validate SQL structure
  const statements = content
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => {
      // Remove comments and empty lines
      const cleanStmt = stmt.replace(/--.*$/gm, '').trim();
      return cleanStmt.length > 0;
    });
  
  if (statements.length === 0) {
    errors.push('Migration file appears to be empty or contains only comments');
  }

  // Check each statement
  statements.forEach((statement, index) => {
    const trimmed = statement.trim();
    if (!trimmed) return;

    // Check for transaction safety
    if (trimmed.match(/^(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)/i)) {
      // This is a data-modifying statement
      if (!content.includes('IF NOT EXISTS') && !content.includes('ON CONFLICT')) {
        warnings.push(`Statement ${index + 1} might not be idempotent`);
      }
    }
  });

  // Check dangerous patterns
  dangerousPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(content)) {
      errors.push(message);
    }
  });

  return { errors, warnings };
}

function validateAllMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found');
    return false;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('⚠️  No migration files found');
    return true;
  }

  let hasErrors = false;
  console.log(`🔍 Validating ${files.length} migration files...\n`);

  files.forEach(filename => {
    const filePath = path.join(migrationsDir, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const { errors, warnings } = validateMigrationFile(filename, content);

    console.log(`📄 ${filename}`);
    
    if (errors.length > 0) {
      hasErrors = true;
      console.log('  ❌ Errors:');
      errors.forEach(error => console.log(`    - ${error}`));
    }

    if (warnings.length > 0) {
      console.log('  ⚠️  Warnings:');
      warnings.forEach(warning => console.log(`    - ${warning}`));
    }

    if (errors.length === 0 && warnings.length === 0) {
      console.log('  ✅ Valid');
    }

    console.log('');
  });

  if (hasErrors) {
    console.log('❌ Validation failed. Please fix the errors above.');
    return false;
  } else {
    console.log('✅ All migrations are valid!');
    return true;
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const isValid = validateAllMigrations();
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateAllMigrations, validateMigrationFile };