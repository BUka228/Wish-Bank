'use client';

import { useState } from 'react';
import { GiftWishRequest } from '@/types/quest-economy';

interface WishGifterProps {
  onGiftWish: (gift: GiftWishRequest) => Promise<void>;
  onCancel: () => void;
  recipientId: string;
  recipientName: string;
  currentQuotas?: {
    daily: { limit: number; used: number; reset_time: Date };
    weekly: { limit: number; used: number; reset_time: Date };
    monthly: { limit: number; used: number; reset_time: Date };
  };
}

const giftTypes = [
  { 
    value: 'green', 
    label: 'Зеленое желание', 
    emoji: '💚', 
    description: 'Простое желание на каждый день',
    examples: ['Приготовить кофе', 'Обнять', 'Сделать комплимент']
  },
  { 
    value: 'blue', 
    label: 'Синее желание', 
    emoji: '💙', 
    description: 'Особенное желание для приятных моментов',
    examples: ['Массаж', 'Совместный фильм', 'Прогулка']
  },
  { 
    value: 'red', 
    label: 'Красное желание', 
    emoji: '❤️', 
    description: 'Романтическое желание для особых случаев',
    examples: ['Романтический ужин', 'Сюрприз', 'Особенный вечер']
  }
];

const quickGifts = [
  { type: 'green', amount: 1, label: '💚 Одно зеленое', message: 'Маленький знак внимания' },
  { type: 'green', amount: 3, label: '💚💚💚 Три зеленых', message: 'Хорошее настроение на день' },
  { type: 'blue', amount: 1, label: '💙 Одно синее', message: 'Особенный момент для тебя' },
  { type: 'red', amount: 1, label: '❤️ Одно красное', message: 'С любовью' }
];

function formatTimeLeft(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) return 'Обновлено';
  if (diffHours < 24) return `${diffHours} ч`;
  return `${diffDays} дн`;
}

export default function WishGifter({ 
  onGiftWish, 
  onCancel, 
  recipientId, 
  recipientName,
  currentQuotas 
}: WishGifterProps) {
  const [formData, setFormData] = useState<GiftWishRequest>({
    recipient_id: recipientId,
    type: 'green',
    amount: 1,
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedQuickGift, setSelectedQuickGift] = useState<string | null>(null);

  const handleQuickGift = (gift: typeof quickGifts[0]) => {
    setFormData({
      recipient_id: recipientId,
      type: gift.type as 'green' | 'blue' | 'red',
      amount: gift.amount,
      message: gift.message
    });
    setSelectedQuickGift(`${gift.type}-${gift.amount}`);
  };

  const handleCustomGift = () => {
    setSelectedQuickGift(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      await onGiftWish(formData);
    } catch (error) {
      console.error('Ошибка отправки подарка:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (key: keyof GiftWishRequest, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (selectedQuickGift) {
      setSelectedQuickGift(null);
    }
  };

  const selectedType = giftTypes.find(t => t.value === formData.type);
  const canGift = currentQuotas ? currentQuotas.daily.used < currentQuotas.daily.limit : true;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          🎁 Подарить желание
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="mb-6 p-4 bg-pink-50 dark:bg-pink-900/30 rounded-lg border border-pink-200 dark:border-pink-700">
        <p className="text-sm text-pink-700 dark:text-pink-300">
          <span className="font-semibold">Получатель:</span> {recipientName}
        </p>
      </div>

      {/* Информация о квотах */}
      {currentQuotas && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">📊 Ваши квоты на подарки</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {currentQuotas.daily.limit - currentQuotas.daily.used} / {currentQuotas.daily.limit}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                Дневная ({formatTimeLeft(currentQuotas.daily.reset_time)})
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {currentQuotas.weekly.limit - currentQuotas.weekly.used} / {currentQuotas.weekly.limit}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                Недельная ({formatTimeLeft(currentQuotas.weekly.reset_time)})
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {currentQuotas.monthly.limit - currentQuotas.monthly.used} / {currentQuotas.monthly.limit}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                Месячная ({formatTimeLeft(currentQuotas.monthly.reset_time)})
              </div>
            </div>
          </div>
        </div>
      )}

      {!canGift && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
          <p className="text-sm text-red-700 dark:text-red-300">
            ⚠️ <span className="font-semibold">Дневная квота исчерпана!</span> Попробуйте завтра или дождитесь обновления квот.
          </p>
        </div>
      )}

      {/* Быстрые подарки */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">⚡ Быстрые подарки</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quickGifts.map((gift, index) => (
            <button
              key={index}
              onClick={() => handleQuickGift(gift)}
              disabled={!canGift}
              className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                selectedQuickGift === `${gift.type}-${gift.amount}`
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
              } ${!canGift ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
            >
              <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                {gift.label}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {gift.message}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Кастомный подарок */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">🎨 Настроить подарок</h4>
            <button
              type="button"
              onClick={handleCustomGift}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Настроить вручную
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Тип желания */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Тип желания
              </label>
              <select
                value={formData.type}
                onChange={(e) => updateFormData('type', e.target.value)}
                disabled={!canGift}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                {giftTypes.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.emoji} {option.label}
                  </option>
                ))}
              </select>
              {selectedType && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {selectedType.description}
                </p>
              )}
            </div>

            {/* Количество */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Количество
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.amount}
                onChange={(e) => updateFormData('amount', parseInt(e.target.value))}
                disabled={!canGift}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Сообщение */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Сообщение (необязательно)
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => updateFormData('message', e.target.value)}
            placeholder="Добавьте личное сообщение к подарку..."
            rows={3}
            disabled={!canGift}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50"
          />
        </div>

        {/* Примеры для выбранного типа */}
        {selectedType && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
              💡 Примеры {selectedType.label.toLowerCase()}:
            </h5>
            <div className="flex flex-wrap gap-2">
              {selectedType.examples.map((example, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-sm bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-500"
                >
                  {example}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Предварительный просмотр */}
        <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/30 dark:to-purple-900/30 rounded-lg border border-pink-200 dark:border-pink-700">
          <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">🎁 Предварительный просмотр подарка:</h5>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selectedType?.emoji}</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {formData.amount} × {selectedType?.label}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              для {recipientName}
            </div>
          </div>
          {formData.message && (
            <div className="mt-2 p-2 bg-white/70 dark:bg-gray-700/70 rounded border border-white/50 dark:border-gray-600/50">
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                "{formData.message}"
              </p>
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !canGift}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:from-pink-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '⏳ Отправка...' : '🎁 Подарить'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-600 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200"
          >
            Отменить
          </button>
        </div>
      </form>
    </div>
  );
}