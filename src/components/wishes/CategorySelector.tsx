'use client';

import { useState, useEffect } from 'react';
import { WishCategory } from '@/types/quest-economy';

interface CategorySelectorProps {
  selectedCategory?: string;
  onCategoryChange: (category: string) => void;
  allowCustom?: boolean;
  placeholder?: string;
  className?: string;
}

const defaultCategories: Omit<WishCategory, 'id' | 'created_at'>[] = [
  { name: 'Романтика', emoji: '💕', color: 'pink' },
  { name: 'Развлечения', emoji: '🎉', color: 'yellow' },
  { name: 'Путешествия', emoji: '✈️', color: 'blue' },
  { name: 'Подарки', emoji: '🎁', color: 'purple' },
  { name: 'Домашние дела', emoji: '🏠', color: 'green' },
  { name: 'Спорт', emoji: '⚽', color: 'orange' },
  { name: 'Творчество', emoji: '🎨', color: 'indigo' },
  { name: 'Обучение', emoji: '📚', color: 'teal' },
  { name: 'Здоровье', emoji: '💪', color: 'red' },
  { name: 'Кулинария', emoji: '👨‍🍳', color: 'amber' }
];

const colorClasses = {
  pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-700',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700',
  indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700',
  teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
  amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700'
};

export default function CategorySelector({ 
  selectedCategory, 
  onCategoryChange, 
  allowCustom = false,
  placeholder = "Выберите категорию",
  className = ""
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<WishCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'dropdown'>('grid');

  // Загрузка категорий с сервера
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/wishes/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      } else {
        // Используем дефолтные категории если сервер недоступен
        setCategories(defaultCategories.map((cat, index) => ({
          ...cat,
          id: `default-${index}`,
          created_at: new Date()
        })));
      }
    } catch (error) {
      // Используем дефолтные категории при ошибке
      setCategories(defaultCategories.map((cat, index) => ({
        ...cat,
        id: `default-${index}`,
        created_at: new Date()
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCategorySelect = (categoryName: string) => {
    onCategoryChange(categoryName);
    setShowCustomInput(false);
    setCustomCategory('');
  };

  const handleCustomCategorySubmit = () => {
    if (customCategory.trim()) {
      onCategoryChange(customCategory.trim());
      setShowCustomInput(false);
      setCustomCategory('');
    }
  };

  const handleCustomCategoryKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomCategorySubmit();
    } else if (e.key === 'Escape') {
      setShowCustomInput(false);
      setCustomCategory('');
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Переключатель режима отображения */}
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Категория
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-2 py-1 text-xs rounded ${
              viewMode === 'grid' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            🔲 Сетка
          </button>
          <button
            type="button"
            onClick={() => setViewMode('dropdown')}
            className={`px-2 py-1 text-xs rounded ${
              viewMode === 'dropdown' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            📋 Список
          </button>
        </div>
      </div>

      {viewMode === 'dropdown' ? (
        /* Режим выпадающего списка */
        <div className="space-y-2">
          <select
            value={selectedCategory || ''}
            onChange={(e) => handleCategorySelect(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">{placeholder}</option>
            {categories.map(category => (
              <option key={category.id} value={category.name}>
                {category.emoji} {category.name}
              </option>
            ))}
            {allowCustom && (
              <option value="__custom__">➕ Создать новую категорию</option>
            )}
          </select>
          
          {allowCustom && selectedCategory === '__custom__' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyDown={handleCustomCategoryKeyPress}
                placeholder="Введите название категории"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <button
                type="button"
                onClick={handleCustomCategorySubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                ✓
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Режим сетки */
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {categories.map(category => {
              const isSelected = selectedCategory === category.name;
              const colorClass = colorClasses[category.color as keyof typeof colorClasses] || colorClasses.blue;
              
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategorySelect(category.name)}
                  className={`p-3 rounded-lg border-2 text-left transition-all duration-200 hover:shadow-md ${
                    isSelected 
                      ? `${colorClass} ring-2 ring-blue-500 dark:ring-blue-400` 
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{category.emoji}</span>
                    <span className={`text-sm font-medium ${
                      isSelected 
                        ? '' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {category.name}
                    </span>
                  </div>
                </button>
              );
            })}
            
            {allowCustom && (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">➕</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Новая
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Поле для ввода новой категории */}
          {showCustomInput && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Создать новую категорию
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  onKeyDown={handleCustomCategoryKeyPress}
                  placeholder="Введите название категории"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCustomCategorySubmit}
                  disabled={!customCategory.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomCategory('');
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Отображение выбранной категории */}
      {selectedCategory && selectedCategory !== '__custom__' && (
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-semibold">Выбрана категория:</span> {selectedCategory}
          </p>
        </div>
      )}
    </div>
  );
}