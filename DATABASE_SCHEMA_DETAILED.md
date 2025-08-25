# Quest Economy System Database Schema

## Overview

This document provides detailed documentation of the database schema for the Quest Economy System. The schema extends the existing wish-based system with quests, random events, enhanced wishes, economy management, and rank progression.

## Database Technology

- **Primary Database**: PostgreSQL 14+
- **Connection Pooling**: pg-pool with connection limits
- **Migrations**: Custom migration system with validation
- **Indexing Strategy**: Optimized for read-heavy workloads

## Schema Evolution

The system extends the existing schema while maintaining backward compatibility:

### Phase 1: Core Extensions
- Extended `users` table with rank and economy fields
- Added new tables for quests, events, and categories
- Enhanced `wishes` table with new classification fields

### Phase 2: Performance Optimizations
- Added strategic indexes for query optimization
- Implemented table partitioning for large datasets
- Added materialized views for complex analytics

## Table Definitions

### Users Table (Extended)

```sql
-- Extended users table with new economy and rank fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank VARCHAR(50) DEFAULT 'Рядовой';
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_quota_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_quota_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_quota_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_quota_reset DATE DEFAULT CURRENT_DATE;

-- Constraints and indexes
CREATE INDEX IF NOT EXISTS idx_users_rank ON users(rank);
CREATE INDEX IF NOT EXISTS idx_users_experience ON users(experience_points DESC);
CREATE INDEX IF NOT EXISTS idx_users_quota_reset ON users(last_quota_reset);
```

**Fields:**
- `rank`: Current military rank (default: 'Рядовой')
- `experience_points`: Total experience accumulated
- `daily_quota_used`: Wishes gifted today
- `weekly_quota_used`: Wishes gifted this week
- `monthly_quota_used`: Wishes gifted this month
- `last_quota_reset`: Last quota reset date

### Quests Table

```sql
CREATE TABLE quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic')),
    reward_type VARCHAR(20) NOT NULL,
    reward_amount INTEGER NOT NULL,
    experience_reward INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX idx_quests_assignee_status ON quests(assignee_id, status);
CREATE INDEX idx_quests_author_status ON quests(author_id, status);
CREATE INDEX idx_quests_due_date ON quests(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_quests_category ON quests(category);
CREATE INDEX idx_quests_difficulty ON quests(difficulty);
CREATE INDEX idx_quests_created_at ON quests(created_at DESC);
```

**Business Rules:**
- Quest titles must be 3-200 characters
- Descriptions must be 10-1000 characters
- Only quest authors can mark quests as completed
- Expired quests are automatically marked by background jobs
- Maximum 10 active quests per user

### Random Events Table

```sql
CREATE TABLE random_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    reward_type VARCHAR(20) NOT NULL,
    reward_amount INTEGER NOT NULL,
    experience_reward INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_events_user_status ON random_events(user_id, status);
CREATE INDEX idx_events_expires_at ON random_events(expires_at);
CREATE INDEX idx_events_completed_by ON random_events(completed_by) WHERE completed_by IS NOT NULL;
```

**Business Rules:**
- Only one active event per user at a time
- Events expire after 24 hours if not completed
- Only the user's partner can mark events as completed
- New events are generated 4-8 hours after completion

### Enhanced Wishes Table

```sql
-- Extensions to existing wishes table
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE;
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE;
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS is_historical BOOLEAN DEFAULT FALSE;
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS shared_approved_by UUID REFERENCES users(id);
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;

-- New indexes
CREATE INDEX idx_wishes_category_status ON wishes(category, status);
CREATE INDEX idx_wishes_shared ON wishes(is_shared) WHERE is_shared = TRUE;
CREATE INDEX idx_wishes_gifts ON wishes(is_gift) WHERE is_gift = TRUE;
CREATE INDEX idx_wishes_priority ON wishes(priority DESC);
```

**New Fields:**
- `category`: Wish classification (romance, travel, health, etc.)
- `is_shared`: Indicates shared wishes visible to both partners
- `is_gift`: Marks wishes given as gifts
- `is_historical`: Marks wishes added retroactively
- `shared_approved_by`: Partner who approved shared wish
- `priority`: Wish priority level (1-5)

### Wish Categories Table

```sql
CREATE TABLE wish_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    emoji VARCHAR(10),
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Default categories
INSERT INTO wish_categories (name, emoji, color) VALUES
('Романтика', '💕', '#ff69b4'),
('Путешествия', '✈️', '#4169e1'),
('Здоровье', '💪', '#32cd32'),
('Развлечения', '🎉', '#ffa500'),
('Дом', '🏠', '#8b4513'),
('Общее', '🤝', '#808080');
```

### Ranks Table

```sql
CREATE TABLE ranks (
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

-- Russian military rank hierarchy
INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji) VALUES
('Рядовой', 0, 0, 0, 0, '🎖️'),
('Ефрейтор', 500, 1, 5, 15, '🏅'),
('Младший сержант', 1200, 2, 8, 25, '🎗️'),
('Сержант', 2500, 3, 12, 35, '🏆'),
('Старший сержант', 5000, 4, 15, 50, '🥇'),
('Старшина', 8000, 5, 20, 65, '👑'),
('Прапорщик', 12000, 6, 25, 80, '⭐'),
('Старший прапорщик', 18000, 8, 30, 100, '🌟');

CREATE INDEX idx_ranks_experience ON ranks(min_experience);
```

### Economy Settings Table

```sql
CREATE TABLE economy_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Default economy settings
INSERT INTO economy_settings (setting_key, setting_value, description) VALUES
('base_quotas', '{"daily": 3, "weekly": 15, "monthly": 50}', 'Base gift quotas for all users'),
('experience_rates', '{"quest_easy": 25, "quest_medium": 50, "quest_hard": 100, "quest_epic": 200, "event_completion": 30, "gift_given": 5}', 'Experience points for different actions'),
('gift_types', '{"small": {"wishes": 1, "quota_cost": 1}, "medium": {"wishes": 3, "quota_cost": 2}, "large": {"wishes": 5, "quota_cost": 3}}', 'Gift type definitions'),
('quest_limits', '{"max_active": 10, "max_daily_created": 5, "max_difficulty_easy": 5, "max_difficulty_medium": 3, "max_difficulty_hard": 2, "max_difficulty_epic": 1}', 'Quest creation limits');
```

### Enhanced Transactions Table

```sql
-- Extensions to existing transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_category VARCHAR(50) DEFAULT 'manual';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS experience_gained INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS quest_id UUID REFERENCES quests(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES random_events(id);

-- New indexes
CREATE INDEX idx_transactions_category_date ON transactions(transaction_category, created_at DESC);
CREATE INDEX idx_transactions_experience ON transactions(experience_gained) WHERE experience_gained > 0;
CREATE INDEX idx_transactions_quest ON transactions(quest_id) WHERE quest_id IS NOT NULL;
CREATE INDEX idx_transactions_event ON transactions(event_id) WHERE event_id IS NOT NULL;
```

## Views and Materialized Views

### User Statistics View

```sql
CREATE VIEW user_statistics AS
SELECT 
    u.id,
    u.username,
    u.rank,
    u.experience_points,
    COUNT(DISTINCT q1.id) as quests_created,
    COUNT(DISTINCT q2.id) as quests_completed,
    COUNT(DISTINCT re.id) as events_completed,
    COUNT(DISTINCT w.id) as wishes_created,
    COUNT(DISTINCT t.id) as gifts_given,
    COALESCE(SUM(t.experience_gained), 0) as total_experience_from_transactions
FROM users u
LEFT JOIN quests q1 ON u.id = q1.author_id
LEFT JOIN quests q2 ON u.id = q2.assignee_id AND q2.status = 'completed'
LEFT JOIN random_events re ON u.id = re.user_id AND re.status = 'completed'
LEFT JOIN wishes w ON u.id = w.user_id
LEFT JOIN transactions t ON u.id = t.from_user_id AND t.transaction_category = 'gift'
GROUP BY u.id, u.username, u.rank, u.experience_points;
```

### Economy Metrics Materialized View

```sql
CREATE MATERIALIZED VIEW economy_metrics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE transaction_category = 'gift') as gifts_given,
    COUNT(*) FILTER (WHERE transaction_category = 'quest_reward') as quest_rewards,
    COUNT(*) FILTER (WHERE transaction_category = 'event_reward') as event_rewards,
    AVG(amount) as avg_transaction_amount,
    SUM(experience_gained) as total_experience_awarded
FROM transactions
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Refresh schedule
CREATE OR REPLACE FUNCTION refresh_economy_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW economy_metrics;
END;
$$ LANGUAGE plpgsql;
```

## Triggers and Functions

### Automatic Quota Reset

```sql
CREATE OR REPLACE FUNCTION reset_user_quotas()
RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT id, last_quota_reset 
        FROM users 
        WHERE last_quota_reset < CURRENT_DATE
    LOOP
        -- Reset daily quotas
        UPDATE users 
        SET daily_quota_used = 0,
            last_quota_reset = CURRENT_DATE
        WHERE id = user_record.id;
        
        -- Reset weekly quotas on Monday
        IF EXTRACT(DOW FROM CURRENT_DATE) = 1 THEN
            UPDATE users 
            SET weekly_quota_used = 0
            WHERE id = user_record.id;
        END IF;
        
        -- Reset monthly quotas on first day of month
        IF EXTRACT(DAY FROM CURRENT_DATE) = 1 THEN
            UPDATE users 
            SET monthly_quota_used = 0
            WHERE id = user_record.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Experience Calculation Trigger

```sql
CREATE OR REPLACE FUNCTION calculate_experience_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    exp_gained INTEGER := 0;
    settings JSONB;
BEGIN
    -- Get experience rates from settings
    SELECT setting_value INTO settings
    FROM economy_settings
    WHERE setting_key = 'experience_rates';
    
    -- Calculate experience based on transaction type
    CASE NEW.transaction_category
        WHEN 'quest_reward' THEN
            exp_gained := COALESCE((settings->>'quest_completion')::INTEGER, 50);
        WHEN 'event_reward' THEN
            exp_gained := COALESCE((settings->>'event_completion')::INTEGER, 30);
        WHEN 'gift' THEN
            exp_gained := COALESCE((settings->>'gift_given')::INTEGER, 5);
        ELSE
            exp_gained := 0;
    END CASE;
    
    -- Update experience in transaction
    NEW.experience_gained := exp_gained;
    
    -- Update user's total experience
    UPDATE users 
    SET experience_points = experience_points + exp_gained
    WHERE id = NEW.from_user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_experience
    BEFORE INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_experience_on_transaction();
```

### Rank Update Trigger

```sql
CREATE OR REPLACE FUNCTION update_user_rank()
RETURNS TRIGGER AS $$
DECLARE
    new_rank VARCHAR(100);
BEGIN
    -- Find the highest rank the user qualifies for
    SELECT name INTO new_rank
    FROM ranks
    WHERE min_experience <= NEW.experience_points
    ORDER BY min_experience DESC
    LIMIT 1;
    
    -- Update rank if it changed
    IF new_rank IS NOT NULL AND new_rank != OLD.rank THEN
        UPDATE users 
        SET rank = new_rank
        WHERE id = NEW.id;
        
        -- Log rank promotion
        INSERT INTO transactions (
            from_user_id,
            to_user_id,
            amount,
            transaction_type,
            transaction_category,
            description
        ) VALUES (
            NEW.id,
            NEW.id,
            0,
            'rank_promotion',
            'system',
            'Promoted to ' || new_rank
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rank
    AFTER UPDATE OF experience_points ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rank();
```

## Data Integrity Constraints

### Business Logic Constraints

```sql
-- Ensure quest authors and assignees are different
ALTER TABLE quests ADD CONSTRAINT check_quest_different_users 
CHECK (author_id != assignee_id);

-- Ensure quest due dates are in the future
ALTER TABLE quests ADD CONSTRAINT check_quest_future_due_date 
CHECK (due_date IS NULL OR due_date > created_at);

-- Ensure event expiration is in the future
ALTER TABLE random_events ADD CONSTRAINT check_event_future_expiration 
CHECK (expires_at > created_at);

-- Ensure shared wishes have approval
ALTER TABLE wishes ADD CONSTRAINT check_shared_wish_approval 
CHECK (NOT is_shared OR shared_approved_by IS NOT NULL);

-- Ensure quota values are non-negative
ALTER TABLE users ADD CONSTRAINT check_positive_quotas 
CHECK (daily_quota_used >= 0 AND weekly_quota_used >= 0 AND monthly_quota_used >= 0);

-- Ensure experience points are non-negative
ALTER TABLE users ADD CONSTRAINT check_positive_experience 
CHECK (experience_points >= 0);
```

### Referential Integrity

```sql
-- Ensure quest completion is done by authorized users
CREATE OR REPLACE FUNCTION validate_quest_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only quest author can mark as completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        IF NOT EXISTS (
            SELECT 1 FROM quests 
            WHERE id = NEW.id AND author_id = NEW.completed_by
        ) THEN
            RAISE EXCEPTION 'Only quest author can mark quest as completed';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_quest_completion
    BEFORE UPDATE ON quests
    FOR EACH ROW
    EXECUTE FUNCTION validate_quest_completion();
```

## Performance Optimization

### Partitioning Strategy

```sql
-- Partition transactions table by month for better performance
CREATE TABLE transactions_2024_01 PARTITION OF transactions
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE transactions_2024_02 PARTITION OF transactions
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Automatic partition creation function
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS void AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

### Query Optimization

```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_quests_assignee_status_due ON quests(assignee_id, status, due_date);
CREATE INDEX idx_wishes_user_category_status ON wishes(user_id, category, status);
CREATE INDEX idx_transactions_user_date_category ON transactions(from_user_id, created_at DESC, transaction_category);

-- Partial indexes for specific use cases
CREATE INDEX idx_active_quests ON quests(assignee_id, due_date) WHERE status = 'active';
CREATE INDEX idx_pending_shared_wishes ON wishes(shared_approved_by) WHERE is_shared = TRUE AND shared_approved_by IS NULL;
CREATE INDEX idx_recent_transactions ON transactions(created_at DESC) WHERE created_at > CURRENT_DATE - INTERVAL '7 days';
```

## Backup and Recovery

### Backup Strategy

```sql
-- Full database backup (daily)
pg_dump -h localhost -U postgres -d quest_economy > backup_$(date +%Y%m%d).sql

-- Incremental backup using WAL archiving
archive_command = 'cp %p /backup/wal_archive/%f'

-- Point-in-time recovery setup
restore_command = 'cp /backup/wal_archive/%f %p'
recovery_target_time = '2024-01-15 14:30:00'
```

### Data Retention Policies

```sql
-- Clean up old completed quests (older than 1 year)
DELETE FROM quests 
WHERE status = 'completed' 
AND completed_at < CURRENT_DATE - INTERVAL '1 year';

-- Archive old transactions (older than 2 years)
CREATE TABLE transactions_archive AS 
SELECT * FROM transactions 
WHERE created_at < CURRENT_DATE - INTERVAL '2 years';

DELETE FROM transactions 
WHERE created_at < CURRENT_DATE - INTERVAL '2 years';
```

## Monitoring and Maintenance

### Health Check Queries

```sql
-- Check for orphaned records
SELECT 'Orphaned quests' as issue, COUNT(*) as count
FROM quests q
LEFT JOIN users u1 ON q.author_id = u1.id
LEFT JOIN users u2 ON q.assignee_id = u2.id
WHERE u1.id IS NULL OR u2.id IS NULL;

-- Check quota consistency
SELECT 'Quota inconsistency' as issue, COUNT(*) as count
FROM users
WHERE daily_quota_used > 50 OR weekly_quota_used > 200 OR monthly_quota_used > 500;

-- Check experience consistency
SELECT 'Experience inconsistency' as issue, COUNT(*) as count
FROM users u
LEFT JOIN (
    SELECT from_user_id, SUM(experience_gained) as total_exp
    FROM transactions
    GROUP BY from_user_id
) t ON u.id = t.from_user_id
WHERE ABS(u.experience_points - COALESCE(t.total_exp, 0)) > 10;
```

### Performance Monitoring

```sql
-- Slow query monitoring
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;

-- Index usage statistics
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan < 100
ORDER BY idx_scan;

-- Table size monitoring
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;
```

This database schema provides a robust foundation for the Quest Economy System with proper indexing, constraints, and monitoring capabilities.