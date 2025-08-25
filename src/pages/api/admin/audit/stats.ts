import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, validateAndLogAdminAction } from '../../../../lib/admin-security';
import { getAuditLogStats, getActionTypeStats } from '../../../../lib/admin-audit-functions';

/**
 * Admin audit statistics endpoint
 * GET /api/admin/audit/stats - Get audit log statistics and analytics
 */
export default withAdminAuth(async (req: NextApiRequest, res: NextApiResponse, adminUser) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log the stats access
    await validateAndLogAdminAction(
      adminUser,
      'AUDIT_STATS_ACCESS',
      'Accessed audit log statistics',
      undefined,
      undefined,
      undefined,
      req
    );

    // Get general statistics
    const stats = await getAuditLogStats();
    
    // Get action type statistics
    const actionTypeStats = await getActionTypeStats(undefined, 15);

    return res.status(200).json({
      success: true,
      stats,
      actionTypeStats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Admin audit stats error:', error);
    
    // Log the error
    try {
      await validateAndLogAdminAction(
        adminUser,
        'AUDIT_STATS_ACCESS_ERROR',
        `Error accessing audit stats: ${error.message}`,
        undefined,
        undefined,
        { error: error.message },
        req
      );
    } catch (logError) {
      console.error('Failed to log audit stats error:', logError);
    }

    return res.status(500).json({
      error: 'Failed to retrieve audit statistics',
      message: error.message
    });
  }
});