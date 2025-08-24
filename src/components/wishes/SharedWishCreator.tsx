'use client';

import { useState } from 'react';
import { CreateSharedWishRequest } from '@/types/quest-economy';

interface SharedWishCreatorProps {
  onCreateSharedWish: (wish: CreateSharedWishRequest) => Promise<void>;
  onCancel: () => void;
  partnerName: string;
  categories?: string[];
}

const typeOptions = [
  { value: 'green', label: 'Зеленое желание', emoji: '💚', description: 'Простое желание' },
  { value: 'blue', label: 'Синее желание', emoji: '💙', description: 'Среднее желание' },
  { value: 'red', label: 'Красное желание', emoji: '❤️', description: 'Особое желание' }
];

const priorityOptions = [
  { value: 1, label: 'Низкий', emoji: '⭐', description: 'Когда-нибудь' },
  { value: 2, label: 'Средний', emoji: '⭐⭐', description: 'В ближайшее время' },
  { value: 3, label: 'Высокий', emoji: '⭐⭐⭐', description: 'Как можно скорее' }
];

const defaultCategories = [
  'Романтика',
  'Развлечения',
  'Путешествия',
  'Подарки',
  'Домашние дела',
  'Спорт',
  'Творчество',
  'Обучение'
];

export default function SharedWishCreator({ 
  onCreateSharedWish, 
  onCancel, 
  partnerName,
  categories = defaultCategories 
}: SharedWishCreatorProps) {
  const [formData, setFormData] = useState<CreateSharedWishRequest>({
    type: 'green',
    description: '',
    category: categories[0],
    priority: 2,
    is_historical: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Описание желания обязательно';
    } else if (formData.description.length < 5) {
      newErrors.description = 'Описание должно содержать минимум 5 символов';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Описание не должно превышать 500 символов';
    }

    if (formData.is_historical && formData.created_at && new Date(formData.created_at) > new Date()) {
      newErrors.created_at = 'Дата создания исторического желания не может быть в будущем';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateSharedWish(formData);
    } catch (error) {
      console.error('Ошибка создания общего желания:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (key: keyof CreateSharedWishRequest, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Очищаем ошибку для этого поля
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const selectedType = typeOptions.find(t => t.value === formData.type);
  const selectedPriority = priorityOptions.find(p => p.value === formData.priority);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          🤝 Создать общее желание
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <span className="font-semibold">💡 Подсказка:</span> Общее желание будет отправлено {partnerName} для подтверждения. 
          После одобрения оно станет видимым для вас обоих.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Описание желания */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Описание желания *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            placeholder="Опишите ваше общее желание..."
            rows={4}
            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
              errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Тип желания */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Тип желания
            </label>
            <select
              value={formData.type}
              onChange={(e) => updateFormData('type', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {typeOptions.map(option => (
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

          {/* Категория */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Категория
            </label>
            <select
              value={formData.category}
              onChange={(e) => updateFormData('category', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Приоритет */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Приоритет
          </label>
          <select
            value={formData.priority}
            onChange={(e) => updateFormData('priority', parseInt(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {priorityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.emoji} {option.label}
              </option>
            ))}
          </select>
          {selectedPriority && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {selectedPriority.description}
            </p>
          )}
        </div>

        {/* Историческое желание */}
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.is_historical}
              onChange={(e) => updateFormData('is_historical', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                📚 Это историческое желание
              </span>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Желание, которое существовало до создания приложения
              </p>
            </div>
          </label>

          {formData.is_historical && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Дата создания (необязательно)
              </label>
              <input
                type="date"
                value={formData.created_at ? new Date(formData.created_at).toISOString().split('T')[0] : ''}
                onChange={(e) => updateFormData('created_at', e.target.value ? new Date(e.target.value) : undefined)}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.created_at ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.created_at && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.created_at}</p>
              )}
            </div>
          )}
        </div>

        {/* Предварительный просмотр */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Предварительный просмотр:</h4>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedType?.emoji}</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {selectedType?.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedPriority?.emoji}</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {selectedPriority?.label} приоритет
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">📂</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {formData.category}
              </span>
            </div>
            {formData.is_historical && (
              <div className="flex items-center gap-2">
                <span className="text-lg">📚</span>
                <span className="font-medium text-purple-700 dark:text-purple-300">
                  Историческое
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '⏳ Отправка...' : '🤝 Отправить на подтверждение'}
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