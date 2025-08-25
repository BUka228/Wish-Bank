'use client';

import { useEffect, useState } from 'react';
import { User } from '@/lib/db';
import { RandomEvent } from '@/types/quest-economy';
import EventCard from '@/components/events/EventCard';
import EventHistory from '@/components/events/EventHistory';
import EnhancedNavigation from '@/components/EnhancedNavigation';
import NotificationSystem from '@/components/NotificationSystem';

export default function EventsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentEvent, setCurrentEvent] = useState<RandomEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<RandomEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      // Get current user from Telegram or mock data
      let userData;
      
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        const user = tg.initDataUnsafe?.user;
        
        if (user) {
          const response = await fetch('/api/users/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              initData: tg.initData,
              id: user.id.toString(),
              first_name: user.first_name,
              last_name: user.last_name,
              username: user.username
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            userData = data.user;
          }
        }
      } else {
        // Mock user for development
        const response = await fetch('/api/users/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: '123456789',
            first_name: 'Тестовый',
            last_name: 'Пользователь',
            username: 'testuser'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          userData = data.user;
        }
      }

      if (userData) {
        setCurrentUser(userData);
        await loadCurrentEvent(userData.id);
        await loadEventHistory(userData.id);
      }
    } catch (err) {
      console.error('Initialization error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentEvent = async (userId: string) => {
    try {
      const { ApiClient } = await import('../../lib/api-client');
      const response = await ApiClient.get(`/api/events/current?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentEvent(data.event);
      }
    } catch (err) {
      console.error('Failed to load current event:', err);
    }
  };

  const loadEventHistory = async (userId: string) => {
    try {
      const { ApiClient } = await import('../../lib/api-client');
      const response = await ApiClient.get(`/api/events?userId=${userId}&status=completed`);
      if (response.ok) {
        const data = await response.json();
        setEventHistory(data.events || []);
      }
    } catch (err) {
      console.error('Failed to load event history:', err);
    }
  };

  const handleEventCompleted = () => {
    if (currentUser) {
      loadCurrentEvent(currentUser.id);
      loadEventHistory(currentUser.id);
    }
  };

  const generateNewEvent = async () => {
    if (!currentUser) return;
    
    try {
      const { ApiClient } = await import('../../lib/api-client');
      const response = await ApiClient.post('/api/events/generate', { userId: currentUser.id });
      
      if (response.ok) {
        await loadCurrentEvent(currentUser.id);
      }
    } catch (err) {
      console.error('Failed to generate new event:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-blue-50 dark:from-gray-900 dark:via-green-900 dark:to-teal-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 dark:border-green-700 border-t-green-500 dark:border-t-green-400 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🎲</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Загружаем события...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 dark:from-red-900/20 dark:via-pink-900/20 dark:to-orange-900/20 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Ошибка загрузки</h2>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-600 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            🔄 Перезагрузить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-blue-50 dark:from-gray-900 dark:via-green-900 dark:to-teal-900">
      {currentUser && (
        <>
          <EnhancedNavigation currentUser={currentUser} />
          <NotificationSystem userId={currentUser.id} />
        </>
      )}
      
      <div className="max-w-4xl mx-auto p-4 space-y-6 pt-6">
        {/* Header */}
        <div className="text-center py-6">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-400 to-teal-400 rounded-full shadow-lg mb-4">
              <span className="text-4xl">🎲</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 dark:from-green-400 dark:to-teal-400 bg-clip-text text-transparent mb-2">
            Случайные События
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm">Выполняйте неожиданные задания для получения бонусов</p>
        </div>

        {/* Current Event */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Текущее событие</h2>
            {!currentEvent && (
              <button
                onClick={generateNewEvent}
                className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-teal-600 font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-sm flex items-center gap-2"
              >
                <span className="text-lg">🎲</span>
                Получить событие
              </button>
            )}
          </div>
          
          {currentEvent ? (
            <EventCard
              event={currentEvent}
              currentUserId={currentUser?.id || ''}
              onComplete={handleEventCompleted}
              isPartner={true}
            />
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-200 to-teal-200 dark:from-green-600 dark:to-teal-600 rounded-full mb-4">
                  <span className="text-3xl">🎲</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Нет активного события</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Нажмите кнопку выше, чтобы получить новое случайное событие!</p>
            </div>
          )}
        </div>

        {/* Event History */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">История событий</h2>
          
          {eventHistory.length > 0 ? (
            <EventHistory events={eventHistory} />
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 rounded-full mb-4">
                  <span className="text-3xl">📜</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Пока нет завершенных событий</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Выполните первое событие, чтобы увидеть историю здесь!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}