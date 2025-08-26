'use client';

import React, { useState } from 'react';
import { useDeviceDetection } from '../../lib/mobile-detection';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isMobile, isTablet } = useDeviceDetection();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminMenuItems = [
    {
      href: '/admin/control-panel',
      icon: '🎛️',
      label: 'Панель управления',
      description: 'Основная админ панель'
    },
    {
      href: '/admin/mana',
      icon: '✨',
      label: 'Управление маной',
      description: 'Экономическая система'
    },
    {
      href: '/wishes',
      icon: '💫',
      label: 'Желания',
      description: 'Просмотр желаний'
    },
    {
      href: '/quests',
      icon: '🎯',
      label: 'Квесты',
      description: 'Система заданий'
    },
    {
      href: '/economy',
      icon: '💰',
      label: 'Экономика',
      description: 'Экономические показатели'
    },
    {
      href: '/ranks',
      icon: '🏆',
      label: 'Ранги',
      description: 'Система рангов'
    }
  ];

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      {/* Mobile Header */}
      {(isMobile || isTablet) && (
        <div className="bg-white shadow-lg border-b sticky top-0 z-50">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Админ панель</h1>
                <p className="text-xs text-gray-500">WSL Admin System</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                🔒 Admin
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && !isTablet && (
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl border-r z-40">
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="flex items-center justify-center py-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="text-center">
                <h1 className="text-xl font-bold text-white">WSL Admin</h1>
                <p className="text-blue-100 text-sm">Панель управления</p>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 p-4 space-y-2">
              {adminMenuItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 group"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 group-hover:text-blue-700">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </a>
              ))}
            </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">A</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Admin Mode</div>
                  <div className="text-xs text-gray-500">Полный доступ</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {(isMobile || isTablet) && sidebarOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40" 
            onClick={closeSidebar}
          />
          <div className="fixed inset-y-0 left-0 w-80 max-w-[90vw] bg-white shadow-xl z-50 transform transition-transform duration-300">
            <div className="h-full flex flex-col">
              {/* Mobile Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
                <div>
                  <h1 className="text-lg font-bold text-white">WSL Admin</h1>
                  <p className="text-blue-100 text-sm">Панель управления</p>
                </div>
                <button
                  onClick={closeSidebar}
                  className="p-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
                {adminMenuItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebar}
                    className="flex items-center space-x-4 p-4 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 group border border-gray-100"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 group-hover:text-blue-700">{item.label}</div>
                      <div className="text-sm text-gray-500 mt-1">{item.description}</div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                ))}
              </nav>

              {/* Mobile Sidebar Footer */}
              <div className="p-4 border-t bg-gradient-to-r from-red-50 to-orange-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">🔒</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">Администратор</div>
                    <div className="text-sm text-gray-600">Полный доступ к системе</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${!isMobile && !isTablet ? 'ml-64' : ''}`}>
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}