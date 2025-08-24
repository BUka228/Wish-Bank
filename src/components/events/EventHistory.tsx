'use client';

import { useState, useEffect } from 'react';
import { RandomEvent, EventFilter } from '@/types/quest-economy';
import EventCard from './EventCard';

interface EventHistoryProps {
  currentUserId: string;
  partnerUserId: string;
  partnerName: string;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffDays < 7) return `${diffDays} дн назад`;
  if (diffWeeks < 4) return `${diffWeeks} нед назад`;
  return `${diffMonths} мес назад`;
}

export default function EventHistory({ currentUserId, partnerUserId, partnerName }: EventHistoryProps) {
  const [events, setEvents] = useState<RandomEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<RandomEvent[]>([]);
  const [filter, setFilter] = useState<EventFilter>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'expired'>('all');

  // Загрузка истории событий
  const loadEventHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events/history');
      if (!response.ok) {
        throw new Error('Ошибка загрузки истории событий');
      }
      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация событий
  useEffect(() => {
    let filtered = [...events];

    // Фильтрация по вкладкам
    if (activeTab === 'completed') {
      filtered = filtered.filter(e => e.status === 'completed');
    } else if (activeTab === 'expired') {
      filtered = filtered.filter(e => e.status === 'expired');
    }

    // Применение дополнительных фильтров
    if (filter.status) {
      filtered = filtered.filter(e => e.status === filter.status);
    }
    if (filter.user_id) {
      filtered = filtered.filter(e => e.user_id === filter.user_id);
    }

    // Сортировка по дате (новые сначала)
    filtered.sort((a, b) => {
      const dateA = new Date(a.completed_at || a.expires_at).getTime();
      const dateB = new Date(b.completed_at || b.expires_at).getTime();
      return dateB - dateA;
    });

    setFilteredEvents(filtered);
  }, [events, filter, activeTab]);

  // Загрузка при монтировании
  useEffect(() => {
    loadEventHistory();
  }, []);

  // Статистика
  const stats = {
    total: events.length,
    completed: events.filter(e => e.status === 'completed').length,
    expired: events.filter(e => e.status === 'expired').length,
    myEvents: events.filter(e => e.user_id === currentUserId).length,
    partnerEvents: events.filter(e => e.user_id === partnerUserId).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🎲</div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка истории событий...</p>
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
          onClick={loadEventHistory}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и статистика */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
          📚 История случайных событий
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Всего событий</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
            <div className="text-sm text-green-700 dark:text-green-300">Выполнено</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border border-red-200 dark:border-red-700">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.expired}</div>
            <div className="text-sm text-red-700 dark:text-red-300">Истекло</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.myEvents}</div>
            <div className="text-sm text-purple-700 dark:text-purple-300">Мои события</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.partnerEvents}</div>
            <div className="text-sm text-orange-700 dark:text-orange-300">Партнера</div>
          </div>
        </div>
      </div>      {/* Ф
ильтры и вкладки */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Вкладки */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              📋 Все ({stats.total})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'completed'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              ✅ Выполненные ({stats.completed})
            </button>
            <button
              onClick={() => setActiveTab('expired')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'expired'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              ⏰ Истекшие ({stats.expired})
            </button>
          </div>

          {/* Фильтр по участнику */}
          <div className="flex gap-2">
            <select
              value={filter.user_id || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, user_id: e.target.value || undefined }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Все участники</option>
              <option value={currentUserId}>Мои события</option>
              <option value={partnerUserId}>События {partnerName}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Список событий */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-6xl mb-4">🎲</div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              События не найдены
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {activeTab === 'all' 
                ? 'История событий пока пуста'
                : activeTab === 'completed'
                ? 'Выполненных событий пока нет'
                : 'Истекших событий пока нет'
              }
            </p>
          </div>
        ) : (
          <>
            {/* Группировка по периодам */}
            {(() => {
              const groupedEvents: { [key: string]: RandomEvent[] } = {};
              
              filteredEvents.forEach(event => {
                const eventDate = new Date(event.completed_at || event.expires_at);
                const now = new Date();
                const diffDays = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
                
                let period: string;
                if (diffDays === 0) period = 'Сегодня';
                else if (diffDays === 1) period = 'Вчера';
                else if (diffDays < 7) period = 'На этой неделе';
                else if (diffDays < 30) period = 'В этом месяце';
                else period = 'Ранее';
                
                if (!groupedEvents[period]) {
                  groupedEvents[period] = [];
                }
                groupedEvents[period].push(event);
              });

              const periodOrder = ['Сегодня', 'Вчера', 'На этой неделе', 'В этом месяце', 'Ранее'];
              
              return periodOrder.map(period => {
                if (!groupedEvents[period] || groupedEvents[period].length === 0) return null;
                
                return (
                  <div key={period} className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 px-2">
                      {period} ({groupedEvents[period].length})
                    </h3>
                    <div className="space-y-4">
                      {groupedEvents[period].map((event) => (
                        <EventCard
                          key={event.id}
                          event={{
                            ...event,
                            user_name: event.user_id === currentUserId ? 'Вы' : partnerName,
                            completed_by_name: event.completed_by === currentUserId ? 'Вы' : 
                                             event.completed_by === partnerUserId ? partnerName : undefined
                          }}
                          currentUserId={currentUserId}
                          isPartner={false}
                        />
                      ))}
                    </div>
                  </div>
                );
              }).filter(Boolean);
            })()}
          </>
        )}
      </div>
    </div>
  );
}