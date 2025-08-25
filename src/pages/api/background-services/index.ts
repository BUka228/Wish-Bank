import { NextApiRequest, NextApiResponse } from 'next';
import { backgroundServices } from '../../../lib/background-services';

/**
 * Background Services API
 * Manages the lifecycle of background automation services
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        // Get service status
        const status = backgroundServices.getStatus();
        return res.status(200).json({
          success: true,
          data: status
        });

      case 'POST':
        // Start services
        const { action } = req.body;
        
        if (action === 'start') {
          backgroundServices.start();
          return res.status(200).json({
            success: true,
            message: 'Background services started successfully'
          });
        } else if (action === 'stop') {
          backgroundServices.stop();
          return res.status(200).json({
            success: true,
            message: 'Background services stopped successfully'
          });
        } else {
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Use "start" or "stop"'
          });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          success: false,
          error: `Method ${req.method} not allowed`
        });
    }
  } catch (error) {
    console.error('Background services API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}