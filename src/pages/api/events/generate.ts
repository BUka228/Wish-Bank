import { NextApiRequest, NextApiResponse } from 'next';
import { EventGenerator } from '../../../lib/event-generator';
import { getUserFromRequest } from '../../../lib/telegram-auth';

const eventGenerator = new EventGenerator();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user already has an active event
    const currentEvent = await eventGenerator.getUserCurrentEvent(user.id);
    if (currentEvent) {
      return res.status(400).json({ 
        error: 'User already has an active event',
        currentEvent 
      });
    }

    // Generate new random event
    const newEvent = await eventGenerator.generateRandomEvent(user.id);

    if (!newEvent) {
      return res.status(400).json({ 
        error: 'Could not generate event at this time' 
      });
    }

    return res.status(201).json({ 
      event: newEvent,
      message: 'New event generated successfully' 
    });

  } catch (error) {
    console.error('Event generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}