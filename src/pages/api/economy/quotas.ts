import { NextApiRequest, NextApiResponse } from 'next';
import { EconomyEngine } from '../../../lib/economy-engine';
import { getUserFromRequest } from '../../../lib/telegram-auth';

const economyEngine = new EconomyEngine();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get current quotas for user
    const quotas = await economyEngine.checkQuotas(user.id);

    return res.status(200).json({ quotas });

  } catch (error) {
    console.error('Get quotas error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}