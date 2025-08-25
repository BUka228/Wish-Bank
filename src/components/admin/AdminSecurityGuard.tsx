import React from 'react';
import { useAdmin } from '../../lib/hooks/useAdmin';

interface AdminSecurityGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  requireOperationsAllowed?: boolean;
}

/**
 * Security guard component that protects admin-only content
 * Only renders children if user has admin privileges
 */
export function AdminSecurityGuard({
  children,
  fallback,
  loadingComponent,
  errorComponent,
  requireOperationsAllowed = true
}: AdminSecurityGuardProps) {
  const { isAdmin, isLoading, error, adminData } = useAdmin();

  // Show loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Проверка административных прав...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !isAdmin) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }
    
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800 mb-2">Доступ запрещен</h3>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <p className="text-red-500 text-xs">
              Для доступа к административной панели требуются права администратора.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if operations are allowed (if required)
  if (requireOperationsAllowed && adminData && !adminData.config.operations_allowed) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center max-w-md">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-yellow-800 mb-2">Операции недоступны</h3>
            <p className="text-yellow-600 text-sm mb-4">
              Административные операции отключены в текущем окружении.
            </p>
            <p className="text-yellow-500 text-xs">
              Окружение: {adminData.config.environment}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show fallback if not admin and no error (shouldn't happen, but just in case)
  if (!isAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <p className="text-gray-600">У вас нет прав для просмотра этого содержимого.</p>
        </div>
      </div>
    );
  }

  // User is admin - render children
  return <>{children}</>;
}

/**
 * Higher-order component version of AdminSecurityGuard
 */
export function withAdminSecurity<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<AdminSecurityGuardProps, 'children'> = {}
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const AdminSecuredComponent = (props: P) => {
    return (
      <AdminSecurityGuard {...options}>
        <WrappedComponent {...props} />
      </AdminSecurityGuard>
    );
  };
  
  AdminSecuredComponent.displayName = `withAdminSecurity(${displayName})`;
  
  return AdminSecuredComponent;
}

/**
 * Simple admin badge component to show admin status
 */
export function AdminBadge() {
  const { isAdmin, adminData } = useAdmin();
  
  if (!isAdmin || !adminData) {
    return null;
  }
  
  return (
    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-0.257-0.257A6 6 0 1118 8zM10 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      Администратор
    </div>
  );
}

/**
 * Admin status indicator component
 */
export function AdminStatusIndicator() {
  const { isAdmin, isLoading, error, adminData } = useAdmin();
  
  if (isLoading) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
        Проверка прав...
      </div>
    );
  }
  
  if (error || !isAdmin) {
    return (
      <div className="flex items-center text-sm text-red-600">
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Нет прав администратора
      </div>
    );
  }
  
  return (
    <div className="flex items-center text-sm text-green-600">
      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      Администратор ({adminData?.admin.name})
    </div>
  );
}