'use client';

import React, { useState, useEffect } from 'react';
import { format, parseISO, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';

interface AnalyticsData {
  totalActions: number;
  uniqueUsers: number;
  actionsByDay: Array<{
    date: string;
    count: number;
  }>;
  actionsByType: Array<{
    action_type: string;
    count: number;
    percentage: number;
  }>;
  userImpactAnalysis: Array<{
    user_id: string;
    user_name: string;
    actions_count: number;
    last_action: string;
    most_common_action: string;
  }>;
  systemImpactMetrics: {
    totalManaAdjusted: number;
    totalUsersAffected: number;
    averageActionsPerDay: number;
    peakActivityDay: string;
    peakActivityCount: number;
  };
  timeDistribution: Array<{
    hour: number;
    count: number;
  }>;
  trendAnalysis: {
    activityTrend: 'increasing' | 'decreasing' | 'stable';
    trendPercentage: number;
    comparisonPeriod: string;
  };
  performanceMetrics: {
    averageResponseTime: number;
    errorRate: number;
    successfulActions: number;
    failedActions: number;
  };
  riskAnalysis: {
    highRiskActions: number;
    suspiciousPatterns: Array<{
      pattern: string;
      count: number;
      risk_level: 'low' | 'medium' | 'high';
    }>;
  };
}

interface AdminAnalyticsProps {
  className?: string;
}

export default function AdminAnalytics({ className = '' }: AdminAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: subMonths(new Date(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [exportLoading, setExportLoading] = useState(false);

  // Load analytics data
  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end
      });

      const response = await fetch(`/api/admin/audit/analytics?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load analytics');
      }

      setAnalytics(data.analytics);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Export report
  const exportReport = async (format: 'csv' | 'json' | 'analytics') => {
    try {
      setExportLoading(true);

      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
        format
      });

      const response = await fetch(`/api/admin/audit/export?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-audit-report-${dateRange.start}-${dateRange.end}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error exporting report:', err);
      alert(`Ошибка экспорта: ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  // Apply date range
  const applyDateRange = () => {
    loadAnalytics();
  };

  // Quick date range presets
  const applyQuickRange = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Get color for action type
  const getActionTypeColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-gray-500'
    ];
    return colors[index % colors.length];
  };

  // Initial load
  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading && !analytics) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Аналитика и отчеты
            </h2>
            <p className="text-gray-600">
              Статистика влияния административных действий на систему
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => exportReport('csv')}
              disabled={exportLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              {exportLoading ? 'Экспорт...' : 'Экспорт CSV'}
            </button>
            <button
              onClick={() => exportReport('json')}
              disabled={exportLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {exportLoading ? 'Экспорт...' : 'Экспорт JSON'}
            </button>
            <button
              onClick={() => exportReport('analytics')}
              disabled={exportLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm"
            >
              {exportLoading ? 'Экспорт...' : 'Аналитический отчет'}
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Controls */}
      <div className="p-6 border-b bg-gray-50">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Период:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            />
            <span className="text-gray-500">—</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            />
            <button
              onClick={applyDateRange}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Применить
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => applyQuickRange(7)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              7 дней
            </button>
            <button
              onClick={() => applyQuickRange(30)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              30 дней
            </button>
            <button
              onClick={() => applyQuickRange(90)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              90 дней
            </button>
          </div>
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

      {/* Analytics Content */}
      {analytics && (
        <div className="p-6 space-y-8">
          {/* Alerts and Insights */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Важные уведомления</h3>
            <div className="space-y-3">
              {/* Error Rate Alert */}
              {analytics.performanceMetrics && analytics.performanceMetrics.errorRate > 5 && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">
                        <strong>Высокий процент ошибок:</strong> {analytics.performanceMetrics.errorRate.toFixed(1)}% - рекомендуется проверить стабильность системы
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* High Risk Actions Alert */}
              {analytics.riskAnalysis && analytics.riskAnalysis.highRiskActions > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        <strong>Обнаружены высокорисковые действия:</strong> {analytics.riskAnalysis.highRiskActions} - требуется проверка
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Trend Alert */}
              {analytics.trendAnalysis && analytics.trendAnalysis.activityTrend === 'increasing' && analytics.trendAnalysis.trendPercentage > 50 && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        <strong>Резкий рост активности:</strong> +{analytics.trendAnalysis.trendPercentage.toFixed(1)}% - рекомендуется мониторинг
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* No alerts */}
              {(!analytics.performanceMetrics || analytics.performanceMetrics.errorRate <= 5) &&
               (!analytics.riskAnalysis || analytics.riskAnalysis.highRiskActions === 0) &&
               (!analytics.trendAnalysis || analytics.trendAnalysis.activityTrend !== 'increasing' || analytics.trendAnalysis.trendPercentage <= 50) && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-700">
                        <strong>Система работает стабильно</strong> - критических проблем не обнаружено
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Key Metrics */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ключевые показатели</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{analytics.totalActions}</div>
                <div className="text-sm text-blue-700">Всего действий</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{analytics.uniqueUsers}</div>
                <div className="text-sm text-green-700">Уникальных пользователей</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">
                  {analytics.systemImpactMetrics.averageActionsPerDay.toFixed(1)}
                </div>
                <div className="text-sm text-orange-700">Действий в день</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.systemImpactMetrics.totalManaAdjusted}
                </div>
                <div className="text-sm text-purple-700">Всего маны скорректировано</div>
              </div>
            </div>
          </div>

          {/* Actions by Type Chart */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Распределение по типам действий</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-3">
                {analytics.actionsByType.map((item, index) => (
                  <div key={item.action_type} className="flex items-center">
                    <div className="flex-1 flex items-center">
                      <div 
                        className={`w-4 h-4 rounded ${getActionTypeColor(index)} mr-3`}
                      ></div>
                      <span className="text-sm text-gray-700 flex-1">
                        {item.action_type}
                      </span>
                      <span className="text-sm font-medium text-gray-900 mr-4">
                        {item.count}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatPercentage(item.percentage)}
                      </span>
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-2 ml-4">
                      <div
                        className={`h-2 rounded-full ${getActionTypeColor(index)}`}
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Активность по дням</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-end space-x-1 h-32">
                {analytics.actionsByDay.map((day, index) => {
                  const maxCount = Math.max(...analytics.actionsByDay.map(d => d.count));
                  const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center">
                      <div
                        className="bg-blue-500 rounded-t w-full min-h-[2px] transition-all hover:bg-blue-600"
                        style={{ height: `${height}%` }}
                        title={`${format(parseISO(day.date), 'dd.MM.yyyy', { locale: ru })}: ${day.count} действий`}
                      ></div>
                      <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left">
                        {format(parseISO(day.date), 'dd.MM', { locale: ru })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time Distribution */}
          {analytics.timeDistribution.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Распределение по времени суток</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-end space-x-1 h-24">
                  {analytics.timeDistribution.map((hour) => {
                    const maxCount = Math.max(...analytics.timeDistribution.map(h => h.count));
                    const height = maxCount > 0 ? (hour.count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={hour.hour} className="flex-1 flex flex-col items-center">
                        <div
                          className="bg-green-500 rounded-t w-full min-h-[2px] transition-all hover:bg-green-600"
                          style={{ height: `${height}%` }}
                          title={`${hour.hour}:00 - ${hour.count} действий`}
                        ></div>
                        <div className="text-xs text-gray-500 mt-1">
                          {hour.hour}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* User Impact Analysis */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Анализ воздействия на пользователей</h3>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Пользователь
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Количество действий
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Последнее действие
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Частое действие
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analytics.userImpactAnalysis.map((user) => (
                      <tr key={user.user_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {user.user_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {user.actions_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {format(parseISO(user.last_action), 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {user.most_common_action}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Trend Analysis */}
          {analytics.trendAnalysis && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Анализ трендов</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Тренд активности</h4>
                    <p className="text-sm text-gray-600">
                      По сравнению с предыдущим периодом ({analytics.trendAnalysis.comparisonPeriod})
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      analytics.trendAnalysis.activityTrend === 'increasing' ? 'text-green-600' :
                      analytics.trendAnalysis.activityTrend === 'decreasing' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {analytics.trendAnalysis.activityTrend === 'increasing' ? '↗' :
                       analytics.trendAnalysis.activityTrend === 'decreasing' ? '↘' : '→'}
                      {Math.abs(analytics.trendAnalysis.trendPercentage).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500">
                      {analytics.trendAnalysis.activityTrend === 'increasing' ? 'Рост' :
                       analytics.trendAnalysis.activityTrend === 'decreasing' ? 'Снижение' : 'Стабильно'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          {analytics.performanceMetrics && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Метрики производительности</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics.performanceMetrics.averageResponseTime.toFixed(0)}ms
                  </div>
                  <div className="text-sm text-blue-700">Среднее время ответа</div>
                </div>
                <div className={`p-4 rounded-lg border ${
                  analytics.performanceMetrics.errorRate > 5 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                }`}>
                  <div className={`text-2xl font-bold ${
                    analytics.performanceMetrics.errorRate > 5 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {analytics.performanceMetrics.errorRate.toFixed(1)}%
                  </div>
                  <div className={`text-sm ${
                    analytics.performanceMetrics.errorRate > 5 ? 'text-red-700' : 'text-green-700'
                  }`}>
                    Процент ошибок
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.performanceMetrics.successfulActions}
                  </div>
                  <div className="text-sm text-green-700">Успешных действий</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-600">
                    {analytics.performanceMetrics.failedActions}
                  </div>
                  <div className="text-sm text-red-700">Неудачных действий</div>
                </div>
              </div>
            </div>
          )}

          {/* Risk Analysis */}
          {analytics.riskAnalysis && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Анализ рисков</h3>
              <div className="space-y-4">
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-yellow-800">Высокорисковые действия</h4>
                    <span className="text-2xl font-bold text-yellow-600">
                      {analytics.riskAnalysis.highRiskActions}
                    </span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Действия, требующие особого внимания
                  </p>
                </div>

                {analytics.riskAnalysis.suspiciousPatterns.length > 0 && (
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-gray-100 border-b">
                      <h4 className="font-medium text-gray-900">Подозрительные паттерны</h4>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {analytics.riskAnalysis.suspiciousPatterns.map((pattern, index) => (
                        <div key={index} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {pattern.pattern}
                            </div>
                            <div className="text-sm text-gray-500">
                              Обнаружено {pattern.count} раз
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            pattern.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                            pattern.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {pattern.risk_level === 'high' ? 'Высокий' :
                             pattern.risk_level === 'medium' ? 'Средний' : 'Низкий'} риск
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* System Impact Summary */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Влияние на систему</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Пиковая активность</h4>
                <div className="text-sm text-gray-600">
                  <div>
                    <strong>Дата:</strong> {format(parseISO(analytics.systemImpactMetrics.peakActivityDay), 'dd.MM.yyyy', { locale: ru })}
                  </div>
                  <div>
                    <strong>Количество действий:</strong> {analytics.systemImpactMetrics.peakActivityCount}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Общее воздействие</h4>
                <div className="text-sm text-gray-600">
                  <div>
                    <strong>Затронуто пользователей:</strong> {analytics.systemImpactMetrics.totalUsersAffected}
                  </div>
                  <div>
                    <strong>Среднее действий/день:</strong> {analytics.systemImpactMetrics.averageActionsPerDay.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}