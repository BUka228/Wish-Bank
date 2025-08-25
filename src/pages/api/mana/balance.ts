import { NextApiRequest, NextApiResponse } from 'next';
import { manaEngine } from '../../../lib/mana-engine';
import { getUserFromRequest } from '../../../lib/telegram-auth';
import { 
  isManaSystemError, 
  getUserErrorMessage, 
  createErrorResponse,
  logManaError 
} from '../../../lib/mana-errors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed',
        userMessage: 'Метод не поддерживается'
      }
    });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
          userMessage: 'Необходима авторизация'
        }
      });
    }

    // Get user's mana balance
    const balance = await manaEngine.getUserMana(user.id);

    // Get optional detailed stats if requested
    const { detailed } = req.query;
    if (detailed === 'true') {
      const stats = await manaEngine.getUserManaStats(user.id);
      return res.status(200).json({
        success: true,
        data: {
          balance,
          stats
        }
      });
    }

    return res.status(200).json({ 
      success: true,
      data: { balance }
    });

  } catch (error) {
    logManaError(error, { 
      operation: 'get_mana_balance',
      endpoint: '/api/mana/balance'
    });

    const errorResponse = createErrorResponse(error);
    const statusCode = isManaSystemError(error) ? 400 : 500;
    
    return res.status(statusCode).json(errorResponse);
  }
}