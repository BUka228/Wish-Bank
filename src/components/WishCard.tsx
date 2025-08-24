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
  green: { emoji: '💚', color: 'bg-green-100 border-green-300', textColor: 'text-green-800' },
  blue: { emoji: '💙', color: 'bg-blue-100 border-blue-300', textColor: 'text-blue-800' },
  red: { emoji: '❤️', color: 'bg-red-100 border-red-300', textColor: 'text-red-800' }
};

export default function WishCard({ wish, onComplete, onCancel, currentUserId }: WishCardProps) {
  const config = wishTypeConfig[wish.type];
  const isAuthor = wish.author_id === currentUserId;
  const isAssignee = wish.assignee_id === currentUserId;
  const canComplete = isAssignee && wish.status === 'active';
  const canCancel = isAuthor && wish.status === 'active';

  return (
    <div className={`p-4 rounded-lg border-2 ${config.color} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.emoji}</span>
          <span className={`text-sm font-medium px-2 py-1 rounded ${config.textColor} bg-white/50`}>
            {wish.type.toUpperCase()}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {formatTimeAgo(new Date(wish.created_at))}
        </span>
      </div>

      <p className="text-gray-800 mb-3 font-medium">{wish.description}</p>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          <span className="font-medium">От:</span> {wish.author_name}
          {wish.assignee_name && (
            <>
              <span className="mx-2">→</span>
              <span className="font-medium">Для:</span> {wish.assignee_name}
            </>
          )}
        </div>
      </div>

      {(canComplete || canCancel) && (
        <div className="flex gap-2 mt-3">
          {canComplete && (
            <button
              onClick={() => onComplete?.(wish.id)}
              className="flex-1 bg-green-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-600 transition-colors"
            >
              ✅ Выполнено
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel?.(wish.id)}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              ❌ Отменить
            </button>
          )}
        </div>
      )}
    </div>
  );
}