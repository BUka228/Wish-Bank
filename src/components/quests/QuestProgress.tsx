'use client';

import { Quest } from '@/types/quest-economy';

interface QuestProgressProps {
  quests: Quest[];
  currentUserId: string;
}

interface QuestStats {
  total: number;
  active: number;
  completed: number;
  expired: number;
  cancelled: number;
  completionRate: number;
  averageCompletionTime?: number;
}

function calculateStats(quests: Quest[]): QuestStats {
  const total = quests.length;
  const active = quests.filter(q => q.status === 'active').length;
  const completed = quests.filter(q => q.status === 'completed').length;
  const expired = quests.filter(q => q.status === 'expired').length;
  const cancelled = quests.filter(q => q.status === 'cancelled').length;
  
  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  
  // Расчет среднего времени выполнения для завершенных квестов
  const completedQuests = quests.filter(q => q.status === 'completed' && q.completed_at);
  let averageCompletionTime: number | undefined;
  
  if (completedQuests.length > 0) {
    const totalTime = completedQuests.reduce((sum, quest) => {
      const created = new Date(quest.created_at).getTime();
      const completed = new Date(quest.completed_at!).getTime();
      return sum + (completed - created);
    }, 0);
    averageCompletionTime = totalTime / completedQuests.length;
  }

  return {
    total,
    active,
    completed,
    expired,
    cancelled,
    completionRate,
    averageCompletionTime
  };
}

function formatDuration(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} дн ${hours % 24} ч`;
  }
  return `${hours} ч`;
}

function getCompletionRateColor(rate: number): string {
  if (rate >= 80) return 'text-green-600 dark:text-green-400';
  if (rate >= 60) return 'text-yellow-600 dark:text-yellow-400';
  if (rate >= 40) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function getCompletionRateEmoji(rate: number): string {
  if (rate >= 80) return '🏆';
  if (rate >= 60) return '👍';
  if (rate >= 40) return '📈';
  return '📉';
}

export default function QuestProgress({ quests, currentUserId }: QuestProgressProps) {
  // Разделяем квесты на созданные и назначенные
  const createdQuests = quests.filter(q => q.author_id === currentUserId);
  const assignedQuests = quests.filter(q => q.assignee_id === currentUserId);
  
  const createdStats = calculateStats(createdQuests);
  const assignedStats = calculateStats(assignedQuests);

  // Статистика по сложности для назначенных квестов
  const difficultyStats = {
    easy: assignedQuests.filter(q => q.difficulty === 'easy' && q.status === 'completed').length,
    medium: assignedQuests.filter(q => q.difficulty === 'medium' && q.status === 'completed').length,
    hard: assignedQuests.filter(q => q.difficulty === 'hard' && q.status === 'completed').length,
    epic: assignedQuests.filter(q => q.difficulty === 'epic' && q.status === 'completed').length
  };

  // Недавние достижения
  const recentCompletions = assignedQuests
    .filter(q => q.status === 'completed' && q.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Общая статистика */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
          📊 Прогресс по квестам
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Созданные квесты */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              ⚡ Созданные мной
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {createdStats.total}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Всего создано</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {createdStats.active}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">Активных</div>
              </div>
            </div>
          </div>

          {/* Назначенные квесты */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              🎯 Назначенные мне
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {assignedStats.completed}
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300">Выполнено</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {assignedStats.active}
                </div>
                <div className="text-sm text-orange-700 dark:text-orange-300">В процессе</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Процент выполнения */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
          📈 Эффективность выполнения
        </h4>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Процент выполнения:</span>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getCompletionRateColor(assignedStats.completionRate)}`}>
                {assignedStats.completionRate.toFixed(1)}%
              </span>
              <span className="text-2xl">{getCompletionRateEmoji(assignedStats.completionRate)}</span>
            </div>
          </div>
          
          {/* Прогресс-бар */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${assignedStats.completionRate}%` }}
            />
          </div>
          
          {assignedStats.averageCompletionTime && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Среднее время выполнения:</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {formatDuration(assignedStats.averageCompletionTime)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Статистика по сложности */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
          🏅 Достижения по сложности
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
            <div className="text-2xl mb-2">🟢</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {difficultyStats.easy}
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">Легких</div>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
            <div className="text-2xl mb-2">🟡</div>
            <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
              {difficultyStats.medium}
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300">Средних</div>
          </div>
          
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700">
            <div className="text-2xl mb-2">🟠</div>
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {difficultyStats.hard}
            </div>
            <div className="text-sm text-orange-700 dark:text-orange-300">Сложных</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="text-2xl mb-2">🔴</div>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {difficultyStats.epic}
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-300">Эпичных</div>
          </div>
        </div>
      </div>

      {/* Недавние достижения */}
      {recentCompletions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
            🎉 Недавние достижения
          </h4>
          
          <div className="space-y-3">
            {recentCompletions.map((quest, index) => (
              <div key={quest.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-2xl">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800 dark:text-gray-200">
                    {quest.title}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Выполнено {new Date(quest.completed_at!).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  +{quest.experience_reward} опыта
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}