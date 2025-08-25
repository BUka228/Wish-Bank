#!/usr/bin/env node

/**
 * Seed Data Generator for Quest Economy System
 * Creates comprehensive seed data with Russian descriptions and balanced parameters
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate comprehensive quest templates with Russian descriptions
 */
function generateQuestTemplates() {
  return [
    // Easy quests (10 exp) - Daily care and simple tasks
    {
      title: 'Утренний кофе в постель',
      description: 'Приготовить и принести утренний кофе партнеру прямо в постель',
      category: 'Еда',
      difficulty: 'easy',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 10,
      tags: ['утро', 'кофе', 'забота', 'романтика']
    },
    {
      title: 'Искренний комплимент',
      description: 'Сделать неожиданный и искренний комплимент партнеру о его внешности или качествах',
      category: 'Романтика',
      difficulty: 'easy',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 10,
      tags: ['комплимент', 'романтика', 'слова']
    },
    {
      title: 'Помыть посуду',
      description: 'Помыть всю посуду после ужина, не дожидаясь просьбы',
      category: 'Дом',
      difficulty: 'easy',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 10,
      tags: ['уборка', 'помощь', 'дом']
    },
    {
      title: 'Массаж плеч',
      description: 'Сделать расслабляющий массаж плеч и шеи (5-10 минут)',
      category: 'Здоровье',
      difficulty: 'easy',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 10,
      tags: ['массаж', 'расслабление', 'забота']
    },
    {
      title: 'Выбрать фильм',
      description: 'Найти и предложить интересный фильм для совместного просмотра',
      category: 'Развлечения',
      difficulty: 'easy',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 10,
      tags: ['фильм', 'выбор', 'развлечения']
    },
    {
      title: 'Обнять без причины',
      description: 'Обнять партнера просто так, без особого повода',
      category: 'Романтика',
      difficulty: 'easy',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 10,
      tags: ['объятия', 'нежность', 'спонтанность']
    },
    {
      title: 'Принести чай',
      description: 'Приготовить и принести любимый чай партнера',
      category: 'Еда',
      difficulty: 'easy',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 10,
      tags: ['чай', 'забота', 'напиток']
    },
    {
      title: 'Убрать в спальне',
      description: 'Навести порядок в спальне: заправить кровать, убрать вещи',
      category: 'Дом',
      difficulty: 'easy',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 10,
      tags: ['уборка', 'спальня', 'порядок']
    },

    // Medium quests (25 exp) - More involved activities
    {
      title: 'Романтический ужин',
      description: 'Приготовить романтический ужин при свечах с любимыми блюдами партнера',
      category: 'Романтика',
      difficulty: 'medium',
      reward_type: 'blue',
      reward_amount: 1,
      experience_reward: 25,
      tags: ['ужин', 'романтика', 'готовка', 'свечи']
    },
    {
      title: 'Прогулка в парке',
      description: 'Организовать прогулку в красивом парке или по набережной (1-2 часа)',
      category: 'Спорт',
      difficulty: 'medium',
      reward_type: 'green',
      reward_amount: 2,
      experience_reward: 25,
      tags: ['прогулка', 'природа', 'активность']
    },
    {
      title: 'Генеральная уборка комнаты',
      description: 'Сделать генеральную уборку в одной комнате: пропылесосить, протереть пыль, помыть полы',
      category: 'Дом',
      difficulty: 'medium',
      reward_type: 'blue',
      reward_amount: 1,
      experience_reward: 25,
      tags: ['уборка', 'дом', 'чистота']
    },
    {
      title: 'Покупка продуктов',
      description: 'Сходить в магазин и купить все продукты по списку, включая любимые лакомства партнера',
      category: 'Дом',
      difficulty: 'medium',
      reward_type: 'green',
      reward_amount: 2,
      experience_reward: 25,
      tags: ['покупки', 'продукты', 'забота']
    },
    {
      title: 'Совместная тренировка',
      description: 'Провести совместную тренировку дома или в спортзале (30-45 минут)',
      category: 'Спорт',
      difficulty: 'medium',
      reward_type: 'blue',
      reward_amount: 1,
      experience_reward: 25,
      tags: ['тренировка', 'спорт', 'здоровье']
    },
    {
      title: 'Приготовить завтрак',
      description: 'Приготовить вкусный и красивый завтрак для двоих',
      category: 'Еда',
      difficulty: 'medium',
      reward_type: 'green',
      reward_amount: 2,
      experience_reward: 25,
      tags: ['завтрак', 'готовка', 'утро']
    },
    {
      title: 'Организовать игровой вечер',
      description: 'Подготовить настольные игры или видеоигры для совместного времяпрепровождения',
      category: 'Развлечения',
      difficulty: 'medium',
      reward_type: 'blue',
      reward_amount: 1,
      experience_reward: 25,
      tags: ['игры', 'развлечения', 'вечер']
    },
    {
      title: 'Массаж всего тела',
      description: 'Сделать расслабляющий массаж всего тела с маслами (30-45 минут)',
      category: 'Здоровье',
      difficulty: 'medium',
      reward_type: 'blue',
      reward_amount: 1,
      experience_reward: 25,
      tags: ['массаж', 'расслабление', 'забота', 'масла']
    },

    // Hard quests (50 exp) - Special occasions and projects
    {
      title: 'Сюрприз-свидание',
      description: 'Организовать сюрприз-свидание в необычном месте с продуманной программой',
      category: 'Романтика',
      difficulty: 'hard',
      reward_type: 'blue',
      reward_amount: 2,
      experience_reward: 50,
      tags: ['свидание', 'сюрприз', 'планирование']
    },
    {
      title: 'Мастер-класс для двоих',
      description: 'Найти и записаться на совместный мастер-класс (готовка, танцы, рукоделие)',
      category: 'Образование',
      difficulty: 'hard',
      reward_type: 'red',
      reward_amount: 1,
      experience_reward: 50,
      tags: ['обучение', 'мастер-класс', 'новый опыт']
    },
    {
      title: 'Домашний проект',
      description: 'Завершить один домашний проект: ремонт, декор, организация пространства',
      category: 'Дом',
      difficulty: 'hard',
      reward_type: 'blue',
      reward_amount: 2,
      experience_reward: 50,
      tags: ['проект', 'ремонт', 'улучшение']
    },
    {
      title: 'Активный день на природе',
      description: 'Организовать активный день: поход, велопрогулка, скалодром или другая активность',
      category: 'Спорт',
      difficulty: 'hard',
      reward_type: 'red',
      reward_amount: 1,
      experience_reward: 50,
      tags: ['активность', 'природа', 'приключение']
    },
    {
      title: 'Кулинарный эксперимент',
      description: 'Приготовить сложное блюдо новой кухни, которую раньше не пробовали',
      category: 'Еда',
      difficulty: 'hard',
      reward_type: 'blue',
      reward_amount: 2,
      experience_reward: 50,
      tags: ['готовка', 'эксперимент', 'новая кухня']
    },
    {
      title: 'Фотосессия',
      description: 'Организовать красивую фотосессию в интересном месте',
      category: 'Творчество',
      difficulty: 'hard',
      reward_type: 'blue',
      reward_amount: 2,
      experience_reward: 50,
      tags: ['фото', 'творчество', 'память']
    },

    // Epic quests (100 exp) - Major undertakings
    {
      title: 'Романтический уикенд',
      description: 'Организовать романтический уикенд в другом городе с полной программой',
      category: 'Путешествия',
      difficulty: 'epic',
      reward_type: 'red',
      reward_amount: 2,
      experience_reward: 100,
      tags: ['путешествие', 'романтика', 'уикенд', 'планирование']
    },
    {
      title: 'Большой сюрприз к празднику',
      description: 'Подготовить грандиозный сюрприз к важной дате: день рождения, годовщина',
      category: 'Романтика',
      difficulty: 'epic',
      reward_type: 'red',
      reward_amount: 3,
      experience_reward: 100,
      tags: ['сюрприз', 'праздник', 'планирование']
    },
    {
      title: 'Освоить новое хобби вместе',
      description: 'Выбрать и освоить новое совместное хобби в течение месяца',
      category: 'Хобби',
      difficulty: 'epic',
      reward_type: 'red',
      reward_amount: 2,
      experience_reward: 100,
      tags: ['хобби', 'обучение', 'совместность']
    },
    {
      title: 'Трансформация комнаты',
      description: 'Полностью преобразить одну комнату: новый дизайн, мебель, декор',
      category: 'Дом',
      difficulty: 'epic',
      reward_type: 'red',
      reward_amount: 3,
      experience_reward: 100,
      tags: ['ремонт', 'дизайн', 'трансформация']
    },
    {
      title: 'Спортивный вызов',
      description: 'Подготовиться и участвовать в спортивном мероприятии: марафон, соревнование',
      category: 'Спорт',
      difficulty: 'epic',
      reward_type: 'red',
      reward_amount: 2,
      experience_reward: 100,
      tags: ['спорт', 'вызов', 'соревнование', 'подготовка']
    }
  ];
}

/**
 * Generate random event templates with Russian descriptions
 */
function generateEventTemplates() {
  return [
    // Romantic events
    {
      title: 'Неожиданный поцелуй',
      description: 'Неожиданно поцеловать партнера в течение дня',
      category: 'Романтика',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 12,
      tags: ['поцелуй', 'романтика', 'спонтанность']
    },
    {
      title: 'Записка с любовью',
      description: 'Оставить милую записку партнеру в неожиданном месте',
      category: 'Романтика',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 8,
      tags: ['записка', 'сюрприз', 'слова любви']
    },
    {
      title: 'Объятия без причины',
      description: 'Обнять партнера просто так, без особого повода',
      category: 'Романтика',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 6,
      tags: ['объятия', 'нежность', 'спонтанность']
    },
    {
      title: 'Танец на кухне',
      description: 'Включить музыку и потанцевать с партнером на кухне',
      category: 'Романтика',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 4,
      tags: ['танцы', 'музыка', 'веселье']
    },

    // Care events
    {
      title: 'Принести любимый напиток',
      description: 'Принести партнеру его любимый напиток без просьбы',
      category: 'Еда',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 4,
      tags: ['напиток', 'забота', 'внимание']
    },
    {
      title: 'Помочь с делами',
      description: 'Предложить помощь с текущими делами партнера',
      category: 'Дом',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 8,
      tags: ['помощь', 'поддержка', 'дела']
    },
    {
      title: 'Сделать неожиданный комплимент',
      description: 'Сделать искренний комплимент о внешности или качествах',
      category: 'Романтика',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 2,
      tags: ['комплимент', 'похвала', 'признание']
    },
    {
      title: 'Подготовить ванну',
      description: 'Приготовить расслабляющую ванну с пеной и аромамаслами',
      category: 'Здоровье',
      reward_type: 'blue',
      reward_amount: 1,
      experience_reward: 20,
      duration_hours: 6,
      tags: ['ванна', 'релакс', 'забота']
    },

    // Fun events
    {
      title: 'Включить любимую музыку',
      description: 'Включить любимую песню партнера и подпевать',
      category: 'Развлечения',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 3,
      tags: ['музыка', 'веселье', 'настроение']
    },
    {
      title: 'Рассказать смешную историю',
      description: 'Рассказать забавную историю или анекдот, чтобы рассмешить',
      category: 'Развлечения',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 1,
      tags: ['юмор', 'смех', 'история']
    },
    {
      title: 'Предложить игру',
      description: 'Предложить сыграть в настольную игру или видеоигру',
      category: 'Развлечения',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 6,
      tags: ['игра', 'развлечение', 'совместность']
    },
    {
      title: 'Устроить импровизированную фотосессию',
      description: 'Сделать несколько красивых фото вместе',
      category: 'Творчество',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 2,
      tags: ['фото', 'память', 'творчество']
    },

    // Surprise events
    {
      title: 'Маленький подарок',
      description: 'Подарить что-то маленькое, но приятное',
      category: 'Подарки',
      reward_type: 'blue',
      reward_amount: 1,
      experience_reward: 20,
      duration_hours: 12,
      tags: ['подарок', 'сюрприз', 'внимание']
    },
    {
      title: 'Заказать доставку еды',
      description: 'Заказать любимую еду партнера на дом',
      category: 'Еда',
      reward_type: 'blue',
      reward_amount: 1,
      experience_reward: 20,
      duration_hours: 8,
      tags: ['еда', 'доставка', 'сюрприз']
    },
    {
      title: 'Спонтанная прогулка',
      description: 'Предложить спонтанную прогулку в красивое место',
      category: 'Спорт',
      reward_type: 'blue',
      reward_amount: 1,
      experience_reward: 20,
      duration_hours: 4,
      tags: ['прогулка', 'спонтанность', 'природа']
    },
    {
      title: 'Цветы без повода',
      description: 'Подарить цветы просто так, без особого повода',
      category: 'Романтика',
      reward_type: 'blue',
      reward_amount: 1,
      experience_reward: 20,
      duration_hours: 12,
      tags: ['цветы', 'романтика', 'сюрприз']
    },

    // Wellness events
    {
      title: 'Предложить массаж',
      description: 'Предложить расслабляющий массаж после тяжелого дня',
      category: 'Здоровье',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 6,
      tags: ['массаж', 'расслабление', 'забота']
    },
    {
      title: 'Здоровый перекус',
      description: 'Приготовить полезный и вкусный перекус',
      category: 'Здоровье',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 4,
      tags: ['еда', 'здоровье', 'забота']
    },
    {
      title: 'Медитация вместе',
      description: 'Предложить совместную медитацию или дыхательные упражнения',
      category: 'Здоровье',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 8,
      tags: ['медитация', 'релакс', 'совместность']
    },

    // Communication events
    {
      title: 'Задать интересный вопрос',
      description: 'Задать глубокий или интересный вопрос для разговора',
      category: 'Общие',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 2,
      tags: ['разговор', 'общение', 'вопросы']
    },
    {
      title: 'Поделиться планами',
      description: 'Поделиться планами на будущее или мечтами',
      category: 'Общие',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 3,
      tags: ['планы', 'мечты', 'будущее']
    },
    {
      title: 'Выразить благодарность',
      description: 'Выразить благодарность за что-то конкретное',
      category: 'Общие',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 1,
      tags: ['благодарность', 'признательность', 'слова']
    },
    {
      title: 'Рассказать о своем дне',
      description: 'Подробно рассказать о своем дне и выслушать партнера',
      category: 'Общие',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 2,
      tags: ['разговор', 'день', 'общение']
    },

    // Creative events
    {
      title: 'Написать короткое стихотворение',
      description: 'Написать короткое стихотворение или четверостишие',
      category: 'Творчество',
      reward_type: 'blue',
      reward_amount: 1,
      experience_reward: 20,
      duration_hours: 6,
      tags: ['поэзия', 'творчество', 'слова']
    },
    {
      title: 'Нарисовать картинку',
      description: 'Нарисовать простую картинку или схему чувств',
      category: 'Творчество',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 4,
      tags: ['рисование', 'искусство', 'творчество']
    },
    {
      title: 'Спеть песню',
      description: 'Спеть любимую песню партнера или придумать свою',
      category: 'Творчество',
      reward_type: 'green',
      reward_amount: 1,
      experience_reward: 15,
      duration_hours: 3,
      tags: ['пение', 'музыка', 'творчество']
    }
  ];
}

/**
 * Generate comprehensive rank system with Russian military hierarchy
 */
function generateRankSystem() {
  return [
    // Enlisted ranks (Рядовой состав)
    {
      name: 'Рядовой',
      min_experience: 0,
      daily_quota_bonus: 0,
      weekly_quota_bonus: 0,
      monthly_quota_bonus: 0,
      emoji: '🪖',
      special_privileges: {
        description: 'Начальный ранг новобранца',
        can_create_easy_quests: true,
        max_quest_reward: 1
      }
    },
    {
      name: 'Ефрейтор',
      min_experience: 100,
      daily_quota_bonus: 1,
      weekly_quota_bonus: 2,
      monthly_quota_bonus: 5,
      emoji: '🎖️',
      special_privileges: {
        description: 'Опытный солдат',
        can_create_medium_quests: true,
        bonus_experience: 0.05,
        max_quest_reward: 2
      }
    },

    // Non-commissioned officers (Сержантский состав)
    {
      name: 'Младший сержант',
      min_experience: 300,
      daily_quota_bonus: 2,
      weekly_quota_bonus: 5,
      monthly_quota_bonus: 10,
      emoji: '🏅',
      special_privileges: {
        description: 'Младший командир отделения',
        can_create_hard_quests: true,
        bonus_experience: 0.1,
        can_approve_easy_shared_wishes: true,
        max_quest_reward: 3
      }
    },
    {
      name: 'Сержант',
      min_experience: 600,
      daily_quota_bonus: 3,
      weekly_quota_bonus: 8,
      monthly_quota_bonus: 15,
      emoji: '🎗️',
      special_privileges: {
        description: 'Командир отделения',
        can_create_epic_quests: true,
        bonus_experience: 0.15,
        can_approve_medium_shared_wishes: true,
        max_quest_reward: 4
      }
    },
    {
      name: 'Старший сержант',
      min_experience: 1000,
      daily_quota_bonus: 4,
      weekly_quota_bonus: 12,
      monthly_quota_bonus: 20,
      emoji: '🏆',
      special_privileges: {
        description: 'Старший командир',
        can_approve_shared_wishes: true,
        bonus_experience: 0.2,
        can_modify_quest_rewards: true,
        max_quest_reward: 5
      }
    },
    {
      name: 'Старшина',
      min_experience: 1500,
      daily_quota_bonus: 5,
      weekly_quota_bonus: 15,
      monthly_quota_bonus: 25,
      emoji: '👑',
      special_privileges: {
        description: 'Главный сержант подразделения',
        can_modify_economy: true,
        bonus_experience: 0.25,
        can_create_special_quests: true,
        unlimited_easy_gifts: true
      }
    },

    // Warrant officers (Прапорщики)
    {
      name: 'Прапорщик',
      min_experience: 2200,
      daily_quota_bonus: 6,
      weekly_quota_bonus: 20,
      monthly_quota_bonus: 35,
      emoji: '⭐',
      special_privileges: {
        description: 'Технический специалист',
        can_create_special_events: true,
        bonus_experience: 0.3,
        extended_quest_duration: true,
        can_gift_blue_wishes: true
      }
    },
    {
      name: 'Старший прапорщик',
      min_experience: 3000,
      daily_quota_bonus: 8,
      weekly_quota_bonus: 25,
      monthly_quota_bonus: 45,
      emoji: '🌟',
      special_privileges: {
        description: 'Старший технический специалист',
        unlimited_daily_gifts: true,
        bonus_experience: 0.35,
        can_mentor_lower_ranks: true,
        can_create_custom_categories: true
      }
    },

    // Junior officers (Младшие офицеры)
    {
      name: 'Младший лейтенант',
      min_experience: 4000,
      daily_quota_bonus: 10,
      weekly_quota_bonus: 30,
      monthly_quota_bonus: 60,
      emoji: '💫',
      special_privileges: {
        description: 'Младший офицер',
        can_grant_bonuses: true,
        bonus_experience: 0.4,
        can_create_rank_quests: true,
        can_gift_red_wishes: true
      }
    },
    {
      name: 'Лейтенант',
      min_experience: 5500,
      daily_quota_bonus: 12,
      weekly_quota_bonus: 40,
      monthly_quota_bonus: 80,
      emoji: '✨',
      special_privileges: {
        description: 'Офицер взвода',
        can_create_rank_quests: true,
        bonus_experience: 0.5,
        can_override_quotas: true,
        unlimited_medium_gifts: true
      }
    },
    {
      name: 'Старший лейтенант',
      min_experience: 7500,
      daily_quota_bonus: 15,
      weekly_quota_bonus: 50,
      monthly_quota_bonus: 100,
      emoji: '🌠',
      special_privileges: {
        description: 'Старший офицер взвода',
        advanced_quest_creation: true,
        bonus_experience: 0.6,
        can_create_epic_events: true,
        can_modify_user_ranks: true
      }
    },

    // Senior officers (Старшие офицеры)
    {
      name: 'Капитан',
      min_experience: 10000,
      daily_quota_bonus: 18,
      weekly_quota_bonus: 60,
      monthly_quota_bonus: 120,
      emoji: '⚡',
      special_privileges: {
        description: 'Командир роты',
        company_command: true,
        bonus_experience: 0.7,
        can_modify_rank_requirements: true,
        unlimited_quest_creation: true
      }
    },
    {
      name: 'Майор',
      min_experience: 13000,
      daily_quota_bonus: 20,
      weekly_quota_bonus: 70,
      monthly_quota_bonus: 140,
      emoji: '🔥',
      special_privileges: {
        description: 'Старший офицер батальона',
        battalion_privileges: true,
        bonus_experience: 0.8,
        can_create_legendary_quests: true,
        can_grant_special_rewards: true
      }
    },
    {
      name: 'Подполковник',
      min_experience: 17000,
      daily_quota_bonus: 25,
      weekly_quota_bonus: 80,
      monthly_quota_bonus: 160,
      emoji: '⚔️',
      special_privileges: {
        description: 'Заместитель командира полка',
        deputy_command: true,
        bonus_experience: 0.9,
        unlimited_quest_creation: true,
        can_modify_economy_settings: true
      }
    },
    {
      name: 'Полковник',
      min_experience: 22000,
      daily_quota_bonus: 30,
      weekly_quota_bonus: 100,
      monthly_quota_bonus: 200,
      emoji: '🛡️',
      special_privileges: {
        description: 'Командир полка',
        regiment_command: true,
        bonus_experience: 1.0,
        can_grant_special_privileges: true,
        unlimited_all_gifts: true
      }
    },

    // General officers (Генералы)
    {
      name: 'Генерал-майор',
      min_experience: 30000,
      daily_quota_bonus: 40,
      weekly_quota_bonus: 120,
      monthly_quota_bonus: 250,
      emoji: '🎖️',
      special_privileges: {
        description: 'Младший генерал',
        general_privileges: true,
        bonus_experience: 1.2,
        can_modify_system_settings: true,
        god_mode_quests: true
      }
    },
    {
      name: 'Генерал-лейтенант',
      min_experience: 40000,
      daily_quota_bonus: 50,
      weekly_quota_bonus: 150,
      monthly_quota_bonus: 300,
      emoji: '🏅',
      special_privileges: {
        description: 'Генерал армии',
        senior_general_privileges: true,
        bonus_experience: 1.5,
        unlimited_system_access: true,
        can_create_new_features: true
      }
    },
    {
      name: 'Генерал-полковник',
      min_experience: 55000,
      daily_quota_bonus: 60,
      weekly_quota_bonus: 180,
      monthly_quota_bonus: 350,
      emoji: '🎗️',
      special_privileges: {
        description: 'Старший генерал',
        high_command: true,
        bonus_experience: 2.0,
        can_create_system_events: true,
        ultimate_quest_power: true
      }
    },
    {
      name: 'Генерал армии',
      min_experience: 75000,
      daily_quota_bonus: 80,
      weekly_quota_bonus: 200,
      monthly_quota_bonus: 400,
      emoji: '🏆',
      special_privileges: {
        description: 'Высший генерал',
        army_command: true,
        bonus_experience: 2.5,
        ultimate_privileges: true,
        can_rewrite_reality: true
      }
    },

    // Marshal (Маршал)
    {
      name: 'Маршал',
      min_experience: 100000,
      daily_quota_bonus: 100,
      weekly_quota_bonus: 250,
      monthly_quota_bonus: 500,
      emoji: '👑',
      special_privileges: {
        description: 'Высшее воинское звание',
        marshal_privileges: true,
        bonus_experience: 3.0,
        god_mode: true,
        infinite_power: true
      }
    }
  ];
}

/**
 * Generate comprehensive economy settings
 */
function generateEconomySettings() {
  return [
    // Base quota limits
    { key: 'daily_gift_base_limit', value: 5, description: 'Базовый дневной лимит подарков для всех пользователей' },
    { key: 'weekly_gift_base_limit', value: 20, description: 'Базовый недельный лимит подарков для всех пользователей' },
    { key: 'monthly_gift_base_limit', value: 50, description: 'Базовый месячный лимит подарков для всех пользователей' },
    
    // Experience system
    { key: 'quest_experience_multiplier', value: { easy: 10, medium: 25, hard: 50, epic: 100 }, description: 'Очки опыта за выполнение квестов по сложности' },
    { key: 'event_experience_base', value: 15, description: 'Базовые очки опыта за выполнение случайных событий' },
    { key: 'gift_experience_points', value: 2, description: 'Очки опыта за дарение подарка' },
    { key: 'wish_completion_experience', value: { green: 3, blue: 8, red: 15 }, description: 'Очки опыта за выполнение желаний по типу' },
    
    // Exchange rates
    { key: 'exchange_rates', value: { green_to_blue: 10, blue_to_red: 10 }, description: 'Курсы обмена между типами желаний' },
    { key: 'exchange_experience_bonus', value: 1, description: 'Бонусные очки опыта за обмен желаний' },
    
    // Quest system
    { key: 'max_active_quests_per_user', value: 10, description: 'Максимальное количество активных квестов на пользователя' },
    { key: 'max_quests_per_day', value: 3, description: 'Максимальное количество квестов, которые можно создать за день' },
    { key: 'quest_expiration_notification_hours', value: 24, description: 'За сколько часов до истечения квеста отправлять уведомление' },
    { key: 'quest_auto_expire_days', value: 7, description: 'Через сколько дней автоматически истекают квесты без срока' },
    
    // Random events
    { key: 'random_event_generation_interval', value: { min_hours: 2, max_hours: 8 }, description: 'Случайный интервал генерации новых событий' },
    { key: 'max_active_events_per_user', value: 1, description: 'Максимальное количество активных событий на пользователя' },
    { key: 'event_expiration_hours', value: 24, description: 'Через сколько часов истекают случайные события' },
    { key: 'event_generation_probability', value: 0.3, description: 'Вероятность генерации события при проверке (0-1)' },
    
    // Bonuses and multipliers
    { key: 'weekend_experience_bonus', value: 1.2, description: 'Множитель опыта в выходные дни' },
    { key: 'holiday_experience_bonus', value: 1.5, description: 'Множитель опыта в праздничные дни' },
    { key: 'category_experience_multiplier', value: { 'Романтика': 1.2, 'Путешествия': 1.5, 'Спорт': 1.1, 'Образование': 1.3 }, description: 'Множители опыта для определенных категорий' },
    
    // Quality control
    { key: 'min_quest_description_length', value: 10, description: 'Минимальная длина описания квеста' },
    { key: 'max_quest_description_length', value: 500, description: 'Максимальная длина описания квеста' },
    { key: 'min_wish_description_length', value: 3, description: 'Минимальная длина описания желания' },
    { key: 'max_wish_description_length', value: 200, description: 'Максимальная длина описания желания' }
  ];
}

/**
 * Generate SQL for inserting seed data
 */
function generateSeedDataSQL() {
  const questTemplates = generateQuestTemplates();
  const eventTemplates = generateEventTemplates();
  const ranks = generateRankSystem();
  const economySettings = generateEconomySettings();

  let sql = `-- Generated Seed Data for Quest Economy System
-- This file contains comprehensive seed data with Russian descriptions
-- Generated on: ${new Date().toISOString()}

-- Clear existing seed data
DELETE FROM quest_templates;
DELETE FROM event_templates;
DELETE FROM ranks;
DELETE FROM economy_settings;

-- Insert quest templates
`;

  // Quest templates
  questTemplates.forEach(quest => {
    sql += `INSERT INTO quest_templates (title, description, category, difficulty, reward_type, reward_amount, experience_reward, tags) VALUES (
  '${quest.title.replace(/'/g, "''")}',
  '${quest.description.replace(/'/g, "''")}',
  '${quest.category}',
  '${quest.difficulty}',
  '${quest.reward_type}',
  ${quest.reward_amount},
  ${quest.experience_reward},
  ARRAY[${quest.tags.map(tag => `'${tag}'`).join(', ')}]
);\n\n`;
  });

  sql += `-- Insert event templates\n`;

  // Event templates
  eventTemplates.forEach(event => {
    sql += `INSERT INTO event_templates (title, description, category, reward_type, reward_amount, experience_reward, duration_hours, tags) VALUES (
  '${event.title.replace(/'/g, "''")}',
  '${event.description.replace(/'/g, "''")}',
  '${event.category}',
  '${event.reward_type}',
  ${event.reward_amount},
  ${event.experience_reward},
  ${event.duration_hours},
  ARRAY[${event.tags.map(tag => `'${tag}'`).join(', ')}]
);\n\n`;
  });

  sql += `-- Insert ranks\n`;

  // Ranks
  ranks.forEach(rank => {
    sql += `INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) VALUES (
  '${rank.name}',
  ${rank.min_experience},
  ${rank.daily_quota_bonus},
  ${rank.weekly_quota_bonus},
  ${rank.monthly_quota_bonus},
  '${rank.emoji}',
  '${JSON.stringify(rank.special_privileges).replace(/'/g, "''")}'::JSONB
);\n\n`;
  });

  sql += `-- Insert economy settings\n`;

  // Economy settings
  economySettings.forEach(setting => {
    const value = typeof setting.value === 'object' ? JSON.stringify(setting.value) : setting.value.toString();
    sql += `INSERT INTO economy_settings (setting_key, setting_value, description) VALUES (
  '${setting.key}',
  '${value.replace(/'/g, "''")}'::JSONB,
  '${setting.description.replace(/'/g, "''")}'
);\n\n`;
  });

  sql += `-- Log seed data completion
INSERT INTO migrations (filename) VALUES ('seed_data_generated.sql')
ON CONFLICT (filename) DO NOTHING;
`;

  return sql;
}

/**
 * Main function to generate and save seed data
 */
function main() {
  console.log('🌱 Generating comprehensive seed data for Quest Economy System...');
  
  const seedDataSQL = generateSeedDataSQL();
  const outputPath = path.join(__dirname, 'migrations', '008_comprehensive_seed_data.sql');
  
  fs.writeFileSync(outputPath, seedDataSQL, 'utf8');
  
  console.log(`✅ Seed data generated successfully!`);
  console.log(`📁 File saved to: ${outputPath}`);
  console.log(`📊 Generated data:`);
  console.log(`   - ${generateQuestTemplates().length} quest templates`);
  console.log(`   - ${generateEventTemplates().length} event templates`);
  console.log(`   - ${generateRankSystem().length} military ranks`);
  console.log(`   - ${generateEconomySettings().length} economy settings`);
  
  console.log('\n🎯 Next steps:');
  console.log('1. Review the generated SQL file');
  console.log('2. Run the migration: npm run migrate:data');
  console.log('3. Validate the data: npm run validate:data');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateQuestTemplates,
  generateEventTemplates,
  generateRankSystem,
  generateEconomySettings,
  generateSeedDataSQL
};