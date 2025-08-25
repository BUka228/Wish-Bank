-- Economy Settings Initialization Script: Quest Economy System
-- Version: 006
-- Description: Initialize comprehensive economy settings with Russian category names and balanced parameters

-- Clear existing economy settings and insert comprehensive configuration
DELETE FROM economy_settings;

-- Insert comprehensive economy settings
INSERT INTO economy_settings (setting_key, setting_value, description) VALUES
    -- Base quota limits
    ('daily_gift_base_limit', '5', 'Базовый дневной лимит подарков для всех пользователей'),
    ('weekly_gift_base_limit', '20', 'Базовый недельный лимит подарков для всех пользователей'),
    ('monthly_gift_base_limit', '50', 'Базовый месячный лимит подарков для всех пользователей'),
    
    -- Experience multipliers
    ('quest_experience_multiplier', '{"easy": 10, "medium": 25, "hard": 50, "epic": 100}', 'Очки опыта за выполнение квестов по сложности'),
    ('event_experience_base', '15', 'Базовые очки опыта за выполнение случайных событий'),
    ('gift_experience_points', '2', 'Очки опыта за дарение подарка'),
    ('wish_completion_experience', '{"green": 3, "blue": 8, "red": 15}', 'Очки опыта за выполнение желаний по типу'),
    
    -- Exchange rates
    ('exchange_rates', '{"green_to_blue": 10, "blue_to_red": 10}', 'Курсы обмена между типами желаний'),
    ('exchange_experience_bonus', '1', 'Бонусные очки опыта за обмен желаний'),
    
    -- Quest system limits
    ('max_active_quests_per_user', '10', 'Максимальное количество активных квестов на пользователя'),
    ('max_quests_per_day', '3', 'Максимальное количество квестов, которые можно создать за день'),
    ('quest_expiration_notification_hours', '24', 'За сколько часов до истечения квеста отправлять уведомление'),
    ('quest_auto_expire_days', '7', 'Через сколько дней автоматически истекают квесты без срока'),
    
    -- Random event system
    ('random_event_generation_interval', '{"min_hours": 2, "max_hours": 8}', 'Случайный интервал генерации новых событий'),
    ('max_active_events_per_user', '1', 'Максимальное количество активных событий на пользователя'),
    ('event_expiration_hours', '24', 'Через сколько часов истекают случайные события'),
    ('event_generation_probability', '0.3', 'Вероятность генерации события при проверке (0-1)'),
    
    -- Rank system bonuses
    ('rank_experience_bonus', '{"Ефрейтор": 0.05, "Младший сержант": 0.1, "Сержант": 0.15, "Старший сержант": 0.2, "Старшина": 0.25, "Прапорщик": 0.3, "Старший прапорщик": 0.35, "Младший лейтенант": 0.4, "Лейтенант": 0.5}', 'Бонусы к опыту по рангам'),
    ('rank_quest_difficulty_unlock', '{"medium": "Ефрейтор", "hard": "Младший сержант", "epic": "Сержант"}', 'Какие ранги открывают доступ к сложности квестов'),
    
    -- Shared wish system
    ('shared_wish_approval_timeout_hours', '72', 'Через сколько часов истекает запрос на подтверждение общего желания'),
    ('max_pending_shared_wishes', '5', 'Максимальное количество ожидающих подтверждения общих желаний'),
    
    -- Gift system
    ('gift_cooldown_minutes', '30', 'Минимальный интервал между подарками одному пользователю'),
    ('gift_streak_bonus', '{"3": 1, "7": 2, "14": 5, "30": 10}', 'Бонусные очки опыта за серии подарков (дни: бонус)'),
    ('max_gifts_per_transaction', '5', 'Максимальное количество желаний в одном подарке'),
    
    -- Economy balance
    ('inflation_rate_daily', '0.01', 'Дневная инфляция для балансировки экономики'),
    ('deflation_threshold', '1000', 'Порог общего количества желаний для включения дефляции'),
    ('economy_reset_threshold', '10000', 'Порог для сброса экономики (общее количество транзакций)'),
    
    -- Notification settings
    ('notification_quest_reminder_hours', '2', 'За сколько часов до истечения напоминать о квесте'),
    ('notification_event_reminder_minutes', '30', 'За сколько минут до истечения напоминать о событии'),
    ('notification_quota_warning_percent', '80', 'При каком проценте использования квоты предупреждать'),
    
    -- Achievement system (for future expansion)
    ('achievement_quest_milestones', '[10, 25, 50, 100, 250, 500]', 'Вехи достижений по количеству выполненных квестов'),
    ('achievement_experience_milestones', '[100, 500, 1000, 2500, 5000, 10000]', 'Вехи достижений по набранному опыту'),
    ('achievement_gift_milestones', '[50, 100, 250, 500, 1000]', 'Вехи достижений по количеству подаренных желаний'),
    
    -- Category-specific settings
    ('category_experience_multiplier', '{"Романтика": 1.2, "Путешествия": 1.5, "Спорт": 1.1, "Образование": 1.3}', 'Множители опыта для определенных категорий'),
    ('category_priority_boost', '{"Здоровье": 2, "Семья": 2, "Романтика": 1}', 'Повышение приоритета для определенных категорий'),
    
    -- Time-based bonuses
    ('weekend_experience_bonus', '1.2', 'Множитель опыта в выходные дни'),
    ('holiday_experience_bonus', '1.5', 'Множитель опыта в праздничные дни'),
    ('late_night_penalty', '0.9', 'Штраф к опыту за активность поздно ночью (23:00-06:00)'),
    
    -- Quality control
    ('min_quest_description_length', '10', 'Минимальная длина описания квеста'),
    ('max_quest_description_length', '500', 'Максимальная длина описания квеста'),
    ('min_wish_description_length', '3', 'Минимальная длина описания желания'),
    ('max_wish_description_length', '200', 'Максимальная длина описания желания'),
    
    -- Anti-abuse measures
    ('max_same_quest_per_week', '2', 'Максимальное количество одинаковых квестов в неделю'),
    ('min_time_between_completions_minutes', '5', 'Минимальное время между завершениями активностей'),
    ('suspicious_activity_threshold', '20', 'Порог подозрительной активности (действий в час)'),
    
    -- Seasonal adjustments
    ('seasonal_multipliers', '{"spring": 1.1, "summer": 1.2, "autumn": 1.0, "winter": 0.9}', 'Сезонные множители активности'),
    ('special_dates_bonus', '{"new_year": 2.0, "valentines": 1.8, "birthday": 1.5}', 'Бонусы в особые даты');

-- Create function to get economy setting with default value
CREATE OR REPLACE FUNCTION get_economy_setting(setting_name TEXT, default_value TEXT DEFAULT '0')
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT setting_value::TEXT INTO result 
    FROM economy_settings 
    WHERE setting_key = setting_name;
    
    RETURN COALESCE(result, default_value);
END;
$$ LANGUAGE plpgsql;

-- Create function to update economy setting
CREATE OR REPLACE FUNCTION update_economy_setting(setting_name TEXT, new_value TEXT, description_text TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO economy_settings (setting_key, setting_value, description, updated_at)
    VALUES (setting_name, new_value::JSONB, description_text, NOW())
    ON CONFLICT (setting_key) 
    DO UPDATE SET 
        setting_value = new_value::JSONB,
        description = COALESCE(description_text, economy_settings.description),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Log migration completion
INSERT INTO migrations (filename) VALUES ('006_economy_settings_init.sql')
ON CONFLICT (filename) DO NOTHING;