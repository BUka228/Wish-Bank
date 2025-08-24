-- Migration: Quest Economy System Database Schema
-- Version: 001
-- Description: Add tables and columns for quest economy system with ranks, events, and enhanced wishes

-- Extend users table with rank and economy fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank VARCHAR(50) DEFAULT 'Рядовой';
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_quota_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_quota_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_quota_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_quota_reset DATE DEFAULT CURRENT_DATE;

-- Create quests table
CREATE TABLE IF NOT EXISTS quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic')),
    reward_type VARCHAR(20) NOT NULL DEFAULT 'green',
    reward_amount INTEGER NOT NULL DEFAULT 1,
    experience_reward INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Create random_events table
CREATE TABLE IF NOT EXISTS random_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    reward_type VARCHAR(20) NOT NULL DEFAULT 'green',
    reward_amount INTEGER NOT NULL DEFAULT 1,
    experience_reward INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}'
);

-- Extend wishes table with new columns
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE;
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE;
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS is_historical BOOLEAN DEFAULT FALSE;
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS shared_approved_by UUID REFERENCES users(id);
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;

-- Create wish_categories table
CREATE TABLE IF NOT EXISTS wish_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    emoji VARCHAR(10),
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create ranks table
CREATE TABLE IF NOT EXISTS ranks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    min_experience INTEGER NOT NULL,
    daily_quota_bonus INTEGER DEFAULT 0,
    weekly_quota_bonus INTEGER DEFAULT 0,
    monthly_quota_bonus INTEGER DEFAULT 0,
    special_privileges JSONB DEFAULT '{}',
    emoji VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create economy_settings table
CREATE TABLE IF NOT EXISTS economy_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Extend transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_category VARCHAR(50) DEFAULT 'manual';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS experience_gained INTEGER DEFAULT 0;

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_quests_assignee_status ON quests(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_quests_author_status ON quests(author_id, status);
CREATE INDEX IF NOT EXISTS idx_quests_due_date ON quests(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quests_category ON quests(category);

CREATE INDEX IF NOT EXISTS idx_events_user_status ON random_events(user_id, status);
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON random_events(expires_at);
CREATE INDEX IF NOT EXISTS idx_events_completed_by ON random_events(completed_by) WHERE completed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wishes_category_status ON wishes(category, status);
CREATE INDEX IF NOT EXISTS idx_wishes_shared ON wishes(is_shared) WHERE is_shared = TRUE;
CREATE INDEX IF NOT EXISTS idx_wishes_priority ON wishes(priority);

CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(transaction_category, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_experience ON transactions(experience_gained) WHERE experience_gained > 0;

CREATE INDEX IF NOT EXISTS idx_users_rank ON users(rank);
CREATE INDEX IF NOT EXISTS idx_users_experience ON users(experience_points);
CREATE INDEX IF NOT EXISTS idx_users_quota_reset ON users(last_quota_reset);

CREATE INDEX IF NOT EXISTS idx_ranks_experience ON ranks(min_experience);