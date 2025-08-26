'use client';

import React, { useState, useEffect } from 'react';
import { Enhancement, ManaTransaction } from '@/types/mana-system';
import { useDeviceDetection } from '@/lib/mobile-detection';

interface ManaAdminPanelProps {
  className?: string;
}

interface UserManaInfo {
  id: string;
  username: string;
  mana_balance: number;
  total_earned: number;
  total_spent: number;
  enhancement_count: number;
  last_activity: string;
}

interface ManaMetrics {
  total_users: number;
  total_mana_in_system: number;
  average_balance: number;
  total_enhancements: number;
  daily_transactions: number;
}

export default function ManaAdminPanel({ className = '' }: ManaAdminPanelProps) {
  const { isMobile, isTablet } = useDeviceDetection();
  const [users, setUsers] = useState<UserManaInfo[]>([]);
  const [metrics, setMetrics] = useState<ManaMetrics | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'balance' | 'activity' | 'username'>('balance');
  const [showAdjustmentPanel, setShowAdjustmentPanel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = isMobile ? 5 : 10;

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [usersResponse, metricsResponse] = await Promise.all([
        fetch('/api/admin/mana/users'),
        fetch('/api/admin/mana/metrics')
      ]);

      if (!usersResponse.ok || !metricsResponse.ok) {
        throw new Error('Ошибка загрузки данных администратора');
      }

      const usersData = await usersResponse.json();
      const metricsData = await metricsResponse.json();

      setUsers(usersData.users || []);
      setMetrics(metricsData.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleManaAdjustment = async () => {
    if (!selectedUser || adjustmentAmount === 0) return;

    try {
      const response = await fetch('/api/admin/mana/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser,
          amount: adjustmentAmount,
          reason: adjustmentReason || 'Административная корректировка'
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка корректировки баланса');
      }

      await loadAdminData();
      
      setSelectedUser(null);
      setAdjustmentAmount(0);
      setAdjustmentReason('');
      setShowAdjustmentPanel(false);
      
      alert('Баланс успешно скорректирован');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка корректировки');
    }
  };

  const filteredUsers = users
    .filter(user => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'balance':
          return (b.mana_balance || 0) - (a.mana_balance || 0);
        case 'activity':
          return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
        case 'username':
          return a.username.localeCompare(b.username);
        default:
          return 0;
      }
    });

  // Пагинация
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="relative">
            {/* Enhanced Loading Animation */}
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-600 rounded-full animate-ping"></div>
          </div>
          <div className="ml-6">
            <div className="text-lg font-semibold text-white drop-shadow-lg mb-2">Загрузка данных маны...</div>
            <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
              <div className="h-full bg-gradient-to-r from-purple-500 to-blue-600 rounded-full animate-shimmer"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="glass-strong rounded-3xl p-8 max-w-md mx-auto border border-red-300/30 shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="text-red-100 text-xl font-bold mb-4 drop-shadow-lg">Ошибка загрузки данных</div>
            <p className="text-red-200/80 mb-6 leading-relaxed">{error}</p>
            <button 
              onClick={loadAdminData}
              className="group px-8 py-4 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-2xl hover:from-red-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
            >
              <span className="flex items-center space-x-2">
                <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Повторить попытку</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Enhanced Header with Action Buttons */}
      <div className="glass-strong rounded-3xl p-6 shadow-2xl border border-white/30">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-6 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <span className="text-2xl">✨</span>
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent drop-shadow-lg">
                Управление системой Маны
              </h2>
              <p className="text-white/80 text-lg mt-1">Административная панель экономики</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={loadAdminData}
              className="group px-6 py-3 bg-gradient-to-r from-green-500/20 to-emerald-600/20 backdrop-blur-sm border border-green-300/30 text-white rounded-2xl hover:from-green-500/30 hover:to-emerald-600/30 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl touch-manipulation"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="font-semibold">Обновить</span>
              </div>
            </button>
            <button 
              onClick={() => setShowAdjustmentPanel(!showAdjustmentPanel)}
              className="group px-6 py-3 bg-gradient-to-r from-orange-500/20 to-red-600/20 backdrop-blur-sm border border-orange-300/30 text-white rounded-2xl hover:from-orange-500/30 hover:to-red-600/30 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl touch-manipulation"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <span className="font-semibold">{isMobile ? 'Коррект.' : 'Корректировка'}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced System Metrics */}
      {metrics && (
        <div className={`grid gap-6 ${
          isMobile ? 'grid-cols-2' : 
          isTablet ? 'grid-cols-3' : 
          'grid-cols-5'
        }`}>
          <div className="glass-strong p-6 rounded-3xl border border-blue-300/30 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 group">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <h3 className="font-bold text-blue-200 text-sm mb-1">Пользователи</h3>
                <p className="text-3xl font-black text-white drop-shadow-lg">{metrics.total_users}</p>
                <div className="text-xs text-blue-300 mt-1">Активные</div>
              </div>
            </div>
            <div className="mt-4 h-2 bg-blue-200/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full animate-pulse" style={{width: '100%'}}></div>
            </div>
          </div>
          
          <div className="glass-strong p-6 rounded-3xl border border-purple-300/30 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 group">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">✨</span>
              </div>
              <div>
                <h3 className="font-bold text-purple-200 text-sm mb-1">
                  {isMobile ? 'Всего маны' : 'Мана в системе'}
                </h3>
                <p className="text-3xl font-black text-white drop-shadow-lg">
                  {metrics.total_mana_in_system.toLocaleString()}
                </p>
                <div className="text-xs text-purple-300 mt-1">В обороте</div>
              </div>
            </div>
            <div className="mt-4 h-2 bg-purple-200/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-400 to-violet-500 rounded-full animate-shimmer"></div>
            </div>
          </div>
          
          <div className="glass-strong p-6 rounded-3xl border border-green-300/30 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 group">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h3 className="font-bold text-green-200 text-sm mb-1">
                  {isMobile ? 'Средний' : 'Средний баланс'}
                </h3>
                <p className="text-3xl font-black text-white drop-shadow-lg">
                  {Math.round(metrics.average_balance)}
                </p>
                <div className="text-xs text-green-300 mt-1">На пользователя</div>
              </div>
            </div>
            <div className="mt-4 h-2 bg-green-200/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse" style={{width: '75%'}}></div>
            </div>
          </div>
          
          <div className="glass-strong p-6 rounded-3xl border border-yellow-300/30 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 group">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">🚀</span>
              </div>
              <div>
                <h3 className="font-bold text-yellow-200 text-sm mb-1">
                  {isMobile ? 'Усилений' : 'Всего усилений'}
                </h3>
                <p className="text-3xl font-black text-white drop-shadow-lg">
                  {metrics.total_enhancements}
                </p>
                <div className="text-xs text-yellow-300 mt-1">Применено</div>
              </div>
            </div>
            <div className="mt-4 h-2 bg-yellow-200/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full animate-pulse" style={{width: '60%'}}></div>
            </div>
          </div>
          
          <div className="glass-strong p-6 rounded-3xl border border-red-300/30 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 group">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">📈</span>
              </div>
              <div>
                <h3 className="font-bold text-red-200 text-sm mb-1">
                  {isMobile ? 'Сегодня' : 'Транзакций сегодня'}
                </h3>
                <p className="text-3xl font-black text-white drop-shadow-lg">
                  {metrics.daily_transactions}
                </p>
                <div className="text-xs text-red-300 mt-1">За 24 часа</div>
              </div>
            </div>
            <div className="mt-4 h-2 bg-red-200/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-400 to-rose-500 rounded-full animate-shimmer"></div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Balance Adjustment Panel */}
      {showAdjustmentPanel && (
        <div className="glass-strong rounded-3xl p-8 shadow-2xl border border-orange-300/30 animate-slideInUp">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                <span className="text-2xl">⚙️</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                  Корректировка баланса Маны
                </h3>
                <p className="text-orange-200 mt-1">Административное управление экономикой</p>
              </div>
            </div>
            <button
              onClick={() => setShowAdjustmentPanel(false)}
              className="group p-3 rounded-2xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300 transform hover:scale-110"
            >
              <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-4'}`}>
            <div className="space-y-3">
              <label className="text-sm font-bold text-orange-200">Пользователь</label>
              <div className="relative">
                <select
                  value={selectedUser || ''}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500/50 focus:border-white/40 text-white placeholder-white/60 appearance-none transition-all duration-300"
                >
                  <option value="" className="bg-gray-800 text-white">Выберите пользователя</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id} className="bg-gray-800 text-white">
                      {user.username} (💎{user.mana_balance || 0})
                    </option>
                  ))}
                </select>
                <svg className="absolute right-4 top-4 w-6 h-6 text-white/60 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-bold text-orange-200">Сумма</label>
              <div className="relative">
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                  placeholder="Сумма корректировки"
                  className="w-full p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500/50 focus:border-white/40 text-white placeholder-white/60 transition-all duration-300"
                />
                <div className="absolute right-4 top-4 text-white/60">✨</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-bold text-orange-200">Причина</label>
              <div className="relative">
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Причина корректировки"
                  className="w-full p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500/50 focus:border-white/40 text-white placeholder-white/60 transition-all duration-300"
                />
                <div className="absolute right-4 top-4 text-white/60">📝</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-bold text-orange-200">Действие</label>
              <button
                onClick={handleManaAdjustment}
                disabled={!selectedUser || adjustmentAmount === 0}
                className="group w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl hover:from-orange-600 hover:to-red-700 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100 touch-manipulation"
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Применить</span>
                </div>
              </button>
            </div>
          </div>
          
          {/* Warning Message */}
          <div className="mt-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-300/30 rounded-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-sm">⚠️</span>
              </div>
              <div>
                <p className="text-red-200 text-sm font-semibold">
                  Внимание: Все действия по корректировке логируются и могут быть проверены.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Filters and Search */}
      <div className="glass-strong rounded-3xl p-6 shadow-2xl border border-white/30">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-xl">🔍</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white drop-shadow-lg">Поиск и фильтрация</h3>
            <p className="text-white/70 text-sm">Настройка отображения пользователей</p>
          </div>
        </div>
        
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
          <div className="space-y-3">
            <label className="text-sm font-bold text-white/90">Поиск пользователя</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Введите имя пользователя"
                className="w-full p-4 pl-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-white/40 text-white placeholder-white/60 transition-all duration-300"
              />
              <svg className="absolute left-4 top-4 w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-4 text-white/60 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <label className="text-sm font-bold text-white/90">Сортировка</label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'balance' | 'activity' | 'username')}
                className="w-full p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-white/40 text-white appearance-none transition-all duration-300"
              >
                <option value="balance" className="bg-gray-800 text-white">По балансу</option>
                <option value="activity" className="bg-gray-800 text-white">По активности</option>
                <option value="username" className="bg-gray-800 text-white">По имени</option>
              </select>
              <svg className="absolute right-4 top-4 w-6 h-6 text-white/60 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          <div className="space-y-3">
            <label className="text-sm font-bold text-white/90">Результаты</label>
            <div className="p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold">Найдено: {filteredUsers.length}</span>
                <span className="text-white/70 text-sm">из {users.length}</span>
              </div>
              <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-500"
                  style={{width: `${users.length > 0 ? (filteredUsers.length / users.length) * 100 : 0}%`}}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Список пользователей */}
      <div className="space-y-4">
        {currentUsers.length > 0 ? (
          currentUsers.map(user => (
            <div key={user.id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border hover:shadow-xl transition-all duration-200">
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-6'}`}>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold">{user.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{user.username}</div>
                    <div className="text-sm text-gray-500">Пользователь системы</div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-gray-500">Баланс маны</div>
                  <div className="text-lg font-bold text-purple-600">✨ {(user.mana_balance || 0).toLocaleString()}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-gray-500">Заработано</div>
                  <div className="text-lg font-bold text-green-600">+{user.total_earned.toLocaleString()}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-gray-500">Потрачено</div>
                  <div className="text-lg font-bold text-red-600">-{user.total_spent.toLocaleString()}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-gray-500">Усилений</div>
                  <div className="text-lg font-bold text-yellow-600">{user.enhancement_count}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-gray-500">Последняя активность</div>
                  <div className="text-sm font-medium text-gray-700">
                    {new Date(user.last_activity).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-2xl p-8">
              <span className="text-4xl mb-4 block">🔍</span>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Пользователи не найдены</h3>
              <p className="text-gray-500">Попробуйте изменить параметры поиска</p>
            </div>
          </div>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-xl transition-colors ${
                  currentPage === page
                    ? 'bg-purple-600 text-white'
                    : 'bg-white border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}