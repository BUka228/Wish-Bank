import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, getAdminConfigStatus, isAdminOperationAllowed } from '../../../../lib/admin-security';

/**
 * Admin security validation endpoint
 * GET /api/admin/security/validate
 * 
 * This endpoint validates admin access and returns admin configuration status
 */
export default withAdminAuth(async (req: NextApiRequest, res: NextApiResponse, adminUser) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', ['GET', 'HEAD']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const configStatus = getAdminConfigStatus();
    const operationsAllowed = isAdminOperationAllowed();

    const responseData = {
      success: true,
      admin: {
        id: adminUser.id,
        name: adminUser.name,
        username: adminUser.username,
        telegram_id: adminUser.telegram_id,
        is_admin: adminUser.is_admin
      },
      config: {
        ...configStatus,
        operations_allowed: operationsAllowed
      },
      timestamp: new Date().toISOString()
    };

    // For HEAD requests, only send status and headers, no body
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    return res.status(200).json(responseData);
  } catch (error: any) {
    console.error('Admin validation error:', error);
    return res.status(500).json({
      error: 'Failed to validate admin access',
      message: error.message
    });
  }
});