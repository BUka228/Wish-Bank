import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../lib/telegram-auth';
import { validateAdminAccess, getAdminConfigStatus } from '../../../lib/admin-security';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Получаем пользователя из запроса
    const user = await getUserFromRequest(req);
    
    // Получаем конфигурацию админа
    const adminConfig = getAdminConfigStatus();
    
    // Проверяем админский доступ
    let isAdmin = false;
    let adminCheckError = null;
    
    if (user) {
      try {
        isAdmin = await validateAdminAccess(user.id);
      } catch (error: any) {
        adminCheckError = error.message;
      }
    }

    return res.status(200).json({
      success: true,
      debug: {
        user: user ? {
          id: user.id,
          telegram_id: user.telegram_id,
          name: user.name,
          username: user.username
        } : null,
        adminConfig,
        isAdmin,
        adminCheckError,
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          ADMIN_TELEGRAM_ID: process.env.ADMIN_TELEGRAM_ID ? 'установлен' : 'не установлен',
          DATABASE_URL: process.env.DATABASE_URL ? 'установлен' : 'не установлен'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Debug admin check error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}