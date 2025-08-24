import { NextApiRequest, NextApiResponse } from 'next';
import { RankCalculator } from '../../../lib/rank-calculator';
import { getUserFromRequest } from '../../../lib/telegram-auth';

const rankCalculator = new RankCalculator();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userExperience = user.experience || 0;
    const progress = rankCalculator.getRankProgress(userExperience);

    return res.status(200).json({ 
      progress,
      totalExperience: userExperience 
    });

  } catch (error) {
    console.error('Get rank progress error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}