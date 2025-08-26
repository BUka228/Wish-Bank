import { useState, useEffect, useCallback } from 'react';
import { 
  validateAdminAccess, 
  getAdminAuditLogs, 
  AdminValidationResponse, 
  AdminAuditLogResponse,
  AdminClientError 
} from '../admin-client';

export interface UseAdminResult {
  // Admin status
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  adminData: AdminValidationResponse | null;
  
  // Actions
  checkAdminAccess: () => Promise<void>;
  clearError: () => void;
}

export interface UseAdminAuditLogsResult {
  // Audit logs data
  auditLogs: AdminAuditLogResponse | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadAuditLogs: (options?: {
    limit?: number;
    offset?: number;
    actionType?: string;
    targetUserId?: string;
    startDate?: Date;
    endDate?: Date;
  }) => Promise<void>;
  refreshAuditLogs: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing admin access and validation
 */
export function useAdmin(): UseAdminResult {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<AdminValidationResponse | null>(null);

  // Debug logging for state changes
  console.log('🔄 useAdmin state:', { isAdmin, isLoading, error, adminData: !!adminData });

  const checkAdminAccess = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Checking admin access...');
      const response = await validateAdminAccess();
      console.log('✅ Admin access validated:', response);
      console.log('🔧 Setting isAdmin to true...');
      setAdminData(response);
      setIsAdmin(true);
      console.log('✅ State updated: isAdmin = true');
    } catch (err) {
      console.log('❌ Admin access validation failed:', err);
      console.log('🔧 Setting isAdmin to false...');
      if (err instanceof AdminClientError) {
        if (err.statusCode === 401 || err.statusCode === 403) {
          setIsAdmin(false);
          setError('Administrative privileges required');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to validate admin access');
      }
      setAdminData(null);
      setIsAdmin(false);
      console.log('❌ State updated: isAdmin = false');
    } finally {
      console.log('🏁 Setting isLoading to false...');
      setIsLoading(false);
      console.log('✅ Final state: isLoading = false');
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check admin access on mount
  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  return {
    isAdmin,
    isLoading,
    error,
    adminData,
    checkAdminAccess,
    clearError
  };
}

/**
 * Hook for managing admin audit logs
 */
export function useAdminAuditLogs(): UseAdminAuditLogsResult {
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOptions, setLastOptions] = useState<any>(null);

  const loadAuditLogs = useCallback(async (options: {
    limit?: number;
    offset?: number;
    actionType?: string;
    targetUserId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}) => {
    setIsLoading(true);
    setError(null);
    setLastOptions(options);
    
    try {
      const response = await getAdminAuditLogs(options);
      setAuditLogs(response);
    } catch (err) {
      if (err instanceof AdminClientError) {
        setError(err.message);
      } else {
        setError('Failed to load audit logs');
      }
      setAuditLogs(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshAuditLogs = useCallback(async () => {
    if (lastOptions) {
      await loadAuditLogs(lastOptions);
    } else {
      await loadAuditLogs();
    }
  }, [loadAuditLogs, lastOptions]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    auditLogs,
    isLoading,
    error,
    loadAuditLogs,
    refreshAuditLogs,
    clearError
  };
}

/**
 * Hook for admin operations with automatic logging
 */
export function useAdminOperation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await operation();
      return result;
    } catch (err) {
      if (err instanceof AdminClientError) {
        setError(`${operationName} failed: ${err.message}`);
      } else {
        setError(`${operationName} failed: Unknown error`);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    executeOperation,
    clearError
  };
}

/**
 * Hook for checking admin permissions for specific actions
 */
export function useAdminPermissions() {
  const { isAdmin, adminData } = useAdmin();

  const canPerformAction = useCallback((action: string): boolean => {
    if (!isAdmin || !adminData) {
      return false;
    }

    // In this implementation, admin has all permissions
    // In a more complex system, you might check specific permissions
    return adminData.config.operations_allowed;
  }, [isAdmin, adminData]);

  const getPermissionError = useCallback((action: string): string | null => {
    if (!isAdmin) {
      return 'Administrative privileges required';
    }
    
    if (!adminData?.config.operations_allowed) {
      return 'Admin operations are not allowed in current environment';
    }
    
    return null;
  }, [isAdmin, adminData]);

  return {
    isAdmin,
    canPerformAction,
    getPermissionError,
    adminConfig: adminData?.config || null
  };
}