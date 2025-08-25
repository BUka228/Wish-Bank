'use client';

import React, { useState, useEffect } from 'react';
import { Enhancement, ManaTransaction } from '@/types/mana-system';

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
  const [users, setUsers] = useState<UserManaInfo[]>([]);
  const [metrics, setMetrics] = useState<ManaMetrics | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'balance' | 'activity' | 'username'>('balance');

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

      setUsers(usersData.users);
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

      // Обновляем данные
      await loadAdminData();
      
      // Сбрасываем форму
      setSelectedUser(null);
      setAdjustmentAmount(0);
      setAdjustmentReason('');
      
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

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">Загрузка данных администратора...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-red-500 text-center">Ошибка: {error}</div>
        <button 
          onClick={loadAdminData}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Повторить попытку
        </button>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Административная панель Маны</h2>
        <button 
          onClick={loadAdminData}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Обновить данные
        </button>
      </div>

      {/* Метрики системы */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-blue-100 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Всего пользователей</h3>
            <p className="text-2xl font-bold text-blue-600">{metrics.total_users}</p>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800">Мана в системе</h3>
            <p className="text-2xl font-bold text-purple-600">{metrics.total_mana_in_system.toLocaleString()}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">Средний баланс</h3>
            <p className="text-2xl font-bold text-green-600">{Math.round(metrics.average_balance)}</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-800">Всего усилений</h3>
            <p className="text-2xl font-bold text-yellow-600">{metrics.total_enhancements}</p>
          </div>
          <div className="bg-red-100 p-4 rounded-lg">
            <h3 className="font-semibold text-red-800">Транзакций сегодня</h3>
            <p className="text-2xl font-bold text-red-600">{metrics.daily_transactions}</p>
          </div>
        </div>
      )}

      {/* Корректировка баланса */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Корректировка баланса Маны</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={selectedUser || ''}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">Выберите пользователя</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.username} (Баланс: {user.mana_balance || 0})
              </option>
            ))}
          </select>
          <input
            type="number"
            value={adjustmentAmount}
            onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
            placeholder="Сумма корректировки"
            className="p-2 border rounded"
          />
          <input
            type="text"
            value={adjustmentReason}
            onChange={(e) => setAdjustmentReason(e.target.value)}
            placeholder="Причина корректировки"
            className="p-2 border rounded"
          />
          <button
            onClick={handleManaAdjustment}
            disabled={!selectedUser || adjustmentAmount === 0}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300"
          >
            Применить
          </button>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Поиск по имени пользователя"
          className="p-2 border rounded flex-1"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'balance' | 'activity' | 'username')}
          className="p-2 border rounded"
        >
          <option value="balance">Сортировка по балансу</option>
          <option value="activity">Сортировка по активности</option>
          <option value="username">Сортировка по имени</option>
        </select>
      </div>

      {/* Таблица пользователей */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 p-2 text-left">Пользователь</th>
              <th className="border border-gray-300 p-2 text-right">Баланс Маны</th>
              <th className="border border-gray-300 p-2 text-right">Заработано</th>
              <th className="border border-gray-300 p-2 text-right">Потрачено</th>
              <th className="border border-gray-300 p-2 text-right">Усилений</th>
              <th className="border border-gray-300 p-2 text-left">Последняя активность</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-2">{user.username}</td>
                <td className="border border-gray-300 p-2 text-right font-semibold">
                  {(user.mana_balance || 0).toLocaleString()}
                </td>
                <td className="border border-gray-300 p-2 text-right text-green-600">
                  +{user.total_earned.toLocaleString()}
                </td>
                <td className="border border-gray-300 p-2 text-right text-red-600">
                  -{user.total_spent.toLocaleString()}
                </td>
                <td className="border border-gray-300 p-2 text-right">
                  {user.enhancement_count}
                </td>
                <td className="border border-gray-300 p-2">
                  {new Date(user.last_activity).toLocaleString('ru-RU')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Пользователи не найдены
        </div>
      )}
    </div>
  );
}