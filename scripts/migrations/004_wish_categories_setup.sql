-- Wish Categories Setup Script: Quest Economy System
-- Version: 004
-- Description: Set up comprehensive wish categories with Russian names and proper styling

-- Clear existing categories and insert comprehensive list
DELETE FROM wish_categories;

-- Insert comprehensive wish categories with Russian names
INSERT INTO wish_categories (name, emoji, color) VALUES
    -- Basic categories
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
    ('Семья', '👨‍👩‍👧‍👦', '#84CC16'),
    
    -- Extended categories
    ('Подарки', '🎁', '#F472B6'),
    ('Красота', '💄', '#E879F9'),
    ('Технологии', '💻', '#64748B'),
    ('Музыка', '🎵', '#7C3AED'),
    ('Книги', '📖', '#2563EB'),
    ('Фильмы', '🎬', '#7C2D12'),
    ('Природа', '🌿', '#059669'),
    ('Животные', '🐕', '#92400E'),
    ('Творчество', '🎭', '#BE185D'),
    ('Мода', '👗', '#DB2777'),
    ('Автомобили', '🚗', '#1F2937'),
    ('Финансы', '💰', '#065F46'),
    ('Социальное', '👥', '#7C3AED'),
    ('Духовность', '🧘', '#6366F1'),
    ('Приключения', '🗺️', '#DC2626'),
    ('Комфорт', '🛋️', '#78716C'),
    ('Сюрпризы', '🎉', '#EA580C'),
    ('Традиции', '🕯️', '#92400E');

-- Update existing wishes to use new categories where appropriate
-- Keep existing categorization but ensure all categories exist

-- Log migration completion
INSERT INTO migrations (filename) VALUES ('004_wish_categories_setup.sql')
ON CONFLICT (filename) DO NOTHING;