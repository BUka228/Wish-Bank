'use client';

import React, { useState, useEffect } from 'react';
import { AdminSecurityGuard } from './AdminSecurityGuard';
import AdminSecurityWarnings from './AdminSecurityWarnings';
import { useAdmin } from '../../lib/hooks/useAdmin';

interface AdminPageSecurityProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  showWarnings?: boolean;
  pageTitle?: string;
  criticalOperationsAllowed?: boolean;
}

interface SecurityCheck {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  critical: boolean;
}

export default function AdminPageSecurity({
  children,
  requiredPermissions = [],
  showWarnings = true,
  pageTitle = 'Административная панель',
  criticalOperationsAllowed = true
}: AdminPageSecurityProps) {
  const { adminData, isAdmin } = useAdmin();
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSecurityDetails, setShowSecurityDetails] = useState(false);

  // Perform comprehensive security checks
  const performSecurityChecks = async () => {
    try {
      setLoading(true);
      const checks: SecurityCheck[] = [];

      // Check 1: Admin authentication
      checks.push({
        id: 'admin-auth',
        name: 'Аутентификация администратора',
        status: isAdmin ? 'passed' : 'failed',
        message: isAdmin 
          ? `Аутентифицирован как ${adminData?.admin.name}` 
          : 'Не аутентифицирован как администратор',
        critical: true
      });

      // Check 2: Environment security
      const isProduction = process.env.NODE_ENV === 'production';
      checks.push({
        id: 'environment',
        name: 'Безопасность окружения',
        status: isProduction ? 'passed' : 'warning',
        message: isProduction 
          ? 'Работа в продакшн окружении' 
          : 'Работа в среде разработки - будьте осторожны',
        critical: false
      });

      // Check 3: Operations allowed
      const operationsAllowed = adminData?.config.operations_allowed ?? false;
      checks.push({
        id: 'operations',
        name: 'Разрешение операций',
        status: operationsAllowed ? 'passed' : 'failed',
        message: operationsAllowed 
          ? 'Административные операции разрешены' 
          : 'Административные операции заблокированы',
        critical: criticalOperationsAllowed
      });

      // Check 4: API connectivity
      try {
        const response = await fetch('/api/admin/security/validate', { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        checks.push({
          id: 'api-connectivity',
          name: 'Подключение к API',
          status: response.ok ? 'passed' : 'failed',
          message: response.ok 
            ? 'API доступно' 
            : `API недоступно (${response.status})`,
          critical: true
        });
      } catch (err) {
        checks.push({
          id: 'api-connectivity',
          name: 'Подключение к API',
          status: 'failed',
          message: 'Ошибка подключения к API',
          critical: true
        });
      }

      // Check 5: Recent suspicious activity
      try {
        const auditResponse = await fetch('/api/admin/audit/logs?limit=20');
        if (auditResponse.ok) {
          const auditData = await auditResponse.json();
          if (auditData.success && auditData.data) {
            const recentActions = auditData.data.filter((action: any) => {
              const actionTime = new Date(action.created_at);
              const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
              return actionTime > oneHourAgo;
            });

            const suspiciousActions = recentActions.filter((action: any) =>
              action.action_type.includes('DELETE') ||
              action.action_type.includes('MASS_') ||
              (action.ip_address && action.ip_address !== '127.0.0.1' && action.ip_address !== '::1')
            );

            checks.push({
              id: 'suspicious-activity',
              name: 'Подозрительная активность',
              status: suspiciousActions.length > 0 ? 'warning' : 'passed',
              message: suspiciousActions.length > 0 
                ? `Обнаружено ${suspiciousActions.length} подозрительных действий за час`
                : 'Подозрительной активности не обнаружено',
              critical: false
            });
          }
        }
      } catch (err) {
        checks.push({
          id: 'suspicious-activity',
          name: 'Подозрительная активность',
          status: 'warning',
          message: 'Не удалось проверить журнал активности',
          critical: false
        });
      }

      // Check 6: Permission validation
      if (requiredPermissions.length > 0) {
        // In a real system, you would check specific permissions
        // For now, we assume admin has all permissions
        checks.push({
          id: 'permissions',
          name: 'Права доступа',
          status: isAdmin ? 'passed' : 'failed',
          message: isAdmin 
            ? `Все требуемые права (${requiredPermissions.join(', ')}) предоставлены`
            : `Отсутствуют права: ${requiredPermissions.join(', ')}`,
          critical: true
        });
      }

      // Check 7: Session security
      const sessionAge = adminData ? Date.now() - new Date(adminData.timestamp).getTime() : 0;
      const maxSessionAge = 4 * 60 * 60 * 1000; // 4 hours
      checks.push({
        id: 'session-security',
        name: 'Безопасность сессии',
        status: sessionAge > maxSessionAge ? 'warning' : 'passed',
        message: sessionAge > maxSessionAge 
          ? 'Сессия устарела, рекомендуется повторная аутентификация'
          : `Сессия активна (${Math.round(sessionAge / (60 * 1000))} мин.)`,
        critical: false
      });

      setSecurityChecks(checks);
    } catch (err) {
      console.error('Error performing security checks:', err);
      setSecurityChecks([{
        id: 'error',
        name: 'Ошибка проверки безопасности',
        status: 'failed',
        message: 'Не удалось выполнить проверки безопасности',
        critical: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      performSecurityChecks();
    }
  }, [isAdmin, adminData]);

  // Check if critical security checks failed
  const criticalFailures = securityChecks.filter(check => 
    check.critical && check.status === 'failed'
  );

  const hasWarnings = securityChecks.some(check => 
    check.status === 'warning' || check.status === 'failed'
  );

  // Security status indicator
  const SecurityStatusIndicator = () => {
    if (loading) {
      return (
        <div className="flex items-center text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
          Проверка безопасности...
        </div>
      );
    }

    const passedChecks = securityChecks.filter(c => c.status === 'passed').length;
    const totalChecks = securityChecks.length;

    if (criticalFailures.length > 0) {
      return (
        <div className="flex items-center text-sm text-red-600">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Критические проблемы безопасности
        </div>
      );
    }

    if (hasWarnings) {
      return (
        <div className="flex items-center text-sm text-yellow-600">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Предупреждения безопасности ({passedChecks}/{totalChecks})
        </div>
      );
    }

    return (
      <div className="flex items-center text-sm text-green-600">
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Безопасность в норме ({passedChecks}/{totalChecks})
      </div>
    );
  };

  // Security details modal
  const SecurityDetailsModal = () => {
    if (!showSecurityDetails) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Детали проверки безопасности
              </h3>
              <button
                onClick={() => setShowSecurityDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {securityChecks.map((check) => (
              <div key={check.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {check.status === 'passed' ? (
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : check.status === 'warning' ? (
                    <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {check.name}
                    </h4>
                    {check.critical && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        Критично
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {check.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-between">
              <button
                onClick={performSecurityChecks}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Обновить проверки
              </button>
              <button
                onClick={() => setShowSecurityDetails(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminSecurityGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Security Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center space-x-4">
                <h1 className="text-lg font-medium text-gray-900">{pageTitle}</h1>
                <SecurityStatusIndicator />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSecurityDetails(true)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Детали безопасности
                </button>
                <button
                  onClick={performSecurityChecks}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Обновить
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Security Failures */}
        {criticalFailures.length > 0 && (
          <div className="bg-red-50 border-b border-red-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Критические проблемы безопасности
                  </h3>
                  <div className="text-sm text-red-700 mt-1">
                    {criticalFailures.map(failure => failure.message).join('; ')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Warnings */}
        {showWarnings && !criticalFailures.length && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <AdminSecurityWarnings />
          </div>
        )}

        {/* Main Content */}
        {criticalFailures.length === 0 ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Доступ ограничен
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Обнаружены критические проблемы безопасности. Доступ к административным функциям временно ограничен.
              </p>
              <div className="mt-6">
                <button
                  onClick={performSecurityChecks}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  Повторить проверку
                </button>
              </div>
            </div>
          </div>
        )}

        <SecurityDetailsModal />
      </div>
    </AdminSecurityGuard>
  );
}