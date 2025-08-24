import { NextApiRequest, NextApiResponse } from 'next';
import { handleTelegramCommand, createWebAppKeyboard } from '@/lib/telegram';

interface TelegramUpdate {
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
    };
    text?: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update: TelegramUpdate = req.body;
    
    if (!update.message?.text) {
      return res.status(200).json({ ok: true });
    }

    const { message } = update;
    const chatId = message.chat.id.toString();
    const text = message.text;
    
    // Парсим команду
    const parts = text.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    let responseText = '';
    let keyboard = null;

    if (command === '/start') {
      responseText = await handleTelegramCommand(command, args, message.from, chatId);
      keyboard = createWebAppKeyboard();
    } else {
      responseText = await handleTelegramCommand(command, args, message.from, chatId);
    }

    // В реальном приложении здесь бы отправлялся ответ через Telegram Bot API
    console.log('Telegram response:', { chatId, text: responseText, keyboard });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}