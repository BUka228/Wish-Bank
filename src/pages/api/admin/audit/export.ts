import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, validateAndLogAdminAction } from '../../../../lib/admin-security';
import { exportAuditLogs } from '../../../../lib/admin-audit-functions';

// Generate recommendations based on analytics data
function generateRecommendations(analyticsData: any): string[] {
  const recommendations: string[] = [];
  
  if (!analyticsData) {
    return recommendations;
  }

  // Performance recommendations
  if (analyticsData.performanceMetrics?.errorRate > 5) {
    recommendations.push('Высокий процент ошибок - рекомендуется проверить стабильность системы');
  }

  // Activity pattern recommendations
  if (analyticsData.trendAnalysis?.activityTrend === 'increasing' && analyticsData.trendAnalysis.trendPercentage > 50) {
    recommendations.push('Резкий рост административной активности - рекомендуется мониторинг');
  }

  // Risk recommendations
  if (analyticsData.riskAnalysis?.highRiskActions > 0) {
    recommendations.push(`Обнаружено ${analyticsData.riskAnalysis.highRiskActions} высокорисковых действий - требуется проверка`);
  }

  // Time distribution recommendations
  const nightActivity = analyticsData.timeDistribution?.filter((h: any) => h.hour < 8 || h.hour > 22).reduce((sum: number, h: any) => sum + h.count, 0);
  if (nightActivity > analyticsData.totalActions * 0.2) {
    recommendations.push('Высокая активность в нерабочее время - рекомендуется проверка безопасности');
  }

  // User impact recommendations
  if (analyticsData.systemImpactMetrics?.totalUsersAffected > analyticsData.uniqueUsers * 0.8) {
    recommendations.push('Большой процент пользователей затронут изменениями - рекомендуется мониторинг влияния');
  }

  return recommendations;
}

/**
 * Admin audit export endpoint
 * GET /api/admin/audit/export - Export audit logs in various formats
 * 
 * Query parameters:
 * - start_date: Start date for export (ISO string)
 * - end_date: End date for export (ISO string)
 * - format: Export format ('csv', 'json', or 'analytics')
 * - admin_user_id: Optional filter by admin user ID
 * - include_analytics: Include analytics data in export (boolean)
 */
export default withAdminAuth(async (req: NextApiRequest, res: NextApiResponse, adminUser) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { start_date, end_date, format = 'csv', admin_user_id, include_analytics } = req.query;

    // Validate required parameters
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    if (!['csv', 'json', 'analytics'].includes(format as string)) {
      return res.status(400).json({ error: 'format must be csv, json, or analytics' });
    }

    const startDate = new Date(start_date as string);
    const endDate = new Date(end_date as string);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Log the export action
    await validateAndLogAdminAction(
      adminUser,
      'AUDIT_LOG_EXPORT',
      `Exported audit logs in ${format} format for period ${start_date} to ${end_date}`,
      undefined,
      undefined,
      { 
        format, 
        start_date, 
        end_date, 
        admin_user_id: admin_user_id || null 
      },
      req
    );

    // Get audit logs for export
    const auditLogs = await exportAuditLogs(
      startDate,
      endDate,
      admin_user_id as string
    );

    // Get analytics data if requested
    let analyticsData = null;
    if (include_analytics === 'true' || format === 'analytics') {
      // Fetch analytics data (reuse logic from analytics endpoint)
      const analyticsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/audit/analytics?start_date=${start_date}&end_date=${end_date}`, {
        headers: {
          'Authorization': req.headers.authorization || '',
          'Cookie': req.headers.cookie || ''
        }
      });
      
      if (analyticsResponse.ok) {
        const analyticsResult = await analyticsResponse.json();
        analyticsData = analyticsResult.analytics;
      }
    }

    if (format === 'analytics') {
      // Analytics-focused export
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="admin-analytics-report-${start_date}-${end_date}.json"`
      );

      const exportData = {
        metadata: {
          export_date: new Date().toISOString(),
          export_type: 'analytics',
          period: {
            start_date,
            end_date
          },
          total_audit_records: auditLogs.length,
          exported_by: {
            admin_user_id: adminUser.id,
            admin_name: adminUser.name,
            admin_username: adminUser.username
          }
        },
        analytics: analyticsData,
        summary_audit_logs: auditLogs.slice(0, 100), // Include sample of recent logs
        recommendations: generateRecommendations(analyticsData)
      };

      return res.status(200).json(exportData);
    } else if (format === 'json') {
      // JSON export
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="admin-audit-export-${start_date}-${end_date}.json"`
      );

      const exportData = {
        metadata: {
          export_date: new Date().toISOString(),
          export_type: 'full_audit',
          period: {
            start_date,
            end_date
          },
          total_records: auditLogs.length,
          exported_by: {
            admin_user_id: adminUser.id,
            admin_name: adminUser.name,
            admin_username: adminUser.username
          }
        },
        audit_logs: auditLogs,
        analytics: include_analytics === 'true' ? analyticsData : null
      };

      return res.status(200).json(exportData);
    } else {
      // CSV export
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="admin-audit-export-${start_date}-${end_date}.csv"`
      );

      // CSV headers
      const csvHeaders = [
        'ID',
        'Дата и время',
        'Администратор',
        'Имя администратора',
        'Целевой пользователь ID',
        'Имя целевого пользователя',
        'Тип действия',
        'Старые значения',
        'Новые значения',
        'Причина',
        'IP адрес',
        'User Agent'
      ];

      let csvContent = csvHeaders.join(',') + '\n';

      // CSV rows
      auditLogs.forEach(log => {
        const row = [
          `"${log.id}"`,
          `"${log.created_at}"`,
          `"${log.admin_username || ''}"`,
          `"${log.admin_name || ''}"`,
          `"${log.target_user_id || ''}"`,
          `"${log.target_user_name || ''}"`,
          `"${log.action_type}"`,
          `"${log.old_values ? JSON.stringify(log.old_values).replace(/"/g, '""') : ''}"`,
          `"${log.new_values ? JSON.stringify(log.new_values).replace(/"/g, '""') : ''}"`,
          `"${log.reason.replace(/"/g, '""')}"`,
          `"${log.ip_address || ''}"`,
          `"${log.user_agent ? log.user_agent.replace(/"/g, '""') : ''}"`
        ];
        csvContent += row.join(',') + '\n';
      });

      return res.status(200).send(csvContent);
    }
  } catch (error: any) {
    console.error('Admin audit export error:', error);
    
    // Log the error
    try {
      await validateAndLogAdminAction(
        adminUser,
        'AUDIT_LOG_EXPORT_ERROR',
        `Error exporting audit logs: ${error.message}`,
        undefined,
        undefined,
        { error: error.message },
        req
      );
    } catch (logError) {
      console.error('Failed to log audit export error:', logError);
    }

    return res.status(500).json({
      error: 'Failed to export audit logs',
      message: error.message
    });
  }
});