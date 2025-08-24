'use client';

import { useState, useEffect } from 'react';
import { EnhancedWish, WishFilter as WishFilterType } from '@/types/quest-economy';
import WishCard from '../WishCard';
import WishFilter from './WishFilter';

interface WishTabsProps {
  currentUserId: string;
  partnerUserId: string;
  partnerName: string;
}

type TabType = 'my' | 'assigned' | 'shared';

export default function WishTabs({ currentUserId, partnerUserId, partnerName }: WishTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('my');
  const [wishes, setWishes] = useState<EnhancedWish[]>([]);
  const [filteredWishes, setFilteredWishes] = useState<EnhancedWish[]>([]);
  const [filter, setFilter] = useState<WishFilterType>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка желаний
  const loadWishes = async () => {
    try {
      setLoading(true);
      let endpoint = '';
      
      switch (activeTab) {
        case 'my':
          endpoint = '/api/wishes/my';
          break;
        case 'assigned':
          endpoint = '/api/wishes/assigned';
          break;
        case 'shared':
          endpoint = '/api/wishes/shared';
          break;
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Ошибка загрузки желаний');
      }
      const data = await response.json();
      setWishes(data.wishes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация желаний
  useEffect(() => {
    let filtered = [...wishes];

    // Применение фильтров
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

    // Сортировка: активные сначала, потом по приоритету и дате
    filtered.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setFilteredWishes(filtered);
  }, [wishes, filter]);

  // Загрузка при смене вкладки
  useEffect(() => {
    loadWishes();
  }, [activeTab]);

  // Обработчики действий
  const handleCompleteWish = async (wishId: string) => {
    try {
      const response = await fetch(`/api/wishes/${wishId}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Ошибка выполнения желания');
      }

      await loadWishes();
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

      await loadWishes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отмены желания');
    }
  };

  // Статистика для вкладок
  const stats = {
    my: wishes.filter(w => w.author_id === currentUserId && !w.is_shared).length,
    assigned: wishes.filter(w => w.assignee_id === currentUserId && !w.is_shared).length,
    shared: wishes.filter(w => w.is_shared).length,
    active: wishes.filter(w => w.status === 'active').length
  };

  const tabConfig = {
    my: {
      label: 'Мои желания',
      emoji: '⚡',
      description: 'Желания, которые я создал',
      color: 'bg-blue-500'
    },
    assigned: {
      label: 'Для меня',
      emoji: '🎯',
      description: 'Желания, назначенные мне',
      color: 'bg-green-500'
    },
    shared: {
      label: 'Общие',
      emoji: '🤝',
      description: 'Наши общие желания',
      color: 'bg-purple-500'
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">💫</div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка желаний...</p>
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
          onClick={loadWishes}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и вкладки */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">
          💫 Управление желаниями
        </h1>

        {/* Вкладки */}
        <div className="flex flex-wrap gap-3 mb-6">
          {(Object.keys(tabConfig) as TabType[]).map((tab) => {
            const config = tabConfig[tab];
            const count = tab === 'my' ? stats.my : tab === 'assigned' ? stats.assigned : stats.shared;
            
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === tab
                    ? `${config.color} text-white shadow-lg`
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span className="text-xl">{config.emoji}</span>
                <div className="text-left">
                  <div className="font-semibold">{config.label}</div>
                  <div className="text-xs opacity-80">({count})</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Описание активной вкладки */}
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold">{tabConfig[activeTab].label}:</span> {tabConfig[activeTab].description}
          </p>
        </div>
      </div>

      {/* Фильтры */}
      <WishFilter
        filter={filter}
        onFilterChange={setFilter}
        showSharedFilters={activeTab === 'shared'}
      />

      {/* Список желаний */}
      <div className="space-y-4">
        {filteredWishes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-6xl mb-4">{tabConfig[activeTab].emoji}</div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Желаний не найдено
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {activeTab === 'my' 
                ? 'Вы еще не создали ни одного желания'
                : activeTab === 'assigned'
                ? 'Вам еще не назначили ни одного желания'
                : 'У вас пока нет общих желаний'
              }
            </p>
          </div>
        ) : (
          filteredWishes.map((wish) => (
            <WishCard
              key={wish.id}
              wish={{
                ...wish,
                author_name: wish.author_id === currentUserId ? 'Вы' : partnerName,
                assignee_name: wish.assignee_id === currentUserId ? 'Вы' : partnerName
              }}
              onComplete={handleCompleteWish}
              onCancel={handleCancelWish}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>
    </div>
  );
}