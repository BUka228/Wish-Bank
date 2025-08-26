/**
 * Client-side utilities for admin functionality
 * This file contains helper functions for making admin API calls and handling admin-specific UI logic
 */

export interface AdminValidationResponse {
  success: boolean;
  admin: {
    id: string;
    name: string;
    username?: string;
    telegram_id: string;
    is_admin: boolean;
  };
  config: {
    isConfigured: boolean;
    adminTelegramId?: string;
    environment: string;
    operations_allowed: boolean;
  };
  timestamp: string;
}

export interface AdminAuditLogResponse {
  success: boolean;
  data: AdminAuditLogEntry[];
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
    returned_count: number;
  };
  filters: {
    action_type: string | null;
    target_user_id: string | null;
    start_date: string | null;
    end_date: string | null;
  };
  timestamp: string;
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
  created_at: string;
}

export class AdminClientError extends Error {
  constructor(message: string, public statusCode: number, public code?: string) {
    super(message);
    this.name = 'AdminClientError';
  }
}

/**
 * Validates admin access and returns admin information
 */
export async function validateAdminAccess(): Promise<AdminValidationResponse> {
  try {
    const response = await fetch('/api/admin/security/validate', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add authorization header if available
        ...(getAuthToken() && { 'Authorization': `Bearer ${getAuthToken()}` })
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AdminClientError(
        errorData.error || 'Failed to validate admin access',
        response.status,
        errorData.code
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AdminClientError) {
      throw error;
    }
    throw new AdminClientError('Network error during admin validation', 500);
  }
}

/**
 * Retrieves admin audit logs with optional filtering
 */
export async function getAdminAuditLogs(options: {
  limit?: number;
  offset?: number;
  actionType?: string;
  targetUserId?: string;
  startDate?: Date;
  endDate?: Date;
} = {}): Promise<AdminAuditLogResponse> {
  try {
    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.actionType) params.append('action_type', options.actionType);
    if (options.targetUserId) params.append('target_user_id', options.targetUserId);
    if (options.startDate) params.append('start_date', options.startDate.toISOString());
    if (options.endDate) params.append('end_date', options.endDate.toISOString());

    const response = await fetch(`/api/admin/audit/logs?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() && { 'Authorization': `Bearer ${getAuthToken()}` })
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AdminClientError(
        errorData.error || 'Failed to retrieve audit logs',
        response.status,
        errorData.code
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AdminClientError) {
      throw error;
    }
    throw new AdminClientError('Network error during audit log retrieval', 500);
  }
}

/**
 * Checks if the current user has admin privileges
 * This is a client-side check and should not be relied upon for security
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    await validateAdminAccess();
    return true;
  } catch (error) {
    if (error instanceof AdminClientError && (error.statusCode === 401 || error.statusCode === 403)) {
      return false;
    }
    // For other errors, we can't determine admin status
    throw error;
  }
}

/**
 * Formats admin audit log entries for display
 */
export function formatAuditLogEntry(entry: AdminAuditLogEntry): {
  title: string;
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
} {
  const timestamp = new Date(entry.created_at).toLocaleString();
  
  // Determine severity based on action type
  let severity: 'low' | 'medium' | 'high' = 'low';
  if (entry.action_type.includes('DELETE') || entry.action_type.includes('UNAUTHORIZED')) {
    severity = 'high';
  } else if (entry.action_type.includes('UPDATE') || entry.action_type.includes('CREATE')) {
    severity = 'medium';
  }

  // Determine category
  let category = 'General';
  if (entry.action_type.includes('USER')) category = 'User Management';
  else if (entry.action_type.includes('WISH')) category = 'Wish Management';
  else if (entry.action_type.includes('MANA')) category = 'Mana System';
  else if (entry.action_type.includes('AUDIT')) category = 'Audit System';
  else if (entry.action_type.includes('SECURITY') || entry.action_type.includes('AUTH')) category = 'Security';

  return {
    title: formatActionType(entry.action_type),
    description: entry.reason,
    timestamp,
    severity,
    category
  };
}

/**
 * Formats action type for display
 */
function formatActionType(actionType: string): string {
  return actionType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Gets Telegram Web App authentication data
 */
function getAuthToken(): string | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp.initData;
  }
  
  return null;
}

/**
 * Admin action types for filtering and display
 */
export const ADMIN_ACTION_TYPES = {
  // User management
  USER_PARAMETER_UPDATE: 'User Parameter Update',
  USER_MANA_ADJUSTMENT: 'User Mana Adjustment',
  USER_RANK_CHANGE: 'User Rank Change',
  USER_EXPERIENCE_ADJUSTMENT: 'User Experience Adjustment',
  
  // Wish management
  SHARED_WISH_CREATE: 'Shared Wish Created',
  SHARED_WISH_UPDATE: 'Shared Wish Updated',
  SHARED_WISH_DELETE: 'Shared Wish Deleted',
  
  // Security and access
  ADMIN_ENDPOINT_ACCESS: 'Admin Endpoint Access',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'Unauthorized Access Attempt',
  AUDIT_LOG_ACCESS: 'Audit Log Access',
  
  // System
  AUDIT_SYSTEM_INITIALIZED: 'Audit System Initialized',
  SYSTEM_MAINTENANCE: 'System Maintenance'
} as const;

/**
 * Helper to get all available action types for filtering
 */
export function getAvailableActionTypes(): Array<{ value: string; label: string }> {
  return Object.entries(ADMIN_ACTION_TYPES).map(([key, label]) => ({
    value: key,
    label
  }));
}