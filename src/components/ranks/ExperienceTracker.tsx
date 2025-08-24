'use client';

import { useState, useEffect } from 'react';

interface ExperienceActivity {
  id: string;
  type: 'quest_completed' | 'event_completed' | 'wish_gifted' | 'quest_created' | 'daily_bonus' | 'streak_bonus';
  description: string;
  experience_gained: number;
  multiplier?: number;
  base_experience?: number;
  created_at: Date;
  metadata?: Record<string, any>;
}

interface ExperienceTrackerProps {
  currentUserId: string;
  showRecent?: boolean;
  compact?: boolean;
}

const activityConfig = {
  quest_completed: {
    icon: '⚡',
    label: 'Квест выполнен',
    color: 'blue',
    baseExp: 50
  },
  event_completed: {
    icon: '🎲',
    label: 'Событие выполнено',
    color: 'purple',
    baseExp: 30
  },
  wish_gifted: {
    icon: '🎁',
    label: 'Подарок отправлен',
    color: 'green',
    baseExp: 10
  },
  quest_created: {
    icon: '📝',
    label: 'Квест создан',
    color: 'orange',
    baseExp: 20
  },
  daily_bonus: {
    icon: '📅',
    label: 'Ежедневный бонус',
    color: 'yellow',
    baseExp: 25
  },
  streak_bonus: {
    icon: '🔥',
    label: 'Бонус за серию',
    color: 'red',
    baseExp: 0
  }
};

const getColorClasses = (color: string): string => {
  switch (color) {
    case 'blue':
      return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300';
    case 'purple':
      return 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300';
    case 'green':
      return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300';
    case 'orange':
      return 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300';
    case 'yellow':
      return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300';
    case 'red':
      return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300';
    default:
      return 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300';
  }
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} дн назад`;
  return date.toLocaleDateString('ru-RU');
}

export default function ExperienceTracker({ 
  currentUserId, 
  showRecent = true, 
  compact = false 
}: ExperienceTrackerProps) {
  const [activities, setActivities] = useState<ExperienceActivity[]>([]);
  const [todayExp, setTodayExp] = useState(0);
  const [weekExp, setWeekExp] = useState(0);
  const [monthExp, setMonthExp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка активности опыта
  const loadExperienceData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/experience/activities');
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных об опыте');
      }
      
      const data = await response.json();
      setActivities(data.activities || []);
      
      // Расчет статистики
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const todayActivities = data.activities.filter((a: ExperienceActivity) => 
        new Date(a.created_at) >= today
      );
      const weekActivities = data.activities.filter((a: ExperienceActivity) => 
        new Date(a.created_at) >= weekAgo
      );
      const monthActivities = data.activities.filter((a: ExperienceActivity) => 
        new Date(a.created_at) >= monthAgo
      );
      
      setTodayExp(todayActivities.reduce((sum: number, a: ExperienceActivity) => sum + a.experience_gained, 0));
      setWeekExp(weekActivities.reduce((sum: number, a: ExperienceActivity) => sum + a.experience_gained, 0));
      setMonthExp(monthActivities.reduce((sum: number, a: ExperienceActivity) => sum + a.experience_gained, 0));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExperienceData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin text-3xl mb-3">⭐</div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка трекера опыта...</p>
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
          onClick={loadExperienceData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-700 dark:text-gray-300">⭐ Опыт</h4>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Сегодня: +{todayExp}
          </div>
        </div>
        
        {activities.slice(0, 3).map((activity) => {
          const config = activityConfig[activity.type];
          return (
            <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.icon}</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {activity.description}
                </span>
              </div>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                +{activity.experience_gained}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистика опыта */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">
          ⭐ Трекер опыта
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-50 dark:bg-green-900/30 p-5 rounded-xl border border-green-200 dark:border-green-700">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">📅</span>
              <h3 className="font-semibold text-green-800 dark:text-green-200">Сегодня</h3>
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
              +{todayExp}
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">
              опыта получено
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 p-5 rounded-xl border border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">📊</span>
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">За неделю</h3>
            </div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              +{weekExp}
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              опыта получено
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/30 p-5 rounded-xl border border-purple-200 dark:border-purple-700">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">📈</span>
              <h3 className="font-semibold text-purple-800 dark:text-purple-200">За месяц</h3>
            </div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
              +{monthExp}
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-300">
              опыта получено
            </div>
          </div>
        </div>
      </div>

      {/* Недавняя активность */}
      {showRecent && activities.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">
            🏃‍♂️ Недавняя активность
          </h3>
          
          <div className="space-y-3">
            {activities.slice(0, 10).map((activity) => {
              const config = activityConfig[activity.type];
              const colorClasses = getColorClasses(config.color);
              
              return (
                <div key={activity.id} className={`p-4 rounded-lg border ${colorClasses}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-600">
                        <span className="text-2xl">{config.icon}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {activity.description}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatTimeAgo(new Date(activity.created_at))}
                        </div>
                        {activity.multiplier && activity.multiplier > 1 && (
                          <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            Множитель: ×{activity.multiplier} 
                            {activity.base_experience && (
                              <span className="ml-1">
                                ({activity.base_experience} → {activity.experience_gained})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        +{activity.experience_gained}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        опыта
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Источники опыта */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">
          📋 Источники опыта
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(activityConfig).map(([type, config]) => (
            <div key={type} className={`p-4 rounded-lg border ${getColorClasses(config.color)}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{config.icon}</span>
                <h4 className="font-semibold">{config.label}</h4>
              </div>
              <div className="text-sm opacity-90">
                Базовый опыт: <span className="font-medium">+{config.baseExp}</span>
                {config.baseExp > 0 && (
                  <div className="text-xs mt-1 opacity-75">
                    Может увеличиваться множителями и бонусами
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Советы по получению опыта */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
          💡 Как получить больше опыта
        </h3>
        
        <div className="space-y-3">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">⚡ Выполняйте сложные квесты</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Квесты высокой сложности дают больше опыта. Эпичные квесты могут давать до 200+ опыта.
            </p>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">🔥 Поддерживайте серии</h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              Ежедневная активность создает серии, которые дают бонусный опыт и множители.
            </p>
          </div>
          
          <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
            <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">🎲 Участвуйте в событиях</h4>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Случайные события - отличный способ получить дополнительный опыт без больших усилий.
            </p>
          </div>
          
          <div className="p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700">
            <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">🎁 Дарите подарки регулярно</h4>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Каждый подарок дает опыт, а регулярное дарение может активировать бонусы.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}