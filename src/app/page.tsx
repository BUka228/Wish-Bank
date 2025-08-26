'use client';

import { useEffect, useState } from 'react';
import { User, Wish } from '@/types/database';
import { EnhancedWish } from '@/types/mana-system';
import ManaDisplay from '@/components/ManaDisplay';
import ManaQuickActions from '@/components/ManaQuickActions';
import WishCard from '@/components/WishCard';
import EnhancedNavigation from '@/components/EnhancedNavigation';
import NotificationSystem from '@/components/NotificationSystem';
import AdminDebugInfo from '@/components/AdminDebugInfo';

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [wishes, setWishes] = useState<(Wish & Partial<EnhancedWish>)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Инициализация пользователя из Telegram WebApp
  // Настройка Telegram WebApp UI
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Настраиваем UI
      tg.expand();
      tg.BackButton.hide();
      tg.MainButton.hide();
      
      // Применяем тему Telegram
      if (tg.colorScheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  useEffect(() => {
    const initTelegramUser = async () => {
      try {
        // Ждем загрузки Telegram WebApp скрипта
        let attempts = 0;
        while (!window.Telegram?.WebApp && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        // Проверяем, что мы внутри Telegram WebApp
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp;
          
          console.log('Telegram WebApp detected:', {
            platform: tg.platform,
            version: tg.version,
            initData: !!tg.initData,
            user: !!tg.initDataUnsafe?.user
          });
          
          // Инициализируем WebApp
          tg.ready();
          
          // Получаем данные пользователя
          const user = tg.initDataUnsafe?.user;
          
          if (!user) {
            throw new Error('Telegram user data not available. Убедитесь, что приложение открыто через Telegram бота.');
          }

          const response = await fetch('/api/users/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              initData: tg.initData, // Передаем initData для валидации
              id: user.id.toString(),
              first_name: user.first_name,
              last_name: user.last_name,
              username: user.username
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to initialize user');
          }
          
          const userData = await response.json();
          setCurrentUser(userData.user);
          
          await loadData();
        } else {
          // Fallback для разработки
          console.warn('Not running in Telegram WebApp, using mock data');
          const mockTelegramUser = {
            id: '123456789',
            first_name: 'Тестовый',
            last_name: 'Пользователь',
            username: 'testuser'
          };

          const response = await fetch('/api/users/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockTelegramUser)
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to initialize user');
          }
          
          const userData = await response.json();
          setCurrentUser(userData.user);
          
          await loadData();
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    initTelegramUser();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, wishesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/wishes')
      ]);

      if (!usersRes.ok || !wishesRes.ok) {
        throw new Error('Failed to load data');
      }

      const [usersData, wishesData] = await Promise.all([
        usersRes.json(),
        wishesRes.json()
      ]);

      setUsers(usersData.users);
      setWishes(wishesData.wishes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
  };

  const handleGiveMana = async (recipientId: string, amount: number, reason: string) => {
    if (!currentUser) return;
    
    try {
      const response = await fetch('/api/mana/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: currentUser.id,
          toUserId: recipientId,
          amount,
          reason
        })
      });

      if (!response.ok) throw new Error('Failed to transfer mana');
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer mana');
    }
  };

  const handleCreateWish = async (description: string, assigneeId?: string) => {
    if (!currentUser) return;

    try {
      const response = await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          authorId: currentUser.id,
          assigneeId
        })
      });

      if (!response.ok) throw new Error('Failed to create wish');
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wish');
    }
  };

  const handleCompleteWish = async (wishId: string) => {
    try {
      const response = await fetch(`/api/wishes/${wishId}/complete`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to complete wish');
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete wish');
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
          <p className="text-gray-600 dark:text-gray-300 font-medium">Загружаем Банк Желаний...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 dark:from-red-900/20 dark:via-pink-900/20 dark:to-orange-900/20 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Ошибка инициализации</h2>
          <p className="text-red-600 dark:text-red-400 mb-4 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg border border-red-200 dark:border-red-700">{error}</p>
          
          {error.includes('Telegram user data not available') && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-4 text-left">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">💡 Как исправить:</h3>
              <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>1. Откройте Telegram</li>
                <li>2. Найдите вашего бота</li>
                <li>3. Нажмите кнопку "🎯 Банк Желаний"</li>
                <li>4. НЕ открывайте ссылку в браузере</li>
              </ol>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-600 w-full font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              🔄 Перезагрузить
            </button>
            
            {typeof window !== 'undefined' && window.Telegram?.WebApp && (
              <button
                onClick={() => {
                  if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.close();
                  }
                }}
                className="bg-gray-500 dark:bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-600 dark:hover:bg-gray-700 w-full font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                ❌ Закрыть приложение
              </button>
            )}
          </div>
          
          <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>Telegram WebApp: {typeof window !== 'undefined' && window.Telegram?.WebApp ? '✅' : '❌'}</p>
              <p>Platform: {typeof window !== 'undefined' && window.Telegram?.WebApp?.platform || 'unknown'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👤</div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Пользователь не найден</p>
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
      
      <div className="max-w-md mx-auto p-4 space-y-6 pt-6">
        {/* Заголовок */}
        <div className="text-center py-6">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full shadow-lg mb-4">
              <span className="text-4xl">🎯</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-2">
            Банк Желаний
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm">Управляйте желаниями вместе</p>
        </div>

        {/* Баланс Маны */}
        {currentUser && currentUser.mana_balance !== undefined ? (
          <ManaDisplay user={currentUser} showAnimation={true} />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-gray-100 dark:border-gray-700 backdrop-blur-sm">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-4"></div>
              <div className="h-16 bg-gray-200 dark:bg-gray-600 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
            </div>
          </div>
        )}

        {/* Быстрые действия */}
        {currentUser && currentUser.mana_balance !== undefined ? (
          <ManaQuickActions
            users={users}
            currentUser={currentUser}
            onGiveMana={handleGiveMana}
            onCreateWish={handleCreateWish}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-gray-100 dark:border-gray-700 backdrop-blur-sm">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
              <div className="h-12 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-12 bg-gray-200 dark:bg-gray-600 rounded"></div>
            </div>
          </div>
        )}

        {/* Активные желания */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Активные желания</h2>
            <div className="w-8 h-8 bg-white dark:bg-gray-700 rounded-full shadow-md flex items-center justify-center border border-gray-200 dark:border-gray-600">
              <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{wishes.length}</span>
            </div>
          </div>
          
          {wishes.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-200 to-orange-200 dark:from-yellow-600 dark:to-orange-600 rounded-full mb-4">
                  <span className="text-3xl">🌟</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Пока нет активных желаний</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Создайте первое желание и начните волшебство!</p>
              <div className="flex justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                <span>💚 Простые</span>
                <span>•</span>
                <span>💙 Сложные</span>
                <span>•</span>
                <span>❤️ Особенные</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {wishes
                .sort((a, b) => {
                  // Sort by status first (active first), then by priority (highest first), then by date (newest first)
                  if (a.status === 'active' && b.status !== 'active') return -1;
                  if (a.status !== 'active' && b.status === 'active') return 1;
                  
                  const aPriority = (a as any).priority || 1;
                  const bPriority = (b as any).priority || 1;
                  if (aPriority !== bPriority) return bPriority - aPriority;
                  
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                })
                .map(wish => (
                  <WishCard
                    key={wish.id}
                    wish={wish}
                    currentUserId={currentUser.id}
                    currentUser={currentUser}
                    onComplete={handleCompleteWish}
                    onEnhancementUpdate={loadData}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Footer spacing */}
        <div className="pb-6"></div>
      </div>
      
      {/* Admin Debug Info - только в development */}
      <AdminDebugInfo />
    </div>
  );
}