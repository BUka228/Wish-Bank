-- Migration: 009_wish_economy_rework.sql
-- Description: Overhauls the wish economy from a three-tiered currency system
-- to a single currency (mana) and a wish enchanting system.

BEGIN;

-- 1. Modify 'users' table
-- Add mana columns
ALTER TABLE users ADD COLUMN mana INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN mana_spent INTEGER NOT NULL DEFAULT 0;

-- Back-fill mana based on old balances (1 green = 1, 1 blue = 10, 1 red = 100)
-- This is a sample conversion rate.
UPDATE users
SET mana = COALESCE(green_balance, 0) + (COALESCE(blue_balance, 0) * 10) + (COALESCE(red_balance, 0) * 100);

-- Drop old balance columns
ALTER TABLE users DROP COLUMN green_balance;
ALTER TABLE users DROP COLUMN blue_balance;
ALTER TABLE users DROP COLUMN red_balance;

-- 2. Modify 'wishes' table
-- Add enchantments column
ALTER TABLE wishes ADD COLUMN enchantments JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Back-fill enchantments with old priority
UPDATE wishes
SET enchantments = jsonb_build_object('priority', priority)
WHERE priority IS NOT NULL;

-- Drop old columns
ALTER TABLE wishes DROP COLUMN type;
ALTER TABLE wishes DROP COLUMN priority;

-- 3. Modify 'transactions' table
-- Rename reason column
ALTER TABLE transactions RENAME COLUMN reason TO description;

-- Add mana_amount and drop wish_type
ALTER TABLE transactions ADD COLUMN mana_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE transactions DROP COLUMN wish_type;

-- Add generic relation columns for better tracking
ALTER TABLE transactions ADD COLUMN related_entity_id UUID;
ALTER TABLE transactions ADD COLUMN related_entity_type VARCHAR(50);
CREATE INDEX idx_transactions_related_entity ON transactions(related_entity_id, related_entity_type);


-- 4. Modify 'quests' table
-- Rename reward columns and drop type
ALTER TABLE quests RENAME COLUMN reward_amount TO mana_reward;
ALTER TABLE quests DROP COLUMN reward_type;

-- 5. Modify 'random_events' table
-- Rename reward columns and drop type
ALTER TABLE random_events RENAME COLUMN reward_amount TO mana_reward;
ALTER TABLE random_events DROP COLUMN reward_type;


-- 6. Update 'economy_settings'
-- Delete old exchange rates setting
DELETE FROM economy_settings WHERE setting_key = 'exchange_rates';

-- Add new settings for enchantment costs
INSERT INTO economy_settings (setting_key, setting_value, description)
VALUES
  ('enchantment_costs', '{"priority": 5, "aura": 2, "linked_wish": 10, "recurring": 50}', 'Base mana costs for different types of enchantments.'),
  ('priority_cost_multiplier', '{"1": 0, "2": 1, "3": 2, "4": 4, "5": 8}', 'Multiplier for mana cost based on priority level. Final cost = base_cost * multiplier.')
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = excluded.setting_value, description = excluded.description;


COMMIT;
