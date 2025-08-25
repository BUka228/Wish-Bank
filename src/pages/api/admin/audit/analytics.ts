import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, validateAndLogAdminAction } from '../../../../lib/admin-security';
import { sql } from '../../../../lib/db-pool';
import { format, eachDayOfInterval } from 'date-fns';

/**
 * Admin audit analytics endpoint
 * GET /api/admin/audit/analytics - Get comprehensive analytics data
 * 
 * Query parameters:
 * - start_date: Start date for analysis (ISO string)
 * - end_date: End date for analysis (ISO string)
 */
export default withAdminAuth(async (req: NextApiRequest, res: NextApiResponse, adminUser) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { start_date, end_date } = req.query;

    // Validate dates
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    const startDate = new Date(start_date as string);
    const endDate = new Date(end_date as string);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Log the analytics access
    await validateAndLogAdminAction(
      adminUser,
      'AUDIT_ANALYTICS_ACCESS',
      `Accessed audit analytics for period ${start_date} to ${end_date}`,
      undefined,
      undefined,
      { start_date, end_date },
      req
    );

    // Get total actions and unique users
    const [totalStats] = await sql`
      SELECT 
        COUNT(*) as total_actions,
        COUNT(DISTINCT target_user_id) as unique_users
      FROM admin_audit_log 
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
    `;

    // Get actions by day
    const actionsByDay = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM admin_audit_log 
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    // Fill in missing days with 0 count
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    const actionsByDayComplete = dateRange.map((date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const existing = actionsByDay.find(item => item.date === dateStr);
      return {
        date: dateStr,
        count: existing ? parseInt(existing.count) : 0
      };
    });

    // Get actions by type with percentages
    const actionsByType = await sql`
      SELECT 
        action_type,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM admin_audit_log WHERE created_at >= ${startDate} AND created_at <= ${endDate})), 2) as percentage
      FROM admin_audit_log 
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY action_type
      ORDER BY count DESC
    `;

    // Get user impact analysis
    const userImpactAnalysis = await sql`
      SELECT 
        aal.target_user_id as user_id,
        u.name as user_name,
        COUNT(*) as actions_count,
        MAX(aal.created_at) as last_action,
        MODE() WITHIN GROUP (ORDER BY aal.action_type) as most_common_action
      FROM admin_audit_log aal
      LEFT JOIN users u ON aal.target_user_id = u.id
      WHERE aal.created_at >= ${startDate} 
        AND aal.created_at <= ${endDate}
        AND aal.target_user_id IS NOT NULL
      GROUP BY aal.target_user_id, u.name
      ORDER BY actions_count DESC
      LIMIT 20
    `;

    // Get system impact metrics
    const [systemImpactMetrics] = await sql`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN action_type = 'USER_PARAMETER_CHANGE' 
            AND new_values->>'mana_balance' IS NOT NULL 
          THEN ABS((new_values->>'mana_balance')::numeric - COALESCE((old_values->>'mana_balance')::numeric, 0))
          ELSE 0 
        END), 0) as total_mana_adjusted,
        COUNT(DISTINCT target_user_id) as total_users_affected,
        ROUND(COUNT(*)::numeric / GREATEST(EXTRACT(days FROM ${endDate}::timestamp - ${startDate}::timestamp), 1), 2) as average_actions_per_day
      FROM admin_audit_log 
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
    `;

    // Get peak activity day
    const [peakActivity] = await sql`
      SELECT 
        DATE(created_at) as peak_activity_day,
        COUNT(*) as peak_activity_count
      FROM admin_audit_log 
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `;

    // Get time distribution (by hour)
    const timeDistribution = await sql`
      SELECT 
        EXTRACT(hour FROM created_at) as hour,
        COUNT(*) as count
      FROM admin_audit_log 
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY EXTRACT(hour FROM created_at)
      ORDER BY hour
    `;

    // Fill in missing hours with 0 count
    const timeDistributionComplete = Array.from({ length: 24 }, (_, hour) => {
      const existing = timeDistribution.find(item => parseInt(item.hour) === hour);
      return {
        hour,
        count: existing ? parseInt(existing.count) : 0
      };
    });

    // Calculate trend analysis (compare with previous period)
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousStartDate = new Date(startDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));
    const previousEndDate = new Date(startDate.getTime() - 1);

    const [previousPeriodStats] = await sql`
      SELECT COUNT(*) as previous_actions
      FROM admin_audit_log 
      WHERE created_at >= ${previousStartDate} AND created_at <= ${previousEndDate}
    `;

    const currentActions = parseInt(totalStats.total_actions);
    const previousActions = parseInt(previousPeriodStats.previous_actions);
    
    let activityTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    let trendPercentage = 0;
    
    if (previousActions > 0) {
      trendPercentage = ((currentActions - previousActions) / previousActions) * 100;
      if (Math.abs(trendPercentage) > 5) {
        activityTrend = trendPercentage > 0 ? 'increasing' : 'decreasing';
      }
    }

    // Calculate performance metrics
    const [performanceStats] = await sql`
      SELECT 
        COUNT(CASE WHEN action_type LIKE '%_ERROR' THEN 1 END) as failed_actions,
        COUNT(CASE WHEN action_type NOT LIKE '%_ERROR' THEN 1 END) as successful_actions,
        AVG(EXTRACT(EPOCH FROM (created_at - created_at)) * 1000) as avg_response_time
      FROM admin_audit_log 
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
    `;

    const failedActions = parseInt(performanceStats.failed_actions);
    const successfulActions = parseInt(performanceStats.successful_actions);
    const totalActionsForError = failedActions + successfulActions;
    const errorRate = totalActionsForError > 0 ? (failedActions / totalActionsForError) * 100 : 0;

    // Risk analysis - detect suspicious patterns
    const suspiciousPatterns = await sql`
      SELECT 
        'Массовые изменения параметров' as pattern,
        COUNT(*) as count,
        CASE 
          WHEN COUNT(*) > 50 THEN 'high'
          WHEN COUNT(*) > 20 THEN 'medium'
          ELSE 'low'
        END as risk_level
      FROM admin_audit_log 
      WHERE created_at >= ${startDate} 
        AND created_at <= ${endDate}
        AND action_type = 'USER_PARAMETER_CHANGE'
      HAVING COUNT(*) > 10
      
      UNION ALL
      
      SELECT 
        'Частые изменения одного пользователя' as pattern,
        MAX(user_changes) as count,
        CASE 
          WHEN MAX(user_changes) > 20 THEN 'high'
          WHEN MAX(user_changes) > 10 THEN 'medium'
          ELSE 'low'
        END as risk_level
      FROM (
        SELECT target_user_id, COUNT(*) as user_changes
        FROM admin_audit_log 
        WHERE created_at >= ${startDate} 
          AND created_at <= ${endDate}
          AND target_user_id IS NOT NULL
        GROUP BY target_user_id
        HAVING COUNT(*) > 5
      ) user_activity
      
      UNION ALL
      
      SELECT 
        'Активность в нерабочее время' as pattern,
        COUNT(*) as count,
        CASE 
          WHEN COUNT(*) > 30 THEN 'high'
          WHEN COUNT(*) > 15 THEN 'medium'
          ELSE 'low'
        END as risk_level
      FROM admin_audit_log 
      WHERE created_at >= ${startDate} 
        AND created_at <= ${endDate}
        AND (EXTRACT(hour FROM created_at) < 8 OR EXTRACT(hour FROM created_at) > 22)
      HAVING COUNT(*) > 5
    `;

    const highRiskActions = suspiciousPatterns.filter(p => p.risk_level === 'high').length;

    const analytics = {
      totalActions: parseInt(totalStats.total_actions),
      uniqueUsers: parseInt(totalStats.unique_users),
      actionsByDay: actionsByDayComplete,
      actionsByType: actionsByType.map(item => ({
        action_type: item.action_type,
        count: parseInt(item.count),
        percentage: parseFloat(item.percentage)
      })),
      userImpactAnalysis: userImpactAnalysis.map(item => ({
        user_id: item.user_id,
        user_name: item.user_name || 'Unknown User',
        actions_count: parseInt(item.actions_count),
        last_action: item.last_action,
        most_common_action: item.most_common_action
      })),
      systemImpactMetrics: {
        totalManaAdjusted: parseInt(systemImpactMetrics.total_mana_adjusted),
        totalUsersAffected: parseInt(systemImpactMetrics.total_users_affected),
        averageActionsPerDay: parseFloat(systemImpactMetrics.average_actions_per_day),
        peakActivityDay: peakActivity?.peak_activity_day || startDate.toISOString().split('T')[0],
        peakActivityCount: peakActivity ? parseInt(peakActivity.peak_activity_count) : 0
      },
      timeDistribution: timeDistributionComplete,
      trendAnalysis: {
        activityTrend,
        trendPercentage,
        comparisonPeriod: `${periodDays} дней`
      },
      performanceMetrics: {
        averageResponseTime: 150, // Simulated - would need actual timing data
        errorRate,
        successfulActions,
        failedActions
      },
      riskAnalysis: {
        highRiskActions,
        suspiciousPatterns: suspiciousPatterns.map(pattern => ({
          pattern: pattern.pattern,
          count: parseInt(pattern.count),
          risk_level: pattern.risk_level as 'low' | 'medium' | 'high'
        }))
      }
    };

    return res.status(200).json({
      success: true,
      analytics,
      period: {
        start_date,
        end_date
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Admin audit analytics error:', error);
    
    // Log the error
    try {
      await validateAndLogAdminAction(
        adminUser,
        'AUDIT_ANALYTICS_ACCESS_ERROR',
        `Error accessing audit analytics: ${error.message}`,
        undefined,
        undefined,
        { error: error.message },
        req
      );
    } catch (logError) {
      console.error('Failed to log audit analytics error:', logError);
    }

    return res.status(500).json({
      error: 'Failed to retrieve audit analytics',
      message: error.message
    });
  }
});