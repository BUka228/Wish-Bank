'use client';

import { WishFilter as WishFilterType } from '@/types/quest-economy';
import { SparklesIcon, StarIcon } from '@heroicons/react/24/solid';

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

const enchantmentOptions = [
    { value: '', label: 'Все усиления' },
    { value: 'priority', label: '⭐ С приоритетом' },
    { value: 'aura', label: '✨ С аурой' },
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Усиления */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Усиления
          </label>
          <select
            value={filter.has_enchantment || ''}
            onChange={(e) => updateFilter('has_enchantment', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {enchantmentOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

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
    </div>
  );
}
