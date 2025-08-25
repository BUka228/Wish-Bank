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

    // Get user's mana balance
    const balance = await manaEngine.getUserMana(user.id);

    // Get optional detailed stats if requested
    const { detailed } = req.query;
    if (detailed === 'true') {
      const stats = await manaEngine.getUserManaStats(user.id);
      return res.status(200).json({
        balance,
        stats
      });
    }

    return res.status(200).json({ balance });

  } catch (error) {
    console.error('Get mana balance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}