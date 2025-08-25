import { NextApiRequest, NextApiResponse } from 'next';
import { EventGenerator } from '../../../../lib/event-generator';
import { RankCalculator } from '../../../../lib/rank-calculator';
import { manaEngine } from '../../../../lib/mana-engine';
import { getUserFromRequest } from '../../../../lib/telegram-auth';
import { updateUser } from '../../../../lib/db';

const eventGenerator = new EventGenerator();
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

    const { id } = req.query;
    const eventId = parseInt(id as string);

    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    // Complete the event (now handles Mana rewards internally)
    const result = await eventGenerator.completeRandomEvent(String(eventId), user.id);
    const completedEvent = result.event;

    if (!completedEvent) {
      return res.status(404).json({ error: 'Event not found or already completed' });
    }

    // Calculate experience reward
    const userRank = rankCalculator.getCurrentRank(user.experience || 0);
    const baseExp = rankCalculator.calculateExperience('eventComplete');
    const multiplier = rankCalculator.getEconomyMultiplier(userRank);
    const experienceGained = Math.floor(baseExp * multiplier);

    // Update user experience
    const newExperience = (user.experience || 0) + experienceGained;
    
    // Check for rank promotion
    const promotionResult = rankCalculator.checkForPromotion(
      user.experience || 0, 
      newExperience
    );

    // Update user in database
    await updateUser(user.id, {
      experience_points: newExperience,
      rank: promotionResult.newRank.id
    });

    // Mana reward is now handled by EventGenerator.grantEventRewards()
    // Get the final mana reward amount from the event
    const finalManaReward = completedEvent.reward_amount;

    const response: any = {
      event: completedEvent,
      rewards: {
        experience: experienceGained,
        mana: finalManaReward,
        eventRewards: result.rewardsGranted
      }
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
    console.error('Event completion error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}