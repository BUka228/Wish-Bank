'use client';

import { useState, useEffect } from 'react';
import { Quest, QuestFilter as QuestFilterType, CreateQuestRequest } from '@/types/quest-economy';
import QuestCard from './QuestCard';
import QuestFilter from './QuestFilter';
import QuestCreator from './QuestCreator';
import QuestProgress from './QuestProgress';

interface QuestBoardProps {
  currentUserId: string;
  quests: Quest[];
  onQuestUpdate: () => void;
}

type ViewMode = 'board' | 'create' | 'progress';

export default function QuestBoard({ currentUserId, quests, onQuestUpdate }: QuestBoardProps) {
  const [filteredQuests, setFilteredQuests] = useState<Quest[]>([]);
  const [filter, setFilter] = useState<QuestFilterType>({});
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'created' | 'assigned'>('all');

  // Removed loadQuests function since quests are passed as props

  // Фильтрация квестов
  useEffect(() => {
    let filtered = [...quests];

    // Фильтрация по вкладкам
    if (activeTab === 'created') {
      filtered = filtered.filter(q => q.author_id === currentUserId);
    } else if (activeTab === 'assigned') {
      filtered = filtered.filter(q => q.assignee_id === currentUserId);
    }

    // Применение фильтров
    if (filter.status) {
      filtered = filtered.filter(q => q.status === filter.status);
    }
    if (filter.difficulty) {
      filtered = filtered.filter(q => q.difficulty === filter.difficulty);
    }
    if (filter.category) {
      filtered = filtered.filter(q => q.category === filter.category);
    }
    if (filter.due_before) {
      filtered = filtered.filter(q => q.due_date && new Date(q.due_date) <= new Date(filter.due_before!));
    }
    if (filter.due_after) {
      filtered = filtered.filter(q => q.due_date && new Date(q.due_date) >= new Date(filter.due_after!));
    }

    // Сортировка: активные сначала, потом по дате создания
    filtered.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setFilteredQuests(filtered);
  }, [quests, filter, activeTab, currentUserId]);

  // Initialize loading state
  useEffect(() => {
    setLoading(false);
  }, []);

  // Quest creation is handled in parent component

  // Quest completion and cancellation
  const handleCompleteQuest = async (questId: string) => {
    try {
      const response = await fetch(`/api/quests/${questId}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Ошибка завершения квеста');
      }

      onQuestUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка завершения квеста');
    }
  };

  const handleCancelQuest = async (questId: string) => {
    try {
      const response = await fetch(`/api/quests/${questId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Ошибка отмены квеста');
      }

      onQuestUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отмены квеста');
    }
  };

  // Статистика для вкладок
  const stats = {
    all: quests.length,
    created: quests.filter(q => q.author_id === currentUserId).length,
    assigned: quests.filter(q => q.assignee_id === currentUserId).length,
    active: quests.filter(q => q.status === 'active').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚡</div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка квестов...</p>
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
          onClick={onQuestUpdate}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и навигация */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
            ⚡ Доска квестов
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => setViewMode('board')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'board'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              📋 Доска
            </button>
            <button
              onClick={() => setViewMode('progress')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'progress'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              📊 Прогресс
            </button>

          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.all}</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Всего квестов</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</div>
            <div className="text-sm text-green-700 dark:text-green-300">Активных</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.created}</div>
            <div className="text-sm text-purple-700 dark:text-purple-300">Создано мной</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.assigned}</div>
            <div className="text-sm text-orange-700 dark:text-orange-300">Назначено мне</div>
          </div>
        </div>
      </div>

      {/* Контент в зависимости от режима */}
      {viewMode === 'progress' && (
        <QuestProgress
          quests={quests}
          currentUserId={currentUserId}
        />
      )}

      {viewMode === 'board' && (
        <>
          {/* Фильтры */}
          <QuestFilter
            filter={filter}
            onFilterChange={setFilter}
          />

          {/* Вкладки */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                🌟 Все квесты ({stats.all})
              </button>
              <button
                onClick={() => setActiveTab('created')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'created'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                ⚡ Мои квесты ({stats.created})
              </button>
              <button
                onClick={() => setActiveTab('assigned')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'assigned'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                🎯 Для меня ({stats.assigned})
              </button>
            </div>
          </div>

          {/* Список квестов */}
          <div className="space-y-4">
            {filteredQuests.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Квестов не найдено
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {activeTab === 'all' 
                    ? 'Создайте первый квест, чтобы начать приключение!'
                    : activeTab === 'created'
                    ? 'Вы еще не создали ни одного квеста'
                    : 'Вам еще не назначили ни одного квеста'
                  }
                </p>

              </div>
            ) : (
              filteredQuests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onComplete={handleCompleteQuest}
                  onCancel={handleCancelQuest}
                  currentUserId={currentUserId}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}