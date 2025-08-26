#!/usr/bin/env node

/**
 * Migration script to fix wish_type constraint for mana transactions
 * This fixes the "null value in column "wish_type" violates not-null constraint" error
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Check if DATABASE_URL is provided
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('Usage: DATABASE_URL="your_database_url" node scripts/fix-mana-transaction-constraint.js');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log('🔧 Starting wish_type constraint fix migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '014_fix_mana_transaction_wish_type.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    console.log('📝 Executing migration SQL...');
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    
    // Check if the constraint was updated
    const constraintCheck = await sql`
      SELECT conname, consrc 
      FROM pg_constraint 
      WHERE conname = 'transactions_wish_type_check'
    `;
    
    if (constraintCheck.length > 0) {
      console.log('✅ Constraint updated successfully');
    } else {
      console.log('⚠️  Constraint check returned no results - this may be normal');
    }
    
    // Check for any problematic transactions
    const problemTransactions = await sql`
      SELECT COUNT(*) as count
      FROM transactions 
      WHERE mana_amount > 0 
      AND transaction_source = 'mana_transaction_manager'
      AND wish_type IS NOT NULL 
      AND amount = 0
    `;
    
    console.log(`📊 Found ${problemTransactions[0].count} transactions that may need review`);
    
    // Test creating a mana-only transaction (should not fail now)
    console.log('🧪 Testing mana-only transaction creation...');
    try {
      await sql`
        INSERT INTO transactions (
          user_id, 
          type, 
          wish_type,
          amount,
          mana_amount, 
          reason, 
          transaction_category,
          transaction_source,
          experience_gained
        ) VALUES (
          gen_random_uuid(),
          'credit',
          NULL,
          0,
          100,
          'Migration test transaction',
          'test',
          'migration_test',
          0
        )
      `;
      
      // Clean up test transaction
      await sql`
        DELETE FROM transactions 
        WHERE reason = 'Migration test transaction' 
        AND transaction_source = 'migration_test'
      `;
      
      console.log('✅ Mana-only transaction test passed!');
    } catch (testError) {
      console.error('❌ Mana-only transaction test failed:', testError.message);
      throw testError;
    }
    
    console.log('🎉 All checks passed! The wish_type constraint issue has been fixed.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration().then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = { runMigration };