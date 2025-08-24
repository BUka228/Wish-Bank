import { NextApiRequest, NextApiResponse } from 'next';
import { EventGenerator } from '../../../lib/event-generator';
import { getUserFromRequest } from '../../../lib/telegram-auth';

const eventGenerator = new EventGenerator();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get current active event for user
    const currentEvent = await eventGenerator.getUserCurrentEvent(user.id);

    if (!currentEvent) {
      // Try to generate a new event
      const newEvent = await eventGenerator.generateRandomEvent(user.id);
      return res.status(200).json({ 
        event: newEvent,
        isNew: true 
      });
    }

    return res.status(200).json({ 
      event: currentEvent,
      isNew: false 
    });

  } catch (error) {
    console.error('Get current event error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}