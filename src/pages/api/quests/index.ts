import { NextApiRequest, NextApiResponse } from 'next';
import { QuestEngine } from '../../../lib/quest-engine';
import { RankCalculator } from '../../../lib/rank-calculator';
import { getUserFromRequest } from '../../../lib/telegram-auth';
import { Quest, CreateQuestRequest, User } from '../../../types/quest-economy';

const questEngine = new QuestEngine();
const rankCalculator = new RankCalculator();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET':
        return handleGetQuests(req, res, user);
      case 'POST':
        return handleCreateQuest(req, res, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Quest API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetQuests(req: NextApiRequest, res: NextApiResponse, user: User) {
  const { 
    status, 
    role = 'both',
    limit = '10' 
  } = req.query;

  const options: any = {};
  
  if (status) options.status = status as 'active' | 'completed' | 'expired' | 'cancelled';
  if (role) options.role = role as 'author' | 'assignee' | 'both';
  if (limit) options.limit = parseInt(limit as string);

  const quests = await questEngine.getUserQuests(user.id, options);
  
  return res.status(200).json({
    quests,
    total: quests.length
  });
}

async function handleCreateQuest(req: NextApiRequest, res: NextApiResponse, user: User) {
  const { 
    title, 
    description, 
    assignee_id, 
    category, 
    difficulty, 
    reward_type, 
    reward_amount,
    experience_reward,
    due_date 
  } = req.body;

  if (!title || !description || !assignee_id) {
    return res.status(400).json({ 
      error: 'Missing required fields: title, description, assignee_id' 
    });
  }

  const questData: CreateQuestRequest = {
    title,
    description,
    assignee_id,
    category,
    difficulty: difficulty as 'easy' | 'medium' | 'hard' | 'epic',
    reward_type,
    reward_amount,
    experience_reward,
    due_date: due_date ? new Date(due_date) : undefined
  };

  const result = await questEngine.createQuest(user.id, questData);
  
  return res.status(201).json(result);
}