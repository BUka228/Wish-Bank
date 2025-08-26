-- Migration: Fix Mana Transaction Wish Type Constraint
-- Version: 014
-- Description: Allow NULL values for wish_type in transactions table for mana-only operations

-- Remove the NOT NULL constraint from wish_type column
-- This allows mana transactions that are not tied to specific wish types
ALTER TABLE transactions ALTER COLUMN wish_type DROP NOT NULL;

-- Update existing constraint to allow NULL values
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_wish_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_wish_type_check 
    CHECK (wish_type IS NULL OR wish_type IN ('green', 'blue', 'red'));

-- Add comment to clarify the new behavior
COMMENT ON COLUMN transactions.wish_type IS 'Type of wish for wish-related transactions (green, blue, red), NULL for pure mana transactions';

-- Create index for better performance on mana-only transactions
CREATE INDEX IF NOT EXISTS idx_transactions_mana_only ON transactions(mana_amount) WHERE wish_type IS NULL AND mana_amount > 0;

-- Add index for mixed transaction queries
CREATE INDEX IF NOT EXISTS idx_transactions_type_source ON transactions(transaction_source, type) WHERE mana_amount > 0;

-- Update existing mana transactions that might have invalid wish_type values
-- Set wish_type to NULL for transactions that are purely mana-based
UPDATE transactions 
SET wish_type = NULL 
WHERE transaction_source = 'mana_transaction_manager' 
  AND mana_amount > 0 
  AND amount = 0;

-- Verify the migration
-- This query should not return any rows after the migration
DO $$
BEGIN
    RAISE NOTICE 'Checking for transactions with mana_amount > 0 but invalid wish_type...';
    
    IF EXISTS (
        SELECT 1 FROM transactions 
        WHERE mana_amount > 0 
        AND transaction_source = 'mana_transaction_manager'
        AND wish_type IS NOT NULL 
        AND amount = 0
    ) THEN
        RAISE WARNING 'Found transactions that may need manual review';
    ELSE
        RAISE NOTICE 'All mana transactions appear to be correctly configured';
    END IF;
END $$;