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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <span className="ml-4 text-gray-600">Загрузка данных...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="text-red-500 text-lg font-semibold mb-4">Ошибка загрузки данных</div>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={loadAdminData}
              className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
            >
              Повторить попытку
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header с кнопками действий */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Управление системой Маны
          </h2>
          <p className="text-gray-600 text-sm mt-1">Административная панель экономики</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={loadAdminData}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center space-x-2 shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Обновить</span>
          </button>
          <button 
            onClick={() => setShowAdjustmentPanel(!showAdjustmentPanel)}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:from-orange-600 hover:to-red-700 transition-all duration-200 flex items-center space-x-2 shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            <span>{isMobile ? 'Коррект.' : 'Корректировка'}</span>
          </button>
        </div>
      </div>

      {/* Метрики системы */}
      {metrics && (
        <div className={`grid gap-4 ${
          isMobile ? 'grid-cols-2' : 
          isTablet ? 'grid-cols-3' : 
          'grid-cols-5'
        }`}>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-100 p-4 rounded-2xl border border-blue-200 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">👥</span>
              </div>
              <div>
                <h3 className="font-semibold text-blue-800 text-sm">Пользователи</h3>
                <p className="text-2xl font-bold text-blue-600">{metrics.total_users}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-4 rounded-2xl border border-purple-200 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">✨</span>
              </div>
              <div>
                <h3 className="font-semibold text-purple-800 text-sm">
                  {isMobile ? 'Всего маны' : 'Мана в системе'}
                </h3>
                <p className="text-2xl font-bold text-purple-600">
                  {metrics.total_mana_in_system.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 rounded-2xl border border-green-200 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">📊</span>
              </div>
              <div>
                <h3 className="font-semibold text-green-800 text-sm">
                  {isMobile ? 'Средний' : 'Средний баланс'}
                </h3>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round(metrics.average_balance)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-50 to-amber-100 p-4 rounded-2xl border border-yellow-200 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">🚀</span>
              </div>
              <div>
                <h3 className="font-semibold text-yellow-800 text-sm">
                  {isMobile ? 'Усилений' : 'Всего усилений'}
                </h3>
                <p className="text-2xl font-bold text-yellow-600">
                  {metrics.total_enhancements}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-rose-100 p-4 rounded-2xl border border-red-200 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">📈</span>
              </div>
              <div>
                <h3 className="font-semibold text-red-800 text-sm">
                  {isMobile ? 'Сегодня' : 'Транзакций сегодня'}
                </h3>
                <p className="text-2xl font-bold text-red-600">
                  {metrics.daily_transactions}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Панель корректировки баланса */}
      {showAdjustmentPanel && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-orange-800 flex items-center space-x-2">
              <span>⚙️</span>
              <span>Корректировка баланса Маны</span>
            </h3>
            <button
              onClick={() => setShowAdjustmentPanel(false)}
              className="text-orange-600 hover:text-orange-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-4'}`}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-orange-800">Пользователь</label>
              <select
                value={selectedUser || ''}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Выберите пользователя</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.username} (💎{user.mana_balance || 0})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-orange-800">Сумма</label>
              <input
                type="number"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                placeholder="Сумма корректировки"
                className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-orange-800">Причина</label>
              <input
                type="text"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Причина корректировки"
                className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-orange-800">Действие</label>
              <button
                onClick={handleManaAdjustment}
                disabled={!selectedUser || adjustmentAmount === 0}
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:from-orange-600 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400 transition-all duration-200 font-semibold"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Фильтры и поиск */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border">
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Поиск пользователя</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Введите имя пользователя"
                className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Сортировка</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'balance' | 'activity' | 'username')}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="balance">По балансу</option>
              <option value="activity">По активности</option>
              <option value="username">По имени</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Результаты</label>
            <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600">
              Найдено: {filteredUsers.length} из {users.length}
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