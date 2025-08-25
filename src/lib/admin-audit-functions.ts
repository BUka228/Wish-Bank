/**
 * Administrative Audit Logging Functions
 * Provides utilities for logging all administrative actions
 */

import { sql } from './db-pool';

export interface AdminAuditLogEntry {
  adminUserId: string;
  targetUserId?: string;
  actionType: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AdminAuditLogQuery {
  adminUserId?: string;
  targetUserId?: string;
  actionType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Log an administrative action to the audit log
 */
export async function logAdminAction(entry: AdminAuditLogEntry): Promise<void> {
  try {
    await sql`
      INSERT INTO admin_audit_log (
        admin_user_id,
        target_user_id,
        action_type,
        old_values,
        new_values,
        reason,
        ip_address,
        user_agent
      ) VALUES (
        ${entry.adminUserId},
        ${entry.targetUserId || null},
        ${entry.actionType},
        ${entry.oldValues ? JSON.stringify(entry.oldValues) : null},
        ${entry.newValues ? JSON.stringify(entry.newValues) : null},
        ${entry.reason},
        ${entry.ipAddress || null},
        ${entry.userAgent || null}
      )
    `;
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw - we don't want audit logging failures to break the main operation
  }
}

/**
 * Query audit log entries with filtering and pagination
 */
export async function getAuditLogs(query: AdminAuditLogQuery = {}) {
  let sqlQuery = sql`
    SELECT 
      aal.id,
      aal.admin_user_id,
      au.name as admin_name,
      au.username as admin_username,
      aal.target_user_id,
      tu.name as target_user_name,
      tu.username as target_username,
      aal.action_type,
      aal.old_values,
      aal.new_values,
      aal.reason,
      aal.ip_address,
      aal.user_agent,
      aal.created_at
    FROM admin_audit_log aal
    LEFT JOIN users au ON aal.admin_user_id = au.id
    LEFT JOIN users tu ON aal.target_user_id = tu.id
  `;

  // Build WHERE conditions
  const conditions = [];
  if (query.adminUserId) {
    conditions.push(sql`aal.admin_user_id = ${query.adminUserId}`);
  }
  if (query.targetUserId) {
    conditions.push(sql`aal.target_user_id = ${query.targetUserId}`);
  }
  if (query.actionType) {
    conditions.push(sql`aal.action_type = ${query.actionType}`);
  }
  if (query.startDate) {
    conditions.push(sql`aal.created_at >= ${query.startDate}`);
  }
  if (query.endDate) {
    conditions.push(sql`aal.created_at <= ${query.endDate}`);
  }

  // Add WHERE clause if conditions exist
  if (conditions.length > 0) {
    const whereClause = conditions.reduce((acc, condition, index) => {
      return index === 0 ? sql`WHERE ${condition}` : sql`${acc} AND ${condition}`;
    });
    sqlQuery = sql`${sqlQuery} ${whereClause}`;
  }

  // Add ORDER BY and LIMIT
  const limit = query.limit || 50;
  const offset = query.offset || 0;
  sqlQuery = sql`${sqlQuery} ORDER BY aal.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

  const result = await sqlQuery;
  return result;
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(adminUserId?: string) {
  let query = sql`
    SELECT 
      COUNT(*) as total_actions,
      COUNT(DISTINCT action_type) as unique_action_types,
      COUNT(DISTINCT target_user_id) as affected_users,
      MIN(created_at) as first_action,
      MAX(created_at) as last_action,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as actions_last_24h,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as actions_last_week,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as actions_last_month
    FROM admin_audit_log
  `;

  if (adminUserId) {
    query = sql`${query} WHERE admin_user_id = ${adminUserId}`;
  }

  const result = await query;
  return result[0];
}

/**
 * Get most common action types
 */
export async function getActionTypeStats(adminUserId?: string, limit: number = 10) {
  let query = sql`
    SELECT 
      action_type,
      COUNT(*) as count,
      COUNT(DISTINCT target_user_id) as unique_targets,
      MAX(created_at) as last_used
    FROM admin_audit_log
  `;

  if (adminUserId) {
    query = sql`${query} WHERE admin_user_id = ${adminUserId}`;
  }

  query = sql`${query} GROUP BY action_type ORDER BY count DESC LIMIT ${limit}`;

  const result = await query;
  return result;
}

/**
 * Log user parameter change
 */
export async function logUserParameterChange(
  adminUserId: string,
  targetUserId: string,
  parameter: string,
  oldValue: any,
  newValue: any,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAdminAction({
    adminUserId,
    targetUserId,
    actionType: 'USER_PARAMETER_CHANGE',
    oldValues: { [parameter]: oldValue },
    newValues: { [parameter]: newValue },
    reason: `Changed ${parameter}: ${reason}`,
    ipAddress,
    userAgent
  });
}

/**
 * Log shared wish creation
 */
export async function logSharedWishCreation(
  adminUserId: string,
  sharedWishId: string,
  wishData: Record<string, any>,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAdminAction({
    adminUserId,
    actionType: 'SHARED_WISH_CREATED',
    newValues: { sharedWishId, ...wishData },
    reason: `Created shared wish: ${reason}`,
    ipAddress,
    userAgent
  });
}

/**
 * Log shared wish management action
 */
export async function logSharedWishManagement(
  adminUserId: string,
  sharedWishId: string,
  action: 'EDIT' | 'DELETE' | 'EXPIRE',
  reason: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAdminAction({
    adminUserId,
    actionType: `SHARED_WISH_${action}`,
    oldValues,
    newValues: { sharedWishId, ...newValues },
    reason: `${action.toLowerCase()} shared wish: ${reason}`,
    ipAddress,
    userAgent
  });
}

/**
 * Clean up old audit logs (should be run periodically)
 */
export async function cleanupOldAuditLogs(retentionDays: number = 730): Promise<number> {
  const result = await sql`
    DELETE FROM admin_audit_log 
    WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
  `;
  
  return result.length || 0;
}

/**
 * Export audit logs for a specific time period
 */
export async function exportAuditLogs(
  startDate: Date,
  endDate: Date,
  adminUserId?: string
): Promise<any[]> {
  let query = sql`
    SELECT 
      aal.id,
      aal.admin_user_id,
      au.name as admin_name,
      au.username as admin_username,
      aal.target_user_id,
      tu.name as target_user_name,
      tu.username as target_username,
      aal.action_type,
      aal.old_values,
      aal.new_values,
      aal.reason,
      aal.ip_address,
      aal.user_agent,
      aal.created_at
    FROM admin_audit_log aal
    LEFT JOIN users au ON aal.admin_user_id = au.id
    LEFT JOIN users tu ON aal.target_user_id = tu.id
    WHERE aal.created_at >= ${startDate} AND aal.created_at <= ${endDate}
  `;

  if (adminUserId) {
    query = sql`${query} AND aal.admin_user_id = ${adminUserId}`;
  }

  query = sql`${query} ORDER BY aal.created_at DESC`;

  const result = await query;
  return result;
}