-- Quest and Event Templates Setup Script: Quest Economy System
-- Version: 005
-- Description: Create predefined quest templates and random event pool with Russian descriptions

-- Create table for quest templates
CREATE TABLE IF NOT EXISTS quest_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic')),
    reward_type VARCHAR(20) NOT NULL DEFAULT 'green',
    reward_amount INTEGER NOT NULL DEFAULT 1,
    experience_reward INTEGER DEFAULT 0,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create table for random event templates
CREATE TABLE IF NOT EXISTS event_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    reward_type VARCHAR(20) NOT NULL DEFAULT 'green',
    reward_amount INTEGER NOT NULL DEFAULT 1,
    experience_reward INTEGER DEFAULT 15,
    duration_hours INTEGER DEFAULT 24,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert quest templates with Russian descriptions
INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES
    -- Easy quests (10 exp)
    ('Утренний кофе', 'Приготовить утренний кофе для партнера', 'Еда', 'easy', 'green', 1, 10, ARRAY['утро', 'кофе', 'забота']),
    ('Комплимент дня', 'Сделать искренний комплимент партнеру', 'Романтика', 'easy', 'green', 1, 10, ARRAY['комплимент', 'романтика']),
    ('Уборка посуды', 'Помыть посуду после ужина', 'Дом', 'easy', 'green', 1, 10, ARRAY['уборка', 'помощь']),
    ('Массаж плеч', 'Сделать расслабляющий массаж плеч (5 минут)', 'Здоровье', 'easy', 'green', 1, 10, ARRAY['массаж', 'расслабление']),
    ('Выбор фильма', 'Выбрать интересный фильм для совместного просмотра', 'Развлечения', 'easy', 'green', 1, 10, ARRAY['фильм', 'выбор']),
    
    -- Medium quests (25 exp)
    ('Романтический ужин', 'Приготовить романтический ужин при свечах', 'Романтика', 'medium', 'blue', 1, 25, ARRAY['ужин', 'романтика', 'готовка']),
    ('Прогулка в парке', 'Организовать прогулку в парке на 1-2 часа', 'Спорт', 'medium', 'green', 2, 25, ARRAY['прогулка', 'природа']),
    ('Генеральная уборка', 'Сделать генеральную уборку в одной комнате', 'Дом', 'medium', 'blue', 1, 25, ARRAY['уборка', 'дом']),
    ('Покупка продуктов', 'Сходить в магазин и купить продукты по списку', 'Дом', 'medium', 'green', 2, 25, ARRAY['покупки', 'продукты']),
    ('Совместная тренировка', 'Провести совместную тренировку (30-45 минут)', 'Спорт', 'medium', 'blue', 1, 25, ARRAY['тренировка', 'спорт']),
    
    -- Hard quests (50 exp)
    ('Сюрприз-свидание', 'Организовать сюрприз-свидание в необычном месте', 'Романтика', 'hard', 'blue', 2, 50, ARRAY['свидание', 'сюрприз']),
    ('Мастер-класс', 'Записаться и посетить совместный мастер-класс', 'Образование', 'hard', 'red', 1, 50, ARRAY['обучение', 'мастер-класс']),
    ('Домашний проект', 'Завершить один домашний проект (ремонт, декор)', 'Дом', 'hard', 'blue', 2, 50, ARRAY['проект', 'ремонт']),
    ('Активный день', 'Организовать активный день: поход, велопрогулка, скалодром', 'Спорт', 'hard', 'red', 1, 50, ARRAY['активность', 'приключение']),
    ('Кулинарный эксперимент', 'Приготовить сложное блюдо новой кухни', 'Еда', 'hard', 'blue', 2, 50, ARRAY['готовка', 'эксперимент']),
    
    -- Epic quests (100 exp)
    ('Романтический уикенд', 'Организовать романтический уикенд в другом городе', 'Путешествия', 'epic', 'red', 2, 100, ARRAY['путешествие', 'романтика', 'уикенд']),
    ('Большой сюрприз', 'Подготовить большой сюрприз к важной дате', 'Романтика', 'epic', 'red', 3, 100, ARRAY['сюрприз', 'праздник']),
    ('Новое хобби', 'Освоить новое совместное хобби (месяц занятий)', 'Хобби', 'epic', 'red', 2, 100, ARRAY['хобби', 'обучение']),
    ('Домашняя трансформация', 'Полностью преобразить одну комнату в доме', 'Дом', 'epic', 'red', 3, 100, ARRAY['ремонт', 'дизайн']),
    ('Спортивный вызов', 'Подготовиться и участвовать в спортивном мероприятии', 'Спорт', 'epic', 'red', 2, 100, ARRAY['спорт', 'вызов', 'соревнование']);

-- Insert random event templates with Russian descriptions
INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES
    -- Romantic events
    ('Неожиданный поцелуй', 'Неожиданно поцеловать партнера в течение дня', 'Романтика', 'green', 1, 15, 12, ARRAY['поцелуй', 'романтика']),
    ('Записка с любовью', 'Оставить милую записку партнеру в неожиданном месте', 'Романтика', 'green', 1, 15, 8, ARRAY['записка', 'сюрприз']),
    ('Объятия без причины', 'Обнять партнера просто так, без особого повода', 'Романтика', 'green', 1, 15, 6, ARRAY['объятия', 'нежность']),
    
    -- Care events
    ('Принести чай/кофе', 'Принести партнеру любимый напиток без просьбы', 'Еда', 'green', 1, 15, 4, ARRAY['напиток', 'забота']),
    ('Помочь с делами', 'Предложить помощь с текущими делами партнера', 'Дом', 'green', 1, 15, 8, ARRAY['помощь', 'поддержка']),
    ('Сделать комплимент', 'Сделать неожиданный искренний комплимент', 'Романтика', 'green', 1, 15, 2, ARRAY['комплимент', 'похвала']),
    
    -- Fun events
    ('Включить любимую музыку', 'Включить любимую песню партнера и потанцевать', 'Развлечения', 'green', 1, 15, 3, ARRAY['музыка', 'танцы']),
    ('Рассказать анекдот', 'Рассказать смешную историю или анекдот', 'Развлечения', 'green', 1, 15, 1, ARRAY['юмор', 'смех']),
    ('Предложить игру', 'Предложить сыграть в настольную игру или видеоигру', 'Развлечения', 'green', 1, 15, 6, ARRAY['игра', 'развлечение']),
    
    -- Surprise events
    ('Маленький подарок', 'Подарить что-то маленькое, но приятное', 'Подарки', 'blue', 1, 20, 12, ARRAY['подарок', 'сюрприз']),
    ('Заказать доставку', 'Заказать любимую еду партнера на дом', 'Еда', 'blue', 1, 20, 8, ARRAY['еда', 'доставка']),
    ('Спонтанная прогулка', 'Предложить спонтанную прогулку в красивое место', 'Спорт', 'blue', 1, 20, 4, ARRAY['прогулка', 'спонтанность']),
    
    -- Wellness events
    ('Предложить массаж', 'Предложить расслабляющий массаж после тяжелого дня', 'Здоровье', 'green', 1, 15, 6, ARRAY['массаж', 'расслабление']),
    ('Приготовить ванну', 'Приготовить расслабляющую ванну с аромамаслами', 'Здоровье', 'blue', 1, 20, 8, ARRAY['ванна', 'релакс']),
    ('Здоровый перекус', 'Приготовить полезный и вкусный перекус', 'Здоровье', 'green', 1, 15, 4, ARRAY['еда', 'здоровье']),
    
    -- Communication events
    ('Задать интересный вопрос', 'Задать глубокий или интересный вопрос для разговора', 'Общие', 'green', 1, 15, 2, ARRAY['разговор', 'общение']),
    ('Поделиться планами', 'Поделиться планами на будущее или мечтами', 'Общие', 'green', 1, 15, 3, ARRAY['планы', 'мечты']),
    ('Выразить благодарность', 'Выразить благодарность за что-то конкретное', 'Общие', 'green', 1, 15, 1, ARRAY['благодарность', 'признательность']),
    
    -- Creative events
    ('Сделать фото вместе', 'Сделать красивое совместное фото или селфи', 'Творчество', 'green', 1, 15, 2, ARRAY['фото', 'память']),
    ('Написать стихотворение', 'Написать короткое стихотворение или четверостишие', 'Творчество', 'blue', 1, 20, 6, ARRAY['поэзия', 'творчество']),
    ('Нарисовать картинку', 'Нарисовать простую картинку или схему чувств', 'Творчество', 'green', 1, 15, 4, ARRAY['рисование', 'искусство']);

-- Create indexes for templates
CREATE INDEX IF NOT EXISTS idx_quest_templates_difficulty ON quest_templates(difficulty);
CREATE INDEX IF NOT EXISTS idx_quest_templates_category ON quest_templates(category);
CREATE INDEX IF NOT EXISTS idx_event_templates_category ON event_templates(category);
CREATE INDEX IF NOT EXISTS idx_event_templates_duration ON event_templates(duration_hours);

-- Log migration completion
INSERT INTO migrations (filename) VALUES ('005_quest_event_templates.sql')
ON CONFLICT (filename) DO NOTHING;