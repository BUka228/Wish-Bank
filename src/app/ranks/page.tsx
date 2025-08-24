'use client';

import { useEffect, useState } from 'react';
import { User } from '@/lib/db';
import { Rank } from '@/types/quest-economy';
import RankBadge from '@/components/ranks/RankBadge';
import RankProgress from '@/components/ranks/RankProgress';
import RankPrivileges from '@/components/ranks/RankPrivileges';
import ExperienceTracker from '@/components/ranks/ExperienceTracker';
import EnhancedNavigation from '@/components/EnhancedNavigation';
import NotificationSystem from '@/components/NotificationSystem';

export default function RanksPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [currentRank, setCurrentRank] = useState<Rank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      // Get current user from Telegram or mock data
      let userData;
      
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        const user = tg.initDataUnsafe?.user;
        
        if (user) {
          const response = await fetch('/api/users/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              initData: tg.initData,
              id: user.id.toString(),
              first_name: user.first_name,
              last_name: user.last_name,
              username: user.username
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            userData = data.user;
          }
        }
      } else {
        // Mock user for development
        const response = await fetch('/api/users/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: '123456789',
            first_name: 'Тестовый',
            last_name: 'Пользователь',
            username: 'testuser'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          userData = data.user;
        }
      }

      if (userData) {
        setCurrentUser(userData);
        await loadRanks();
        await loadCurrentRank(userData.id);
      }
    } catch (err) {
      console.error('Initialization error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadRanks = async () => {
    try {
      const response = await fetch('/api/ranks');
      if (response.ok) {
        const data = await response.json();
        setRanks(data.ranks || []);
      }
    } catch (err) {
      console.error('Failed to load ranks:', err);
    }
  };

  const loadCurrentRank = async (userId: string) => {
    try {
      const response = await fetch(`/api/ranks/current?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentRank(data.rank);
      }
    } catch (err) {
      console.error('Failed to load current rank:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-orange-900 dark:to-red-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 dark:border-orange-700 border-t-orange-500 dark:border-t-orange-400 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🏆</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Загружаем ранги...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 dark:from-red-900/20 dark:via-pink-900/20 dark:to-orange-900/20 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Ошибка загрузки</h2>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-600 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            🔄 Перезагрузить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-orange-900 dark:to-red-900">
      {currentUser && (
        <>
          <EnhancedNavigation currentUser={currentUser} />
          <NotificationSystem userId={currentUser.id} />
        </>
      )}
      
      <div className="max-w-4xl mx-auto p-4 space-y-6 pt-6">
        {/* Header */}
        <div className="text-center py-6">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-orange-400 to-red-400 rounded-full shadow-lg mb-4">
              <span className="text-4xl">🏆</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent mb-2">
            Система Рангов
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm">Прогрессируйте через военные звания и получайте привилегии</p>
        </div>

        {/* Current Rank & Progress */}
        {currentUser && currentRank && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Текущий ранг</h2>
              <RankBadge 
                rank={currentRank} 
                currentExperience={currentUser.experience_points || 0}
                size="large"
              />
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Прогресс</h2>
              <RankProgress userId={currentUser.id} />
            </div>
          </div>
        )}

        {/* Rank Privileges */}
        {currentUser && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Привилегии ранга</h2>
            <RankPrivileges currentUserId={currentUser.id} />
          </div>
        )}

        {/* Experience Tracker */}
        {currentUser && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Отслеживание активности</h2>
            <ExperienceTracker currentUserId={currentUser.id} />
          </div>
        )}

        {/* All Ranks */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Все ранги</h2>
          
          {ranks.length > 0 ? (
            <div className="space-y-4">
              {ranks.map((rank, index) => {
                const isCurrentRank = currentRank?.name === rank.name;
                const isUnlocked = (currentUser?.experience_points || 0) >= rank.min_experience;
                
                return (
                  <div
                    key={rank.id}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      isCurrentRank
                        ? 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 border-orange-200 dark:border-orange-600'
                        : isUnlocked
                        ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-600'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                          isCurrentRank
                            ? 'bg-gradient-to-r from-orange-400 to-red-400 text-white'
                            : isUnlocked
                            ? 'bg-green-400 text-white'
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                        }`}>
                          {rank.emoji || '🎖️'}
                        </div>
                        
                        <div>
                          <h3 className={`font-bold ${
                            isCurrentRank
                              ? 'text-orange-800 dark:text-orange-200'
                              : isUnlocked
                              ? 'text-green-800 dark:text-green-200'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {rank.name}
                            {isCurrentRank && (
                              <span className="ml-2 text-sm bg-orange-200 dark:bg-orange-700 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full">
                                Текущий
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Требуется: {rank.min_experience} опыта
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {isUnlocked ? (
                          <span className="text-green-600 dark:text-green-400 text-2xl">✓</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-2xl">🔒</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Rank bonuses */}
                    {(rank.daily_quota_bonus > 0 || rank.weekly_quota_bonus > 0 || rank.monthly_quota_bonus > 0) && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Бонусы к квотам:</p>
                        <div className="flex gap-4 text-xs">
                          {rank.daily_quota_bonus > 0 && (
                            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                              +{rank.daily_quota_bonus} в день
                            </span>
                          )}
                          {rank.weekly_quota_bonus > 0 && (
                            <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                              +{rank.weekly_quota_bonus} в неделю
                            </span>
                          )}
                          {rank.monthly_quota_bonus > 0 && (
                            <span className="bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200 px-2 py-1 rounded">
                              +{rank.monthly_quota_bonus} в месяц
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🏆</div>
              <p className="text-gray-500 dark:text-gray-400">Ранги загружаются...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}