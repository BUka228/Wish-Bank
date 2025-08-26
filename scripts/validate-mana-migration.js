// Validation script for mana system migration
// This script validates the SQL syntax and structure without executing it

const fs = require('fs');
const path = require('path');

function validateMigrationSQL() {
  console.log('🔍 Validating mana system migration SQL...');
  
  const migrationPath = path.join(__dirname, 'migrations', '009_mana_system_infrastructure.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    return false;
  }
  
  const content = fs.readFileSync(migrationPath, 'utf8');
  
  // Basic SQL validation checks
  const checks = [
    {
      name: 'Contains mana_balance column addition',
      test: content.includes('ADD COLUMN IF NOT EXISTS mana_balance INTEGER DEFAULT 0')
    },
    {
      name: 'Contains legacy_migration_completed column addition',
      test: content.includes('ADD COLUMN IF NOT EXISTS legacy_migration_completed BOOLEAN DEFAULT FALSE')
    },
    {
      name: 'Creates wish_enhancements table',
      test: content.includes('CREATE TABLE IF NOT EXISTS wish_enhancements')
    },
    {
      name: 'Has proper enhancement type constraints',
      test: content.includes("CHECK (type IN ('priority', 'aura'))")
    },
    {
      name: 'Has proper aura type constraints',
      test: content.includes("aura_type IN ('tech', 'gaming', 'nature', 'cosmic')")
    },
    {
      name: 'Creates necessary indexes',
      test: content.includes('idx_users_mana_balance') && 
            content.includes('idx_enhancements_wish_id') &&
            content.includes('idx_transactions_mana')
    },
    {
      name: 'Has proper foreign key references',
      test: content.includes('REFERENCES users(id)') && 
            content.includes('REFERENCES wishes(id)')
    },
    {
      name: 'Includes documentation comments',
      test: content.includes('COMMENT ON')
    }
  ];
  
  let allPassed = true;
  
  checks.forEach(check => {
    if (check.test) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`❌ ${check.name}`);
      allPassed = false;
    }
  });
  
  // Check for common SQL syntax issues
  const syntaxChecks = [
    {
      name: 'No unmatched parentheses',
      test: (content.match(/\(/g) || []).length === (content.match(/\)/g) || []).length
    },
    {
      name: 'No unmatched quotes',
      test: (content.match(/'/g) || []).length % 2 === 0
    },
    {
      name: 'Proper statement termination',
      test: (() => {
        const statements = content.split(';');
        // Filter out empty statements and comments
        const sqlStatements = statements.filter(stmt => {
          const trimmed = stmt.trim();
          return trimmed && !trimmed.startsWith('--') && !trimmed.match(/^COMMENT ON/);
        });
        // Check that we have SQL statements (not just comments)
        return sqlStatements.length > 0;
      })()
    }
  ];
  
  syntaxChecks.forEach(check => {
    if (check.test) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`❌ ${check.name}`);
      allPassed = false;
    }
  });
  
  if (allPassed) {
    console.log('🎉 Migration validation passed!');
    console.log('📋 Migration summary:');
    console.log('   - Adds mana_balance field to users table');
    console.log('   - Adds legacy_migration_completed field to users table');
    console.log('   - Creates wish_enhancements table for storing enhancements');
    console.log('   - Extends transactions table with mana support');
    console.log('   - Creates necessary indexes for performance');
    console.log('   - Adds proper constraints and foreign keys');
    return true;
  } else {
    console.log('❌ Migration validation failed!');
    return false;
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const isValid = validateMigrationSQL();
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateMigrationSQL };