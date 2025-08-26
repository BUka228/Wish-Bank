// Telegram Bot будет инициализирован только на сервере при необходимости
let bot: any = null;

function getBot() {
  if (!bot && typeof window === 'undefined') {
    const TelegramBot = require('node-telegram-bot-api');
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false });
  }
  return bot;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export async function sendNotification(chatId: string, message: string, options: any = {}) {
  try {
    const telegramBot = getBot();
    if (telegramBot) {
      const defaultOptions = { parse_mode: 'HTML' };
      await telegramBot.sendMessage(chatId, message, { ...defaultOptions, ...options });
    }
  } catch (error) {
    console.error('Telegram notification error:', error);
    throw error;
  }
}

// Enhanced notification types for different scenarios
export async function sendQuestNotification(
  chatId: string,
  questType: 'created' | 'completed' | 'expired' | 'reminder',
  questTitle: string,
  details: any = {}
) {
  const emojis = {
    created: '🎯',
    completed: '✅',
    expired: '⏰',
    reminder: '⏳'
  };
  
  const titles = {
    created: 'Новый квест!',
    completed: 'Квест выполнен!',
    expired: 'Квест истек',
    reminder: 'Напоминание о квесте'
  };
  
  let message = `${emojis[questType]} <b>${titles[questType]}</b>\n\n`;
  message += `Квест: ${questTitle}\n`;
  
  if (details.reward_amount) {
    message += `Награда: ${details.reward_amount} ${details.reward_type}\n`;
  }
  
  if (details.experience_reward) {
    message += `Опыт: +${details.experience_reward}\n`;
  }
  
  if (details.expires_at && questType === 'reminder') {
    const hoursLeft = Math.ceil((new Date(details.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60));
    message += `Осталось: ${hoursLeft} ч.\n`;
  }
  
  message += '\n🎯 Откройте приложение для управления квестами';
  
  await sendNotification(chatId, message, createWebAppKeyboard());
}

export async function sendEventNotification(
  chatId: string,
  eventType: 'available' | 'completed' | 'expired' | 'reminder',
  eventTitle: string,
  details: any = {}
) {
  const emojis = {
    available: '🎲',
    completed: '🎉',
    expired: '⏰',
    reminder: '⏳'
  };
  
  const titles = {
    available: 'Новое случайное событие!',
    completed: 'Событие выполнено!',
    expired: 'Событие истекло',
    reminder: 'Событие скоро истечет'
  };
  
  let message = `${emojis[eventType]} <b>${titles[eventType]}</b>\n\n`;
  message += `Событие: ${eventTitle}\n`;
  
  if (details.reward_amount) {
    message += `Награда: ${details.reward_amount} ${details.reward_type}\n`;
  }
  
  if (details.experience_reward) {
    message += `Опыт: +${details.experience_reward}\n`;
  }
  
  if (eventType === 'reminder' && details.hours_remaining) {
    message += `Осталось: ${details.hours_remaining} ч.\n`;
  }
  
  message += '\n🎯 Откройте приложение для участия';
  
  await sendNotification(chatId, message, createWebAppKeyboard());
}

export async function sendRankNotification(
  chatId: string,
  oldRank: string,
  newRank: string,
  experience: number
) {
  const message = `🏆 <b>Повышение ранга!</b>\n\n` +
    `Ваш ранг повышен:\n` +
    `${oldRank} → ${newRank}\n\n` +
    `Текущий опыт: ${experience}\n\n` +
    `🎯 Поздравляем с достижением!`;
    
  await sendNotification(chatId, message, createWebAppKeyboard());
}

export async function sendManaNotification(
  chatId: string,
  type: 'earned' | 'spent' | 'exchange',
  amount: number,
  reason: string,
  balance?: number
) {
  const emojis = {
    earned: '💰',
    spent: '💸',
    exchange: '🔄'
  };
  
  const titles = {
    earned: 'Мана получена!',
    spent: 'Мана потрачена',
    exchange: 'Обмен валют'
  };
  
  let message = `${emojis[type]} <b>${titles[type]}</b>\n\n`;
  
  if (type === 'earned') {
    message += `+${amount} маны\n`;
  } else if (type === 'spent') {
    message += `-${amount} маны\n`;
  } else {
    message += `Обменяно: ${amount} маны\n`;
  }
  
  message += `Причина: ${reason}\n`;
  
  if (balance !== undefined) {
    message += `Баланс: ${balance} маны\n`;
  }
  
  message += '\n🎯 Откройте приложение для управления экономикой';
  
  await sendNotification(chatId, message, createWebAppKeyboard());
}

export async function sendSharedWishNotification(
  chatId: string,
  type: 'created' | 'progress' | 'completed' | 'expired' | 'reminder',
  wishDescription: string,
  details: any = {}
) {
  const emojis = {
    created: '🌟',
    progress: '📈',
    completed: '🎉',
    expired: '⏰',
    reminder: '⏳'
  };
  
  const titles = {
    created: 'Новое общее желание!',
    progress: 'Прогресс общего желания',
    completed: 'Общее желание выполнено!',
    expired: 'Общее желание истекло',
    reminder: 'Напоминание об общем желании'
  };
  
  let message = `${emojis[type]} <b>${titles[type]}</b>\n\n`;
  
  if (type === 'created') {
    message += `Создано новое общее желание:\n"${wishDescription.substring(0, 100)}${wishDescription.length > 100 ? '...' : ''}"\n\n`;
    if (details.collective_reward > 0) {
      message += `Награда: ${details.collective_reward} маны\n`;
    }
  } else if (type === 'progress') {
    message += `"${wishDescription.substring(0, 80)}..."\n\n`;
    if (details.participant_name) {
      message += `${details.participant_name} внес вклад\n`;
    }
    if (details.progress) {
      message += `Прогресс: ${details.progress}%\n`;
    }
  } else if (type === 'completed') {
    message += `"${wishDescription.substring(0, 80)}..."\n\n`;
    message += `Желание успешно выполнено!\n`;
    if (details.collective_reward > 0) {
      message += `Вы получили ${details.collective_reward} маны!\n`;
    }
  }
  
  message += '\n🎯 Откройте приложение для просмотра';
  
  await sendNotification(chatId, message, createWebAppKeyboard());
}

export async function sendSystemNotification(
  chatId: string,
  title: string,
  message: string,
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
) {
  const emojis = {
    low: 'ℹ️',
    normal: '📢',
    high: '⚠️',
    urgent: '🚨'
  };
  
  const fullMessage = `${emojis[priority]} <b>${title}</b>\n\n${message}`;
  
  await sendNotification(chatId, fullMessage, createWebAppKeyboard());
}

// Function to get user's Telegram chat ID from user ID
export async function getUserTelegramChatId(userId: string): Promise<string | null> {
  try {
    // This would typically query the database to get the user's Telegram chat ID
    // For now, we'll assume the user ID is the Telegram chat ID
    // In a real implementation, you'd query your users table
    const { sql } = require('./db-pool');
    const result = await sql`
      SELECT telegram_id FROM users WHERE id = ${userId}
    `;
    
    if (result.length > 0 && result[0].telegram_id) {
      return result[0].telegram_id.toString();
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user Telegram chat ID:', error);
    return null;
  }
}

export async function sendWishNotification(
  chatId: string,
  wishType: 'green' | 'blue' | 'red',
  description: string,
  fromUser: string
) {
  const emoji = {
    green: '💚',
    blue: '💙',
    red: '❤️'
  };
  
  const message = `${emoji[wishType]} <b>Новое желание!</b>\n\n` +
    `От: ${fromUser}\n` +
    `Желание: ${description}\n\n` +
    `Откройте приложение для управления желаниями`;
    
  await sendNotification(chatId, message);
}

export async function sendBalanceUpdate(
  chatId: string,
  wishType: 'green' | 'blue' | 'red',
  amount: number,
  reason: string
) {
  const emoji = {
    green: '💚',
    blue: '💙',
    red: '❤️'
  };
  
  const message = `${emoji[wishType]} <b>Баланс обновлен!</b>\n\n` +
    `+${amount} ${wishType} желание\n` +
    `Причина: ${reason}`;
    
  await sendNotification(chatId, message);
}

export function createWebAppKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🎯 Открыть Банк Желаний',
            web_app: { url: process.env.VERCEL_URL || 'https://your-app.vercel.app' }
          }
        ]
      ]
    }
  };
}

export async function handleTelegramCommand(
  command: string,
  _args: string[],
  _user: TelegramUser,
  _chatId: string
): Promise<string> {
  switch (command) {
    case '/start':
      return 'Добро пожаловать в Банк Желаний! 🎯\n\n' +
        'Используйте кнопку ниже для открытия приложения или команды:\n' +
        '/balance - показать баланс\n' +
        '/give @username green - дать зеленое желание\n' +
        '/wishes - показать активные желания';
    
    case '/help':
      return '📖 <b>Команды Банка Желаний:</b>\n\n' +
        '/balance - ваш текущий баланс\n' +
        '/give @username green|blue|red - дать желание\n' +
        '/wishes - активные желания\n' +
        '/exchange green|blue - обменять желания\n\n' +
        '💚 Зеленые (1) → 💙 Синие (10) → ❤️ Красные (100)';
    
    default:
      return 'Неизвестная команда. Используйте /help для списка команд.';
  }
}