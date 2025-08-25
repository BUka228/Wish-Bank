-- Data Migration Script: Quest Economy System
-- Version: 003
-- Description: Migrate existing wish data to enhanced schema and initialize user data

-- Migrate existing wish data to enhanced schema
-- Update existing wishes to have default category if not set
UPDATE wishes 
SET category = 'general' 
WHERE category IS NULL OR category = '';

-- Set default priority for existing wishes
UPDATE wishes 
SET priority = 1 
WHERE priority IS NULL OR priority = 0;

-- Set default values for new boolean fields
UPDATE wishes 
SET is_shared = FALSE 
WHERE is_shared IS NULL;

UPDATE wishes 
SET is_gift = FALSE 
WHERE is_gift IS NULL;

UPDATE wishes 
SET is_historical = FALSE 
WHERE is_historical IS NULL;

-- Create default rank progression for existing users
-- Update users who don't have a rank set
UPDATE users 
SET rank = 'Рядовой' 
WHERE rank IS NULL OR rank = '';

-- Initialize experience points for existing users based on their activity
-- Give experience based on completed wishes (5 points per completed wish)
UPDATE users 
SET experience_points = COALESCE(
    (SELECT COUNT(*) * 5 
     FROM wishes 
     WHERE author_id = users.id AND status = 'completed'), 
    0
) + COALESCE(
    (SELECT COUNT(*) * 3 
     FROM wishes 
     WHERE assignee_id = users.id AND status = 'completed'), 
    0
)
WHERE experience_points = 0 OR experience_points IS NULL;

-- Initialize economy quotas for all users
UPDATE users 
SET daily_quota_used = 0,
    weekly_quota_used = 0,
    monthly_quota_used = 0,
    last_quota_reset = CURRENT_DATE
WHERE daily_quota_used IS NULL 
   OR weekly_quota_used IS NULL 
   OR monthly_quota_used IS NULL 
   OR last_quota_reset IS NULL;

-- Update transaction categories for existing transactions
UPDATE transactions 
SET transaction_category = 'manual',
    experience_gained = 0
WHERE transaction_category IS NULL 
   OR experience_gained IS NULL;

-- Categorize existing wishes based on keywords in description
-- Romance category
UPDATE wishes 
SET category = 'Романтика'
WHERE category = 'general' 
  AND (LOWER(description) LIKE '%романтик%' 
       OR LOWER(description) LIKE '%свидание%'
       OR LOWER(description) LIKE '%поцелу%'
       OR LOWER(description) LIKE '%объят%'
       OR LOWER(description) LIKE '%любов%'
       OR LOWER(description) LIKE '%цветы%'
       OR LOWER(description) LIKE '%подарок%');

-- Food category
UPDATE wishes 
SET category = 'Еда'
WHERE category = 'general' 
  AND (LOWER(description) LIKE '%еда%' 
       OR LOWER(description) LIKE '%готов%'
       OR LOWER(description) LIKE '%кух%'
       OR LOWER(description) LIKE '%ресторан%'
       OR LOWER(description) LIKE '%кафе%'
       OR LOWER(description) LIKE '%завтрак%'
       OR LOWER(description) LIKE '%обед%'
       OR LOWER(description) LIKE '%ужин%');

-- Entertainment category
UPDATE wishes 
SET category = 'Развлечения'
WHERE category = 'general' 
  AND (LOWER(description) LIKE '%кино%' 
       OR LOWER(description) LIKE '%фильм%'
       OR LOWER(description) LIKE '%игр%'
       OR LOWER(description) LIKE '%театр%'
       OR LOWER(description) LIKE '%концерт%'
       OR LOWER(description) LIKE '%развлеч%');

-- Travel category
UPDATE wishes 
SET category = 'Путешествия'
WHERE category = 'general' 
  AND (LOWER(description) LIKE '%путешеств%' 
       OR LOWER(description) LIKE '%поездк%'
       OR LOWER(description) LIKE '%отпуск%'
       OR LOWER(description) LIKE '%отдых%'
       OR LOWER(description) LIKE '%море%'
       OR LOWER(description) LIKE '%горы%');

-- Home category
UPDATE wishes 
SET category = 'Дом'
WHERE category = 'general' 
  AND (LOWER(description) LIKE '%дом%' 
       OR LOWER(description) LIKE '%уборк%'
       OR LOWER(description) LIKE '%ремонт%'
       OR LOWER(description) LIKE '%мебель%'
       OR LOWER(description) LIKE '%интерьер%');

-- Sports category
UPDATE wishes 
SET category = 'Спорт'
WHERE category = 'general' 
  AND (LOWER(description) LIKE '%спорт%' 
       OR LOWER(description) LIKE '%тренировк%'
       OR LOWER(description) LIKE '%фитнес%'
       OR LOWER(description) LIKE '%бег%'
       OR LOWER(description) LIKE '%зал%');

-- Update user ranks based on their experience points
UPDATE users 
SET rank = CASE 
    WHEN experience_points >= 5500 THEN 'Лейтенант'
    WHEN experience_points >= 4000 THEN 'Младший лейтенант'
    WHEN experience_points >= 3000 THEN 'Старший прапорщик'
    WHEN experience_points >= 2200 THEN 'Прапорщик'
    WHEN experience_points >= 1500 THEN 'Старшина'
    WHEN experience_points >= 1000 THEN 'Старший сержант'
    WHEN experience_points >= 600 THEN 'Сержант'
    WHEN experience_points >= 300 THEN 'Младший сержант'
    WHEN experience_points >= 100 THEN 'Ефрейтор'
    ELSE 'Рядовой'
END
WHERE experience_points > 0;

-- Create some sample historical shared wishes for existing users (if they have partners)
-- This will only work if there are exactly 2 users (a couple)
DO $$
DECLARE
    user_count INTEGER;
    user1_id UUID;
    user2_id UUID;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    
    -- Only create sample data if there are exactly 2 users
    IF user_count = 2 THEN
        SELECT id INTO user1_id FROM users ORDER BY created_at LIMIT 1;
        SELECT id INTO user2_id FROM users ORDER BY created_at DESC LIMIT 1;
        
        -- Create some sample historical shared wishes
        INSERT INTO wishes (type, description, author_id, assignee_id, category, is_shared, is_historical, status, created_at, completed_at, priority)
        VALUES 
            ('blue', 'Поездка в отпуск на море', user1_id, user2_id, 'Путешествия', true, true, 'completed', NOW() - INTERVAL '6 months', NOW() - INTERVAL '5 months', 3),
            ('red', 'Романтический ужин в ресторане', user2_id, user1_id, 'Романтика', true, true, 'completed', NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 months', 2),
            ('blue', 'Совместная тренировка в спортзале', user1_id, user2_id, 'Спорт', true, true, 'completed', NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 month', 1);
    END IF;
END $$;

-- Log migration completion
INSERT INTO migrations (filename) VALUES ('003_data_migration.sql')
ON CONFLICT (filename) DO NOTHING;