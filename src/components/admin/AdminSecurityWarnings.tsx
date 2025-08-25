'use client';

import React, { useState, useEffect } from 'react';

interface SecurityWarning {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  dismissed?: boolean;
  actionRequired?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    variant: 'primary' | 'secondary' | 'danger';
  }>;
}

interface AdminSecurityWarningsProps {
  className?: string;
  onWarningDismiss?: (warningId: string) => void;
}

export default function AdminSecurityWarnings({ 
  className = '',
  onWarningDismiss 
}: AdminSecurityWarningsProps) {
  const [warnings, setWarnings] = useState<SecurityWarning[]>([]);
  const [loading, setLoading] = useState(true);

  // Check for security warnings
  const checkSecurityWarnings = async () => {
    try {
      setLoading(true);
      const newWarnings: SecurityWarning[] = [];

      // Check environment security
      const isProduction = process.env.NODE_ENV === 'production';
      if (!isProduction) {
        newWarnings.push({
          id: 'dev-environment',
          type: 'warning',
          title: 'Среда разработки',
          message: 'Вы работаете в среде разработки. Будьте осторожны с критическими операциями.',
          timestamp: new Date(),
          actionRequired: false
        });
      }

      // Check for recent suspicious activity
      try {
        const auditResponse = await fetch('/api/admin/audit/logs?limit=10');
        if (auditResponse.ok) {
          const auditData = await auditResponse.json();
          if (auditData.success && auditData.data) {
            const recentActions = auditData.data.filter((action: any) => {
              const actionTime = new Date(action.created_at);
              const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
              return actionTime > oneHourAgo;
            });

            if (recentActions.length > 5) {
              newWarnings.push({
                id: 'high-activity',
                type: 'warning',
                title: 'Высокая активность',
                message: `Обнаружено ${recentActions.length} административных действий за последний час.`,
                timestamp: new Date(),
                actionRequired: false,
                actions: [{
                  label: 'Просмотреть журнал',
                  action: () => window.location.hash = '#audit',
                  variant: 'secondary'
                }]
              });
            }

            // Check for critical actions
            const criticalActions = recentActions.filter((action: any) => 
              action.action_type.includes('DELETE') || 
              action.action_type.includes('MASS_') ||
              (action.new_values && typeof action.new_values === 'object' && 
               Object.values(action.new_values).some((val: any) => 
                 typeof val === 'number' && Math.abs(val) > 10000
               ))
            );

            if (criticalActions.length > 0) {
              newWarnings.push({
                id: 'critical-actions',
                type: 'critical',
                title: 'Критические действия',
                message: `Выполнено ${criticalActions.length} критических действий. Рекомендуется проверка.`,
                timestamp: new Date(),
                actionRequired: true,
                actions: [{
                  label: 'Проверить действия',
                  action: () => window.location.hash = '#audit',
                  variant: 'danger'
                }]
              });
            }
          }
        }
      } catch (err) {
        console.warn('Could not check audit logs for security warnings:', err);
      }

      // Check system health
      try {
        const healthResponse = await fetch('/api/admin/security/validate');
        if (!healthResponse.ok) {
          newWarnings.push({
            id: 'system-health',
            type: 'critical',
            title: 'Проблема с системой',
            message: 'Не удается проверить состояние системы безопасности.',
            timestamp: new Date(),
            actionRequired: true,
            actions: [{
              label: 'Проверить систему',
              action: () => window.location.reload(),
              variant: 'danger'
            }]
          });
        }
      } catch (err) {
        console.warn('Could not check system health:', err);
      }

      // Add informational warnings for best practices
      newWarnings.push({
        id: 'backup-reminder',
        type: 'info',
        title: 'Напоминание о резервном копировании',
        message: 'Рекомендуется регулярно создавать резервные копии данных перед критическими изменениями.',
        timestamp: new Date(),
        actionRequired: false
      });

      setWarnings(newWarnings);
    } catch (err) {
      console.error('Error checking security warnings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dismiss warning
  const dismissWarning = (warningId: string) => {
    setWarnings(prev => prev.map(w => 
      w.id === warningId ? { ...w, dismissed: true } : w
    ));
    onWarningDismiss?.(warningId);
  };

  // Get warning icon
  const getWarningIcon = (type: SecurityWarning['type']) => {
    switch (type) {
      case 'critical':
        return (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  // Get warning styles
  const getWarningStyles = (type: SecurityWarning['type']) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Get button styles
  const getButtonStyles = (variant: 'primary' | 'secondary' | 'danger') => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700';
      case 'secondary':
        return 'bg-gray-600 text-white hover:bg-gray-700';
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700';
    }
  };

  useEffect(() => {
    checkSecurityWarnings();
    
    // Refresh warnings every 5 minutes
    const interval = setInterval(checkSecurityWarnings, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const activeWarnings = warnings.filter(w => !w.dismissed);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (activeWarnings.length === 0) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-green-800">Система безопасности</h3>
            <p className="text-sm text-green-700">Все проверки безопасности пройдены успешно</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Предупреждения безопасности</h3>
        <button
          onClick={checkSecurityWarnings}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Обновить
        </button>
      </div>

      {activeWarnings.map((warning) => (
        <div
          key={warning.id}
          className={`border rounded-lg p-4 ${getWarningStyles(warning.type)}`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getWarningIcon(warning.type)}
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">
                  {warning.title}
                  {warning.actionRequired && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Требует внимания
                    </span>
                  )}
                </h4>
                <button
                  onClick={() => dismissWarning(warning.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-sm">
                {warning.message}
              </p>
              <p className="mt-1 text-xs opacity-75">
                {warning.timestamp.toLocaleString('ru-RU')}
              </p>
              
              {warning.actions && warning.actions.length > 0 && (
                <div className="mt-3 flex space-x-2">
                  {warning.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      className={`px-3 py-1 text-xs font-medium rounded ${getButtonStyles(action.variant)}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}