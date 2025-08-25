'use client';

import { useState, useRef, useEffect } from 'react';
import { Wish, User } from '@/types/database';
import { EnhancedWish } from '@/types/mana-system';
import EnhancementInterface from '../EnhancementInterface';
import { MANA_TEXTS, getAuraName } from '@/lib/mana-localization';
import { TouchOptimizedButton, MobileOptimizedModal } from '../TouchInteractions';

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

interface MobileOptimizedWishCardProps {
  wish: (Wish | (EnhancedWish & { type?: 'green' | 'blue' | 'red' })) & { author_name?: string; assignee_name?: string };
  onComplete?: (wishId: string) => void;
  onCancel?: (wishId: string) => void;
  currentUserId?: string;
  currentUser?: User;
  onEnhancementUpdate?: () => void;
  isMobile?: boolean;
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

export default function MobileOptimizedWishCard({ 
  wish, 
  onComplete, 
  onCancel, 
  currentUserId, 
  currentUser,
  onEnhancementUpdate,
  isMobile = false
}: MobileOptimizedWishCardProps) {
  const [showEnhancementInterface, setShowEnhancementInterface] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Handle both old and new wish types - default to green for mana system wishes
  const wishType = wish.type || 'green';
  const config = wishTypeConfig[wishType as keyof typeof wishTypeConfig];
  const isAuthor = wish.author_id === currentUserId;
  const isAssignee = wish.assignee_id === currentUserId;
  const canComplete = isAssignee && wish.status === 'active';
  const canCancel = isAuthor && wish.status === 'active';
  const canEnhance = isAuthor && wish.status === 'active' && currentUser;

  // Get priority level (default to 1 if not set)
  const priorityLevel = (wish as EnhancedWish).priority || 1;
  const aura = (wish as EnhancedWish).aura;

  // Auto-hide actions after 5 seconds on mobile
  useEffect(() => {
    if (showActions && isMobile) {
      const timer = setTimeout(() => {
        setShowActions(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showActions, isMobile]);

  const handleEnhancementApplied = () => {
    setShowEnhancementInterface(false);
    onEnhancementUpdate?.();
  };

  const getAuraIcon = (auraType: string): string => {
    const icons = {
      romantic: '💕',
      gaming: '🎮',
      mysterious: '🔮'
    };
    return icons[auraType as keyof typeof icons] || '✨';
  };

  const getAuraGradient = (auraType: string): string => {
    const gradients = {
      romantic: 'from-pink-400/20 to-rose-400/20',
      gaming: 'from-purple-400/20 to-indigo-400/20',
      mysterious: 'from-indigo-400/20 to-purple-400/20'
    };
    return gradients[auraType as keyof typeof gradients] || '';
  };

  // Touch handlers for mobile interactions
  const handleCardTap = () => {
    if (isMobile) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleLongPress = () => {
    if (isMobile && (canComplete || canCancel || canEnhance)) {
      setShowActions(!showActions);
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };

  // Long press detection
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  
  const handleTouchStart = () => {
    if (isMobile) {
      const timer = setTimeout(handleLongPress, 500);
      setPressTimer(timer);
    }
  };

  const handleTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const cardClasses = `
    ${config.color} 
    ${aura ? `bg-gradient-to-br ${getAuraGradient(aura)}` : ''} 
    ${isMobile ? 'active:scale-[0.98]' : 'hover:scale-[1.02]'}
    ${isExpanded && isMobile ? 'shadow-2xl' : 'shadow-lg hover:shadow-xl'}
    p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 backdrop-blur-sm relative overflow-hidden
    ${isMobile ? 'touch-manipulation' : ''}
  `;

  return (
    <>
      <div 
        ref={cardRef}
        className={cardClasses}
        onClick={handleCardTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Aura effect overlay */}
        {aura && (
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className={`absolute inset-0 bg-gradient-to-br ${getAuraGradient(aura)} animate-pulse`} />
          </div>
        )}
        
        <div className="flex items-start justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-white dark:bg-gray-700 rounded-xl shadow-md flex items-center justify-center border border-gray-100 dark:border-gray-600`}>
              <span className={`${isMobile ? 'text-xl' : 'text-2xl'}`}>{config.emoji}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className={`text-xs font-bold px-2 sm:px-3 py-1 rounded-full ${config.badgeColor} shadow-sm`}>
                {wishType.toUpperCase()}
              </span>
              {/* Priority indicator */}
              {priorityLevel > 1 && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-orange-500">🔥</span>
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    {MANA_TEXTS.priority} {priorityLevel}
                  </span>
                </div>
              )}
              {/* Aura indicator */}
              {aura && (
                <div className="flex items-center gap-1 text-xs">
                  <span>{getAuraIcon(aura)}</span>
                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                    {getAuraName(aura)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-gray-700/70 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600">
            {formatTimeAgo(new Date(wish.created_at))}
          </div>
        </div>

        {/* Description - expandable on mobile */}
        <div className={`text-gray-800 dark:text-gray-100 mb-4 font-medium ${isMobile ? 'text-sm' : 'text-base'} leading-relaxed bg-white/50 dark:bg-gray-700/50 p-3 rounded-lg border border-white/70 dark:border-gray-600/70`}>
          <p className={`${!isExpanded && isMobile && wish.description.length > 100 ? 'line-clamp-3' : ''}`}>
            {wish.description}
          </p>
          {!isExpanded && isMobile && wish.description.length > 100 && (
            <button 
              className="text-purple-600 dark:text-purple-400 text-xs mt-1 font-medium"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
            >
              Показать больше...
            </button>
          )}
        </div>

        {/* User info */}
        <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-300 mb-4`}>
          <div className="bg-white/70 dark:bg-gray-700/70 px-2 sm:px-3 py-2 rounded-lg border border-white/50 dark:border-gray-600/50 flex-1 mr-2">
            <span className="font-semibold text-gray-700 dark:text-gray-200">От:</span> 
            <span className="font-medium ml-1">{wish.author_name}</span>
            {wish.assignee_name && (
              <>
                <span className="mx-1 sm:mx-2 text-gray-400 dark:text-gray-500">→</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">Для:</span> 
                <span className="font-medium ml-1">{wish.assignee_name}</span>
              </>
            )}
          </div>
        </div>

        {/* Mobile tap hint */}
        {isMobile && !isExpanded && (canComplete || canCancel || canEnhance) && (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 mb-2">
            Нажмите и удерживайте для действий
          </div>
        )}

        {/* Action buttons - always visible on desktop, toggle on mobile */}
        {(canComplete || canCancel || canEnhance) && (!isMobile || showActions) && (
          <div className={`flex gap-2 sm:gap-3 mt-4 relative z-10 ${isMobile ? 'flex-col' : 'flex-row'}`}>
            {canComplete && (
              <TouchOptimizedButton
                onClick={() => onComplete?.(wish.id)}
                variant="primary"
                size={isMobile ? "large" : "medium"}
                className={`${isMobile ? 'w-full' : 'flex-1'} bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600`}
              >
                ✅ Выполнено
              </TouchOptimizedButton>
            )}
            {canEnhance && (
              <TouchOptimizedButton
                onClick={() => setShowEnhancementInterface(true)}
                variant="primary"
                size={isMobile ? "large" : "medium"}
                className={`${isMobile ? 'w-full' : 'flex-1'} bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600`}
              >
                ✨ {MANA_TEXTS.enhancements}
              </TouchOptimizedButton>
            )}
            {canCancel && (
              <TouchOptimizedButton
                onClick={() => onCancel?.(wish.id)}
                variant="secondary"
                size={isMobile ? "large" : "medium"}
                className={isMobile ? 'w-full' : ''}
              >
                ❌ Отменить
              </TouchOptimizedButton>
            )}
          </div>
        )}
      </div>

      {/* Enhancement Interface Modal - Mobile Optimized */}
      {showEnhancementInterface && currentUser && (
        <MobileOptimizedModal
          isOpen={showEnhancementInterface}
          onClose={() => setShowEnhancementInterface(false)}
          title="Улучшения желания"
          size={isMobile ? "fullscreen" : "large"}
        >
          <EnhancementInterface
            wish={wish as EnhancedWish}
            user={currentUser}
            onEnhancementApplied={handleEnhancementApplied}
            onClose={() => setShowEnhancementInterface(false)}
          />
        </MobileOptimizedModal>
      )}
    </>
  );
}