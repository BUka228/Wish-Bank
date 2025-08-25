-- Migration: Mana System Infrastructure
-- Version: 009
-- Description: Add mana system infrastructure - mana_balance field and wish_enhancements table

-- Add mana_balance and migration tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mana_balance INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS legacy_migration_completed BOOLEAN DEFAULT FALSE;

-- Create wish_enhancements table for storing wish enhancements
CREATE TABLE IF NOT EXISTS wish_enhancements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wish_id UUID REFERENCES wishes(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('priority', 'aura')),
    level INTEGER DEFAULT 1,
    aura_type VARCHAR(20),
    cost INTEGER NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW(),
    applied_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}'
);

-- Update transactions table to support mana transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS mana_amount INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_source VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS enhancement_id UUID REFERENCES wish_enhancements(id);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_mana_balance ON users(mana_balance);
CREATE INDEX IF NOT EXISTS idx_users_migration_status ON users(legacy_migration_completed);

CREATE INDEX IF NOT EXISTS idx_enhancements_wish_id ON wish_enhancements(wish_id);
CREATE INDEX IF NOT EXISTS idx_enhancements_type ON wish_enhancements(type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_enhancements_priority_unique ON wish_enhancements(wish_id) 
    WHERE type = 'priority';

CREATE INDEX IF NOT EXISTS idx_transactions_mana ON transactions(mana_amount) WHERE mana_amount > 0;
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(transaction_source);
CREATE INDEX IF NOT EXISTS idx_transactions_enhancement ON transactions(enhancement_id) WHERE enhancement_id IS NOT NULL;

-- Add check constraints for data integrity
ALTER TABLE wish_enhancements ADD CONSTRAINT IF NOT EXISTS chk_priority_level 
    CHECK (type != 'priority' OR (level >= 1 AND level <= 5));

ALTER TABLE wish_enhancements ADD CONSTRAINT IF NOT EXISTS chk_aura_type 
    CHECK (type != 'aura' OR aura_type IN ('romantic', 'gaming', 'mysterious'));

-- Add comments for documentation
COMMENT ON COLUMN users.mana_balance IS 'Current mana balance for the user';
COMMENT ON COLUMN users.legacy_migration_completed IS 'Whether user has been migrated from old currency system';

COMMENT ON TABLE wish_enhancements IS 'Stores enhancements applied to wishes using mana';
COMMENT ON COLUMN wish_enhancements.type IS 'Type of enhancement: priority or aura';
COMMENT ON COLUMN wish_enhancements.level IS 'Enhancement level (1-5 for priority, 1 for aura)';
COMMENT ON COLUMN wish_enhancements.aura_type IS 'Type of aura: romantic, gaming, or mysterious';
COMMENT ON COLUMN wish_enhancements.cost IS 'Mana cost paid for this enhancement';

COMMENT ON COLUMN transactions.mana_amount IS 'Amount of mana involved in transaction';
COMMENT ON COLUMN transactions.transaction_source IS 'Source of transaction (quest, event, enhancement, etc.)';
COMMENT ON COLUMN transactions.enhancement_id IS 'Reference to enhancement if transaction was for enhancement';