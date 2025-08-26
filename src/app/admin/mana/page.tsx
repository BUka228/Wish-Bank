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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 relative">
      {/* Enhanced Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-10 left-10 w-80 h-80 bg-purple-300/30 rounded-full mix-blend-multiply filter blur-2xl animate-blob"></div>
        <div className="absolute top-10 right-10 w-80 h-80 bg-blue-300/30 rounded-full mix-blend-multiply filter blur-2xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-80 h-80 bg-pink-300/30 rounded-full mix-blend-multiply filter blur-2xl animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Content Overlay */}
      <div className="relative z-10">
        {/* Enhanced Header - Adaptive Design */}
        <div className="glass-strong shadow-2xl border-b border-white/30 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-6 sm:py-8 space-y-6 sm:space-y-0">
              <div className="flex items-center space-x-4 sm:space-x-6">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300 animate-float">
                  <span className="text-3xl">✨</span>
                </div>
                <div>
                  <h1 className={`font-black bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-300 dark:via-blue-300 dark:to-cyan-300 bg-clip-text text-transparent drop-shadow-2xl ${
                    isMobile ? 'text-2xl' : 'text-3xl sm:text-4xl'
                  }`}>
                    {isMobile ? 'Мана система' : 'Система управления маной'}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm sm:text-base lg:text-lg">
                    {isMobile ? 'Экономическая панель' : 'Управление, мониторинг и аудит экономической системы'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-sm text-red-600 dark:text-red-300 border border-red-300/30 px-3 py-2 sm:px-4 sm:py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center space-x-2 shadow-lg">
                  <span>🔒</span>
                  <span>{isMobile ? 'Admin' : 'Режим администратора'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Enhanced Adaptive Navigation Tabs */}
          <div className="mb-8">
            {/* Mobile Tab Navigation */}
            {(isMobile || isTablet) ? (
              <div className="glass-strong rounded-3xl p-3 shadow-2xl border border-white/30">
                <div className="grid grid-cols-3 gap-3">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative p-4 rounded-2xl text-center transition-all duration-300 touch-manipulation transform ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-xl scale-105'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-white/10 active:scale-95'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <span className={`text-2xl ${activeTab === tab.id ? 'animate-bounce' : 'group-hover:scale-110'} transition-transform duration-300`}>
                          {tab.icon}
                        </span>
                        <span className="text-xs font-bold">
                          {isMobile ? tab.shortLabel : tab.label}
                        </span>
                      </div>
                      {activeTab === tab.id && (
                        <div className="absolute inset-0 bg-white/20 rounded-2xl animate-pulse"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Desktop Tab Navigation */
              <div className="glass-strong p-3 rounded-3xl shadow-2xl border border-white/30">
                <div className="flex space-x-3">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-4 px-8 py-5 rounded-2xl text-sm font-semibold transition-all duration-300 group ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-xl transform scale-105'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className={`text-2xl ${activeTab === tab.id ? 'animate-bounce' : 'group-hover:scale-110'} transition-transform duration-300`}>
                        {tab.icon}
                      </span>
                      <div className="text-left">
                        <div className="text-lg">{tab.label}</div>
                        <div className={`text-xs ${activeTab === tab.id ? 'text-purple-100' : 'text-gray-500 dark:text-gray-400'} transition-colors`}>
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Tab Content */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-100 dark:border-gray-700 overflow-hidden backdrop-blur-sm">
            {/* Mobile Tab Header */}
            {(isMobile || isTablet) && (
              <div className="bg-gradient-to-r from-purple-500 to-blue-600 px-6 py-5">
                <div className="flex items-center space-x-4">
                  <span className="text-3xl animate-float">{currentTab.icon}</span>
                  <div>
                    <h2 className="text-xl font-bold text-white drop-shadow-lg">{currentTab.label}</h2>
                    <p className="text-purple-100 text-sm mt-1">{currentTab.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content */}
            <div className="p-8">
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


      </div>
    </div>
  );
}