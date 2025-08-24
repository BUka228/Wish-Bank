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

export async function sendNotification(chatId: string, message: string) {
  try {
    const telegramBot = getBot();
    if (telegramBot) {
      await telegramBot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    }
  } catch (error) {
    console.error('Telegram notification error:', error);
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