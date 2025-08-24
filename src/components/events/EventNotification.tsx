'use client';

import { useState, useEffect } from 'react';
import { RandomEvent } from '@/types/quest-economy';

interface EventNotificationProps {
  event?: RandomEvent;
  onDismiss?: () => void;
  onViewEvent?: () => void;
  autoHide?: boolean;
  duration?: number;
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

export default function EventNotification({ 
  event, 
  onDismiss, 
  onViewEvent, 
  autoHide = false, 
  duration = 5000 
}: EventNotificationProps) {
  const [isVisible, setIsVisible] = useState(!!event);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (event) {
      setIsVisible(true);
      setIsAnimating(true);
      
      if (autoHide) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);
        
        return () => clearTimeout(timer);
      }
    }
  }, [event, autoHide, duration]);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 300);
  };

  const handleViewEvent = () => {
    onViewEvent?.();
    handleDismiss();
  };

  if (!event || !isVisible) {
    return null;
  }

  const isExpired = new Date(event.expires_at) < new Date();
  const timeLeft = formatTimeLeft(new Date(event.expires_at));

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`transform transition-all duration-300 ${
        isAnimating 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
      }`}>
        <div className={`p-5 rounded-2xl border-2 shadow-2xl backdrop-blur-sm ${
          isExpired 
            ? 'bg-red-50 dark:bg-red-900/90 border-red-300 dark:border-red-600' 
            : 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/90 dark:to-pink-900/90 border-purple-200 dark:border-purple-700'
        }`}>
          {/* Заголовок с кнопкой закрытия */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl shadow-md flex items-center justify-center border border-gray-100 dark:border-gray-600">
                <span className="text-xl">🎲</span>
              </div>
              <div>
                <div className="text-xs font-bold px-2 py-1 rounded-full bg-purple-500 text-white shadow-sm">
                  СОБЫТИЕ
                </div>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Заголовок события */}
          <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-2 text-sm">
            {event.title}
          </h4>

          {/* Краткое описание */}
          <p className="text-gray-700 dark:text-gray-200 text-xs mb-3 line-clamp-2">
            {event.description.length > 80 
              ? `${event.description.substring(0, 80)}...` 
              : event.description
            }
          </p>

          {/* Информация о времени */}
          <div className={`text-xs mb-3 px-3 py-2 rounded-lg border ${
            isExpired 
              ? 'bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-600 text-red-700 dark:text-red-300' 
              : 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {isExpired ? '⏰ Истекло!' : '⏳ Осталось:'}
              </span>
              <span className="font-bold">{timeLeft}</span>
            </div>
          </div>

          {/* Награда */}
          <div className="flex items-center justify-between text-xs mb-4">
            <div className="bg-white/70 dark:bg-gray-700/70 px-3 py-2 rounded-lg border border-white/50 dark:border-gray-600/50">
              <span className="font-semibold text-gray-700 dark:text-gray-200">Награда:</span> 
              <span className="font-medium ml-1">{event.reward_amount} {event.reward_type}</span>
            </div>
            {event.experience_reward > 0 && (
              <div className="bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-lg border border-purple-200 dark:border-purple-700">
                <span className="font-medium text-purple-700 dark:text-purple-300">
                  +{event.experience_reward} опыта
                </span>
              </div>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-2">
            <button
              onClick={handleViewEvent}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-xs font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              👀 Подробнее
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium hover:bg-white dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200"
            >
              Скрыть
            </button>
          </div>

          {/* Дополнительная информация */}
          {!isExpired && (
            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 Только ваш партнер может засчитать выполнение
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Компонент для отображения множественных уведомлений
interface EventNotificationManagerProps {
  events: RandomEvent[];
  onDismiss: (eventId: string) => void;
  onViewEvent: (eventId: string) => void;
}

export function EventNotificationManager({ 
  events, 
  onDismiss, 
  onViewEvent 
}: EventNotificationManagerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {events.map((event, index) => (
        <div
          key={event.id}
          style={{ 
            transform: `translateY(${index * 10}px)`,
            zIndex: 50 - index 
          }}
        >
          <EventNotification
            event={event}
            onDismiss={() => onDismiss(event.id)}
            onViewEvent={() => onViewEvent(event.id)}
            autoHide={false}
          />
        </div>
      ))}
    </div>
  );
}

// Хук для управления уведомлениями о событиях
export function useEventNotifications() {
  const [notifications, setNotifications] = useState<RandomEvent[]>([]);

  const addNotification = (event: RandomEvent) => {
    setNotifications(prev => {
      // Проверяем, нет ли уже такого уведомления
      if (prev.some(n => n.id === event.id)) {
        return prev;
      }
      return [...prev, event];
    });
  };

  const removeNotification = (eventId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== eventId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications
  };
}