-- Seed Data: Quest Economy System
-- Version: 002
-- Description: Insert default ranks, wish categories, and economy settings

-- Insert default wish categories
INSERT INTO wish_categories (name, emoji, color) VALUES
    ('Общие', '📋', '#6B7280'),
    ('Романтика', '💕', '#EC4899'),
    ('Развлечения', '🎮', '#8B5CF6'),
    ('Еда', '🍽️', '#F59E0B'),
    ('Путешествия', '✈️', '#06B6D4'),
    ('Спорт', '⚽', '#10B981'),
    ('Дом', '🏠', '#F97316'),
    ('Работа', '💼', '#374151'),
    ('Здоровье', '🏥', '#EF4444'),
    ('Образование', '📚', '#3B82F6'),
    ('Хобби', '🎨', '#A855F7'),
    ('Семья', '👨‍👩‍👧‍👦', '#84CC16')
ON CONFLICT (name) DO NOTHING;

-- Insert military ranks (Russian military hierarchy)
INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES
    ('Рядовой', 0, 0, 0, 0, '🪖', '{}'),
    ('Ефрейтор', 100, 1, 2, 5, '🎖️', '{"can_create_medium_quests": true}'),
    ('Младший сержант', 300, 2, 5, 10, '🏅', '{"can_create_hard_quests": true, "bonus_experience": 0.1}'),
    ('Сержант', 600, 3, 8, 15, '🎗️', '{"can_create_epic_quests": true, "bonus_experience": 0.15}'),
    ('Старший сержант', 1000, 4, 12, 20, '🏆', '{"can_approve_shared_wishes": true, "bonus_experience": 0.2}'),
    ('Старшина', 1500, 5, 15, 25, '👑', '{"can_modify_economy": true, "bonus_experience": 0.25}'),
    ('Прапорщик', 2200, 6, 20, 35, '⭐', '{"can_create_special_events": true, "bonus_experience": 0.3}'),
    ('Старший прапорщик', 3000, 8, 25, 45, '🌟', '{"unlimited_daily_gifts": true, "bonus_experience": 0.35}'),
    ('Младший лейтенант', 4000, 10, 30, 60, '💫', '{"can_grant_bonuses": true, "bonus_experience": 0.4}'),
    ('Лейтенант', 5500, 12, 40, 80, '✨', '{"can_create_rank_quests": true, "bonus_experience": 0.5}')
ON CONFLICT (name) DO NOTHING;

-- Insert default economy settings
INSERT INTO economy_settings (setting_key, setting_value, description) VALUES
    ('daily_gift_base_limit', '5', 'Base daily gift limit for all users'),
    ('weekly_gift_base_limit', '20', 'Base weekly gift limit for all users'),
    ('monthly_gift_base_limit', '50', 'Base monthly gift limit for all users'),
    ('quest_experience_multiplier', '{"easy": 10, "medium": 25, "hard": 50, "epic": 100}', 'Experience points for completing quests by difficulty'),
    ('event_experience_base', '15', 'Base experience points for completing random events'),
    ('gift_experience_points', '2', 'Experience points gained when giving a gift'),
    ('exchange_rates', '{"green_to_blue": 10, "blue_to_red": 10}', 'Exchange rates between wish types'),
    ('max_active_quests_per_user', '10', 'Maximum number of active quests per user'),
    ('random_event_generation_interval', '{"min_hours": 2, "max_hours": 8}', 'Random interval for generating new events'),
    ('quest_expiration_notification_hours', '24', 'Hours before quest expiration to send notification')
ON CONFLICT (setting_key) DO NOTHING;

-- Update existing users to have default rank if they don't have one
UPDATE users SET rank = 'Рядовой' WHERE rank IS NULL OR rank = '';

-- Set default experience points for existing users based on their activity
UPDATE users SET experience_points = COALESCE(
    (SELECT COUNT(*) * 5 FROM wishes WHERE author_id = users.id AND status = 'completed'), 0
) WHERE experience_points = 0;