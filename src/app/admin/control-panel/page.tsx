'use client';

import React, { useState, useEffect } from 'react';
import AdminPageSecurity from '../../../components/admin/AdminPageSecurity';
import UserParameterManager from '../../../components/admin/UserParameterManager';
import SharedWishManager from '../../../components/admin/SharedWishManager';
import AdminAuditLog from '../../../components/admin/AdminAuditLog';
import AdminConfirmationDialog, { useConfirmationDialog, AdminConfirmations } from '../../../components/admin/AdminConfirmationDialog';
import { useAdmin } from '../../../lib/hooks/useAdmin';
import { useDeviceDetection } from '../../../lib/mobile-detection';

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
  const { isMobile, isTablet } = useDeviceDetection();
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
      <div className="min-h-screen relative">
        {/* Animated Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-blue-300/30 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-20 right-10 w-96 h-96 bg-purple-300/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-pink-300/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
        
        {/* Content Overlay */}
        <div className="relative z-10">
          {/* Enhanced Header */}
          <div className="glass-strong shadow-2xl border-b border-white/30 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 space-y-6 lg:space-y-0">
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                    <span className="text-3xl">🎛️</span>
                  </div>
                  <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent drop-shadow-2xl">
                      Административная панель управления
                    </h1>
                    <p className="mt-2 text-lg text-white/80">
                      Полный контроль над системой WSL и управление пользователями
                    </p>
                    <div className="mt-3 flex items-center space-x-4">
                      <div className="flex items-center space-x-2 bg-green-500/20 backdrop-blur-sm border border-green-300/30 rounded-full px-4 py-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-200 text-sm font-semibold">Система активна</span>
                      </div>
                      <div className="flex items-center space-x-2 bg-blue-500/20 backdrop-blur-sm border border-blue-300/30 rounded-full px-4 py-2">
                        <span className="text-blue-200 text-sm font-semibold">Администратор</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="bg-red-500/20 backdrop-blur-sm border border-red-300/30 text-red-200 px-6 py-3 rounded-2xl text-sm font-bold flex items-center space-x-3 shadow-lg">
                    <span className="animate-pulse">🔒</span>
                    <span>Режим администратора</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Enhanced Navigation Tabs */}
            <div className="mb-8">
              <div className="glass-strong rounded-3xl p-3 shadow-2xl border border-white/30">
                <nav className="flex space-x-2 overflow-x-auto">
                  {[
                    { key: 'dashboard', label: 'Дашборд', icon: '📊', description: 'Общая статистика' },
                    { key: 'users', label: 'Пользователи', icon: '👥', description: 'Управление пользователями' },
                    { key: 'wishes', label: 'Желания', icon: '💫', description: 'Общие желания' },
                    { key: 'audit', label: 'Аудит', icon: '📋', description: 'Журнал действий' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as typeof activeTab)}
                      className={`group flex items-center space-x-3 px-6 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 min-w-max touch-manipulation ${
                        activeTab === tab.key
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl transform scale-105'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className={`text-xl ${activeTab === tab.key ? 'animate-bounce' : 'group-hover:scale-110'} transition-transform duration-300`}>
                        {tab.icon}
                      </span>
                      <div className="text-left">
                        <div>{tab.label}</div>
                        <div className={`text-xs ${activeTab === tab.key ? 'text-blue-100' : 'text-white/50'}`}>
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Enhanced Statistics Cards */}
              {stats && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="glass-strong p-6 rounded-3xl border border-blue-300/30 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 group">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <span className="text-2xl">👥</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-blue-200 text-sm mb-1">Пользователи</h3>
                        <p className="text-3xl font-black text-white drop-shadow-lg">{stats?.totalUsers || 0}</p>
                        <div className="text-xs text-blue-300 mt-1">В системе</div>
                      </div>
                    </div>
                    <div className="mt-4 h-2 bg-blue-200/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full animate-pulse w-full"></div>
                    </div>
                  </div>

                  <div className="glass-strong p-6 rounded-3xl border border-purple-300/30 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 group">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <span className="text-2xl">💫</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-purple-200 text-sm mb-1">Общие желания</h3>
                        <p className="text-3xl font-black text-white drop-shadow-lg">{stats?.totalSharedWishes || 0}</p>
                        <div className="text-xs text-purple-300 mt-1">Активных</div>
                      </div>
                    </div>
                    <div className="mt-4 h-2 bg-purple-200/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-400 to-violet-500 rounded-full animate-shimmer"></div>
                    </div>
                  </div>

                  <div className="glass-strong p-6 rounded-3xl border border-green-300/30 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 group">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <span className="text-2xl">📋</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-green-200 text-sm mb-1">Действия админа</h3>
                        <p className="text-3xl font-black text-white drop-shadow-lg">{stats?.totalAdminActions || 0}</p>
                        <div className="text-xs text-green-300 mt-1">Залогировано</div>
                      </div>
                    </div>
                    <div className="mt-4 h-2 bg-green-200/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse" style={{width: '85%'}}></div>
                    </div>
                  </div>

                  {!isMobile && (
                    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl border-2 border-gray-100 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group backdrop-blur-sm">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <span className="text-xl sm:text-2xl">📈</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-yellow-600 dark:text-yellow-400 text-xs sm:text-sm mb-1">Активные желания</h3>
                          <p className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white drop-shadow-lg">{stats?.totalActiveWishes || 0}</p>
                          <div className="text-xs text-yellow-500 dark:text-yellow-400 mt-1">В работе</div>
                        </div>
                      </div>
                      <div className="mt-3 sm:mt-4 h-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full animate-pulse" style={{width: '60%'}}></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-gray-100 dark:border-gray-700 backdrop-blur-sm overflow-hidden">
              <UserParameterManager />
            </div>
          )}

          {activeTab === 'wishes' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-gray-100 dark:border-gray-700 backdrop-blur-sm overflow-hidden">
              <SharedWishManager />
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-gray-100 dark:border-gray-700 backdrop-blur-sm overflow-hidden">
              <AdminAuditLog />
            </div>
          )}
          </div>
        </div>
      </div>
    </AdminPageSecurity>
  );
}