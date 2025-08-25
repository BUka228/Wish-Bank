'use client';

import React, { useState, useEffect } from 'react';
import AdminPageSecurity from '../../../components/admin/AdminPageSecurity';
import UserParameterManager from '../../../components/admin/UserParameterManager';
import SharedWishManager from '../../../components/admin/SharedWishManager';
import AdminAuditLog from '../../../components/admin/AdminAuditLog';
import AdminConfirmationDialog, { useConfirmationDialog, AdminConfirmations } from '../../../components/admin/AdminConfirmationDialog';
import { useAdmin } from '../../../lib/hooks/useAdmin';

interface AdminStats {
  totalUsers: number;
  totalActiveWishes: number;
  totalSharedWishes: number;
  totalAdminActions: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  variant: 'primary' | 'secondary' | 'warning' | 'danger';
}

export default function AdminControlPanelPage() {
  const { adminData } = useAdmin();
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'wishes' | 'audit'>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard statistics
  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load basic stats from multiple endpoints
      const [usersResponse, wishesResponse, auditResponse] = await Promise.allSettled([
        fetch('/api/admin/users/list?limit=1'),
        fetch('/api/admin/shared-wishes/manage'),
        fetch('/api/admin/audit/logs?limit=5')
      ]);

      let totalUsers = 0;
      let totalSharedWishes = 0;
      let totalAdminActions = 0;
      let recentActivity: AdminStats['recentActivity'] = [];

      // Process users response
      if (usersResponse.status === 'fulfilled' && usersResponse.value.ok) {
        const usersData = await usersResponse.value.json();
        totalUsers = usersData.total || 0;
      }

      // Process shared wishes response
      if (wishesResponse.status === 'fulfilled' && wishesResponse.value.ok) {
        const wishesData = await wishesResponse.value.json();
        totalSharedWishes = wishesData.data?.sharedWishes?.length || 0;
      }

      // Process audit response
      if (auditResponse.status === 'fulfilled' && auditResponse.value.ok) {
        const auditData = await auditResponse.value.json();
        if (auditData.success) {
          totalAdminActions = auditData.pagination?.total || auditData.data?.length || 0;
          recentActivity = auditData.data?.slice(0, 5).map((entry: any) => ({
            id: entry.id,
            type: entry.action_type,
            description: entry.reason,
            timestamp: entry.created_at
          })) || [];
        }
      }

      setStats({
        totalUsers,
        totalActiveWishes: 0, // We'll need to implement this endpoint
        totalSharedWishes,
        totalAdminActions,
        recentActivity
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Quick actions configuration with confirmation dialogs
  const quickActions: QuickAction[] = [
    {
      id: 'refresh-stats',
      title: 'Обновить статистику',
      description: 'Перезагрузить данные дашборда',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      action: () => {
        showConfirmation({
          title: 'Обновление статистики',
          message: 'Обновить данные дашборда?',
          variant: 'info',
          confirmText: 'Обновить'
        }, loadStats);
      },
      variant: 'secondary'
    },
    {
      id: 'manage-users',
      title: 'Управление пользователями',
      description: 'Изменить параметры пользователей',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      action: () => setActiveTab('users'),
      variant: 'primary'
    },
    {
      id: 'create-shared-wish',
      title: 'Создать общее желание',
      description: 'Добавить новое общее желание',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      action: () => setActiveTab('wishes'),
      variant: 'primary'
    },
    {
      id: 'view-audit',
      title: 'Журнал действий',
      description: 'Просмотреть историю изменений',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: () => setActiveTab('audit'),
      variant: 'secondary'
    }
  ];

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('ru-RU');
    } catch {
      return dateString;
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      'USER_PARAMETER_CHANGE': 'Изменение параметров пользователя',
      'SHARED_WISH_CREATED': 'Создание общего желания',
      'SHARED_WISH_EDIT': 'Редактирование общего желания',
      'SHARED_WISH_DELETE': 'Удаление общего желания',
      'AUDIT_LOG_ACCESS': 'Доступ к логам аудита',
      'MANA_ADJUSTMENT': 'Корректировка маны',
      'RANK_CHANGE': 'Изменение ранга'
    };
    return labels[actionType] || actionType;
  };

  return (
    <AdminPageSecurity 
      pageTitle="Административная панель управления"
      showWarnings={true}
      criticalOperationsAllowed={true}
    >
      {ConfirmationDialog}
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Административная панель управления
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Добро пожаловать, {adminData?.admin.name || 'Администратор'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  Окружение: <span className="font-medium">{adminData?.config.environment}</span>
                </div>
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Активен
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'dashboard', label: 'Дашборд', icon: '📊' },
                { id: 'users', label: 'Управление пользователями', icon: '👥' },
                { id: 'wishes', label: 'Общие желания', icon: '⭐' },
                { id: 'audit', label: 'Журнал действий', icon: '📋' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Всего пользователей
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {loading ? '...' : stats?.totalUsers || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Общие желания
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {loading ? '...' : stats?.totalSharedWishes || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Админ действий
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {loading ? '...' : stats?.totalAdminActions || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Статус системы
                          </dt>
                          <dd className="text-lg font-medium text-green-600">
                            Активна
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Быстрые действия</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Часто используемые административные операции
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action) => (
                      <button
                        key={action.id}
                        onClick={action.action}
                        className={`p-4 rounded-lg border-2 border-dashed text-left hover:border-solid transition-all duration-200 ${
                          action.variant === 'primary'
                            ? 'border-blue-300 hover:border-blue-500 hover:bg-blue-50'
                            : action.variant === 'secondary'
                            ? 'border-gray-300 hover:border-gray-500 hover:bg-gray-50'
                            : action.variant === 'warning'
                            ? 'border-yellow-300 hover:border-yellow-500 hover:bg-yellow-50'
                            : 'border-red-300 hover:border-red-500 hover:bg-red-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`flex-shrink-0 ${
                            action.variant === 'primary'
                              ? 'text-blue-600'
                              : action.variant === 'secondary'
                              ? 'text-gray-600'
                              : action.variant === 'warning'
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}>
                            {action.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {action.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {action.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Последние действия</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Недавние административные операции
                  </p>
                </div>
                <div className="p-6">
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : error ? (
                    <div className="text-center py-4">
                      <p className="text-red-600 text-sm">{error}</p>
                      <button
                        onClick={loadStats}
                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Повторить попытку
                      </button>
                    </div>
                  ) : stats?.recentActivity.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="mt-2 text-sm">Нет недавних действий</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {stats?.recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {getActionTypeLabel(activity.type)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {activity.description}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <UserParameterManager />
          )}

          {activeTab === 'wishes' && (
            <SharedWishManager />
          )}

          {activeTab === 'audit' && (
            <AdminAuditLog />
          )}
        </div>
      </div>
    </AdminPageSecurity>
  );
}