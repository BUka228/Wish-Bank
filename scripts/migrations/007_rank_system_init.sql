-- Rank System Initialization Script: Quest Economy System
-- Version: 007
-- Description: Initialize comprehensive Russian military rank system with privileges and bonuses

-- Clear existing ranks and insert complete Russian military hierarchy
DELETE FROM ranks;

-- Insert comprehensive Russian military rank system
INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES
    -- Enlisted ranks (Рядовой состав)
    ('Рядовой', 0, 0, 0, 0, '🪖', '{"description": "Начальный ранг", "can_create_easy_quests": true}'),
    ('Ефрейтор', 100, 1, 2, 5, '🎖️', '{"description": "Опытный солдат", "can_create_medium_quests": true, "bonus_experience": 0.05}'),
    
    -- Non-commissioned officers (Сержантский состав)
    ('Младший сержант', 300, 2, 5, 10, '🏅', '{"description": "Младший командир", "can_create_hard_quests": true, "bonus_experience": 0.1, "can_approve_easy_shared_wishes": true}'),
    ('Сержант', 600, 3, 8, 15, '🎗️', '{"description": "Командир отделения", "can_create_epic_quests": true, "bonus_experience": 0.15, "can_approve_medium_shared_wishes": true}'),
    ('Старший сержант', 1000, 4, 12, 20, '🏆', '{"description": "Старший командир", "can_approve_shared_wishes": true, "bonus_experience": 0.2, "can_modify_quest_rewards": true}'),
    ('Старшина', 1500, 5, 15, 25, '👑', '{"description": "Главный сержант", "can_modify_economy": true, "bonus_experience": 0.25, "can_create_special_quests": true}'),
    
    -- Warrant officers (Прапорщики)
    ('Прапорщик', 2200, 6, 20, 35, '⭐', '{"description": "Технический специалист", "can_create_special_events": true, "bonus_experience": 0.3, "extended_quest_duration": true}'),
    ('Старший прапорщик', 3000, 8, 25, 45, '🌟', '{"description": "Старший специалист", "unlimited_daily_gifts": true, "bonus_experience": 0.35, "can_mentor_lower_ranks": true}'),
    
    -- Junior officers (Младшие офицеры)
    ('Младший лейтенант', 4000, 10, 30, 60, '💫', '{"description": "Младший офицер", "can_grant_bonuses": true, "bonus_experience": 0.4, "can_create_rank_quests": true}'),
    ('Лейтенант', 5500, 12, 40, 80, '✨', '{"description": "Офицер", "can_create_rank_quests": true, "bonus_experience": 0.5, "can_override_quotas": true}'),
    ('Старший лейтенант', 7500, 15, 50, 100, '🌠', '{"description": "Старший офицер", "advanced_quest_creation": true, "bonus_experience": 0.6, "can_create_epic_events": true}'),
    
    -- Senior officers (Старшие офицеры)
    ('Капитан', 10000, 18, 60, 120, '⚡', '{"description": "Командир роты", "company_command": true, "bonus_experience": 0.7, "can_modify_rank_requirements": true}'),
    ('Майор', 13000, 20, 70, 140, '🔥', '{"description": "Старший офицер", "battalion_privileges": true, "bonus_experience": 0.8, "can_create_legendary_quests": true}'),
    ('Подполковник', 17000, 25, 80, 160, '⚔️', '{"description": "Заместитель командира", "deputy_command": true, "bonus_experience": 0.9, "unlimited_quest_creation": true}'),
    ('Полковник', 22000, 30, 100, 200, '🛡️', '{"description": "Командир полка", "regiment_command": true, "bonus_experience": 1.0, "can_grant_special_privileges": true}'),
    
    -- General officers (Генералы)
    ('Генерал-майор', 30000, 40, 120, 250, '🎖️', '{"description": "Младший генерал", "general_privileges": true, "bonus_experience": 1.2, "can_modify_system_settings": true}'),
    ('Генерал-лейтенант', 40000, 50, 150, 300, '🏅', '{"description": "Генерал", "senior_general_privileges": true, "bonus_experience": 1.5, "unlimited_system_access": true}'),
    ('Генерал-полковник', 55000, 60, 180, 350, '🎗️', '{"description": "Старший генерал", "high_command": true, "bonus_experience": 2.0, "can_create_system_events": true}'),
    ('Генерал армии', 75000, 80, 200, 400, '🏆', '{"description": "Высший генерал", "army_command": true, "bonus_experience": 2.5, "ultimate_privileges": true}'),
    
    -- Marshal (Маршал)
    ('Маршал', 100000, 100, 250, 500, '👑', '{"description": "Высшее воинское звание", "marshal_privileges": true, "bonus_experience": 3.0, "god_mode": true}');

-- Create function to get user rank based on experience
CREATE OR REPLACE FUNCTION get_user_rank(user_experience INTEGER)
RETURNS TEXT AS $$
DECLARE
    user_rank TEXT;
BEGIN
    SELECT name INTO user_rank
    FROM ranks
    WHERE min_experience <= user_experience
    ORDER BY min_experience DESC
    LIMIT 1;
    
    RETURN COALESCE(user_rank, 'Рядовой');
END;
$$ LANGUAGE plpgsql;

-- Create function to get next rank info
CREATE OR REPLACE FUNCTION get_next_rank_info(current_experience INTEGER)
RETURNS TABLE(
    next_rank_name TEXT,
    experience_needed INTEGER,
    progress_percentage NUMERIC
) AS $$
DECLARE
    current_rank_exp INTEGER;
    next_rank_exp INTEGER;
    next_rank TEXT;
BEGIN
    -- Get current rank minimum experience
    SELECT min_experience INTO current_rank_exp
    FROM ranks
    WHERE min_experience <= current_experience
    ORDER BY min_experience DESC
    LIMIT 1;
    
    -- Get next rank info
    SELECT name, min_experience INTO next_rank, next_rank_exp
    FROM ranks
    WHERE min_experience > current_experience
    ORDER BY min_experience ASC
    LIMIT 1;
    
    -- If no next rank, return current as max
    IF next_rank IS NULL THEN
        SELECT name INTO next_rank
        FROM ranks
        ORDER BY min_experience DESC
        LIMIT 1;
        next_rank_exp := current_experience;
    END IF;
    
    RETURN QUERY SELECT 
        next_rank,
        GREATEST(0, next_rank_exp - current_experience),
        CASE 
            WHEN next_rank_exp = current_rank_exp THEN 100.0
            ELSE ROUND(((current_experience - current_rank_exp)::NUMERIC / (next_rank_exp - current_rank_exp)::NUMERIC) * 100, 2)
        END;
END;
$$ LANGUAGE plpgsql;

-- Create function to get rank privileges
CREATE OR REPLACE FUNCTION get_rank_privileges(rank_name TEXT)
RETURNS JSONB AS $$
DECLARE
    privileges JSONB;
BEGIN
    SELECT special_privileges INTO privileges
    FROM ranks
    WHERE name = rank_name;
    
    RETURN COALESCE(privileges, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Create function to check if user has specific privilege
CREATE OR REPLACE FUNCTION user_has_privilege(user_rank TEXT, privilege_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    privileges JSONB;
BEGIN
    SELECT special_privileges INTO privileges
    FROM ranks
    WHERE name = user_rank;
    
    RETURN COALESCE((privileges ->> privilege_name)::BOOLEAN, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Update all existing users to have correct ranks based on their experience
UPDATE users 
SET rank = get_user_rank(experience_points)
WHERE experience_points > 0;

-- Create view for user rank information
CREATE OR REPLACE VIEW user_rank_info AS
SELECT 
    u.id,
    u.name,
    u.experience_points,
    u.rank as current_rank,
    r.emoji as rank_emoji,
    r.daily_quota_bonus,
    r.weekly_quota_bonus,
    r.monthly_quota_bonus,
    r.special_privileges,
    (SELECT next_rank_name FROM get_next_rank_info(u.experience_points)) as next_rank,
    (SELECT experience_needed FROM get_next_rank_info(u.experience_points)) as experience_to_next_rank,
    (SELECT progress_percentage FROM get_next_rank_info(u.experience_points)) as rank_progress_percentage
FROM users u
LEFT JOIN ranks r ON u.rank = r.name;

-- Log migration completion
INSERT INTO migrations (filename) VALUES ('007_rank_system_init.sql')
ON CONFLICT (filename) DO NOTHING;