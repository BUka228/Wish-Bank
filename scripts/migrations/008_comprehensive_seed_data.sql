-- Generated Seed Data for Quest Economy System
-- This file contains comprehensive seed data with Russian descriptions
-- Generated on: 2025-08-25T06:39:24.991Z

-- Clear existing seed data
DELETE FROM quest_templates;
DELETE FROM event_templates;
DELETE FROM ranks;
DELETE FROM economy_settings;

-- Insert quest templates
INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Утренний кофе в постель',
  'Приготовить и принести утренний кофе партнеру прямо в постель',
  'Еда',
  'easy',
  'green',
  1,
  10,
  ARRAY['утро', 'кофе', 'забота', 'романтика']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Искренний комплимент',
  'Сделать неожиданный и искренний комплимент партнеру о его внешности или качествах',
  'Романтика',
  'easy',
  'green',
  1,
  10,
  ARRAY['комплимент', 'романтика', 'слова']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Помыть посуду',
  'Помыть всю посуду после ужина, не дожидаясь просьбы',
  'Дом',
  'easy',
  'green',
  1,
  10,
  ARRAY['уборка', 'помощь', 'дом']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Массаж плеч',
  'Сделать расслабляющий массаж плеч и шеи (5-10 минут)',
  'Здоровье',
  'easy',
  'green',
  1,
  10,
  ARRAY['массаж', 'расслабление', 'забота']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Выбрать фильм',
  'Найти и предложить интересный фильм для совместного просмотра',
  'Развлечения',
  'easy',
  'green',
  1,
  10,
  ARRAY['фильм', 'выбор', 'развлечения']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Обнять без причины',
  'Обнять партнера просто так, без особого повода',
  'Романтика',
  'easy',
  'green',
  1,
  10,
  ARRAY['объятия', 'нежность', 'спонтанность']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Принести чай',
  'Приготовить и принести любимый чай партнера',
  'Еда',
  'easy',
  'green',
  1,
  10,
  ARRAY['чай', 'забота', 'напиток']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Убрать в спальне',
  'Навести порядок в спальне: заправить кровать, убрать вещи',
  'Дом',
  'easy',
  'green',
  1,
  10,
  ARRAY['уборка', 'спальня', 'порядок']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Романтический ужин',
  'Приготовить романтический ужин при свечах с любимыми блюдами партнера',
  'Романтика',
  'medium',
  'blue',
  1,
  25,
  ARRAY['ужин', 'романтика', 'готовка', 'свечи']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Прогулка в парке',
  'Организовать прогулку в красивом парке или по набережной (1-2 часа)',
  'Спорт',
  'medium',
  'green',
  2,
  25,
  ARRAY['прогулка', 'природа', 'активность']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Генеральная уборка комнаты',
  'Сделать генеральную уборку в одной комнате: пропылесосить, протереть пыль, помыть полы',
  'Дом',
  'medium',
  'blue',
  1,
  25,
  ARRAY['уборка', 'дом', 'чистота']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Покупка продуктов',
  'Сходить в магазин и купить все продукты по списку, включая любимые лакомства партнера',
  'Дом',
  'medium',
  'green',
  2,
  25,
  ARRAY['покупки', 'продукты', 'забота']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Совместная тренировка',
  'Провести совместную тренировку дома или в спортзале (30-45 минут)',
  'Спорт',
  'medium',
  'blue',
  1,
  25,
  ARRAY['тренировка', 'спорт', 'здоровье']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Приготовить завтрак',
  'Приготовить вкусный и красивый завтрак для двоих',
  'Еда',
  'medium',
  'green',
  2,
  25,
  ARRAY['завтрак', 'готовка', 'утро']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Организовать игровой вечер',
  'Подготовить настольные игры или видеоигры для совместного времяпрепровождения',
  'Развлечения',
  'medium',
  'blue',
  1,
  25,
  ARRAY['игры', 'развлечения', 'вечер']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Массаж всего тела',
  'Сделать расслабляющий массаж всего тела с маслами (30-45 минут)',
  'Здоровье',
  'medium',
  'blue',
  1,
  25,
  ARRAY['массаж', 'расслабление', 'забота', 'масла']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Сюрприз-свидание',
  'Организовать сюрприз-свидание в необычном месте с продуманной программой',
  'Романтика',
  'hard',
  'blue',
  2,
  50,
  ARRAY['свидание', 'сюрприз', 'планирование']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Мастер-класс для двоих',
  'Найти и записаться на совместный мастер-класс (готовка, танцы, рукоделие)',
  'Образование',
  'hard',
  'red',
  1,
  50,
  ARRAY['обучение', 'мастер-класс', 'новый опыт']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Домашний проект',
  'Завершить один домашний проект: ремонт, декор, организация пространства',
  'Дом',
  'hard',
  'blue',
  2,
  50,
  ARRAY['проект', 'ремонт', 'улучшение']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Активный день на природе',
  'Организовать активный день: поход, велопрогулка, скалодром или другая активность',
  'Спорт',
  'hard',
  'red',
  1,
  50,
  ARRAY['активность', 'природа', 'приключение']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Кулинарный эксперимент',
  'Приготовить сложное блюдо новой кухни, которую раньше не пробовали',
  'Еда',
  'hard',
  'blue',
  2,
  50,
  ARRAY['готовка', 'эксперимент', 'новая кухня']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Фотосессия',
  'Организовать красивую фотосессию в интересном месте',
  'Творчество',
  'hard',
  'blue',
  2,
  50,
  ARRAY['фото', 'творчество', 'память']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Романтический уикенд',
  'Организовать романтический уикенд в другом городе с полной программой',
  'Путешествия',
  'epic',
  'red',
  2,
  100,
  ARRAY['путешествие', 'романтика', 'уикенд', 'планирование']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Большой сюрприз к празднику',
  'Подготовить грандиозный сюрприз к важной дате: день рождения, годовщина',
  'Романтика',
  'epic',
  'red',
  3,
  100,
  ARRAY['сюрприз', 'праздник', 'планирование']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Освоить новое хобби вместе',
  'Выбрать и освоить новое совместное хобби в течение месяца',
  'Хобби',
  'epic',
  'red',
  2,
  100,
  ARRAY['хобби', 'обучение', 'совместность']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Трансформация комнаты',
  'Полностью преобразить одну комнату: новый дизайн, мебель, декор',
  'Дом',
  'epic',
  'red',
  3,
  100,
  ARRAY['ремонт', 'дизайн', 'трансформация']
);

INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  'Спортивный вызов',
  'Подготовиться и участвовать в спортивном мероприятии: марафон, соревнование',
  'Спорт',
  'epic',
  'red',
  2,
  100,
  ARRAY['спорт', 'вызов', 'соревнование', 'подготовка']
);

-- Insert event templates
INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Неожиданный поцелуй',
  'Неожиданно поцеловать партнера в течение дня',
  'Романтика',
  'green',
  1,
  15,
  12,
  ARRAY['поцелуй', 'романтика', 'спонтанность']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Записка с любовью',
  'Оставить милую записку партнеру в неожиданном месте',
  'Романтика',
  'green',
  1,
  15,
  8,
  ARRAY['записка', 'сюрприз', 'слова любви']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Объятия без причины',
  'Обнять партнера просто так, без особого повода',
  'Романтика',
  'green',
  1,
  15,
  6,
  ARRAY['объятия', 'нежность', 'спонтанность']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Танец на кухне',
  'Включить музыку и потанцевать с партнером на кухне',
  'Романтика',
  'green',
  1,
  15,
  4,
  ARRAY['танцы', 'музыка', 'веселье']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Принести любимый напиток',
  'Принести партнеру его любимый напиток без просьбы',
  'Еда',
  'green',
  1,
  15,
  4,
  ARRAY['напиток', 'забота', 'внимание']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Помочь с делами',
  'Предложить помощь с текущими делами партнера',
  'Дом',
  'green',
  1,
  15,
  8,
  ARRAY['помощь', 'поддержка', 'дела']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Сделать неожиданный комплимент',
  'Сделать искренний комплимент о внешности или качествах',
  'Романтика',
  'green',
  1,
  15,
  2,
  ARRAY['комплимент', 'похвала', 'признание']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Подготовить ванну',
  'Приготовить расслабляющую ванну с пеной и аромамаслами',
  'Здоровье',
  'blue',
  1,
  20,
  6,
  ARRAY['ванна', 'релакс', 'забота']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Включить любимую музыку',
  'Включить любимую песню партнера и подпевать',
  'Развлечения',
  'green',
  1,
  15,
  3,
  ARRAY['музыка', 'веселье', 'настроение']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Рассказать смешную историю',
  'Рассказать забавную историю или анекдот, чтобы рассмешить',
  'Развлечения',
  'green',
  1,
  15,
  1,
  ARRAY['юмор', 'смех', 'история']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Предложить игру',
  'Предложить сыграть в настольную игру или видеоигру',
  'Развлечения',
  'green',
  1,
  15,
  6,
  ARRAY['игра', 'развлечение', 'совместность']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Устроить импровизированную фотосессию',
  'Сделать несколько красивых фото вместе',
  'Творчество',
  'green',
  1,
  15,
  2,
  ARRAY['фото', 'память', 'творчество']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Маленький подарок',
  'Подарить что-то маленькое, но приятное',
  'Подарки',
  'blue',
  1,
  20,
  12,
  ARRAY['подарок', 'сюрприз', 'внимание']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Заказать доставку еды',
  'Заказать любимую еду партнера на дом',
  'Еда',
  'blue',
  1,
  20,
  8,
  ARRAY['еда', 'доставка', 'сюрприз']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Спонтанная прогулка',
  'Предложить спонтанную прогулку в красивое место',
  'Спорт',
  'blue',
  1,
  20,
  4,
  ARRAY['прогулка', 'спонтанность', 'природа']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Цветы без повода',
  'Подарить цветы просто так, без особого повода',
  'Романтика',
  'blue',
  1,
  20,
  12,
  ARRAY['цветы', 'романтика', 'сюрприз']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Предложить массаж',
  'Предложить расслабляющий массаж после тяжелого дня',
  'Здоровье',
  'green',
  1,
  15,
  6,
  ARRAY['массаж', 'расслабление', 'забота']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Здоровый перекус',
  'Приготовить полезный и вкусный перекус',
  'Здоровье',
  'green',
  1,
  15,
  4,
  ARRAY['еда', 'здоровье', 'забота']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Медитация вместе',
  'Предложить совместную медитацию или дыхательные упражнения',
  'Здоровье',
  'green',
  1,
  15,
  8,
  ARRAY['медитация', 'релакс', 'совместность']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Задать интересный вопрос',
  'Задать глубокий или интересный вопрос для разговора',
  'Общие',
  'green',
  1,
  15,
  2,
  ARRAY['разговор', 'общение', 'вопросы']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Поделиться планами',
  'Поделиться планами на будущее или мечтами',
  'Общие',
  'green',
  1,
  15,
  3,
  ARRAY['планы', 'мечты', 'будущее']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Выразить благодарность',
  'Выразить благодарность за что-то конкретное',
  'Общие',
  'green',
  1,
  15,
  1,
  ARRAY['благодарность', 'признательность', 'слова']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Рассказать о своем дне',
  'Подробно рассказать о своем дне и выслушать партнера',
  'Общие',
  'green',
  1,
  15,
  2,
  ARRAY['разговор', 'день', 'общение']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Написать короткое стихотворение',
  'Написать короткое стихотворение или четверостишие',
  'Творчество',
  'blue',
  1,
  20,
  6,
  ARRAY['поэзия', 'творчество', 'слова']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Нарисовать картинку',
  'Нарисовать простую картинку или схему чувств',
  'Творчество',
  'green',
  1,
  15,
  4,
  ARRAY['рисование', 'искусство', 'творчество']
);

INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  'Спеть песню',
  'Спеть любимую песню партнера или придумать свою',
  'Творчество',
  'green',
  1,
  15,
  3,
  ARRAY['пение', 'музыка', 'творчество']
);

-- Insert ranks
INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Рядовой',
  0,
  0,
  0,
  0,
  '🪖',
  '{"description":"Начальный ранг новобранца","can_create_easy_quests":true,"max_quest_reward":1}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Ефрейтор',
  100,
  1,
  2,
  5,
  '🎖️',
  '{"description":"Опытный солдат","can_create_medium_quests":true,"bonus_experience":0.05,"max_quest_reward":2}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Младший сержант',
  300,
  2,
  5,
  10,
  '🏅',
  '{"description":"Младший командир отделения","can_create_hard_quests":true,"bonus_experience":0.1,"can_approve_easy_shared_wishes":true,"max_quest_reward":3}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Сержант',
  600,
  3,
  8,
  15,
  '🎗️',
  '{"description":"Командир отделения","can_create_epic_quests":true,"bonus_experience":0.15,"can_approve_medium_shared_wishes":true,"max_quest_reward":4}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Старший сержант',
  1000,
  4,
  12,
  20,
  '🏆',
  '{"description":"Старший командир","can_approve_shared_wishes":true,"bonus_experience":0.2,"can_modify_quest_rewards":true,"max_quest_reward":5}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Старшина',
  1500,
  5,
  15,
  25,
  '👑',
  '{"description":"Главный сержант подразделения","can_modify_economy":true,"bonus_experience":0.25,"can_create_special_quests":true,"unlimited_easy_gifts":true}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Прапорщик',
  2200,
  6,
  20,
  35,
  '⭐',
  '{"description":"Технический специалист","can_create_special_events":true,"bonus_experience":0.3,"extended_quest_duration":true,"can_gift_blue_wishes":true}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Старший прапорщик',
  3000,
  8,
  25,
  45,
  '🌟',
  '{"description":"Старший технический специалист","unlimited_daily_gifts":true,"bonus_experience":0.35,"can_mentor_lower_ranks":true,"can_create_custom_categories":true}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Младший лейтенант',
  4000,
  10,
  30,
  60,
  '💫',
  '{"description":"Младший офицер","can_grant_bonuses":true,"bonus_experience":0.4,"can_create_rank_quests":true,"can_gift_red_wishes":true}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Лейтенант',
  5500,
  12,
  40,
  80,
  '✨',
  '{"description":"Офицер взвода","can_create_rank_quests":true,"bonus_experience":0.5,"can_override_quotas":true,"unlimited_medium_gifts":true}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Старший лейтенант',
  7500,
  15,
  50,
  100,
  '🌠',
  '{"description":"Старший офицер взвода","advanced_quest_creation":true,"bonus_experience":0.6,"can_create_epic_events":true,"can_modify_user_ranks":true}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Капитан',
  10000,
  18,
  60,
  120,
  '⚡',
  '{"description":"Командир роты","company_command":true,"bonus_experience":0.7,"can_modify_rank_requirements":true,"unlimited_quest_creation":true}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Майор',
  13000,
  20,
  70,
  140,
  '🔥',
  '{"description":"Старший офицер батальона","battalion_privileges":true,"bonus_experience":0.8,"can_create_legendary_quests":true,"can_grant_special_rewards":true}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Подполковник',
  17000,
  25,
  80,
  160,
  '⚔️',
  '{"description":"Заместитель командира полка","deputy_command":true,"bonus_experience":0.9,"unlimited_quest_creation":true,"can_modify_economy_settings":true}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Полковник',
  22000,
  30,
  100,
  200,
  '🛡️',
  '{"description":"Командир полка","regiment_command":true,"bonus_experience":1,"can_grant_special_privileges":true,"unlimited_all_gifts":true}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Генерал-майор',
  30000,
  40,
  120,
  250,
  '🎖️',
  '{"description":"Младший генерал","general_privileges":true,"bonus_experience":1.2,"can_modify_system_settings":true,"god_mode_quests":true}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Генерал-лейтенант',
  40000,
  50,
  150,
  300,
  '🏅',
  '{"description":"Генерал армии","senior_general_privileges":true,"bonus_experience":1.5,"unlimited_system_access":true,"can_create_new_features":true}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Генерал-полковник',
  55000,
  60,
  180,
  350,
  '🎗️',
  '{"description":"Старший генерал","high_command":true,"bonus_experience":2,"can_create_system_events":true,"ultimate_quest_power":true}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Генерал армии',
  75000,
  80,
  200,
  400,
  '🏆',
  '{"description":"Высший генерал","army_command":true,"bonus_experience":2.5,"ultimate_privileges":true,"can_rewrite_reality":true}'::JSONB
);

INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  'Маршал',
  100000,
  100,
  250,
  500,
  '👑',
  '{"description":"Высшее воинское звание","marshal_privileges":true,"bonus_experience":3,"god_mode":true,"infinite_power":true}'::JSONB
);

-- Insert economy settings
INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'daily_gift_base_limit',
  '5'::JSONB,
  'Базовый дневной лимит подарков для всех пользователей'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'weekly_gift_base_limit',
  '20'::JSONB,
  'Базовый недельный лимит подарков для всех пользователей'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'monthly_gift_base_limit',
  '50'::JSONB,
  'Базовый месячный лимит подарков для всех пользователей'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'quest_experience_multiplier',
  '{"easy":10,"medium":25,"hard":50,"epic":100}'::JSONB,
  'Очки опыта за выполнение квестов по сложности'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'event_experience_base',
  '15'::JSONB,
  'Базовые очки опыта за выполнение случайных событий'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'gift_experience_points',
  '2'::JSONB,
  'Очки опыта за дарение подарка'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'wish_completion_experience',
  '{"green":3,"blue":8,"red":15}'::JSONB,
  'Очки опыта за выполнение желаний по типу'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'exchange_rates',
  '{"green_to_blue":10,"blue_to_red":10}'::JSONB,
  'Курсы обмена между типами желаний'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'exchange_experience_bonus',
  '1'::JSONB,
  'Бонусные очки опыта за обмен желаний'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'max_active_quests_per_user',
  '10'::JSONB,
  'Максимальное количество активных квестов на пользователя'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'max_quests_per_day',
  '3'::JSONB,
  'Максимальное количество квестов, которые можно создать за день'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'quest_expiration_notification_hours',
  '24'::JSONB,
  'За сколько часов до истечения квеста отправлять уведомление'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'quest_auto_expire_days',
  '7'::JSONB,
  'Через сколько дней автоматически истекают квесты без срока'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'random_event_generation_interval',
  '{"min_hours":2,"max_hours":8}'::JSONB,
  'Случайный интервал генерации новых событий'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'max_active_events_per_user',
  '1'::JSONB,
  'Максимальное количество активных событий на пользователя'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'event_expiration_hours',
  '24'::JSONB,
  'Через сколько часов истекают случайные события'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'event_generation_probability',
  '0.3'::JSONB,
  'Вероятность генерации события при проверке (0-1)'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'weekend_experience_bonus',
  '1.2'::JSONB,
  'Множитель опыта в выходные дни'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'holiday_experience_bonus',
  '1.5'::JSONB,
  'Множитель опыта в праздничные дни'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'category_experience_multiplier',
  '{"Романтика":1.2,"Путешествия":1.5,"Спорт":1.1,"Образование":1.3}'::JSONB,
  'Множители опыта для определенных категорий'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'min_quest_description_length',
  '10'::JSONB,
  'Минимальная длина описания квеста'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'max_quest_description_length',
  '500'::JSONB,
  'Максимальная длина описания квеста'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'min_wish_description_length',
  '3'::JSONB,
  'Минимальная длина описания желания'
);

INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  'max_wish_description_length',
  '200'::JSONB,
  'Максимальная длина описания желания'
);

-- Log seed data completion
INSERT INTO migrations (filename) VALUES ('seed_data_generated.sql')
ON CONFLICT (filename) DO NOTHING;
