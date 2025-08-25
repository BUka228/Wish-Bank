'use client';

import { EnhancedWish as Wish } from '@/types/quest-economy'; // Using the correct centralized type
import { StarIcon, SparklesIcon, LinkIcon, ClockIcon } from '@heroicons/react/24/solid';

// Simple time formatting function
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} мин. назад`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ч. назад`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} д. назад`;
}

interface WishCardProps {
  wish: Wish & { author_name?: string; assignee_name?: string };
  onComplete?: (wishId: string) => void;
  onCancel?: (wishId: string) => void;
  onEnchant?: (wishId: string) => void; // New prop to open enchantment panel
  currentUserId?: string;
}

const auraConfig = {
  romantic: { icon: SparklesIcon, color: 'text-pink-500', label: 'Романтика' },
  urgent: { icon: StarIcon, color: 'text-red-500', label: 'Срочно' },
  playful: { icon: SparklesIcon, color: 'text-yellow-500', label: 'Игривое' },
  mysterious: { icon: SparklesIcon, color: 'text-purple-500', label: 'Загадочное' },
};

export default function WishCard({ wish, onComplete, onCancel, onEnchant, currentUserId }: WishCardProps) {
  const isAuthor = wish.author_id === currentUserId;
  const isAssignee = wish.assignee_id === currentUserId;
  const canComplete = isAssignee && wish.status === 'active';
  const canCancel = isAuthor && wish.status === 'active';
  const canEnchant = isAuthor && wish.status === 'active';

  const priority = wish.enchantments?.priority;
  const aura = wish.enchantments?.aura;

  return (
    <div className="p-5 rounded-2xl border-2 bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-wrap">
            {/* Displaying Priority */}
            {priority && (
                <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 px-3 py-1 rounded-full text-xs font-bold">
                    <StarIcon className="w-4 h-4" />
                    <span>Приоритет {priority}</span>
                </div>
            )}
            {/* Displaying Aura */}
            {aura && auraConfig[aura] && (
                <div className={`flex items-center gap-1 bg-purple-100 dark:bg-purple-900/50 ${auraConfig[aura].color} px-3 py-1 rounded-full text-xs font-bold`}>
                    <auraConfig[aura].icon className="w-4 h-4" />
                    <span>{auraConfig[aura].label}</span>
                </div>
            )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/70 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600 shrink-0">
          {formatTimeAgo(new Date(wish.created_at))}
        </div>
      </div>

      <p className="text-gray-800 dark:text-gray-100 mb-4 font-medium text-base leading-relaxed bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600/70">
        {wish.description}
      </p>

      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-4">
        <div className="bg-gray-50 dark:bg-gray-700/70 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600/50">
          <span className="font-semibold text-gray-700 dark:text-gray-200">От:</span> <span className="font-medium">{wish.author_name}</span>
          {wish.assignee_name && (
            <>
              <span className="mx-2 text-gray-400 dark:text-gray-500">→</span>
              <span className="font-semibold text-gray-700 dark:text-gray-200">Для:</span> <span className="font-medium">{wish.assignee_name}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        {canComplete && (
          <button onClick={() => onComplete?.(wish.id)} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-xl text-sm font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl">
            ✅ Выполнено
          </button>
        )}
        {canEnchant && (
          <button onClick={() => onEnchant?.(wish.id)} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-3 rounded-xl text-sm font-medium hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl">
            ✨ Усилить
          </button>
        )}
        {canCancel && (
          <button onClick={() => onCancel?.(wish.id)} className="px-4 py-3 bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium hover:bg-white dark:hover:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 shadow-md hover:shadow-lg">
            ❌ Отменить
          </button>
        )}
      </div>
    </div>
  );
}
