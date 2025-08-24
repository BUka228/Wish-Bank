'use client';

import { useState, useEffect } from 'react';
import { Rank, UserStats } from '@/types/quest-economy';
import RankBadge from './RankBadge';

interface RankProgressProps {
  currentUserId: string;
}

interface RankProgressData {
  current_rank: Rank;
  next_rank?: Rank;
  current_experience: number;
  experience_to_next: number;
  progress_percentage: number;
  recent_activities: {
    type: string;
    description: string;
    experience_gained: number;
    date: Date;
  }[];
}

export default function RankProgress({ currentUserId }: RankProgressProps) {
  const [progressData, setProgressData] = useState<RankProgressData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных прогресса
  const loadProgressData = async () => {
    try {
      setLoading(true);
      
      const [progressRes, statsRes] = await Promise.all([
        fetch('/api/ranks/progress'),
        fetch('/api/economy/stats')
      ]);

      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setProgressData(progressData);
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
    loadProgressData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⭐</div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка прогресса рангов...</p>
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
          onClick={loadProgressData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
        <p className="text-gray-600 dark:text-gray-400">Данные о прогрессе недоступны</p>
      </div>
    );
  }

  const isMaxRank = !progressData.next_rank;

  return (
    <div className="space-y-6">
      {/* Текущий ранг и прогресс */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">
          ⭐ Прогресс по рангам
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Текущий ранг */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              🎖️ Текущий ранг
            </h3>
            
            <div className="p-5 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl border border-blue-200 dark:border-blue-700">
              <RankBadge 
                rank={progressData.current_rank} 
                size="large" 
                showName={true}
                currentExperience={progressData.current_experience}
                nextRank={progressData.next_rank}
                showProgress={false}
              />
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Общий опыт:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {progressData.current_experience.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Минимум для ранга:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {progressData.current_rank.min_experience.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Следующий ранг */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              🎯 {isMaxRank ? 'Максимальный ранг' : 'Следующий ранг'}
            </h3>
            
            {isMaxRank ? (
              <div className="p-5 bg-gradient-to-br from-gold-50 to-yellow-50 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-xl border border-yellow-200 dark:border-yellow-700">
                <div className="text-center">
                  <div className="text-4xl mb-3">👑</div>
                  <h4 className="text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-2">
                    Поздравляем!
                  </h4>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Вы достигли максимального ранга в системе
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl border border-green-200 dark:border-green-700">
                <RankBadge 
                  rank={progressData.next_rank!} 
                  size="large" 
                  showName={true}
                />
                
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Нужно опыта:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {progressData.experience_to_next.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Прогресс-бар */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Прогресс:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {progressData.progress_percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(progressData.progress_percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Статистика активности */}
      {stats && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">
            📊 Статистика для получения опыта
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">⚡</span>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">Квесты</h4>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.total_quests_completed}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Выполнено квестов
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  ~{(stats.total_quests_completed * 50).toLocaleString()} опыта
                </div>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl border border-purple-200 dark:border-purple-700">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🎲</span>
                <h4 className="font-semibold text-purple-800 dark:text-purple-200">События</h4>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.total_events_completed}
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300">
                  Выполнено событий
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400">
                  ~{(stats.total_events_completed * 30).toLocaleString()} опыта
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-xl border border-green-200 dark:border-green-700">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🎁</span>
                <h4 className="font-semibold text-green-800 dark:text-green-200">Подарки</h4>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.total_wishes_gifted}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  Подарено желаний
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">
                  ~{(stats.total_wishes_gifted * 10).toLocaleString()} опыта
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-xl border border-yellow-200 dark:border-yellow-700">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📈</span>
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Эффективность</h4>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.completion_rate.toFixed(0)}%
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  Процент выполнения
                </div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400">
                  Влияет на бонусы
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Недавняя активность */}
      {progressData.recent_activities && progressData.recent_activities.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">
            🏃‍♂️ Недавняя активность
          </h3>
          
          <div className="space-y-3">
            {progressData.recent_activities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center border border-blue-200 dark:border-blue-700">
                    <span className="text-lg">
                      {activity.type === 'quest' ? '⚡' : 
                       activity.type === 'event' ? '🎲' : 
                       activity.type === 'gift' ? '🎁' : '📈'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {activity.description}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(activity.date).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600 dark:text-green-400">
                    +{activity.experience_gained}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    опыта
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Советы по получению опыта */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
          💡 Как получить больше опыта
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">⚡ Выполняйте квесты</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Квесты дают больше всего опыта. Сложные квесты дают больше очков.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
              <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">🎲 Участвуйте в событиях</h4>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Случайные события - отличный способ получить дополнительный опыт.
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">🎁 Дарите подарки</h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Каждый подарок приносит опыт и укрепляет отношения.
              </p>
            </div>
            
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">📈 Будьте активны</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Регулярная активность дает бонусы к получаемому опыту.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}