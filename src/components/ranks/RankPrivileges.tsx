'use client';

import { useState, useEffect } from 'react';
import { Rank, RankPrivileges as RankPrivilegesType } from '@/types/quest-economy';
import RankBadge from './RankBadge';

interface RankPrivilegesProps {
  currentUserId: string;
}

interface RankPrivilegesData {
  current_rank: Rank;
  current_privileges: RankPrivilegesType;
  all_ranks: Rank[];
}

const privilegeDescriptions: Record<string, { icon: string; title: string; description: string }> = {
  can_create_medium_quests: {
    icon: '🟡',
    title: 'Средние квесты',
    description: 'Возможность создавать квесты средней сложности'
  },
  can_create_hard_quests: {
    icon: '🟠',
    title: 'Сложные квесты',
    description: 'Возможность создавать сложные квесты'
  },
  can_create_epic_quests: {
    icon: '🔴',
    title: 'Эпичные квесты',
    description: 'Возможность создавать эпичные квесты'
  },
  can_approve_shared_wishes: {
    icon: '🤝',
    title: 'Одобрение желаний',
    description: 'Быстрое одобрение общих желаний'
  },
  bonus_experience: {
    icon: '⭐',
    title: 'Бонусный опыт',
    description: 'Дополнительный опыт за все действия'
  },
  priority_support: {
    icon: '🎯',
    title: 'Приоритетная поддержка',
    description: 'Приоритетное рассмотрение обращений'
  }
};

export default function RankPrivileges({ currentUserId }: RankPrivilegesProps) {
  const [privilegesData, setPrivilegesData] = useState<RankPrivilegesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);

  // Загрузка данных о привилегиях
  const loadPrivilegesData = async () => {
    try {
      setLoading(true);
      
      const { ApiClient } = await import('../../lib/api-client');
      const [currentRes, ranksRes] = await Promise.all([
        ApiClient.get('/api/ranks/current'),
        ApiClient.get('/api/ranks')
      ]);

      if (currentRes.ok && ranksRes.ok) {
        const currentData = await currentRes.json();
        const ranksData = await ranksRes.json();
        
        const data: RankPrivilegesData = {
          current_rank: currentData.rank,
          current_privileges: currentData.privileges,
          all_ranks: ranksData.ranks
        };
        
        setPrivilegesData(data);
        setSelectedRank(data.current_rank);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrivilegesData();
  }, []);

  // Получение привилегий для выбранного ранга
  const getPrivilegesForRank = (rank: Rank): RankPrivilegesType => {
    return rank.special_privileges as RankPrivilegesType || {};
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🎖️</div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка привилегий рангов...</p>
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
          onClick={loadPrivilegesData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!privilegesData) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
        <p className="text-gray-600 dark:text-gray-400">Данные о привилегиях недоступны</p>
      </div>
    );
  }

  const selectedPrivileges = selectedRank ? getPrivilegesForRank(selectedRank) : {};
  const isCurrentRank = selectedRank?.id === privilegesData.current_rank.id;

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          🎖️ Привилегии рангов
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Изучите привилегии различных рангов и узнайте, что вас ждет при повышении
        </p>
      </div>

      {/* Селектор рангов */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Выберите ранг для просмотра
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {privilegesData.all_ranks
            .sort((a, b) => a.min_experience - b.min_experience)
            .map((rank) => {
              const isSelected = selectedRank?.id === rank.id;
              const isCurrent = rank.id === privilegesData.current_rank.id;
              
              return (
                <button
                  key={rank.id}
                  onClick={() => setSelectedRank(rank)}
                  className={`p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : isCurrent
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <RankBadge rank={rank} size="small" />
                  {isCurrent && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        Ваш текущий ранг
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* Привилегии выбранного ранга */}
      {selectedRank && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <RankBadge rank={selectedRank} size="large" />
              {isCurrentRank && (
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                  Текущий ранг
                </span>
              )}
            </div>
          </div>

          {/* Базовые бонусы */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">📊 Базовые бонусы</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📅</span>
                  <span className="font-medium text-blue-800 dark:text-blue-200">Дневная квота</span>
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  +{selectedRank.daily_quota_bonus}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  дополнительных подарков
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📊</span>
                  <span className="font-medium text-purple-800 dark:text-purple-200">Недельная квота</span>
                </div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  +{selectedRank.weekly_quota_bonus}
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300">
                  дополнительных подарков
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📈</span>
                  <span className="font-medium text-green-800 dark:text-green-200">Месячная квота</span>
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  +{selectedRank.monthly_quota_bonus}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  дополнительных подарков
                </div>
              </div>
            </div>
          </div>

          {/* Специальные привилегии */}
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">🌟 Специальные привилегии</h4>
            
            {Object.keys(selectedPrivileges).length === 0 ? (
              <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
                <div className="text-4xl mb-3">🎖️</div>
                <p className="text-gray-600 dark:text-gray-400">
                  Этот ранг не имеет специальных привилегий
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(selectedPrivileges).map(([key, value]) => {
                  const privilege = privilegeDescriptions[key];
                  if (!privilege || !value) return null;

                  return (
                    <div key={key} className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center border border-yellow-200 dark:border-yellow-600">
                          <span className="text-lg">{privilege.icon}</span>
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                            {privilege.title}
                          </h5>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            {privilege.description}
                          </p>
                          {typeof value === 'number' && value > 0 && (
                            <div className="mt-2">
                              <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                                Бонус: +{value}
                              </span>
                            </div>
                          )}
                          {Array.isArray(value) && value.length > 0 && (
                            <div className="mt-2">
                              <div className="flex flex-wrap gap-1">
                                {value.map((item, index) => (
                                  <span key={index} className="text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Сравнение с текущим рангом */}
      {selectedRank && !isCurrentRank && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
            🔄 Сравнение с вашим текущим рангом
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Текущий ранг */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-600 dark:text-gray-400">Ваш текущий ранг</h4>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                <RankBadge rank={privilegesData.current_rank} size="medium" />
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Дневная квота:</span>
                    <span className="font-medium">+{privilegesData.current_rank.daily_quota_bonus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Недельная квота:</span>
                    <span className="font-medium">+{privilegesData.current_rank.weekly_quota_bonus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Месячная квота:</span>
                    <span className="font-medium">+{privilegesData.current_rank.monthly_quota_bonus}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Выбранный ранг */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-600 dark:text-gray-400">Выбранный ранг</h4>
              <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                <RankBadge rank={selectedRank} size="medium" />
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Дневная квота:</span>
                    <span className="font-medium">
                      +{selectedRank.daily_quota_bonus}
                      {selectedRank.daily_quota_bonus > privilegesData.current_rank.daily_quota_bonus && (
                        <span className="text-green-600 dark:text-green-400 ml-1">
                          (+{selectedRank.daily_quota_bonus - privilegesData.current_rank.daily_quota_bonus})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Недельная квота:</span>
                    <span className="font-medium">
                      +{selectedRank.weekly_quota_bonus}
                      {selectedRank.weekly_quota_bonus > privilegesData.current_rank.weekly_quota_bonus && (
                        <span className="text-green-600 dark:text-green-400 ml-1">
                          (+{selectedRank.weekly_quota_bonus - privilegesData.current_rank.weekly_quota_bonus})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Месячная квота:</span>
                    <span className="font-medium">
                      +{selectedRank.monthly_quota_bonus}
                      {selectedRank.monthly_quota_bonus > privilegesData.current_rank.monthly_quota_bonus && (
                        <span className="text-green-600 dark:text-green-400 ml-1">
                          (+{selectedRank.monthly_quota_bonus - privilegesData.current_rank.monthly_quota_bonus})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Информация о получении привилегий */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
          💡 Как получить привилегии
        </h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">⚡ Выполняйте квесты</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Квесты дают больше всего опыта для повышения ранга. Сложные квесты дают больше очков.
            </p>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">🎁 Будьте активны</h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              Регулярная активность в системе: дарение подарков, участие в событиях, создание квестов.
            </p>
          </div>
          
          <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
            <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">📈 Поддерживайте высокую эффективность</h4>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Высокий процент выполнения квестов и событий дает бонусы к получаемому опыту.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}