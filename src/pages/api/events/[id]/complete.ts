import { NextApiRequest, NextApiResponse } from 'next';
import { eventGenerator } from '../../../../lib/event-generator';
import { getUserIdFromRequest } from '../../../../lib/telegram-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // The user completing the event is the partner, not the event owner.
    const partnerId = await getUserIdFromRequest(req);
    if (!partnerId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.query;
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid event ID format' });
    }

    // The eventGenerator will handle all logic: permission checks, status validation,
    // and reward distribution to the event owner.
    const result = await eventGenerator.completeRandomEvent(id, partnerId);

    return res.status(200).json(result);

  } catch (error: any) {
    console.error(`[API] /events/${req.query.id}/complete:`, error);
    return res.status(500).json({ message: error.message || 'An internal server error occurred' });
  }
}