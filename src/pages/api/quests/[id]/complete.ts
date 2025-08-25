import { NextApiRequest, NextApiResponse } from 'next';
import { QuestEngine } from '../../../../lib/quest-engine';
import { RankCalculator } from '../../../../lib/rank-calculator';
import { EconomyEngine } from '../../../../lib/economy-engine';
import { manaEngine } from '../../../../lib/mana-engine';
import { getUserFromRequest } from '../../../../lib/telegram-auth';
import { updateUser, getQuestById } from '../../../../lib/db';

const questEngine = new QuestEngine();
const rankCalculator = new RankCalculator();
const economyEngine = new EconomyEngine();

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
    const questId = parseInt(id as string);

    if (isNaN(questId)) {
      return res.status(400).json({ error: 'Invalid quest ID' });
    }

    const quest = await getQuestById(String(questId));
    
    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    // Check if user can complete this quest
    if (quest.assignee_id !== user.id) {
      return res.status(403).json({ error: 'You are not assigned to this quest' });
    }

    if (quest.status !== 'active') {
      return res.status(400).json({ error: 'Quest is not active' });
    }

    // Complete the quest (now handles Mana rewards internally)
    const completedQuest = await questEngine.completeQuest(String(questId), user.id);

    // Calculate experience reward
    const userRank = rankCalculator.getCurrentRank(user.experience_points || 0);
    const baseExp = rankCalculator.calculateExperience('questComplete');
    const multiplier = rankCalculator.getEconomyMultiplier(userRank);
    const experienceGained = Math.floor(baseExp * multiplier);

    // Update user experience
    const newExperience = (user.experience_points || 0) + experienceGained;
    
    // Check for rank promotion
    const promotionResult = rankCalculator.checkForPromotion(
      user.experience_points || 0, 
      newExperience
    );

    // Update user in database
    await updateUser(user.id, {
      experience_points: newExperience,
      rank: promotionResult.newRank.name
    });

    // Mana reward is now handled by QuestEngine.grantQuestRewards()
    // Get the final mana reward amount from the quest
    const finalManaReward = completedQuest.quest.reward_amount;

    const response: any = {
      quest: completedQuest,
      rewards: {
        experience: experienceGained,
        mana: finalManaReward
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
    console.error('Quest completion error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}