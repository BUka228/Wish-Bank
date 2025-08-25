// Русская локализация для системы Маны
export const MANA_TEXTS = {
  // Основные термины
  mana: 'Мана',
  manaBalance: 'Баланс Маны',
  manaUnits: 'Единиц Маны',
  
  // Усиления
  enhancements: 'Усиления',
  priority: 'Приоритет',
  aura: 'Аура',
  
  // Типы аур
  auraTypes: {
    romantic: 'Романтическая',
    gaming: 'Игровая',
    mysterious: 'Загадочная'
  },
  
  // Интерфейс
  interface: {
    createWish: 'Создать желание',
    enhanceWish: 'Усилить желание',
    giftMana: 'Подарить Ману',
    transferMana: 'Перевести Ману',
    freeWishCreation: 'Создание желаний теперь бесплатно!',
    useManaForEnhancements: 'Используйте Ману для усилений',
    universalCurrency: 'универсальная валюта для усиления ваших желаний',
    priorityCost: '10-200 Маны',
    auraCost: '50 Маны'
  },
  
  // Сообщения об ошибках
  errors: {
    insufficientMana: 'Недостаточно Маны',
    enhancementFailed: 'Не удалось применить усиление',
    transferFailed: 'Не удалось перевести Ману',
    wishCreationFailed: 'Не удалось создать желание',
    migrationFailed: 'Ошибка миграции',
    invalidAmount: 'Неверная сумма',
    userNotFound: 'Пользователь не найден'
  },
  
  // Уведомления об успехе
  success: {
    manaReceived: 'Получена Мана',
    manaSpent: 'Мана потрачена',
    enhancementApplied: 'Усиление применено',
    wishCreated: 'Желание создано',
    manaTransferred: 'Мана переведена'
  },
  
  // Описания усилений
  enhancementDescriptions: {
    priority: {
      level1: 'Базовый приоритет - желание поднимается в списке',
      level2: 'Повышенный приоритет - желание выделяется',
      level3: 'Высокий приоритет - желание получает особое внимание',
      level4: 'Максимальный приоритет - желание становится приоритетным',
      level5: 'Критический приоритет - желание требует немедленного внимания'
    },
    aura: {
      romantic: 'Добавляет романтическую атмосферу желанию',
      gaming: 'Придает игровой стиль оформлению',
      mysterious: 'Создает загадочную ауру вокруг желания'
    }
  },
  
  // Подсказки и инструкции
  tips: {
    earnMana: 'Зарабатывайте Ману, выполняя квесты и участвуя в событиях',
    spendWisely: 'Тратьте Ману разумно на усиления желаний',
    priorityLevels: 'Уровни приоритета: 1-5, стоимость увеличивается',
    auraEffects: 'Ауры добавляют визуальные эффекты желаниям',
    freeCreation: 'Создание желаний бесплатно, платите только за усиления'
  },
  
  // Форматирование чисел
  formatting: {
    manaAmount: (amount: number) => `${amount.toLocaleString('ru-RU')} Маны`,
    manaShort: (amount: number) => `${amount}М`,
    priorityLevel: (level: number) => `Приоритет ${level}`,
    cost: (amount: number) => `Стоимость: ${amount} Маны`
  }
};

// Утилитарные функции для локализации
export const formatManaAmount = (amount: number): string => {
  return MANA_TEXTS.formatting.manaAmount(amount);
};

export const formatPriorityLevel = (level: number): string => {
  return MANA_TEXTS.formatting.priorityLevel(level);
};

export const formatCost = (amount: number): string => {
  return MANA_TEXTS.formatting.cost(amount);
};

export const getAuraName = (auraType: string): string => {
  return MANA_TEXTS.auraTypes[auraType as keyof typeof MANA_TEXTS.auraTypes] || auraType;
};

export const getPriorityDescription = (level: number): string => {
  const descriptions = MANA_TEXTS.enhancementDescriptions.priority;
  const key = `level${level}` as keyof typeof descriptions;
  return descriptions[key] || `Приоритет уровня ${level}`;
};

export const getAuraDescription = (auraType: string): string => {
  const descriptions = MANA_TEXTS.enhancementDescriptions.aura;
  return descriptions[auraType as keyof typeof descriptions] || `Аура типа ${auraType}`;
};