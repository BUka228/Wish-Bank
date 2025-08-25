'use client';

import { useState, useEffect } from 'react';
import { EnhancedWish, WishFilter as WishFilterType } from '@/types/quest-economy';
import WishCard from '../WishCard';
import WishFilter from './WishFilter';
import { SwipeableTabs } from '../TouchInteractions';

import { User } from '@/lib/db';

interface WishTabsProps {
  currentUserId: string;
  currentUser?: User;
  wishes: {
    my: EnhancedWish[];
    assigned: EnhancedWish[];
    shared: EnhancedWish[];
  };
  onWishUpdate: () => void;
}

type TabType = 'my' | 'assigned' | 'shared';

export default function WishTabs({ currentUserId, currentUser, wishes, onWishUpdate }: WishTabsProps) {
  const [activeTab, setActiveTab] = useState(0); // Changed to number for SwipeableTabs
  const [filteredWishes, setFilteredWishes] = useState<{
    my: EnhancedWish[];
    assigned: EnhancedWish[];
    shared: EnhancedWish[];
  }>({ my: [], assigned: [], shared: [] });
  const [filter, setFilter] = useState<WishFilterType>({});
  const [error, setError] = useState<string | null>(null);

  const tabTypes: TabType[] = ['my', 'assigned', 'shared'];
  const currentTabType = tabTypes[activeTab];

  // Filter wishes for each tab
  const filterWishesForTab = (tabWishes: EnhancedWish[]) => {
    let filtered = [...tabWishes];

    // Apply filters
    if (filter.status) {
      filtered = filtered.filter(w => w.status === filter.status);
    }
    if (filter.category) {
      filtered = filtered.filter(w => w.category === filter.category);
    }
    if (filter.type) {
      filtered = filtered.filter(w => w.type === filter.type);
    }
    if (filter.is_shared !== undefined) {
      filtered = filtered.filter(w => w.is_shared === filter.is_shared);
    }
    if (filter.is_gift !== undefined) {
      filtered = filtered.filter(w => w.is_gift === filter.is_gift);
    }
    if (filter.is_historical !== undefined) {
      filtered = filtered.filter(w => w.is_historical === filter.is_historical);
    }
    if (filter.priority) {
      filtered = filtered.filter(w => w.priority === filter.priority);
    }

    // Sort: active first, then by priority and date
    filtered.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return filtered;
  };

  // Apply filters when wishes or filter changes
  useEffect(() => {
    setFilteredWishes({
      my: filterWishesForTab(wishes.my),
      assigned: filterWishesForTab(wishes.assigned),
      shared: filterWishesForTab(wishes.shared)
    });
  }, [wishes, filter]);

  // Action handlers
  const handleCompleteWish = async (wishId: string) => {
    try {
      const response = await fetch(`/api/wishes/${wishId}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Ошибка выполнения желания');
      }

      onWishUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка выполнения желания');
    }
  };

  const handleCancelWish = async (wishId: string) => {
    try {
      const response = await fetch(`/api/wishes/${wishId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Ошибка отмены желания');
      }

      onWishUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отмены желания');
    }
  };

  // Statistics for tabs
  const stats = {
    my: wishes.my.length,
    assigned: wishes.assigned.length,
    shared: wishes.shared.length
  };

  const tabLabels = [
    `Мои (${stats.my})`,
    `Для меня (${stats.assigned})`,
    `Общие (${stats.shared})`
  ];

  const tabConfig = [
    {
      label: 'Мои желания',
      emoji: '⚡',
      description: 'Желания, которые я создал'
    },
    {
      label: 'Для меня',
      emoji: '🎯',
      description: 'Желания, назначенные мне'
    },
    {
      label: 'Общие',
      emoji: '🤝',
      description: 'Наши общие желания'
    }
  ];

  const renderTabContent = (tabIndex: number) => {
    const tabType = tabTypes[tabIndex];
    const tabWishes = filteredWishes[tabType];
    const config = tabConfig[tabIndex];

    return (
      <div className="p-4 space-y-4">
        {/* Tab description */}
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold">{config.label}:</span> {config.description}
          </p>
        </div>

        {/* Wishes list */}
        {tabWishes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">{config.emoji}</div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Желаний не найдено
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {tabType === 'my' 
                ? 'Вы еще не создали ни одного желания'
                : tabType === 'assigned'
                ? 'Вам еще не назначили ни одного желания'
                : 'У вас пока нет общих желаний'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tabWishes.map((wish) => (
              <WishCard
                key={wish.id}
                wish={wish}
                onComplete={handleCompleteWish}
                onCancel={handleCancelWish}
                currentUserId={currentUserId}
                currentUser={currentUser}
                onEnhancementUpdate={onWishUpdate}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

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
          onClick={onWishUpdate}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          💫 Управление желаниями
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Свайпайте влево/вправо для переключения между вкладками
        </p>
      </div>

      {/* Filters */}
      <WishFilter
        filter={filter}
        onFilterChange={setFilter}
        showSharedFilters={currentTabType === 'shared'}
      />

      {/* Swipeable Tabs */}
      <SwipeableTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabLabels={tabLabels}
      >
        {tabTypes.map((_, index) => renderTabContent(index))}
      </SwipeableTabs>
    </div>
  );
}