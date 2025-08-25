'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, subDays, subWeeks, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import AdminAnalytics from './AdminAnalytics';

interface AdminAuditLogEntry {
  id: string;
  admin_user_id: string;
  admin_name: string;
  admin_username: string;
  target_user_id?: string;
  target_user_name?: string;
  target_username?: string;
  action_type: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  reason: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface AdminAuditLogStats {
  total_actions: number;
  unique_action_types: number;
  affected_users: number;
  first_action?: string;
  last_action?: string;
  actions_last_24h: number;
  actions_last_week: number;
  actions_last_month: number;
}

interface ActionTypeStats {
  action_type: string;
  count: number;
  unique_targets: number;
  last_used: string;
}

interface AdminAuditLogProps {
  className?: string;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  'USER_PARAMETER_CHANGE': 'Изменение параметров пользователя',
  'SHARED_WISH_CREATED': 'Создание общего желания',
  'SHARED_WISH_EDIT': 'Редактирование общего желания',
  'SHARED_WISH_DELETE': 'Удаление общего желания',
  'SHARED_WISH_EXPIRE': 'Истечение общего желания',
  'AUDIT_LOG_ACCESS': 'Доступ к логам аудита',
  'AUDIT_SYSTEM_INITIALIZED': 'Инициализация системы аудита',
  'MANA_ADJUSTMENT': 'Корректировка маны',
  'RANK_CHANGE': 'Изменение ранга',
  'EXPERIENCE_ADJUSTMENT': 'Корректировка опыта',
  'QUOTA_RESET': 'Сброс квот'
};

const ACTION_TYPE_COLORS: Record<string, string> = {
  'USER_PARAMETER_CHANGE': 'bg-blue-100 text-blue-800',
  'SHARED_WISH_CREATED': 'bg-green-100 text-green-800',
  'SHARED_WISH_EDIT': 'bg-yellow-100 text-yellow-800',
  'SHARED_WISH_DELETE': 'bg-red-100 text-red-800',
  'SHARED_WISH_EXPIRE': 'bg-gray-100 text-gray-800',
  'AUDIT_LOG_ACCESS': 'bg-purple-100 text-purple-800',
  'AUDIT_SYSTEM_INITIALIZED': 'bg-indigo-100 text-indigo-800',
  'MANA_ADJUSTMENT': 'bg-emerald-100 text-emerald-800',
  'RANK_CHANGE': 'bg-orange-100 text-orange-800',
  'EXPERIENCE_ADJUSTMENT': 'bg-cyan-100 text-cyan-800',
  'QUOTA_RESET': 'bg-pink-100 text-pink-800'
};

export default function AdminAuditLog({ className = '' }: AdminAuditLogProps) {
  const [logs, setLogs] = useState<AdminAuditLogEntry[]>([]);
  const [stats, setStats] = useState<AdminAuditLogStats | null>(null);
  const [actionTypeStats, setActionTypeStats] = useState<ActionTypeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<AdminAuditLogEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'analytics'>('logs');
  
  // Filters
  const [filters, setFilters] = useState({
    action_type: '',
    target_user_id: '',
    start_date: '',
    end_date: '',
    limit: 50,
    offset: 0
  });

  // Quick date filters
  const [quickDateFilter, setQuickDateFilter] = useState<string>('');

  // Load audit logs
  const loadAuditLogs = async (newFilters = filters) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (newFilters.action_type) params.append('action_type', newFilters.action_type);
      if (newFilters.target_user_id) params.append('target_user_id', newFilters.target_user_id);
      if (newFilters.start_date) params.append('start_date', newFilters.start_date);
      if (newFilters.end_date) params.append('end_date', newFilters.end_date);
      params.append('limit', newFilters.limit.toString());
      params.append('offset', newFilters.offset.toString());

      const response = await fetch(`/api/admin/audit/logs?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load audit logs');
      }

      setLogs(data.data);
    } catch (err: any) {
      console.error('Error loading audit logs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/audit/stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
          setActionTypeStats(data.actionTypeStats || []);
        }
      }
    } catch (err) {
      console.error('Error loading audit stats:', err);
    }
  };

  // Apply quick date filter
  const applyQuickDateFilter = (period: string) => {
    const now = new Date();
    let startDate = '';
    
    switch (period) {
      case '24h':
        startDate = subDays(now, 1).toISOString();
        break;
      case '7d':
        startDate = subWeeks(now, 1).toISOString();
        break;
      case '30d':
        startDate = subMonths(now, 1).toISOString();
        break;
      case '90d':
        startDate = subMonths(now, 3).toISOString();
        break;
      default:
        startDate = '';
    }

    const newFilters = {
      ...filters,
      start_date: startDate,
      end_date: '',
      offset: 0
    };

    setQuickDateFilter(period);
    setFilters(newFilters);
    loadAuditLogs(newFilters);
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string | number) => {
    const newFilters = {
      ...filters,
      [key]: value,
      offset: key !== 'offset' ? 0 : (typeof value === 'number' ? value : parseInt(value.toString()) || 0) // Reset offset when changing other filters
    };
    setFilters(newFilters);
    
    if (key !== 'offset') {
      setQuickDateFilter(''); // Clear quick filter when manually setting dates
    }
  };

  // Apply filters
  const applyFilters = () => {
    loadAuditLogs();
  };

  // Reset filters
  const resetFilters = () => {
    const resetFilters = {
      action_type: '',
      target_user_id: '',
      start_date: '',
      end_date: '',
      limit: 50,
      offset: 0
    };
    setFilters(resetFilters);
    setQuickDateFilter('');
    loadAuditLogs(resetFilters);
  };

  // Load next page
  const loadNextPage = () => {
    const newFilters = {
      ...filters,
      offset: filters.offset + filters.limit
    };
    setFilters(newFilters);
    loadAuditLogs(newFilters);
  };

  // Load previous page
  const loadPreviousPage = () => {
    const newFilters = {
      ...filters,
      offset: Math.max(0, filters.offset - filters.limit)
    };
    setFilters(newFilters);
    loadAuditLogs(newFilters);
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd.MM.yyyy HH:mm:ss', { locale: ru });
    } catch {
      return dateString;
    }
  };

  // Get action type label
  const getActionTypeLabel = (actionType: string) => {
    return ACTION_TYPE_LABELS[actionType] || actionType;
  };

  // Get action type color
  const getActionTypeColor = (actionType: string) => {
    return ACTION_TYPE_COLORS[actionType] || 'bg-gray-100 text-gray-800';
  };

  // Format JSON values for display
  const formatJsonValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  // Get unique action types for filter dropdown
  const uniqueActionTypes = useMemo(() => {
    const types = new Set(logs.map(log => log.action_type));
    return Array.from(types).sort();
  }, [logs]);

  // Initial load
  useEffect(() => {
    loadAuditLogs();
    loadStats();
  }, []);

  if (loading && logs.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Журнал административных действий
        </h2>
        <p className="text-gray-600">
          Полная история всех административных действий в системе
        </p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="p-6 border-b bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Статистика</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{stats.total_actions}</div>
              <div className="text-sm text-gray-600">Всего действий</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{stats.affected_users}</div>
              <div className="text-sm text-gray-600">Затронуто пользователей</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-orange-600">{stats.actions_last_24h}</div>
              <div className="text-sm text-gray-600">За последние 24ч</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-purple-600">{stats.actions_last_week}</div>
              <div className="text-sm text-gray-600">За последнюю неделю</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-6 border-b bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Фильтры</h3>
        
        {/* Quick date filters */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Быстрые фильтры по времени:
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { key: '24h', label: 'Последние 24 часа' },
              { key: '7d', label: 'Последние 7 дней' },
              { key: '30d', label: 'Последние 30 дней' },
              { key: '90d', label: 'Последние 90 дней' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => applyQuickDateFilter(key)}
                className={`px-3 py-1 text-sm rounded-md border ${
                  quickDateFilter === key
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип действия:
            </label>
            <select
              value={filters.action_type}
              onChange={(e) => handleFilterChange('action_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Все типы</option>
              {uniqueActionTypes.map(type => (
                <option key={type} value={type}>
                  {getActionTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Дата начала:
            </label>
            <input
              type="datetime-local"
              value={filters.start_date ? filters.start_date.slice(0, 16) : ''}
              onChange={(e) => handleFilterChange('start_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Дата окончания:
            </label>
            <input
              type="datetime-local"
              value={filters.end_date ? filters.end_date.slice(0, 16) : ''}
              onChange={(e) => handleFilterChange('end_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Количество записей:
            </label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={applyFilters}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Загрузка...' : 'Применить фильтры'}
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Сбросить
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <div className="text-red-700">
            <strong>Ошибка:</strong> {error}
          </div>
        </div>
      )}

      {/* Audit Logs */}
      <div className="p-6">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Записи не найдены
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedEntry(entry)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionTypeColor(entry.action_type)}`}>
                          {getActionTypeLabel(entry.action_type)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(entry.created_at)}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-900 mb-1">
                        <strong>Администратор:</strong> {entry.admin_name} (@{entry.admin_username})
                      </div>
                      
                      {entry.target_user_name && (
                        <div className="text-sm text-gray-900 mb-1">
                          <strong>Целевой пользователь:</strong> {entry.target_user_name} 
                          {entry.target_username && ` (@${entry.target_username})`}
                        </div>
                      )}
                      
                      <div className="text-sm text-gray-700">
                        <strong>Причина:</strong> {entry.reason}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      Нажмите для деталей
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Показано записей: {logs.length} (начиная с {filters.offset + 1})
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadPreviousPage}
                  disabled={filters.offset === 0 || loading}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Предыдущая
                </button>
                <button
                  onClick={loadNextPage}
                  disabled={logs.length < filters.limit || loading}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Следующая
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detailed View Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Детали административного действия
                </h3>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID записи:</label>
                  <div className="text-sm text-gray-900 font-mono">{selectedEntry.id}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата и время:</label>
                  <div className="text-sm text-gray-900">{formatDate(selectedEntry.created_at)}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Тип действия:</label>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionTypeColor(selectedEntry.action_type)}`}>
                    {getActionTypeLabel(selectedEntry.action_type)}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Администратор:</label>
                  <div className="text-sm text-gray-900">
                    {selectedEntry.admin_name} (@{selectedEntry.admin_username})
                  </div>
                </div>
                
                {selectedEntry.target_user_name && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Целевой пользователь:</label>
                    <div className="text-sm text-gray-900">
                      {selectedEntry.target_user_name}
                      {selectedEntry.target_username && ` (@${selectedEntry.target_username})`}
                    </div>
                  </div>
                )}
                
                {selectedEntry.ip_address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IP адрес:</label>
                    <div className="text-sm text-gray-900 font-mono">{selectedEntry.ip_address}</div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Причина:</label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {selectedEntry.reason}
                </div>
              </div>
              
              {selectedEntry.old_values && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Старые значения:</label>
                  <pre className="text-xs text-gray-900 bg-red-50 p-3 rounded-md overflow-x-auto">
                    {formatJsonValue(selectedEntry.old_values)}
                  </pre>
                </div>
              )}
              
              {selectedEntry.new_values && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Новые значения:</label>
                  <pre className="text-xs text-gray-900 bg-green-50 p-3 rounded-md overflow-x-auto">
                    {formatJsonValue(selectedEntry.new_values)}
                  </pre>
                </div>
              )}
              
              {selectedEntry.user_agent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Agent:</label>
                  <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-md break-all">
                    {selectedEntry.user_agent}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}