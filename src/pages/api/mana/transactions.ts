import { NextApiRequest, NextApiResponse } from 'next';
import { manaEngine } from '../../../lib/mana-engine';
import { getUserFromRequest } from '../../../lib/telegram-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit = '50' } = req.query;
    const limitNum = parseInt(limit as string);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ 
        error: 'Limit must be a number between 1 and 100' 
      });
    }

    // Get user's mana transaction history
    const transactions = await manaEngine.getUserTransactions(user.id, limitNum);

    return res.status(200).json({
      transactions,
      total: transactions.length
    });

  } catch (error) {
    console.error('Get mana transactions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}