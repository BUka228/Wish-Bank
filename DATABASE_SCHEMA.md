# Database Schema Documentation

## Overview

This document describes the database schema for the Quest Economy System, which extends the original wish-based system with quests, random events, ranks, and an enhanced economy.

## Core Tables

### users
Extended user table with rank and economy tracking.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50),
  green_balance INTEGER DEFAULT 0,
  blue_balance INTEGER DEFAULT 0,
  red_balance INTEGER DEFAULT 0,
  rank VARCHAR(50) DEFAULT 'Рядовой',
  experience_points INTEGER DEFAULT 0,
  daily_quota_used INTEGER DEFAULT 0,
  weekly_quota_used INTEGER DEFAULT 0,
  monthly_quota_used INTEGER DEFAULT 0,
  last_quota_reset DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**New Fields:**
- `rank`: Current military rank (default: 'Рядовой')
- `experience_points`: Total experience points earned
- `daily_quota_used`: Gifts used today
- `weekly_quota_used`: Gifts used this week
- `monthly_quota_used`: Gifts used this month
- `last_quota_reset`: Last quota reset date

### wishes
Extended wish table with categories and sharing capabilities.

```sql
CREATE TABLE wishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(10) NOT NULL CHECK (type IN ('green', 'blue', 'red')),
  description TEXT NOT NULL,
  author_id UUID REFERENCES users(id),
  assignee_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  category VARCHAR(50) DEFAULT 'general',
  is_shared BOOLEAN DEFAULT FALSE,
  is_gift BOOLEAN DEFAULT FALSE,
  is_historical BOOLEAN DEFAULT FALSE,
  shared_approved_by UUID REFERENCES users(id),
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  metadata JSONB
);
```

**New Fields:**
- `category`: Wish category (references wish_categories)
- `is_shared`: Whether this is a shared wish between partners
- `is_gift`: Whether this wish was given as a gift
- `is_historical`: Whether this is a historical wish (added retroactively)
- `shared_approved_by`: User who approved the shared wish
- `priority`: Wish priority (1-5)

### transactions
Extended transaction table with categories and experience tracking.

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
  wish_type VARCHAR(10) NOT NULL CHECK (wish_type IN ('green', 'blue', 'red')),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  transaction_category VARCHAR(50) DEFAULT 'manual',
  experience_gained INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);
```

**New Fields:**
- `transaction_category`: Category of transaction (manual, quest, event, gift, etc.)
- `experience_gained`: Experience points gained from this transaction

## New Tables

### quests
Quest management system.

```sql
CREATE TABLE quests (
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
```

**Fields:**
- `title`: Quest title (max 200 chars)
- `description`: Detailed quest description
- `author_id`: User who created the quest
- `assignee_id`: User assigned to complete the quest
- `category`: Quest category
- `difficulty`: Quest difficulty (easy, medium, hard, epic)
- `reward_type`: Type of reward (green, blue, red)
- `reward_amount`: Amount of reward
- `experience_reward`: Experience points for completion
- `status`: Current quest status
- `due_date`: Optional deadline
- `metadata`: Additional quest data (JSON)

### random_events
Random event system for spontaneous activities.

```sql
CREATE TABLE random_events (
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
```

**Fields:**
- `user_id`: User who received the event
- `title`: Event title
- `description`: Event description
- `reward_type`: Type of reward
- `reward_amount`: Amount of reward
- `experience_reward`: Experience points for completion
- `status`: Event status
- `expires_at`: When the event expires
- `completed_by`: User who validated completion (must be partner)
- `metadata`: Additional event data

### wish_categories
Categorization system for wishes.

```sql
CREATE TABLE wish_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  emoji VARCHAR(10),
  color VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Default Categories:**
- Общие (📋, #6B7280)
- Романтика (💕, #EC4899)
- Развлечения (🎮, #8B5CF6)
- Еда (🍽️, #F59E0B)
- Путешествия (✈️, #06B6D4)
- Спорт (⚽, #10B981)
- Дом (🏠, #F97316)
- Работа (💼, #374151)
- Здоровье (🏥, #EF4444)
- Образование (📚, #3B82F6)
- Хобби (🎨, #A855F7)
- Семья (👨‍👩‍👧‍👦, #84CC16)

### ranks
Military rank progression system.

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
```

**Default Ranks:**
1. Рядовой (0 exp, 🪖)
2. Ефрейтор (100 exp, 🎖️)
3. Младший сержант (300 exp, 🏅)
4. Сержант (600 exp, 🎗️)
5. Старший сержант (1000 exp, 🏆)
6. Старшина (1500 exp, 👑)
7. Прапорщик (2200 exp, ⭐)
8. Старший прапорщик (3000 exp, 🌟)
9. Младший лейтенант (4000 exp, 💫)
10. Лейтенант (5500 exp, ✨)

### economy_settings
Configurable economy parameters.

```sql
CREATE TABLE economy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Default Settings:**
- `daily_gift_base_limit`: 5
- `weekly_gift_base_limit`: 20
- `monthly_gift_base_limit`: 50
- `quest_experience_multiplier`: {"easy": 10, "medium": 25, "hard": 50, "epic": 100}
- `event_experience_base`: 15
- `gift_experience_points`: 2
- `exchange_rates`: {"green_to_blue": 10, "blue_to_red": 10}
- `max_active_quests_per_user`: 10

### migrations
Migration tracking table.

```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT NOW()
);
```

## Indexes

### Performance Indexes
```sql
-- User indexes
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_rank ON users(rank);
CREATE INDEX idx_users_experience ON users(experience_points);
CREATE INDEX idx_users_quota_reset ON users(last_quota_reset);

-- Quest indexes
CREATE INDEX idx_quests_assignee_status ON quests(assignee_id, status);
CREATE INDEX idx_quests_author_status ON quests(author_id, status);
CREATE INDEX idx_quests_due_date ON quests(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_quests_category ON quests(category);

-- Event indexes
CREATE INDEX idx_events_user_status ON random_events(user_id, status);
CREATE INDEX idx_events_expires_at ON random_events(expires_at);
CREATE INDEX idx_events_completed_by ON random_events(completed_by) WHERE completed_by IS NOT NULL;

-- Wish indexes
CREATE INDEX idx_wishes_author ON wishes(author_id);
CREATE INDEX idx_wishes_assignee ON wishes(assignee_id);
CREATE INDEX idx_wishes_status ON wishes(status);
CREATE INDEX idx_wishes_category_status ON wishes(category, status);
CREATE INDEX idx_wishes_shared ON wishes(is_shared) WHERE is_shared = TRUE;
CREATE INDEX idx_wishes_priority ON wishes(priority);

-- Transaction indexes
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_transactions_category_date ON transactions(transaction_category, created_at);
CREATE INDEX idx_transactions_experience ON transactions(experience_gained) WHERE experience_gained > 0;

-- Rank indexes
CREATE INDEX idx_ranks_experience ON ranks(min_experience);
```

## Relationships

### Foreign Key Relationships
- `wishes.author_id` → `users.id`
- `wishes.assignee_id` → `users.id`
- `wishes.shared_approved_by` → `users.id`
- `quests.author_id` → `users.id`
- `quests.assignee_id` → `users.id`
- `random_events.user_id` → `users.id`
- `random_events.completed_by` → `users.id`
- `transactions.user_id` → `users.id`

### Business Logic Relationships
- Users have one current rank based on experience points
- Quests can only be completed by their assignee but validated by their author
- Random events can only be validated by the partner of the user who received them
- Shared wishes require approval from both partners
- Economy quotas are reset based on time periods and rank bonuses

## Data Integrity Rules

### Check Constraints
- `wishes.type` must be 'green', 'blue', or 'red'
- `wishes.status` must be 'active', 'completed', or 'cancelled'
- `quests.difficulty` must be 'easy', 'medium', 'hard', or 'epic'
- `quests.status` must be 'active', 'completed', 'expired', or 'cancelled'
- `random_events.status` must be 'active', 'completed', or 'expired'
- `transactions.type` must be 'credit' or 'debit'

### Business Rules
1. Only quest authors can mark quests as completed
2. Only partners can validate random event completion
3. Shared wishes require mutual approval
4. Users cannot exceed their quota limits
5. Experience points only increase (never decrease)
6. Ranks are automatically assigned based on experience thresholds

## Migration Strategy

The database schema is managed through versioned migration files:

1. **001_quest_economy_system.sql** - Core schema migration
2. **002_seed_data.sql** - Default data insertion

Migrations are tracked in the `migrations` table and are idempotent (safe to run multiple times).

## Backup and Recovery

### Critical Data
- User profiles and balances
- Completed wishes and quests
- Transaction history
- Rank progression data

### Recovery Strategy
1. Regular automated backups of all tables
2. Point-in-time recovery capability
3. Migration rollback procedures
4. Data validation scripts

## Performance Considerations

### Query Optimization
- Indexes on frequently queried columns
- Partitioning for large transaction tables
- Connection pooling for concurrent access
- Caching for frequently accessed reference data

### Scaling Strategy
- Read replicas for reporting queries
- Horizontal partitioning for user data
- Archive old completed data
- Monitor and optimize slow queries