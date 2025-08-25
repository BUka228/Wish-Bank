'use client';

import React, { useState } from 'react';
import ManaAdminPanel from '@/components/admin/ManaAdminPanel';
import ManaAuditSystem from '@/components/admin/ManaAuditSystem';
import EnhancementMetrics from '@/components/admin/EnhancementMetrics';

type AdminTab = 'overview' | 'audit' | 'metrics';

export default function ManaAdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const tabs = [
    { id: 'overview' as AdminTab, label: 'Обзор и управление', icon: '📊' },
    { id: 'audit' as AdminTab, label: 'Журнал аудита', icon: '📋' },
    { id: 'metrics' as AdminTab, label: 'Метрики усилений', icon: '📈' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Административная панель системы Маны
              </h1>
              <p className="text-gray-600 mt-1">
                Управление, мониторинг и аудит экономической системы
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>🔒</span>
              <span>Режим администратора</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Навигационные вкладки */}
        <div className="mb-6">
          <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${activeTab === tab.id
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Контент вкладок */}
        <div className="bg-white rounded-lg shadow-sm border">
          {activeTab === 'overview' && (
            <ManaAdminPanel className="rounded-lg" />
          )}
          
          {activeTab === 'audit' && (
            <ManaAuditSystem className="rounded-lg" />
          )}
          
          {activeTab === 'metrics' && (
            <EnhancementMetrics className="rounded-lg" />
          )}
        </div>
      </div>

      {/* Предупреждение о безопасности */}
      <div className="fixed bottom-4 right-4 max-w-sm">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Административный доступ
              </h3>
              <p className="mt-1 text-xs text-yellow-700">
                Все действия логируются и могут быть проверены. 
                Используйте административные функции ответственно.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}