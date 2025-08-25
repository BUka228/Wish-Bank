'use client';

import React, { useState, useEffect } from 'react';

interface PerformanceData {
  timestamp: string;
  summary: {
    totalManaOperations: number;
    averageResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
    activeAlerts: number;
  };
  performance: {
    operations: any;
    enhancements: any;
    api: any;
    cache: any;
  };
  alerts: string[];
  recommendations: string[];
  systemHealth: {
    healthy: boolean;
    score: number;
  };
}

export default function ManaPerformanceDashboard() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('operations');

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mana/performance?type=dashboard');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setPerformanceData(result.data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch performance data');
      }
    } catch (err) {
      console.error('Error fetching performance data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchPerformanceData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthStatus = (score: number) => {
    if (score >= 90) return 'Отлично';
    if (score >= 70) return 'Хорошо';
    if (score >= 50) return 'Удовлетворительно';
    return 'Требует внимания';
  };

  if (loading && !performanceData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Загрузка данных производительности...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-600 mb-4">
          <span>⚠️</span>
          <span>Ошибка загрузки: {error}</span>
        </div>
        <button 
          onClick={fetchPerformanceData} 
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Повторить попытку
        </button>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="border rounded-lg p-6">
        <p>Нет данных о производительности</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Мониторинг производительности системы Маны</h2>
          {lastUpdated && (
            <p className="text-sm text-gray-500">
              Последнее обновление: {lastUpdated.toLocaleTimeString('ru-RU')}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 text-sm rounded-md ${autoRefresh ? 'bg-blue-600 text-white' : 'border border-gray-300'}`}
          >
            🔄 Авто-обновление
          </button>
          <button 
            onClick={fetchPerformanceData} 
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            🔄 Обновить
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className={performanceData.systemHealth.healthy ? '✅' : '❌'}></span>
            <div>
              <p className="text-sm font-medium">Состояние системы</p>
              <p className={`text-lg font-bold ${getHealthColor(performanceData.systemHealth.score)}`}>
                {getHealthStatus(performanceData.systemHealth.score)}
              </p>
            </div>
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${performanceData.systemHealth.score}%` }}
            ></div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span>📊</span>
            <div>
              <p className="text-sm font-medium">Операции с Маной</p>
              <p className="text-lg font-bold">{performanceData.summary.totalManaOperations}</p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span>⏱️</span>
            <div>
              <p className="text-sm font-medium">Время отклика</p>
              <p className="text-lg font-bold">{performanceData.summary.averageResponseTime}мс</p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span>⚡</span>
            <div>
              <p className="text-sm font-medium">Попадания в кэш</p>
              <p className="text-lg font-bold">{performanceData.summary.cacheHitRate}%</p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className={performanceData.summary.activeAlerts > 0 ? '🚨' : '✅'}></span>
            <div>
              <p className="text-sm font-medium">Активные уведомления</p>
              <p className="text-lg font-bold">{performanceData.summary.activeAlerts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {performanceData.alerts.length > 0 && (
        <div className="border-yellow-200 bg-yellow-50 border rounded-lg p-4">
          <div className="flex items-center space-x-2 text-yellow-800 mb-3">
            <span>⚠️</span>
            <span className="font-medium">Активные уведомления</span>
          </div>
          <div className="space-y-2">
            {performanceData.alerts.map((alert, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="px-2 py-1 text-xs border border-yellow-300 rounded text-yellow-800">
                  Предупреждение
                </span>
                <span className="text-sm">{alert}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Performance Tabs */}
      <div className="border rounded-lg">
        <div className="border-b">
          <div className="flex space-x-1 p-1">
            {['operations', 'cache', 'api', 'recommendations'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-sm rounded-md ${
                  activeTab === tab 
                    ? 'bg-blue-600 text-white' 
                    : 'hover:bg-gray-100'
                }`}
              >
                {tab === 'operations' && 'Операции'}
                {tab === 'cache' && 'Кэш'}
                {tab === 'api' && 'API'}
                {tab === 'recommendations' && 'Рекомендации'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'operations' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Производительность операций с Маной</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(performanceData.performance.operations || {}).map(([operation, stats]: [string, any]) => (
                  <div key={operation} className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">{operation}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Всего вызовов:</span>
                        <span className="font-medium">{stats.totalCalls}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Успешность:</span>
                        <span className="font-medium">{Math.round(stats.successRate * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Среднее время:</span>
                        <span className="font-medium">{Math.round(stats.averageTime)}мс</span>
                      </div>
                      <div className="flex justify-between">
                        <span>95-й процентиль:</span>
                        <span className="font-medium">{Math.round(stats.p95Time)}мс</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'cache' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Статистика кэша</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Общая статистика</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Записей в кэше:</span>
                      <span className="font-medium">{performanceData.performance.cache.totalManaEntries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Коэффициент попаданий:</span>
                      <span className="font-medium">{Math.round(performanceData.performance.cache.hitRate * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Использование памяти:</span>
                      <span className="font-medium">{Math.round(performanceData.performance.cache.memoryUsage / 1024)}КБ</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Топ ключей кэша</h4>
                  <div className="space-y-1 text-sm">
                    {performanceData.performance.cache.topManaKeys?.slice(0, 5).map((key: any, index: number) => (
                      <div key={index} className="flex justify-between">
                        <span className="truncate mr-2">{key.key}</span>
                        <span className="font-medium">{key.hits} попаданий</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Производительность API</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Общая статистика</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Всего запросов:</span>
                      <span className="font-medium">{performanceData.performance.api.totalRequests || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Среднее время отклика:</span>
                      <span className="font-medium">{Math.round(performanceData.performance.api.averageResponseTime || 0)}мс</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Коэффициент ошибок:</span>
                      <span className="font-medium">{Math.round((performanceData.performance.api.errorRate || 0) * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>95-й процентиль:</span>
                      <span className="font-medium">{Math.round(performanceData.performance.api.p95ResponseTime || 0)}мс</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Статистика по эндпоинтам</h4>
                  <div className="space-y-1 text-sm">
                    {Object.entries(performanceData.performance.api.endpointStats || {}).slice(0, 5).map(([endpoint, stats]: [string, any]) => (
                      <div key={endpoint} className="border-b pb-1 mb-1">
                        <div className="font-medium truncate">{endpoint}</div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>{stats.requests} запросов</span>
                          <span>{Math.round(stats.averageTime)}мс</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center space-x-2">
                <span>📈</span>
                <span>Рекомендации по оптимизации</span>
              </h3>
              {performanceData.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {performanceData.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <span className="text-blue-600 mt-0.5">📊</span>
                      <div>
                        <p className="text-sm">{recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">✅</div>
                  <p>Система работает оптимально!</p>
                  <p className="text-sm">Рекомендаций по улучшению производительности нет.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}