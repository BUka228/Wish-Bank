'use client';

import { QuestFilter as QuestFilterType } from '@/types/quest-economy';

interface QuestFilterProps {
  filter: QuestFilterType;
  onFilterChange: (filter: QuestFilterType) => void;
  categories?: string[];
}

const difficultyOptions = [
  { value: '', label: 'Все сложности' },
  { value: 'easy', label: 'Легко' },
  { value: 'medium', label: 'Средне' },
  { value: 'hard', label: 'Сложно' },
  { value: 'epic', label: 'Эпично' }
];

const statusOptions = [
  { value: '', label: 'Все статусы' },
  { value: 'active', label: 'Активные' },
  { value: 'completed', label: 'Выполненные' },
  { value: 'expired', label: 'Просроченные' },
  { value: 'cancelled', label: 'Отмененные' }
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

export default function QuestFilter({ filter, onFilterChange, categories = defaultCategories }: QuestFilterProps) {
  const updateFilter = (key: keyof QuestFilterType, value: any) => {
    onFilterChange({
      ...filter,
      [key]: value || undefined
    });
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(filter).some(value => value !== undefined && value !== '');

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          🔍 Фильтры квестов
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Очистить все
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Статус */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Статус
          </label>
          <select
            value={filter.status || ''}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
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
            value={filter.difficulty || ''}
            onChange={(e) => updateFilter('difficulty', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {difficultyOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Категория */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Категория
          </label>
          <select
            value={filter.category || ''}
            onChange={(e) => updateFilter('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Все категории</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Срок выполнения */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Срок до
          </label>
          <input
            type="date"
            value={filter.due_before ? new Date(filter.due_before).toISOString().split('T')[0] : ''}
            onChange={(e) => updateFilter('due_before', e.target.value ? new Date(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Быстрые фильтры */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Быстрые фильтры:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFilterChange({ status: 'active' })}
            className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
          >
            🟢 Активные
          </button>
          <button
            onClick={() => onFilterChange({ status: 'active', due_before: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })}
            className="px-3 py-1 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
          >
            ⏰ На этой неделе
          </button>
          <button
            onClick={() => onFilterChange({ difficulty: 'epic' })}
            className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
          >
            🔴 Эпичные
          </button>
          <button
            onClick={() => onFilterChange({ status: 'completed' })}
            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            ✅ Выполненные
          </button>
        </div>
      </div>
    </div>
  );
}