'use client';

import { Quest } from '@/types/quest-economy';

// Простая функция для форматирования времени без внешних зависимостей
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

function formatDueDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMs < 0) return 'Просрочено';
  if (diffHours < 24) return `Осталось ${diffHours} ч`;
  return `Осталось ${diffDays} дн`;
}

interface QuestCardProps {
  quest: Quest & { author_name?: string; assignee_name?: string };
  onComplete?: (questId: string) => void;
  onCancel?: (questId: string) => void;
  onEdit?: (questId: string) => void;
  currentUserId?: string;
}

const difficultyConfig = {
  easy: { 
    emoji: '🟢', 
    label: 'Легко',
    color: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-700',
    badgeColor: 'bg-green-500 text-white'
  },
  medium: { 
    emoji: '🟡', 
    label: 'Средне',
    color: 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 border-yellow-200 dark:border-yellow-700',
    badgeColor: 'bg-yellow-500 text-white'
  },
  hard: { 
    emoji: '🟠', 
    label: 'Сложно',
    color: 'bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 border-orange-200 dark:border-orange-700',
    badgeColor: 'bg-orange-500 text-white'
  },
  epic: { 
    emoji: '🔴', 
    label: 'Эпично',
    color: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-200 dark:border-purple-700',
    badgeColor: 'bg-purple-500 text-white'
  }
};

const statusConfig = {
  active: { label: 'Активен', color: 'text-green-600 dark:text-green-400' },
  completed: { label: 'Выполнен', color: 'text-blue-600 dark:text-blue-400' },
  expired: { label: 'Просрочен', color: 'text-red-600 dark:text-red-400' },
  cancelled: { label: 'Отменен', color: 'text-gray-600 dark:text-gray-400' }
};

export default function QuestCard({ quest, onComplete, onCancel, onEdit, currentUserId }: QuestCardProps) {
  const difficultyConf = difficultyConfig[quest.difficulty];
  const statusConf = statusConfig[quest.status];
  const isAuthor = quest.author_id === currentUserId;
  const isAssignee = quest.assignee_id === currentUserId;
  const canComplete = isAuthor && quest.status === 'active';
  const canCancel = (isAuthor || isAssignee) && quest.status === 'active';
  const canEdit = isAuthor && quest.status === 'active';

  const isOverdue = quest.due_date && new Date(quest.due_date) < new Date() && quest.status === 'active';

  return (
    <div className={`p-5 rounded-2xl border-2 ${difficultyConf.color} transition-all duration-200 hover:shadow-lg hover:scale-[1.02] backdrop-blur-sm ${isOverdue ? 'ring-2 ring-red-400 dark:ring-red-500' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-xl shadow-md flex items-center justify-center border border-gray-100 dark:border-gray-600">
            <span className="text-2xl">{difficultyConf.emoji}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${difficultyConf.badgeColor} shadow-sm`}>
              {difficultyConf.label}
            </span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 ${statusConf.color}`}>
              {statusConf.label}
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-gray-700/70 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600">
          {formatTimeAgo(new Date(quest.created_at))}
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
        {quest.title}
      </h3>

      <p className="text-gray-700 dark:text-gray-200 mb-4 font-medium text-sm leading-relaxed bg-white/50 dark:bg-gray-700/50 p-3 rounded-lg border border-white/70 dark:border-gray-600/70">
        {quest.description}
      </p>

      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-4">
        <div className="bg-white/70 dark:bg-gray-700/70 px-3 py-2 rounded-lg border border-white/50 dark:border-gray-600/50">
          <span className="font-semibold text-gray-700 dark:text-gray-200">Автор:</span> <span className="font-medium">{quest.author_name}</span>
          <span className="mx-2 text-gray-400 dark:text-gray-500">→</span>
          <span className="font-semibold text-gray-700 dark:text-gray-200">Исполнитель:</span> <span className="font-medium">{quest.assignee_name}</span>
        </div>
      </div>

      {quest.due_date && (
        <div className={`text-sm mb-4 px-3 py-2 rounded-lg border ${isOverdue ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300' : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'}`}>
          <span className="font-semibold">Срок выполнения:</span> {formatDueDate(new Date(quest.due_date))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm mb-4">
        <div className="flex items-center gap-4">
          <div className="bg-white/70 dark:bg-gray-700/70 px-3 py-2 rounded-lg border border-white/50 dark:border-gray-600/50">
            <span className="font-semibold text-gray-700 dark:text-gray-200">Награда:</span> 
            <span className="font-medium ml-1">{quest.reward_amount} {quest.reward_type}</span>
          </div>
          {quest.experience_reward > 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/30 px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-700">
              <span className="font-semibold text-purple-700 dark:text-purple-300">Опыт:</span> 
              <span className="font-medium ml-1 text-purple-700 dark:text-purple-300">+{quest.experience_reward}</span>
            </div>
          )}
        </div>
      </div>

      {(canComplete || canCancel || canEdit) && (
        <div className="flex gap-3 mt-4">
          {canComplete && (
            <button
              onClick={() => onComplete?.(quest.id)}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-xl text-sm font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              ✅ Засчитать выполнение
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => onEdit?.(quest.id)}
              className="px-4 py-3 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              ✏️ Изменить
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel?.(quest.id)}
              className="px-4 py-3 bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium hover:bg-white dark:hover:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              ❌ Отменить
            </button>
          )}
        </div>
      )}
    </div>
  );
}