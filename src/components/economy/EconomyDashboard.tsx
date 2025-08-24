'use client';

import { useState, useEffect } from 'react';
import { EconomyQuotas, EconomyMetrics, UserStats } from '@/types/quest-economy';
import QuotaDisplay from './QuotaDisplay';

interface EconomyDashboardProps {
  userId: string;
}

export default function EconomyDashboard({ userId }: EconomyDashboardProps) {
  const [quotas, setQuotas] = useState<EconomyQuotas | null>(null);
  const [metrics, setMetrics] = useState<EconomyMetrics | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных экономики
  const loadEconomyData = async () => {
    try {
      setLoading(true);
      
      // Параллельная загрузка всех данных
      const [quotasRes, metricsRes, statsRes] = await Promise.all([
        fetch(`/api/economy/quotas?userId=${userId}`),
        fetch(`/api/economy/metrics?userId=${userId}`),
        fetch(`/api/economy/stats?userId=${userId}`)
      ]);

      if (quotasRes.ok) {
        const quotasData = await quotasRes.json();
        setQuotas(quotasData.quotas);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.metrics);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEconomyData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">💰</div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка экономических данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">❌</span>
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-200">Ошибка</h3>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
        <button
          onClick={loadEconomyData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          💰 Экономическая панель
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Управляйте своими квотами, отслеживайте статистику и анализируйте активность
        </p>
      </div>

      {/* Квоты */}
      {quotas && (
        <QuotaDisplay quotas={quotas} showDetails={true} />
      )}

      {/* Статистика активности */}
      {stats && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">
            📈 Статистика активности
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-5 rounded-xl border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">⚡</span>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">Квесты</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700 dark:text-blue-300">Создано:</span>
                  <span className="font-medium text-blue-800 dark:text-blue-200">{stats.total_quests_created}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700 dark:text-blue-300">Выполнено:</span>
                  <span className="font-medium text-blue-800 dark:text-blue-200">{stats.total_quests_completed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700 dark:text-blue-300">Успешность:</span>
                  <span className="font-medium text-blue-800 dark:text-blue-200">{stats.completion_rate.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/30 p-5 rounded-xl border border-purple-200 dark:border-purple-700">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🎲</span>
                <h4 className="font-semibold text-purple-800 dark:text-purple-200">События</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-700 dark:text-purple-300">Выполнено:</span>
                  <span className="font-medium text-purple-800 dark:text-purple-200">{stats.total_events_completed}</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/30 p-5 rounded-xl border border-green-200 dark:border-green-700">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🎁</span>
                <h4 className="font-semibold text-green-800 dark:text-green-200">Подарки</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-700 dark:text-green-300">Подарено:</span>
                  <span className="font-medium text-green-800 dark:text-green-200">{stats.total_wishes_gifted}</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-5 rounded-xl border border-yellow-200 dark:border-yellow-700">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">⭐</span>
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Опыт</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-700 dark:text-yellow-300">Всего:</span>
                  <span className="font-medium text-yellow-800 dark:text-yellow-200">{stats.total_experience}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-700 dark:text-yellow-300">Ранг:</span>
                  <span className="font-medium text-yellow-800 dark:text-yellow-200">{stats.current_rank}</span>
                </div>
                {stats.experience_to_next_rank && (
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-700 dark:text-yellow-300">До повышения:</span>
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">{stats.experience_to_next_rank}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Метрики экономики */}
      {metrics && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">
            📊 Экономические метрики
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Статистика подарков */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300">🎁 Активность подарков</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {metrics.total_gifts_given}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">Подарено</div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {metrics.total_gifts_received}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Получено</div>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    Любимый тип подарков:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {metrics.most_gifted_type === 'green' ? '💚' : 
                       metrics.most_gifted_type === 'blue' ? '💙' : '❤️'}
                    </span>
                    <span className="font-medium text-purple-800 dark:text-purple-200">
                      {metrics.most_gifted_type === 'green' ? 'Зеленые' : 
                       metrics.most_gifted_type === 'blue' ? 'Синие' : 'Красные'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Использование квот */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300">📈 Использование квот</h4>
              
              <div className="space-y-3">
                {Object.entries(metrics.quota_utilization).map(([period, utilization]) => {
                  const percentage = utilization * 100;
                  const color = percentage >= 80 ? 'red' : percentage >= 60 ? 'yellow' : 'green';
                  
                  return (
                    <div key={period} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {period === 'daily' ? 'Дневная' : 
                           period === 'weekly' ? 'Недельная' : 'Месячная'}:
                        </span>
                        <span className={`font-bold ${
                          color === 'red' ? 'text-red-600 dark:text-red-400' :
                          color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-green-600 dark:text-green-400'
                        }`}>
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            color === 'red' ? 'bg-red-500' :
                            color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Частота подарков:
                  </span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {metrics.gift_frequency.toFixed(1)} в день
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Рекомендации */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
          💡 Рекомендации
        </h3>
        
        <div className="space-y-3">
          {quotas && quotas.daily.used < quotas.daily.limit * 0.5 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                🎁 <strong>Используйте квоты:</strong> У вас есть неиспользованные подарки на сегодня. 
                Порадуйте своего партнера!
              </p>
            </div>
          )}
          
          {stats && stats.completion_rate < 70 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                ⚡ <strong>Улучшите показатели:</strong> Ваш процент выполнения квестов можно повысить. 
                Это увеличит ваши квоты и ранг.
              </p>
            </div>
          )}
          
          {metrics && metrics.gift_frequency < 1 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
              <p className="text-sm text-green-700 dark:text-green-300">
                💚 <strong>Будьте активнее:</strong> Регулярные подарки укрепляют отношения и 
                повышают ваш ранг в системе.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}