'use client';

import React, { useState, useEffect } from 'react';

interface EnhancementStats {
  total_enhancements: number;
  priority_enhancements: number;
  aura_enhancements: number;
  total_mana_spent: number;
  average_enhancement_cost: number;
  most_popular_aura: string;
  enhancement_distribution: {
    level: number;
    count: number;
    percentage: number;
  }[];
  aura_distribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
  daily_stats: {
    date: string;
    enhancements: number;
    mana_spent: number;
  }[];
  top_users: {
    user_id: string;
    username: string;
    enhancement_count: number;
    mana_spent: number;
  }[];
}

interface EnhancementMetricsProps {
  className?: string;
}

export default function EnhancementMetrics({ className = '' }: EnhancementMetricsProps) {
  const [stats, setStats] = useState<EnhancementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    loadEnhancementStats();
  }, [dateRange]);

  const loadEnhancementStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/mana/enhancement-metrics?range=${dateRange}`);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки метрик усилений');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const getAuraLabel = (auraType: string) => {
    const labels = {
      romantic: 'Романтическая',
      gaming: 'Игровая',
      mysterious: 'Загадочная'
    };
    return labels[auraType as keyof typeof labels] || auraType;
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">Загрузка метрик усилений...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-red-500 text-center">Ошибка: {error}</div>
        <button 
          onClick={loadEnhancementStats}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Повторить попытку
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">Нет данных для отображения</div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Метрики использования системы усилений</h2>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | 'all')}
            className="p-2 border rounded"
          >
            <option value="7d">Последние 7 дней</option>
            <option value="30d">Последние 30 дней</option>
            <option value="90d">Последние 90 дней</option>
            <option value="all">Все время</option>
          </select>
          <button 
            onClick={loadEnhancementStats}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Обновить
          </button>
        </div>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-100 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800">Всего усилений</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.total_enhancements}</p>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-800">Усилений приоритета</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.priority_enhancements}</p>
        </div>
        <div className="bg-pink-100 p-4 rounded-lg">
          <h3 className="font-semibold text-pink-800">Усилений ауры</h3>
          <p className="text-2xl font-bold text-pink-600">{stats.aura_enhancements}</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">Потрачено Маны</h3>
          <p className="text-2xl font-bold text-green-600">{stats.total_mana_spent.toLocaleString()}</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg">
          <h3 className="font-semibold text-yellow-800">Средняя стоимость</h3>
          <p className="text-2xl font-bold text-yellow-600">{Math.round(stats.average_enhancement_cost)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Распределение уровней приоритета */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Распределение уровней приоритета</h3>
          <div className="space-y-2">
            {stats.enhancement_distribution.map(item => (
              <div key={item.level} className="flex items-center justify-between">
                <span>Уровень {item.level}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {item.count} ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Распределение типов аур */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Популярность типов аур</h3>
          <div className="space-y-2">
            {stats.aura_distribution.map(item => (
              <div key={item.type} className="flex items-center justify-between">
                <span>{getAuraLabel(item.type)}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-pink-500 h-2 rounded-full" 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {item.count} ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
          {stats.most_popular_aura && (
            <div className="mt-4 p-2 bg-pink-50 rounded">
              <strong>Самая популярная аура:</strong> {getAuraLabel(stats.most_popular_aura)}
            </div>
          )}
        </div>
      </div>

      {/* Топ пользователей по усилениям */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Топ пользователей по использованию усилений</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Место</th>
                <th className="text-left p-2">Пользователь</th>
                <th className="text-right p-2">Усилений</th>
                <th className="text-right p-2">Потрачено Маны</th>
                <th className="text-right p-2">Средняя стоимость</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_users.map((user, index) => (
                <tr key={user.user_id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <span className={`font-bold ${
                      index === 0 ? 'text-yellow-600' : 
                      index === 1 ? 'text-gray-500' : 
                      index === 2 ? 'text-orange-600' : 'text-gray-700'
                    }`}>
                      #{index + 1}
                    </span>
                  </td>
                  <td className="p-2">
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-xs text-gray-500">{user.user_id}</div>
                    </div>
                  </td>
                  <td className="p-2 text-right font-semibold">
                    {user.enhancement_count}
                  </td>
                  <td className="p-2 text-right text-red-600">
                    {user.mana_spent.toLocaleString()}
                  </td>
                  <td className="p-2 text-right">
                    {Math.round(user.mana_spent / user.enhancement_count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* График активности по дням */}
      {stats.daily_stats.length > 0 && (
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Активность усилений по дням</h3>
          <div className="overflow-x-auto">
            <div className="flex items-end space-x-1 min-w-full h-32">
              {stats.daily_stats.map((day, index) => {
                const maxEnhancements = Math.max(...stats.daily_stats.map(d => d.enhancements));
                const height = maxEnhancements > 0 ? (day.enhancements / maxEnhancements) * 100 : 0;
                
                return (
                  <div key={index} className="flex flex-col items-center flex-1 min-w-0">
                    <div 
                      className="bg-blue-500 w-full rounded-t"
                      style={{ height: `${height}%` }}
                      title={`${day.enhancements} усилений, ${day.mana_spent} Маны`}
                    ></div>
                    <div className="text-xs mt-1 transform -rotate-45 origin-top-left">
                      {new Date(day.date).toLocaleDateString('ru-RU', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}