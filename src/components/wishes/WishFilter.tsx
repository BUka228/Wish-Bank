'use client';

import { WishFilter as WishFilterType } from '@/types/quest-economy';

interface WishFilterProps {
  filter: WishFilterType;
  onFilterChange: (filter: WishFilterType) => void;
  categories?: string[];
  showSharedFilters?: boolean;
}

const statusOptions = [
  { value: '', label: 'Все статусы' },
  { value: 'active', label: 'Активные' },
  { value: 'completed', label: 'Выполненные' },
  { value: 'cancelled', label: 'Отмененные' }
];

const typeOptions = [
  { value: '', label: 'Все типы' },
  { value: 'green', label: '💚 Зеленые' },
  { value: 'blue', label: '💙 Синие' },
  { value: 'red', label: '❤️ Красные' }
];

const priorityOptions = [
  { value: '', label: 'Любой приоритет' },
  { value: '1', label: '⭐ Низкий' },
  { value: '2', label: '⭐⭐ Средний' },
  { value: '3', label: '⭐⭐⭐ Высокий' }
];

const defaultCategories = [
  'Романтика',
  'Развлечения',
  'Домашние дела',
  'Подарки',
  'Путешествия',
  'Спорт',
  'Творчество',
  'Обучение'
];

export default function WishFilter({ 
  filter, 
  onFilterChange, 
  categories = defaultCategories,
  showSharedFilters = false 
}: WishFilterProps) {
  const updateFilter = (key: keyof WishFilterType, value: any) => {
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
          🔍 Фильтры желаний
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

        {/* Тип */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Тип желания
          </label>
          <select
            value={filter.type || ''}
            onChange={(e) => updateFilter('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {typeOptions.map(option => (
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

        {/* Приоритет */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Приоритет
          </label>
          <select
            value={filter.priority?.toString() || ''}
            onChange={(e) => updateFilter('priority', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {priorityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Дополнительные фильтры для общих желаний */}
      {showSharedFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Дополнительные фильтры:</p>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filter.is_historical === true}
                onChange={(e) => updateFilter('is_historical', e.target.checked ? true : undefined)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">📚 Исторические</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filter.is_gift === true}
                onChange={(e) => updateFilter('is_gift', e.target.checked ? true : undefined)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">🎁 Подарки</span>
            </label>
          </div>
        </div>
      )}

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
            onClick={() => onFilterChange({ priority: 3 })}
            className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            ⭐⭐⭐ Высокий приоритет
          </button>
          <button
            onClick={() => onFilterChange({ type: 'red' })}
            className="px-3 py-1 text-sm bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors"
          >
            ❤️ Красные
          </button>
          <button
            onClick={() => onFilterChange({ category: 'Романтика' })}
            className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
          >
            💕 Романтика
          </button>
          {showSharedFilters && (
            <button
              onClick={() => onFilterChange({ is_gift: true })}
              className="px-3 py-1 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
            >
              🎁 Подарки
            </button>
          )}
        </div>
      </div>
    </div>
  );
}