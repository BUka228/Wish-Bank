import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, getAdminAuditLog, validateAndLogAdminAction } from '../../../../lib/admin-security';

/**
 * Admin audit logs endpoint
 * GET /api/admin/audit/logs - Retrieve audit logs with filtering and pagination
 * 
 * Query parameters:
 * - limit: number of entries to return (default: 50, max: 200)
 * - offset: number of entries to skip (default: 0)
 * - action_type: filter by action type
 * - target_user_id: filter by target user ID
 * - start_date: filter by start date (ISO string)
 * - end_date: filter by end date (ISO string)
 */
export default withAdminAuth(async (req: NextApiRequest, res: NextApiResponse, adminUser) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse query parameters
    const {
      limit = '50',
      offset = '0',
      action_type,
      target_user_id,
      start_date,
      end_date
    } = req.query;

    // Validate and parse parameters
    const parsedLimit = Math.min(parseInt(limit as string) || 50, 200);
    const parsedOffset = Math.max(parseInt(offset as string) || 0, 0);
    
    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;

    // Validate dates
    if (start_date && isNaN(startDate!.getTime())) {
      return res.status(400).json({ error: 'Invalid start_date format' });
    }
    
    if (end_date && isNaN(endDate!.getTime())) {
      return res.status(400).json({ error: 'Invalid end_date format' });
    }

    // Log the audit log access
    await validateAndLogAdminAction(
      adminUser,
      'AUDIT_LOG_ACCESS',
      `Accessed audit logs with filters: limit=${parsedLimit}, offset=${parsedOffset}, action_type=${action_type || 'all'}`,
      undefined,
      undefined,
      {
        filters: {
          limit: parsedLimit,
          offset: parsedOffset,
          action_type: action_type || null,
          target_user_id: target_user_id || null,
          start_date: start_date || null,
          end_date: end_date || null
        }
      },
      req
    );

    // Retrieve audit logs
    const auditLogs = await getAdminAuditLog(
      parsedLimit,
      parsedOffset,
      action_type as string,
      target_user_id as string,
      startDate,
      endDate
    );

    // Get total count for pagination (simplified - in production you'd want a separate count query)
    const hasMore = auditLogs.length === parsedLimit;

    return res.status(200).json({
      success: true,
      data: auditLogs,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        has_more: hasMore,
        returned_count: auditLogs.length
      },
      filters: {
        action_type: action_type || null,
        target_user_id: target_user_id || null,
        start_date: start_date || null,
        end_date: end_date || null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Admin audit logs error:', error);
    
    // Log the error
    try {
      await validateAndLogAdminAction(
        adminUser,
        'AUDIT_LOG_ACCESS_ERROR',
        `Error accessing audit logs: ${error.message}`,
        undefined,
        undefined,
        { error: error.message },
        req
      );
    } catch (logError) {
      console.error('Failed to log audit access error:', logError);
    }

    return res.status(500).json({
      error: 'Failed to retrieve audit logs',
      message: error.message
    });
  }
});