'use client';

import React, { useState } from 'react';
import ManaAdminPanel from '@/components/admin/ManaAdminPanel';
import ManaAuditSystem from '@/components/admin/ManaAuditSystem';
import EnhancementMetrics from '@/components/admin/EnhancementMetrics';
import { useDeviceDetection } from '@/lib/mobile-detection';

type AdminTab = 'overview' | 'audit' | 'metrics';

export default function ManaAdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const { isMobile, isTablet } = useDeviceDetection();

  const tabs = [
    { 
      id: 'overview' as AdminTab, 
      label: 'Обзор и управление', 
      icon: '📊',
      shortLabel: 'Обзор',
      description: 'Панель управления системой маны'
    },
    { 
      id: 'audit' as AdminTab, 
      label: 'Журнал аудита', 
      icon: '📋',
      shortLabel: 'Аудит',
      description: 'История операций и изменений'
    },
    { 
      id: 'metrics' as AdminTab, 
      label: 'Метрики усилений', 
      icon: '📈',
      shortLabel: 'Метрики',
      description: 'Аналитика и статистика'
    }
  ];

  const getCurrentTabInfo = () => {
    return tabs.find(tab => tab.id === activeTab) || tabs[0];
  };

  const currentTab = getCurrentTabInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-xl border-b border-purple-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 sm:py-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-xl">✨</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Система управления маной
                </h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">
                  {isMobile ? 'Экономическая панель' : 'Управление, мониторинг и аудит экономической системы'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 mt-4 sm:mt-0">
              <div className="bg-gradient-to-r from-red-100 to-orange-100 text-red-800 px-3 py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center space-x-2">
                <span>🔒</span>
                <span>{isMobile ? 'Admin' : 'Режим администратора'}</span>
              </div>
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-3 py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center space-x-2">
                <span>🟢</span>
                <span>Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Adaptive Navigation Tabs */}
        <div className="mb-6">
          {/* Mobile Tab Navigation */}
          {(isMobile || isTablet) ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-purple-200">
              <div className="grid grid-cols-3 gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      relative p-4 rounded-xl text-center transition-all duration-300 touch-manipulation
                      ${activeTab === tab.id
                        ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-600 hover:text-purple-700 hover:bg-purple-50'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <span className={`text-2xl ${activeTab === tab.id ? 'animate-pulse' : ''}`}>{tab.icon}</span>
                      <span className="text-xs font-semibold">
                        {isMobile ? tab.shortLabel : tab.label}
                      </span>
                    </div>
                    {activeTab === tab.id && (
                      <div className="absolute inset-0 bg-white/20 rounded-xl animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Desktop Tab Navigation */
            <nav className="bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-lg border border-purple-200">
              <div className="flex space-x-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-3 px-6 py-4 rounded-xl text-sm font-semibold transition-all duration-300
                      ${activeTab === tab.id
                        ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-purple-700 hover:bg-purple-50'
                      }
                    `}
                  >
                    <span className={`text-xl ${activeTab === tab.id ? 'animate-bounce' : ''}`}>{tab.icon}</span>
                    <div className="text-left">
                      <div>{tab.label}</div>
                      <div className={`text-xs ${activeTab === tab.id ? 'text-purple-100' : 'text-gray-500'}`}>
                        {tab.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </nav>
          )}
        </div>

        {/* Enhanced Tab Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-200 overflow-hidden">
          {/* Mobile Tab Header */}
          {(isMobile || isTablet) && (
            <div className="bg-gradient-to-r from-purple-500 to-blue-600 px-6 py-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{currentTab.icon}</span>
                <div>
                  <h2 className="text-lg font-bold text-white">{currentTab.label}</h2>
                  <p className="text-purple-100 text-sm">{currentTab.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <ManaAdminPanel className="bg-transparent" />
            )}
            
            {activeTab === 'audit' && (
              <ManaAuditSystem className="bg-transparent" />
            )}
            
            {activeTab === 'metrics' && (
              <EnhancementMetrics className="bg-transparent" />
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Security Warning */}
      <div className={`fixed z-50 ${isMobile ? 'bottom-4 left-4 right-4' : 'bottom-6 right-6 max-w-sm'}`}>
        <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">⚠️</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-amber-900">
                Административный доступ
              </h3>
              <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                {isMobile 
                  ? 'Все действия логируются. Используйте ответственно.' 
                  : 'Все действия логируются и могут быть проверены. Используйте административные функции ответственно.'
                }
              </p>
            </div>
            {!isMobile && (
              <button className="flex-shrink-0 text-amber-600 hover:text-amber-800 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}