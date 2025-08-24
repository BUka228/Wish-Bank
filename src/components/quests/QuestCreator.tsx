'use client';

import { useState } from 'react';
import { CreateQuestRequest } from '@/types/quest-economy';
import { TouchOptimizedButton } from '../TouchInteractions';

interface QuestCreatorProps {
  currentUserId: string;
  onQuestCreated: () => void;
  onCancel: () => void;
}

const difficultyOptions = [
  { value: 'easy', label: 'Легко', emoji: '🟢', description: 'Простая задача, 5-15 минут' },
  { value: 'medium', label: 'Средне', emoji: '🟡', description: 'Обычная задача, 30-60 минут' },
  { value: 'hard', label: 'Сложно', emoji: '🟠', description: 'Сложная задача, 1-3 часа' },
  { value: 'epic', label: 'Эпично', emoji: '🔴', description: 'Очень сложная задача, несколько часов или дней' }
];

const rewardTypeOptions = [
  { value: 'green', label: 'Зеленые желания', emoji: '💚' },
  { value: 'blue', label: 'Синие желания', emoji: '💙' },
  { value: 'red', label: 'Красные желания', emoji: '❤️' }
];

const defaultCategories = [
  'Домашние дела',
  'Романтика',
  'Развлечения',
  'Спорт',
  'Обучение',
  'Работа',
  'Здоровье',
  'Творчество'
];

export default function QuestCreator({ 
  currentUserId,
  onQuestCreated, 
  onCancel
}: QuestCreatorProps) {
  const [formData, setFormData] = useState<CreateQuestRequest>({
    title: '',
    description: '',
    assignee_id: '', // Will be set when partner is selected
    category: defaultCategories[0],
    difficulty: 'easy',
    reward_type: 'green',
    reward_amount: 1,
    experience_reward: 10
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Название квеста обязательно';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Название должно содержать минимум 3 символа';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Название не должно превышать 200 символов';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Описание квеста обязательно';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Описание должно содержать минимум 10 символов';
    } else if (formData.description.length > 1000) {
      newErrors.description = 'Описание не должно превышать 1000 символов';
    }

    if (formData.reward_amount && (formData.reward_amount < 1 || formData.reward_amount > 100)) {
      newErrors.reward_amount = 'Награда должна быть от 1 до 100';
    }

    if (formData.due_date && new Date(formData.due_date) <= new Date()) {
      newErrors.due_date = 'Срок выполнения должен быть в будущем';
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
      const response = await fetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          author_id: currentUserId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create quest');
      }

      onQuestCreated();
    } catch (error) {
      console.error('Ошибка создания квеста:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (key: keyof CreateQuestRequest, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Очищаем ошибку для этого поля
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const selectedDifficulty = difficultyOptions.find(d => d.value === formData.difficulty);
  const selectedRewardType = rewardTypeOptions.find(r => r.value === formData.reward_type);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200">
          ⚡ Создать новый квест
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Создайте задание для выполнения
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Assignee Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Исполнитель *
          </label>
          <input
            type="text"
            value={formData.assignee_id}
            onChange={(e) => updateFormData('assignee_id', e.target.value)}
            placeholder="ID партнера"
            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.assignee_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.assignee_id && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.assignee_id}</p>
          )}
        </div>

        {/* Название квеста */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Название квеста *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateFormData('title', e.target.value)}
            placeholder="Например: Приготовить ужин на двоих"
            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base ${
              errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
          )}
        </div>

        {/* Описание */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Описание квеста *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            placeholder="Подробно опишите, что нужно сделать..."
            rows={3}
            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base ${
              errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Категория */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Категория
            </label>
            <select
              value={formData.category}
              onChange={(e) => updateFormData('category', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            >
              {defaultCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Сложность */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Сложность
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => updateFormData('difficulty', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            >
              {difficultyOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.emoji} {option.label}
                </option>
              ))}
            </select>
            {selectedDifficulty && (
              <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {selectedDifficulty.description}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Тип награды */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Тип награды
            </label>
            <select
              value={formData.reward_type}
              onChange={(e) => updateFormData('reward_type', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            >
              {rewardTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.emoji} {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Количество награды */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Количество награды
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.reward_amount}
              onChange={(e) => updateFormData('reward_amount', parseInt(e.target.value))}
              className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base ${
                errors.reward_amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.reward_amount && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reward_amount}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Опыт за выполнение */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Опыт за выполнение
            </label>
            <input
              type="number"
              min="0"
              max="1000"
              value={formData.experience_reward}
              onChange={(e) => updateFormData('experience_reward', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Срок выполнения */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Срок выполнения (необязательно)
            </label>
            <input
              type="datetime-local"
              value={formData.due_date ? new Date(formData.due_date).toISOString().slice(0, 16) : ''}
              onChange={(e) => updateFormData('due_date', e.target.value ? new Date(e.target.value) : undefined)}
              className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.due_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.due_date && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.due_date}</p>
            )}
          </div>
        </div>

        {/* Предварительный просмотр награды */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Предварительный просмотр награды:</h4>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedRewardType?.emoji}</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {formData.reward_amount} {selectedRewardType?.label}
              </span>
            </div>
            {formData.experience_reward && formData.experience_reward > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-lg">⭐</span>
                <span className="font-medium text-purple-700 dark:text-purple-300">
                  +{formData.experience_reward} опыта
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-4 rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px] text-base"
          >
            {isSubmitting ? '⏳ Создание...' : '⚡ Создать квест'}
          </button>
          <TouchOptimizedButton
            onClick={onCancel}
            variant="secondary"
            size="large"
            className="sm:w-auto"
          >
            Отменить
          </TouchOptimizedButton>
        </div>
      </form>
    </div>
  );
}