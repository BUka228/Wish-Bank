'use client';

import { RandomEvent } from '@/types/quest-economy';

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

function formatTimeLeft(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMs < 0) return 'Истекло';
  if (diffMins < 60) return `${diffMins} мин`;
  if (diffHours < 24) return `${diffHours} ч`;
  return `${Math.floor(diffHours / 24)} дн`;
}

interface EventCardProps {
  event: RandomEvent & { user_name?: string; completed_by_name?: string };
  onComplete?: (eventId: string) => void;
  currentUserId?: string;
  isPartner?: boolean;
}

const statusConfig = {
  active: { 
    label: 'Активно', 
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
  },
  completed: { 
    label: 'Выполнено', 
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
  },
  expired: { 
    label: 'Истекло', 
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
  }
};

const eventEmojis = ['🎲', '🎯', '⭐', '🎪', '🎨', '🎵', '🎭', '🎊'];

export default function EventCard({ event, onComplete, currentUserId, isPartner = false }: EventCardProps) {
  const statusConf = statusConfig[event.status];
  const canComplete = isPartner && event.status === 'active';
  const isExpired = event.status === 'active' && new Date(event.expires_at) < new Date();
  const randomEmoji = eventEmojis[Math.abs(event.id.charCodeAt(0)) % eventEmojis.length];

  return (
    <div className={`p-6 rounded-2xl border-2 transition-all duration-200 hover:shadow-lg backdrop-blur-sm ${
      isExpired 
        ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-600 ring-2 ring-red-400 dark:ring-red-500' 
        : statusConf.bgColor
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-2xl shadow-lg flex items-center justify-center border border-gray-100 dark:border-gray-600">
            <span className="text-3xl">{randomEmoji}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className={`text-sm font-bold px-3 py-1 rounded-full bg-purple-500 text-white shadow-sm`}>
              СЛУЧАЙНОЕ СОБЫТИЕ
            </span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 ${statusConf.color}`}>
              {statusConf.label}
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-gray-700/70 px-3 py-2 rounded-full border border-gray-200 dark:border-gray-600">
          {formatTimeAgo(new Date(event.created_at))}
        </div>
      </div>

      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">
        {event.title}
      </h3>

      <p className="text-gray-700 dark:text-gray-200 mb-5 font-medium text-base leading-relaxed bg-white/60 dark:bg-gray-700/60 p-4 rounded-xl border border-white/70 dark:border-gray-600/70">
        {event.description}
      </p>

      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-4">
        <div className="bg-white/70 dark:bg-gray-700/70 px-4 py-3 rounded-xl border border-white/50 dark:border-gray-600/50">
          <span className="font-semibold text-gray-700 dark:text-gray-200">Участник:</span> 
          <span className="font-medium ml-2">{event.user_name}</span>
        </div>
      </div>

      {/* Информация о времени */}
      <div className={`text-sm mb-5 px-4 py-3 rounded-xl border ${
        isExpired 
          ? 'bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-600 text-red-700 dark:text-red-300' 
          : event.status === 'active'
          ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300'
          : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
      }`}>
        {event.status === 'active' ? (
          <div className="flex items-center justify-between">
            <span className="font-semibold">
              {isExpired ? '⏰ Время истекло!' : '⏳ Осталось времени:'}
            </span>
            <span className="font-bold">
              {formatTimeLeft(new Date(event.expires_at))}
            </span>
          </div>
        ) : event.status === 'completed' && event.completed_at ? (
          <div className="flex items-center justify-between">
            <span className="font-semibold">✅ Выполнено:</span>
            <span className="font-medium">
              {new Date(event.completed_at).toLocaleDateString('ru-RU')}
              {event.completed_by_name && (
                <span className="ml-2">({event.completed_by_name})</span>
              )}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="font-semibold">❌ Истекло:</span>
            <span className="font-medium">
              {new Date(event.expires_at).toLocaleDateString('ru-RU')}
            </span>
          </div>
        )}
      </div>

      {/* Награда */}
      <div className="flex items-center justify-between text-sm mb-5">
        <div className="flex items-center gap-4">
          <div className="bg-white/70 dark:bg-gray-700/70 px-4 py-3 rounded-xl border border-white/50 dark:border-gray-600/50">
            <span className="font-semibold text-gray-700 dark:text-gray-200">Награда:</span> 
            <span className="font-medium ml-2">{event.reward_amount} {event.reward_type}</span>
          </div>
          {event.experience_reward > 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/30 px-4 py-3 rounded-xl border border-purple-200 dark:border-purple-700">
              <span className="font-semibold text-purple-700 dark:text-purple-300">Опыт:</span> 
              <span className="font-medium ml-2 text-purple-700 dark:text-purple-300">+{event.experience_reward}</span>
            </div>
          )}
        </div>
      </div>

      {/* Кнопки действий */}
      {canComplete && !isExpired && (
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => onComplete?.(event.id)}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-xl text-base font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            ✅ Засчитать выполнение
          </button>
        </div>
      )}

      {/* Информационные сообщения */}
      {!isPartner && event.status === 'active' && !isExpired && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            💡 <span className="font-semibold">Подсказка:</span> Только ваш партнер может засчитать выполнение этого события
          </p>
        </div>
      )}

      {isExpired && event.status === 'active' && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-700">
          <p className="text-sm text-red-700 dark:text-red-300">
            ⏰ <span className="font-semibold">Время истекло!</span> Скоро появится новое случайное событие
          </p>
        </div>
      )}

      {event.status === 'completed' && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-700">
          <p className="text-sm text-green-700 dark:text-green-300">
            🎉 <span className="font-semibold">Отлично!</span> Событие успешно выполнено и награда получена
          </p>
        </div>
      )}
    </div>
  );
}