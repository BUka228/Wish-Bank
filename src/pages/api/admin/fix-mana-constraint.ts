/**
 * Deploy Migration: Fix Mana Transaction Wish Type Constraint
 * This migration fixes the database constraint that prevents mana-only transactions
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db-pool';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Support GET and HEAD methods for complete functionality
  if (req.method === 'GET' || req.method === 'HEAD') {
    return res.status(200).json({ 
      message: 'Mana constraint migration endpoint', 
      description: 'POST to deploy the migration that fixes wish_type constraint'
    });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔧 Starting wish_type constraint fix migration...');
    
    // Step 1: Remove the NOT NULL constraint from wish_type column
    await db.execute`ALTER TABLE transactions ALTER COLUMN wish_type DROP NOT NULL`;
    console.log('✅ Removed NOT NULL constraint from wish_type');

    // Step 2: Update existing constraint to allow NULL values
    await db.execute`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_wish_type_check`;
    await db.execute`ALTER TABLE transactions ADD CONSTRAINT transactions_wish_type_check 
        CHECK (wish_type IS NULL OR wish_type IN ('green', 'blue', 'red'))`;
    console.log('✅ Updated check constraint to allow NULL values');

    // Step 3: Add comment to clarify the new behavior
    await db.execute`COMMENT ON COLUMN transactions.wish_type IS 'Type of wish for wish-related transactions (green, blue, red), NULL for pure mana transactions'`;
    console.log('✅ Added column comment');

    // Step 4: Create indexes for better performance
    await db.execute`CREATE INDEX IF NOT EXISTS idx_transactions_mana_only ON transactions(mana_amount) WHERE wish_type IS NULL AND mana_amount > 0`;
    await db.execute`CREATE INDEX IF NOT EXISTS idx_transactions_type_source ON transactions(transaction_source, type) WHERE mana_amount > 0`;
    console.log('✅ Created performance indexes');

    // Step 5: Update existing mana transactions to have NULL wish_type
    const updateResult = await db.execute`
      UPDATE transactions 
      SET wish_type = NULL 
      WHERE transaction_source = 'mana_transaction_manager' 
        AND mana_amount > 0 
        AND amount = 0
      RETURNING id
    `;
    console.log(`✅ Updated ${updateResult.length} existing mana transactions`);

    // Step 6: Test creating a mana-only transaction
    const testTransactionId = `test_${Date.now()}`;
    await db.execute`
      INSERT INTO transactions (
        user_id, 
        type, 
        wish_type,
        amount,
        mana_amount, 
        reason, 
        transaction_category,
        transaction_source,
        experience_gained,
        metadata
      ) VALUES (
        gen_random_uuid(),
        'credit',
        NULL,
        0,
        100,
        ${`Migration test - ${testTransactionId}`},
        'test',
        'migration_test',
        0,
        '{}'
      )
    `;
    
    // Clean up test transaction
    await db.execute`DELETE FROM transactions WHERE reason = ${`Migration test - ${testTransactionId}`}`;
    console.log('✅ Mana-only transaction test passed');

    // Step 7: Verification
    const problemTransactions = await db.execute`
      SELECT COUNT(*) as count
      FROM transactions 
      WHERE mana_amount > 0 
      AND transaction_source = 'mana_transaction_manager'
      AND wish_type IS NOT NULL 
      AND amount = 0
    `;

    const result = {
      success: true,
      message: 'Migration completed successfully',
      details: {
        updated_transactions: updateResult.length,
        remaining_problem_transactions: problemTransactions[0].count,
        migration_timestamp: new Date().toISOString()
      }
    };

    console.log('🎉 Migration completed successfully!', result);
    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return res.status(500).json({ 
      error: 'Migration failed', 
      details: errorMessage,
      stack: errorStack
    });
  }
}