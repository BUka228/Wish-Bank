'use client';

import { useEffect, useState } from 'react';
import { User, Wish } from '@/lib/db';
import BalanceCard from '@/components/BalanceCard';
import QuickActions from '@/components/QuickActions';
import WishCard from '@/components/WishCard';

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [wishes, setWishes] = useState<Wish[]>([]);
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

  const handleGiveWish = async (recipientId: string, type: 'green' | 'blue' | 'red', reason: string) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: recipientId,
          type: 'credit',
          wishType: type,
          amount: 1,
          reason
        })
      });

      if (!response.ok) throw new Error('Failed to give wish');
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to give wish');
    }
  };

  const handleCreateWish = async (type: 'green' | 'blue' | 'red', description: string, assigneeId?: string) => {
    if (!currentUser) return;

    try {
      const response = await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
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

  const handleExchange = async (fromType: 'green' | 'blue', toType: 'blue' | 'red') => {
    if (!currentUser) return;

    try {
      const response = await fetch('/api/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          fromType,
          toType
        })
      });

      if (!response.ok) throw new Error('Failed to exchange wishes');
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to exchange wishes');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Ошибка инициализации</h2>
          <p className="text-red-600 mb-4 text-sm">{error}</p>
          
          {error.includes('Telegram user data not available') && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
              <h3 className="font-semibold text-blue-800 mb-2">💡 Как исправить:</h3>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Откройте Telegram</li>
                <li>2. Найдите вашего бота</li>
                <li>3. Нажмите кнопку "🎯 Банк Желаний"</li>
                <li>4. НЕ открывайте ссылку в браузере</li>
              </ol>
            </div>
          )}
          
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 w-full"
            >
              Перезагрузить
            </button>
            
            {typeof window !== 'undefined' && window.Telegram?.WebApp && (
              <button
                onClick={() => {
                  if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.close();
                  }
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 w-full"
              >
                Закрыть приложение
              </button>
            )}
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            <p>Telegram WebApp: {typeof window !== 'undefined' && window.Telegram?.WebApp ? '✅' : '❌'}</p>
            <p>Platform: {typeof window !== 'undefined' && window.Telegram?.WebApp?.platform || 'unknown'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Пользователь не найден</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Заголовок */}
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">🎯 Банк Желаний</h1>
          <p className="text-gray-600 text-sm">Управляйте желаниями вместе</p>
        </div>

        {/* Баланс */}
        <BalanceCard user={currentUser} onExchange={handleExchange} />

        {/* Быстрые действия */}
        <QuickActions
          users={users}
          currentUser={currentUser}
          onGiveWish={handleGiveWish}
          onCreateWish={handleCreateWish}
        />

        {/* Активные желания */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Активные желания</h2>
          {wishes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-2">🌟</p>
              <p>Пока нет активных желаний</p>
              <p className="text-sm">Создайте первое желание!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {wishes.map(wish => (
                <WishCard
                  key={wish.id}
                  wish={wish}
                  currentUserId={currentUser.id}
                  onComplete={handleCompleteWish}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}