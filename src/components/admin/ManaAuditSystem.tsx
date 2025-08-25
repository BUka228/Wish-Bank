'use client';

import React, { useState, useEffect } from 'react';

interface ManaAuditLog {
  id: string;
  user_id: string;
  username: string;
  action: 'earn' | 'spend' | 'enhance' | 'admin_adjust';
  amount: number;
  reason: string;
  timestamp: string;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

interface AuditFilters {
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}

interface ManaAuditSystemProps {
  className?: string;
}

export default function ManaAuditSystem({ className = '' }: ManaAuditSystemProps) {
  const [auditLogs, setAuditLogs] = useState<ManaAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [exportLoading, setExportLoading] = useState(false);

  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    loadAuditLogs();
  }, [filters, currentPage]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      });

      const response = await fetch(`/api/admin/mana/audit?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки журнала аудита');
      }

      const data = await response.json();
      setAuditLogs(data.logs);
      setTotalPages(Math.ceil(data.total / ITEMS_PER_PAGE));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof AuditFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const exportAuditLogs = async () => {
    try {
      setExportLoading(true);
      const queryParams = new URLSearchParams({
        export: 'true',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      });

      const response = await fetch(`/api/admin/mana/audit?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Ошибка экспорта данных');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mana-audit-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка экспорта');
    } finally {
      setExportLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels = {
      earn: 'Получение',
      spend: 'Трата',
      enhance: 'Усиление',
      admin_adjust: 'Админ. корректировка'
    };
    return labels[action as keyof typeof labels] || action;
  };

  const getActionColor = (action: string) => {
    const colors = {
      earn: 'text-green-600',
      spend: 'text-red-600',
      enhance: 'text-blue-600',
      admin_adjust: 'text-orange-600'
    };
    return colors[action as keyof typeof colors] || 'text-gray-600';
  };

  if (loading && auditLogs.length === 0) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">Загрузка журнала аудита...</div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Система аудита операций с Маной</h2>
        <div className="flex gap-2">
          <button
            onClick={exportAuditLogs}
            disabled={exportLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {exportLoading ? 'Экспорт...' : 'Экспорт CSV'}
          </button>
          <button 
            onClick={loadAuditLogs}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Обновить
          </button>
        </div>
      </div>

      {/* Фильтры */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Фильтры</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="ID пользователя"
            value={filters.userId || ''}
            onChange={(e) => handleFilterChange('userId', e.target.value)}
            className="p-2 border rounded"
          />
          <select
            value={filters.action || ''}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">Все действия</option>
            <option value="earn">Получение</option>
            <option value="spend">Трата</option>
            <option value="enhance">Усиление</option>
            <option value="admin_adjust">Админ. корректировка</option>
          </select>
          <input
            type="date"
            placeholder="Дата от"
            value={filters.dateFrom || ''}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="p-2 border rounded"
          />
          <input
            type="date"
            placeholder="Дата до"
            value={filters.dateTo || ''}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="p-2 border rounded"
          />
          <input
            type="number"
            placeholder="Мин. сумма"
            value={filters.minAmount || ''}
            onChange={(e) => handleFilterChange('minAmount', parseInt(e.target.value) || '')}
            className="p-2 border rounded"
          />
          <input
            type="number"
            placeholder="Макс. сумма"
            value={filters.maxAmount || ''}
            onChange={(e) => handleFilterChange('maxAmount', parseInt(e.target.value) || '')}
            className="p-2 border rounded"
          />
        </div>
        <div className="mt-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Очистить фильтры
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Ошибка: {error}
        </div>
      )}

      {/* Таблица логов */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 p-2 text-left">Время</th>
              <th className="border border-gray-300 p-2 text-left">Пользователь</th>
              <th className="border border-gray-300 p-2 text-left">Действие</th>
              <th className="border border-gray-300 p-2 text-right">Сумма</th>
              <th className="border border-gray-300 p-2 text-left">Причина</th>
              <th className="border border-gray-300 p-2 text-left">Детали</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-2 text-sm">
                  {new Date(log.timestamp).toLocaleString('ru-RU')}
                </td>
                <td className="border border-gray-300 p-2">
                  <div>
                    <div className="font-medium">{log.username}</div>
                    <div className="text-xs text-gray-500">{log.user_id}</div>
                  </div>
                </td>
                <td className="border border-gray-300 p-2">
                  <span className={`font-medium ${getActionColor(log.action)}`}>
                    {getActionLabel(log.action)}
                  </span>
                </td>
                <td className="border border-gray-300 p-2 text-right">
                  <span className={`font-semibold ${log.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {log.amount > 0 ? '+' : ''}{log.amount.toLocaleString()}
                  </span>
                </td>
                <td className="border border-gray-300 p-2">
                  {log.reason}
                </td>
                <td className="border border-gray-300 p-2">
                  {Object.keys(log.metadata).length > 0 && (
                    <details className="cursor-pointer">
                      <summary className="text-blue-600 hover:text-blue-800">
                        Показать детали
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                  {log.ip_address && (
                    <div className="text-xs text-gray-500 mt-1">
                      IP: {log.ip_address}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {auditLogs.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">
          Записи аудита не найдены
        </div>
      )}

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:bg-gray-200"
          >
            ←
          </button>
          <span className="px-4 py-2">
            Страница {currentPage} из {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:bg-gray-200"
          >
            →
          </button>
        </div>
      )}

      {loading && auditLogs.length > 0 && (
        <div className="text-center text-gray-500">
          Загрузка...
        </div>
      )}
    </div>
  );
}