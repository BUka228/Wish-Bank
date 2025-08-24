import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../lib/telegram-auth';
import { RankCalculator } from '../../../lib/rank-calculator';

const rankCalculator = new RankCalculator();

// Default economy settings
const economySettings = {
  quotas: {
    daily: {
      wishGifts: 3,
      questCreation: 2,
      sharedWishCreation: 1
    },
    weekly: {
      wishGifts: 15,
      questCreation: 10,
      sharedWishCreation: 5
    },
    monthly: {
      wishGifts: 50,
      questCreation: 30,
      sharedWishCreation: 15
    }
  },
  costs: {
    wishGift: 10,
    questCreation: 5,
    sharedWishCreation: 15
  },
  rewards: {
    questComplete: 20,
    eventComplete: 15,
    wishFulfill: 25,
    dailyLogin: 2
  },
  rankMultipliers: {
    1: 1.0,   // Рядовой
    2: 1.1,   // Ефрейтор
    3: 1.2,   // Младший сержант
    4: 1.3,   // Сержант
    5: 1.4,   // Старший сержант
    6: 1.5    // Старшина
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's current rank to show personalized settings
    const userRank = rankCalculator.getCurrentRank(user.experience || 0);
    const userMultiplier = rankCalculator.getEconomyMultiplier(userRank);

    const personalizedSettings = {
      ...economySettings,
      userRank: {
        current: userRank,
        multiplier: userMultiplier,
        privileges: userRank.special_privileges
      }
    };

    return res.status(200).json({ settings: personalizedSettings });

  } catch (error) {
    console.error('Get economy settings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}