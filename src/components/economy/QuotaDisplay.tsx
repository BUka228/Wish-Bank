'use client';

import { EconomyQuotas } from '@/types/quest-economy';

interface QuotaDisplayProps {
  quotas: EconomyQuotas;
  compact?: boolean;
  showDetails?: boolean;
}

function formatTimeLeft(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) return 'Обновлено';
  if (diffHours < 1) return 'Скоро';
  if (diffHours < 24) return `${diffHours} ч`;
  return `${diffDays} дн`;
}

function getQuotaColor(used: number, limit: number): string {
  const percentage = (used / limit) * 100;
  if (percentage >= 90) return 'red';
  if (percentage >= 70) return 'yellow';
  return 'green';
}

function getQuotaColorClasses(color: string): string {
  switch (color) {
    case 'red':
      return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300';
    case 'yellow':
      return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300';
    case 'green':
      return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300';
    default:
      return 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300';
  }
}

function getProgressBarColor(color: string): string {
  switch (color) {
    case 'red':
      return 'bg-red-500';
    case 'yellow':
      return 'bg-yellow-500';
    case 'green':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
}

export default function QuotaDisplay({ quotas, compact = false, showDetails = true }: QuotaDisplayProps) {
  const quotaTypes = [
    { 
      key: 'daily' as const, 
      label: 'Дневная', 
      emoji: '📅', 
      data: quotas.daily,
      description: 'Обновляется каждый день'
    },
    { 
      key: 'weekly' as const, 
      label: 'Недельная', 
      emoji: '📊', 
      data: quotas.weekly,
      description: 'Обновляется каждую неделю'
    },
    { 
      key: 'monthly' as const, 
      label: 'Месячная', 
      emoji: '📈', 
      data: quotas.monthly,
      description: 'Обновляется каждый месяц'
    }
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        {quotaTypes.map(quota => {
          const remaining = quota.data.limit - quota.data.used;
          const color = getQuotaColor(quota.data.used, quota.data.limit);
          
          return (
            <div key={quota.key} className="flex items-center gap-2">
              <span className="text-lg">{quota.emoji}</span>
              <div className="text-sm">
                <span className={`font-bold ${
                  color === 'red' ? 'text-red-600 dark:text-red-400' :
                  color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-green-600 dark:text-green-400'
                }`}>
                  {remaining}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  /{quota.data.limit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
          📊 Квоты на подарки
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Обновляется автоматически
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quotaTypes.map(quota => {
          const remaining = quota.data.limit - quota.data.used;
          const percentage = (quota.data.used / quota.data.limit) * 100;
          const color = getQuotaColor(quota.data.used, quota.data.limit);
          const colorClasses = getQuotaColorClasses(color);
          const progressColor = getProgressBarColor(color);

          return (
            <div key={quota.key} className={`p-5 rounded-xl border-2 ${colorClasses}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{quota.emoji}</span>
                  <div>
                    <h4 className="font-semibold text-lg">{quota.label}</h4>
                    {showDetails && (
                      <p className="text-xs opacity-80">{quota.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Основные цифры */}
              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {remaining}
                  </span>
                  <span className="text-lg opacity-70">
                    / {quota.data.limit}
                  </span>
                </div>
                <p className="text-sm opacity-80 mt-1">
                  {remaining > 0 ? 'Осталось подарков' : 'Квота исчерпана'}
                </p>
              </div>

              {/* Прогресс-бар */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Использовано</span>
                  <span className="font-medium">{percentage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-white/50 dark:bg-gray-700/50 rounded-full h-3 border border-white/70 dark:border-gray-600/70">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${progressColor}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Время до обновления */}
              <div className="flex items-center justify-between text-sm">
                <span>Обновление через:</span>
                <span className="font-medium">
                  {formatTimeLeft(quota.data.reset_time)}
                </span>
              </div>

              {showDetails && (
                <div className="mt-3 pt-3 border-t border-white/30 dark:border-gray-600/30">
                  <div className="text-xs opacity-80">
                    <div className="flex justify-between">
                      <span>Использовано:</span>
                      <span>{quota.data.used}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Лимит:</span>
                      <span>{quota.data.limit}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Общая информация */}
      {showDetails && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            💡 Как работают квоты
          </h4>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p>• <strong>Дневная квота</strong> - количество подарков, которые можно дарить каждый день</p>
            <p>• <strong>Недельная квота</strong> - общий лимит подарков на неделю</p>
            <p>• <strong>Месячная квота</strong> - максимум подарков в месяц</p>
            <p>• Квоты увеличиваются с повышением ранга и выполнением квестов</p>
          </div>
        </div>
      )}

      {/* Предупреждения */}
      {quotaTypes.some(q => q.data.used >= q.data.limit) && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-semibold text-red-800 dark:text-red-200">
                Квота исчерпана
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                Одна или несколько квот достигли лимита. Дождитесь обновления или повысьте ранг для увеличения лимитов.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}