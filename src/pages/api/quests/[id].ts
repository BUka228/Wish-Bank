import { NextApiRequest, NextApiResponse } from 'next';
import { QuestEngine } from '../../../lib/quest-engine';
import { RankCalculator } from '../../../lib/rank-calculator';
import { EconomyEngine } from '../../../lib/economy-engine';
import { getUserFromRequest } from '../../../lib/telegram-auth';
import { getQuestById } from '../../../lib/db';
// Quest status types are defined inline

const questEngine = new QuestEngine();
const rankCalculator = new RankCalculator();
const economyEngine = new EconomyEngine();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    switch (req.method) {
      case 'GET':
        return handleGetQuest(req, res, questId);
      case 'PUT':
        return handleUpdateQuest(req, res, user, questId);
      case 'DELETE':
        return handleDeleteQuest(req, res, user, questId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Quest API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetQuest(req: NextApiRequest, res: NextApiResponse, questId: number) {
  const quest = await getQuestById(String(questId));
  
  if (!quest) {
    return res.status(404).json({ error: 'Quest not found' });
  }

  return res.status(200).json({ quest });
}

async function handleUpdateQuest(req: NextApiRequest, res: NextApiResponse, user: any, questId: number) {
  const quest = await getQuestById(String(questId));
  
  if (!quest) {
    return res.status(404).json({ error: 'Quest not found' });
  }

  // Check permissions - only creator or assigned user can update
  if (quest.author_id !== user.id && quest.assignee_id !== user.id) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  const { title, description, status, reward, deadline } = req.body;
  
  const updateData: any = {};
  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (status) updateData.status = status;
  if (reward !== undefined) updateData.reward = reward;
  if (deadline) updateData.deadline = new Date(deadline);

  const updatedQuest = await questEngine.updateQuest(String(questId), user.id, updateData);
  
  return res.status(200).json({ quest: updatedQuest });
}

async function handleDeleteQuest(req: NextApiRequest, res: NextApiResponse, user: any, questId: number) {
  const quest = await getQuestById(String(questId));
  
  if (!quest) {
    return res.status(404).json({ error: 'Quest not found' });
  }

  // Only creator can delete quest
  if (quest.author_id !== user.id) {
    return res.status(403).json({ error: 'Only quest creator can delete quest' });
  }

  // Can't delete completed quests
  if (quest.status === 'completed') {
    return res.status(400).json({ error: 'Cannot delete completed quest' });
  }

  await questEngine.cancelQuest(String(questId), user.id);
  
  return res.status(200).json({ message: 'Quest deleted successfully' });
}