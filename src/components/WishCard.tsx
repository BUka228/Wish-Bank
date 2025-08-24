'use client';

import { Wish } from '@/lib/db';
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

interface WishCardProps {
  wish: Wish & { author_name?: string; assignee_name?: string };
  onComplete?: (wishId: string) => void;
  onCancel?: (wishId: string) => void;
  currentUserId?: string;
}

const wishTypeConfig = {
  green: { 
    emoji: '💚', 
    color: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-700', 
    textColor: 'text-green-800 dark:text-green-300',
    badgeColor: 'bg-green-500 text-white'
  },
  blue: { 
    emoji: '💙', 
    color: 'bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/30 dark:to-sky-900/30 border-blue-200 dark:border-blue-700', 
    textColor: 'text-blue-800 dark:text-blue-300',
    badgeColor: 'bg-blue-500 text-white'
  },
  red: { 
    emoji: '❤️', 
    color: 'bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 border-red-200 dark:border-red-700', 
    textColor: 'text-red-800 dark:text-red-300',
    badgeColor: 'bg-red-500 text-white'
  }
};

export default function WishCard({ wish, onComplete, onCancel, currentUserId }: WishCardProps) {
  const config = wishTypeConfig[wish.type];
  const isAuthor = wish.author_id === currentUserId;
  const isAssignee = wish.assignee_id === currentUserId;
  const canComplete = isAssignee && wish.status === 'active';
  const canCancel = isAuthor && wish.status === 'active';

  return (
    <div className={`p-5 rounded-2xl border-2 ${config.color} transition-all duration-200 hover:shadow-lg hover:scale-[1.02] backdrop-blur-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-xl shadow-md flex items-center justify-center border border-gray-100 dark:border-gray-600">
            <span className="text-2xl">{config.emoji}</span>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${config.badgeColor} shadow-sm`}>
            {wish.type.toUpperCase()}
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-gray-700/70 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600">
          {formatTimeAgo(new Date(wish.created_at))}
        </div>
      </div>

      <p className="text-gray-800 dark:text-gray-100 mb-4 font-medium text-base leading-relaxed bg-white/50 dark:bg-gray-700/50 p-3 rounded-lg border border-white/70 dark:border-gray-600/70">
        {wish.description}
      </p>

      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-4">
        <div className="bg-white/70 dark:bg-gray-700/70 px-3 py-2 rounded-lg border border-white/50 dark:border-gray-600/50">
          <span className="font-semibold text-gray-700 dark:text-gray-200">От:</span> <span className="font-medium">{wish.author_name}</span>
          {wish.assignee_name && (
            <>
              <span className="mx-2 text-gray-400 dark:text-gray-500">→</span>
              <span className="font-semibold text-gray-700 dark:text-gray-200">Для:</span> <span className="font-medium">{wish.assignee_name}</span>
            </>
          )}
        </div>
      </div>

      {(canComplete || canCancel) && (
        <div className="flex gap-3 mt-4">
          {canComplete && (
            <button
              onClick={() => onComplete?.(wish.id)}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-xl text-sm font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              ✅ Выполнено
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel?.(wish.id)}
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