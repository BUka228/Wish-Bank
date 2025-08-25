'use client';

import { useState, useEffect } from 'react';
import { GiftWishRequest, EconomyQuotas } from '@/types/quest-economy';
import WishGifter from '../wishes/WishGifter';

interface GiftInterfaceProps {
  currentUserId: string;
  partnerUserId: string;
  partnerName: string;
  onGiftSent?: () => void;
}

const quickGiftPresets = [
  {
    id: 'morning-coffee',
    name: 'Утренний кофе',
    emoji: '☕',
    type: 'green' as const,
    amount: 1,
    message: 'Доброе утро! Кофе в постель 💕',
    description: 'Начните день с заботы'
  },
  {
    id: 'hug-pack',
    name: 'Пачка обнимашек',
    emoji: '🤗',
    type: 'green' as const,
    amount: 3,
    message: 'Обнимашки для хорошего настроения!',
    description: '3 зеленых желания'
  },
  {
    id: 'movie-night',
    name: 'Вечер кино',
    emoji: '🍿',
    type: 'blue' as const,
    amount: 1,
    message: 'Давай посмотрим что-то вместе?',
    description: 'Уютный вечер вдвоем'
  },
  {
    id: 'massage-time',
    name: 'Время массажа',
    emoji: '💆‍♀️',
    type: 'blue' as const,
    amount: 1,
    message: 'Расслабься, я позабочусь о тебе',
    description: 'Релаксация и забота'
  },
  {
    id: 'romantic-surprise',
    name: 'Романтический сюрприз',
    emoji: '🌹',
    type: 'red' as const,
    amount: 1,
    message: 'Готовлю что-то особенное... ❤️',
    description: 'Особенный момент'
  },
  {
    id: 'love-bomb',
    name: 'Бомба любви',
    emoji: '💣',
    type: 'red' as const,
    amount: 2,
    message: 'Взрыв любви и нежности!',
    description: '2 красных желания'
  }
];

export default function GiftInterface({ 
  currentUserId, 
  partnerUserId, 
  partnerName, 
  onGiftSent 
}: GiftInterfaceProps) {
  const [quotas, setQuotas] = useState<EconomyQuotas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCustomGifter, setShowCustomGifter] = useState(false);
  const [sendingGift, setSendingGift] = useState<string | null>(null);

  // Загрузка квот
  const loadQuotas = async () => {
    try {
      setLoading(true);
      const { ApiClient } = await import('../../lib/api-client');
      const response = await ApiClient.get('/api/economy/quotas');
      if (!response.ok) {
        throw new Error('Ошибка загрузки квот');
      }
      const data = await response.json();
      setQuotas(data.quotas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotas();
  }, []);

  // Отправка быстрого подарка
  const handleQuickGift = async (preset: typeof quickGiftPresets[0]) => {
    if (!quotas || quotas.daily.used >= quotas.daily.limit) {
      return;
    }

    setSendingGift(preset.id);
    try {
      const giftRequest: GiftWishRequest = {
        recipient_id: partnerUserId,
        type: preset.type,
        amount: preset.amount,
        message: preset.message
      };

      const { ApiClient } = await import('../../lib/api-client');
      const response = await ApiClient.post('/api/economy/gift', giftRequest);

      if (!response.ok) {
        throw new Error('Ошибка отправки подарка');
      }

      await loadQuotas(); // Обновляем квоты
      onGiftSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки подарка');
    } finally {
      setSendingGift(null);
    }
  };

  // Отправка кастомного подарка
  const handleCustomGift = async (giftRequest: GiftWishRequest) => {
    try {
      const { ApiClient } = await import('../../lib/api-client');
      const response = await ApiClient.post('/api/economy/gift', giftRequest);

      if (!response.ok) {
        throw new Error('Ошибка отправки подарка');
      }

      await loadQuotas(); // Обновляем квоты
      setShowCustomGifter(false);
      onGiftSent?.();
    } catch (err) {
      throw err; // Пробрасываем ошибку для обработки в WishGifter
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin text-3xl mb-3">🎁</div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка интерфейса подарков...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">❌</span>
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-200">Ошибка</h3>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
        <button
          onClick={loadQuotas}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (showCustomGifter) {
    return (
      <WishGifter
        onGiftWish={handleCustomGift}
        onCancel={() => setShowCustomGifter(false)}
        recipientId={partnerUserId}
        recipientName={partnerName}
        currentQuotas={quotas || undefined}
      />
    );
  }

  const canGift = quotas ? quotas.daily.used < quotas.daily.limit : false;
  const remainingGifts = quotas ? quotas.daily.limit - quotas.daily.used : 0;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          🎁 Быстрые подарки
        </h2>
        <button
          onClick={() => setShowCustomGifter(true)}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
        >
          🎨 Настроить подарок
        </button>
      </div>

      {/* Информация о получателе и квотах */}
      <div className="mb-6 p-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/30 dark:to-purple-900/30 rounded-lg border border-pink-200 dark:border-pink-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-pink-700 dark:text-pink-300">
              Получатель: <span className="font-bold">{partnerName}</span>
            </p>
            <p className="text-xs text-pink-600 dark:text-pink-400">
              Подарки будут добавлены в их коллекцию желаний
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Осталось подарков: <span className="font-bold">{remainingGifts}</span>
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              из {quotas?.daily.limit} на сегодня
            </p>
          </div>
        </div>
      </div>

      {!canGift && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-semibold text-red-800 dark:text-red-200">
                Дневная квота исчерпана
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                Вы использовали все подарки на сегодня. Попробуйте завтра или повысьте ранг для увеличения квот.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Быстрые подарки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickGiftPresets.map((preset) => {
          const isLoading = sendingGift === preset.id;
          const typeEmoji = preset.type === 'green' ? '💚' : preset.type === 'blue' ? '💙' : '❤️';
          
          return (
            <button
              key={preset.id}
              onClick={() => handleQuickGift(preset)}
              disabled={!canGift || isLoading}
              className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                canGift && !isLoading
                  ? 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-lg hover:scale-105 bg-white dark:bg-gray-700'
                  : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 rounded-xl flex items-center justify-center border border-purple-200 dark:border-purple-700">
                  <span className="text-2xl">{isLoading ? '⏳' : preset.emoji}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                    {preset.name}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {preset.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{typeEmoji}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {preset.amount} × {preset.type === 'green' ? 'Зеленое' : preset.type === 'blue' ? 'Синее' : 'Красное'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-600/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                  "{preset.message}"
                </p>
              </div>

              {isLoading && (
                <div className="mt-3 text-center">
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                    Отправляем подарок...
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Дополнительная информация */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
          💡 Как работают подарки
        </h4>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <p>• <strong>Быстрые подарки</strong> - готовые наборы с сообщениями для разных ситуаций</p>
          <p>• <strong>Настроить подарок</strong> - создайте персональный подарок с вашим сообщением</p>
          <p>• Подарки мгновенно появляются в коллекции получателя</p>
          <p>• Каждый подарок увеличивает ваш опыт и укрепляет отношения</p>
        </div>
      </div>
    </div>
  );
}