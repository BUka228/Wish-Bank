'use client';

import { useEffect, useState } from 'react';
import { User } from '@/lib/db';
import { EnhancedWish } from '@/types/quest-economy';
import WishTabs from '@/components/wishes/WishTabs';
import EnhancedNavigation from '@/components/EnhancedNavigation';
import NotificationSystem from '@/components/NotificationSystem';

export default function WishesPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [wishes, setWishes] = useState<{
    my: EnhancedWish[];
    assigned: EnhancedWish[];
    shared: EnhancedWish[];
  }>({
    my: [],
    assigned: [],
    shared: []
  });
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
        await loadWishes(userData.id);
      }
    } catch (err) {
      console.error('Initialization error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadWishes = async (userId: string) => {
    try {
      const [myResponse, assignedResponse, sharedResponse] = await Promise.all([
        fetch(`/api/wishes/my?userId=${userId}`),
        fetch(`/api/wishes/assigned?userId=${userId}`),
        fetch(`/api/wishes/shared?userId=${userId}`)
      ]);

      const [myData, assignedData, sharedData] = await Promise.all([
        myResponse.ok ? myResponse.json() : { wishes: [] },
        assignedResponse.ok ? assignedResponse.json() : { wishes: [] },
        sharedResponse.ok ? sharedResponse.json() : { wishes: [] }
      ]);

      setWishes({
        my: myData.wishes || [],
        assigned: assignedData.wishes || [],
        shared: sharedData.wishes || []
      });
    } catch (err) {
      console.error('Failed to load wishes:', err);
    }
  };

  const handleWishUpdate = () => {
    if (currentUser) {
      loadWishes(currentUser.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 dark:from-gray-900 dark:via-pink-900 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-200 dark:border-pink-700 border-t-pink-500 dark:border-t-pink-400 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">⭐</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Загружаем желания...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 dark:from-gray-900 dark:via-pink-900 dark:to-purple-900">
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
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full shadow-lg mb-4">
              <span className="text-4xl">⭐</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
            Желания
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm">Управляйте своими желаниями и создавайте общие цели</p>
        </div>

        {/* Wish Tabs */}
        {currentUser && (
          <WishTabs
            currentUserId={currentUser.id}
            currentUser={currentUser}
            wishes={wishes}
            onWishUpdate={handleWishUpdate}
          />
        )}
      </div>
    </div>
  );
}