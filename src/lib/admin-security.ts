import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from './telegram-auth';
import { neon } from '@neondatabase/serverless';

// Admin security configuration
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID; // @nikirO1's Telegram ID

export interface AdminUser {
  id: string;
  telegram_id: string;
  name: string;
  username?: string;
  is_admin: boolean;
}

export interface AdminAuditLogEntry {
  id: string;
  admin_user_id: string;
  target_user_id?: string;
  action_type: string;
  old_values?: any;
  new_values?: any;
  reason: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export class AdminSecurityError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AdminSecurityError';
  }
}

/**
 * Validates if the current user has administrative privileges
 * Only @nikirO1 (specified by ADMIN_TELEGRAM_ID) has admin access
 */
export async function validateAdminAccess(userId: string): Promise<boolean> {
  try {
    // Check if user's telegram_id matches the admin telegram ID
    const sql = neon(process.env.DATABASE_URL!);
    
    // If userId looks like a Telegram ID (numeric string), search by telegram_id
    // Otherwise, search by UUID
    let result;
    if (/^\d+$/.test(userId)) {
      // userId is a Telegram ID
      result = await sql`
        SELECT telegram_id FROM users WHERE telegram_id = ${userId}
      `;
    } else {
      // userId is a UUID
      result = await sql`
        SELECT telegram_id FROM users WHERE id = ${userId}
      `;
    }
    
    if (result.length === 0) {
      return false;
    }
    
    return result[0].telegram_id === ADMIN_TELEGRAM_ID;
  } catch (error) {
    console.error('Error validating admin access:', error);
    return false;
  }
}

/**
 * Validates admin access by telegram_id directly
 */
export async function validateAdminAccessByTelegramId(telegramId: string): Promise<boolean> {
  if (!ADMIN_TELEGRAM_ID) {
    return false;
  }
  return telegramId === ADMIN_TELEGRAM_ID;
}

/**
 * Gets admin user information if the user has admin privileges
 */
export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // If userId looks like a Telegram ID (numeric string), search by telegram_id
    // Otherwise, search by UUID
    let result;
    if (/^\d+$/.test(userId)) {
      // userId is a Telegram ID
      result = await sql`
        SELECT id, telegram_id, name, username 
        FROM users 
        WHERE telegram_id = ${userId} AND telegram_id = ${ADMIN_TELEGRAM_ID}
      `;
    } else {
      // userId is a UUID
      result = await sql`
        SELECT id, telegram_id, name, username 
        FROM users 
        WHERE id = ${userId} AND telegram_id = ${ADMIN_TELEGRAM_ID}
      `;
    }
    
    if (result.length === 0) {
      return null;
    }
    
    const user = result[0];
    return {
      id: user.id,
      telegram_id: user.telegram_id,
      name: user.name,
      username: user.username,
      is_admin: true
    };
  } catch (error) {
    console.error('Error getting admin user:', error);
    return null;
  }
}

/**
 * Logs administrative actions for audit purposes
 */
export async function logAdminAction(
  adminId: string,
  actionType: string,
  reason: string,
  targetUserId?: string,
  oldValues?: any,
  newValues?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // Convert Telegram IDs to UUIDs if needed
    let adminUuid = adminId;
    let targetUuid = targetUserId;
    
    if (/^\d+$/.test(adminId)) {
      // adminId is a Telegram ID, get the UUID
      const adminResult = await sql`SELECT id FROM users WHERE telegram_id = ${adminId}`;
      if (adminResult.length > 0) {
        adminUuid = adminResult[0].id;
      }
    }
    
    if (targetUserId && /^\d+$/.test(targetUserId)) {
      // targetUserId is a Telegram ID, get the UUID
      const targetResult = await sql`SELECT id FROM users WHERE telegram_id = ${targetUserId}`;
      if (targetResult.length > 0) {
        targetUuid = targetResult[0].id;
      }
    }
    
    await sql`
      INSERT INTO admin_audit_log 
      (admin_user_id, target_user_id, action_type, old_values, new_values, reason, ip_address, user_agent)
      VALUES (
        ${adminUuid}, 
        ${targetUuid || null}, 
        ${actionType}, 
        ${oldValues ? JSON.stringify(oldValues) : null}, 
        ${newValues ? JSON.stringify(newValues) : null}, 
        ${reason}, 
        ${ipAddress || null}, 
        ${userAgent || null}
      )
    `;
    
    console.log(`Admin action logged: ${actionType} by ${adminId}`, {
      targetUserId,
      reason,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
    // Don't throw error here to avoid breaking the main operation
  }
}

/**
 * Retrieves admin audit log entries with pagination and filtering
 */
export async function getAdminAuditLog(
  limit: number = 50,
  offset: number = 0,
  actionType?: string,
  targetUserId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<AdminAuditLogEntry[]> {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // Build the query with proper filtering
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    
    if (actionType) {
      whereConditions.push(`aal.action_type = $${queryParams.length + 1}`);
      queryParams.push(actionType);
    }
    
    if (targetUserId) {
      whereConditions.push(`aal.target_user_id = $${queryParams.length + 1}`);
      queryParams.push(targetUserId);
    }
    
    if (startDate) {
      whereConditions.push(`aal.created_at >= $${queryParams.length + 1}`);
      queryParams.push(startDate.toISOString());
    }
    
    if (endDate) {
      whereConditions.push(`aal.created_at <= $${queryParams.length + 1}`);
      queryParams.push(endDate.toISOString());
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // For now, use a simpler query that works with neon's template literal syntax
    if (whereConditions.length === 0) {
      // No filters - simple query
      const result = await sql`
        SELECT 
          aal.id,
          aal.admin_user_id,
          aal.target_user_id,
          aal.action_type,
          aal.old_values,
          aal.new_values,
          aal.reason,
          aal.ip_address,
          aal.user_agent,
          aal.created_at
        FROM admin_audit_log aal
        ORDER BY aal.created_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      return result.map((row: any) => {
        let oldValues = null;
        let newValues = null;
        
        // Safely parse JSON values
        if (row.old_values && typeof row.old_values === 'string') {
          try {
            oldValues = JSON.parse(row.old_values);
          } catch (e) {
            console.warn('Failed to parse old_values JSON:', e);
            oldValues = row.old_values;
          }
        } else if (row.old_values && typeof row.old_values === 'object') {
          oldValues = row.old_values;
        }
        
        if (row.new_values && typeof row.new_values === 'string') {
          try {
            newValues = JSON.parse(row.new_values);
          } catch (e) {
            console.warn('Failed to parse new_values JSON:', e);
            newValues = row.new_values;
          }
        } else if (row.new_values && typeof row.new_values === 'object') {
          newValues = row.new_values;
        }
        
        return {
          id: row.id,
          admin_user_id: row.admin_user_id,
          target_user_id: row.target_user_id,
          action_type: row.action_type,
          old_values: oldValues,
          new_values: newValues,
          reason: row.reason,
          ip_address: row.ip_address,
          user_agent: row.user_agent,
          created_at: new Date(row.created_at)
        };
      });
    } else {
      // For filtered queries, we'll need to use a different approach
      // This is a simplified version - in production you'd want more sophisticated filtering
      const result = await sql`
        SELECT 
          aal.id,
          aal.admin_user_id,
          aal.target_user_id,
          aal.action_type,
          aal.old_values,
          aal.new_values,
          aal.reason,
          aal.ip_address,
          aal.user_agent,
          aal.created_at
        FROM admin_audit_log aal
        ORDER BY aal.created_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      // Apply client-side filtering for now (not ideal for large datasets)
      let filteredResult = result;
      
      if (actionType) {
        filteredResult = filteredResult.filter((row: any) => row.action_type === actionType);
      }
      
      if (targetUserId) {
        filteredResult = filteredResult.filter((row: any) => row.target_user_id === targetUserId);
      }
      
      if (startDate) {
        filteredResult = filteredResult.filter((row: any) => new Date(row.created_at) >= startDate);
      }
      
      if (endDate) {
        filteredResult = filteredResult.filter((row: any) => new Date(row.created_at) <= endDate);
      }
      
      return filteredResult.map((row: any) => {
        let oldValues = null;
        let newValues = null;
        
        // Safely parse JSON values
        if (row.old_values && typeof row.old_values === 'string') {
          try {
            oldValues = JSON.parse(row.old_values);
          } catch (e) {
            console.warn('Failed to parse old_values JSON:', e);
            oldValues = row.old_values;
          }
        } else if (row.old_values && typeof row.old_values === 'object') {
          oldValues = row.old_values;
        }
        
        if (row.new_values && typeof row.new_values === 'string') {
          try {
            newValues = JSON.parse(row.new_values);
          } catch (e) {
            console.warn('Failed to parse new_values JSON:', e);
            newValues = row.new_values;
          }
        } else if (row.new_values && typeof row.new_values === 'object') {
          newValues = row.new_values;
        }
        
        return {
          id: row.id,
          admin_user_id: row.admin_user_id,
          target_user_id: row.target_user_id,
          action_type: row.action_type,
          old_values: oldValues,
          new_values: newValues,
          reason: row.reason,
          ip_address: row.ip_address,
          user_agent: row.user_agent,
          created_at: new Date(row.created_at)
        };
      });
    }
  } catch (error) {
    console.error('Error retrieving admin audit log:', error);
    return [];
  }
}

/**
 * Middleware to protect admin-only API endpoints
 */
export function withAdminAuth(
  handler: (req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) => Promise<any>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Get user from request
      const user = await getUserFromRequest(req);
      if (!user) {
        throw new AdminSecurityError('Authentication required', 'AUTH_REQUIRED');
      }
      
      // Validate admin access
      const isAdmin = await validateAdminAccess(user.id);
      if (!isAdmin) {
        // Log unauthorized access attempt
        await logAdminAction(
          user.id,
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          `Attempted to access admin endpoint: ${req.url}`,
          undefined,
          undefined,
          undefined,
          getClientIP(req),
          req.headers['user-agent']
        );
        
        throw new AdminSecurityError('Administrative privileges required', 'ADMIN_REQUIRED');
      }
      
      // Get full admin user info
      const adminUser = await getAdminUser(user.id);
      if (!adminUser) {
        throw new AdminSecurityError('Admin user not found', 'ADMIN_NOT_FOUND');
      }
      
      // Log admin endpoint access
      await logAdminAction(
        adminUser.id,
        'ADMIN_ENDPOINT_ACCESS',
        `Accessed admin endpoint: ${req.method} ${req.url}`,
        undefined,
        undefined,
        undefined,
        getClientIP(req),
        req.headers['user-agent']
      );
      
      // Call the actual handler with admin user
      return await handler(req, res, adminUser);
      
    } catch (error: any) {
      console.error('Admin auth middleware error:', error);
      
      if (error instanceof AdminSecurityError) {
        const statusCode = error.code === 'AUTH_REQUIRED' ? 401 : 403;
        return res.status(statusCode).json({
          error: error.message,
          code: error.code
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Utility function to get client IP address
 */
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.socket.remoteAddress;
  
  return ip || 'unknown';
}

/**
 * Validates admin action parameters and logs the action
 */
export async function validateAndLogAdminAction(
  adminUser: AdminUser,
  actionType: string,
  reason: string,
  targetUserId?: string,
  oldValues?: any,
  newValues?: any,
  req?: NextApiRequest
): Promise<void> {
  // Validate reason is provided
  if (!reason || reason.trim().length === 0) {
    throw new AdminSecurityError('Reason is required for all admin actions', 'REASON_REQUIRED');
  }
  
  // Validate reason length
  if (reason.length > 500) {
    throw new AdminSecurityError('Reason must be less than 500 characters', 'REASON_TOO_LONG');
  }
  
  // Log the action
  await logAdminAction(
    adminUser.id,
    actionType,
    reason,
    targetUserId,
    oldValues,
    newValues,
    req ? getClientIP(req) : undefined,
    req ? req.headers['user-agent'] : undefined
  );
}

/**
 * Check if current environment allows admin operations
 */
export function isAdminOperationAllowed(): boolean {
  // In development, allow admin operations for testing
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // In production, require proper admin telegram ID to be set
  return !!process.env.ADMIN_TELEGRAM_ID;
}

/**
 * Get admin configuration status
 */
export function getAdminConfigStatus(): {
  isConfigured: boolean;
  adminTelegramId?: string;
  environment: string;
} {
  return {
    isConfigured: !!process.env.ADMIN_TELEGRAM_ID,
    adminTelegramId: process.env.NODE_ENV === 'development' ? process.env.ADMIN_TELEGRAM_ID : undefined,
    environment: process.env.NODE_ENV || 'development'
  };
}