import { NextApiRequest, NextApiResponse } from 'next';
import { EconomyEngine } from '../../../lib/economy-engine';
import { RankCalculator } from '../../../lib/rank-calculator';
import { getUserFromRequest } from '../../../lib/telegram-auth';
import { updateUser } from '../../../lib/db';

const economyEngine = new EconomyEngine();
const rankCalculator = new RankCalculator();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { recipientId, type = 'green', amount = 1, message } = req.body;

    if (!recipientId) {
      return res.status(400).json({ 
        error: 'Missing required field: recipientId' 
      });
    }

    // Attempt to gift wishes
    const giftResult = await economyEngine.giftWish(user.id, {
      recipient_id: recipientId,
      type,
      amount,
      message
    });

    // Award experience for gifting
    const userRank = rankCalculator.getCurrentRank(user.experience || 0);
    const experienceGained = rankCalculator.calculateExperience('wishFulfill');
    const newExperience = (user.experience || 0) + experienceGained;

    // Check for rank promotion
    const promotionResult = rankCalculator.checkForPromotion(
      user.experience || 0, 
      newExperience
    );

    // Update user experience
    await updateUser(user.id, {
      experience_points: newExperience,
      rank: promotionResult.newRank.id
    });

    const response: any = {
      success: true,
      wishes: giftResult.wishes,
      quotaUsed: giftResult.quotaUsed,
      experienceGained
    };

    // Add promotion info if promoted
    if (promotionResult.promoted) {
      response.promotion = {
        oldRank: promotionResult.oldRank,
        newRank: promotionResult.newRank,
        notification: promotionResult.notification
      };
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Gift wish error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}