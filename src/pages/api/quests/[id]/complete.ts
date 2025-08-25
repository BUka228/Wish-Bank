import { NextApiRequest, NextApiResponse } from 'next';
import { questEngine } from '../../../../lib/quest-engine';
import { getUserIdFromRequest } from '../../../../lib/telegram-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.query;
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid quest ID format' });
    }

    // The questEngine will handle all logic, including permission checks,
    // status validation, and reward distribution.
    const result = await questEngine.completeQuest(id, userId);

    return res.status(200).json(result);

  } catch (error: any) {
    console.error(`[API] /quests/${req.query.id}/complete:`, error);
    // The engine throws specific errors, which we can pass to the client.
    return res.status(500).json({ message: error.message || 'An internal server error occurred' });
  }
}