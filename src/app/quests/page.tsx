'use client';

import { useEffect, useState } from 'react';
import { User } from '@/lib/db';
import { Quest } from '@/types/quest-economy';
import QuestBoard from '@/components/quests/QuestBoard';
import QuestCreator from '@/components/quests/QuestCreator';
import EnhancedNavigation from '@/components/EnhancedNavigation';
import NotificationSystem from '@/components/NotificationSystem';
import { MobileOptimizedModal, TouchOptimizedButton } from '@/components/TouchInteractions';

export default function QuestsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);

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
        await loadQuests(userData.id);
      }
    } catch (err) {
      console.error('Initialization error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadQuests = async (userId: string) => {
    try {
      const response = await fetch(`/api/quests?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setQuests(data.quests || []);
      }
    } catch (err) {
      console.error('Failed to load quests:', err);
    }
  };

  const handleQuestCreated = () => {
    setShowCreator(false);
    if (currentUser) {
      loadQuests(currentUser.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 dark:border-purple-700 border-t-purple-500 dark:border-t-purple-400 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Загружаем квесты...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900">
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
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full shadow-lg mb-4">
              <span className="text-4xl">🎯</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent mb-2">
            Квесты
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm">Создавайте и выполняйте задания для получения наград</p>
        </div>

        {/* Create Quest Button */}
        <div className="flex justify-center mb-6">
          <TouchOptimizedButton
            onClick={() => setShowCreator(true)}
            variant="primary"
            size="large"
            className="flex items-center gap-2"
          >
            <span className="text-xl">➕</span>
            Создать квест
          </TouchOptimizedButton>
        </div>

        {/* Quest Creator Modal */}
        <MobileOptimizedModal
          isOpen={showCreator}
          onClose={() => setShowCreator(false)}
          title="Создать квест"
          size="large"
        >
          {currentUser && (
            <QuestCreator
              currentUserId={currentUser.id}
              onQuestCreated={handleQuestCreated}
              onCancel={() => setShowCreator(false)}
            />
          )}
        </MobileOptimizedModal>

        {/* Quest Board */}
        {currentUser && (
          <QuestBoard
            currentUserId={currentUser.id}
            quests={quests}
            onQuestUpdate={() => loadQuests(currentUser.id)}
          />
        )}
      </div>
    </div>
  );
}