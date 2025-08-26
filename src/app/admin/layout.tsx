'use client';

import React, { useState, useEffect } from 'react';
import { useDeviceDetection } from '../../lib/mobile-detection';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isMobile, isTablet } = useDeviceDetection();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const adminMenuItems = [
    {
      href: '/admin/control-panel',
      icon: '🎛️',
      label: 'Панель управления',
      description: 'Основная админ панель',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      href: '/admin/mana',
      icon: '✨',
      label: 'Управление маной',
      description: 'Экономическая система',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      href: '/wishes',
      icon: '💫',
      label: 'Желания',
      description: 'Просмотр желаний',
      gradient: 'from-indigo-500 to-purple-600'
    },
    {
      href: '/quests',
      icon: '🎯',
      label: 'Квесты',
      description: 'Система заданий',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      href: '/economy',
      icon: '💰',
      label: 'Экономика',
      description: 'Экономические показатели',
      gradient: 'from-amber-500 to-orange-600'
    },
    {
      href: '/ranks',
      icon: '🏆',
      label: 'Ранги',
      description: 'Система рангов',
      gradient: 'from-red-500 to-pink-600'
    }
  ];

  const closeSidebar = () => setSidebarOpen(false);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Main Content Overlay */}
      <div className="relative z-10">
        {/* Enhanced Mobile Header */}
        {(isMobile || isTablet) && (
          <div className="bg-white/10 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="group p-3 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-600/20 backdrop-blur-sm border border-white/20 text-white hover:from-blue-500/30 hover:to-purple-600/30 transition-all duration-300 touch-manipulation transform active:scale-95"
                >
                  <svg className="w-6 h-6 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
                  <h1 className="text-lg font-bold text-white drop-shadow-lg">Админ панель</h1>
                  <p className="text-xs text-white/80">WSL Admin System</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-red-500/20 to-pink-600/20 backdrop-blur-sm text-white border border-red-300/30 px-3 py-2 rounded-full text-xs font-bold flex items-center space-x-2 shadow-lg">
                  <span className="animate-pulse">🔒</span>
                  <span>Admin</span>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <span className="text-white text-sm font-bold">●</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Desktop Sidebar */}
        {!isMobile && !isTablet && (
          <div className="fixed inset-y-0 left-0 w-72 bg-white/10 backdrop-blur-2xl border-r border-white/20 z-40 shadow-2xl">
            <div className="h-full flex flex-col">
              {/* Enhanced Sidebar Header */}
              <div className="flex items-center justify-center py-8 border-b border-white/20 bg-gradient-to-r from-blue-500/20 to-purple-600/20 backdrop-blur-sm">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white drop-shadow-lg">WSL Admin</h1>
                  <p className="text-white/80 text-sm mt-1">Панель управления</p>
                  <div className="mt-3 inline-flex items-center space-x-2 bg-white/10 rounded-full px-3 py-1 text-xs text-white border border-white/20">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span>Online</span>
                  </div>
                </div>
              </div>

              {/* Enhanced Navigation Menu */}
              <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
                {adminMenuItems.map((item, index) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center space-x-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-xl`}
                    style={{
                      animationDelay: `${index * 100}ms`
                    }}
                  >
                    <div className={`w-12 h-12 bg-gradient-to-r ${item.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <span className="text-xl">{item.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white group-hover:text-blue-200 transition-colors">{item.label}</div>
                      <div className="text-xs text-white/60 group-hover:text-white/80 transition-colors mt-1">{item.description}</div>
                    </div>
                    <svg className="w-5 h-5 text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                ))}
              </nav>

              {/* Enhanced Sidebar Footer */}
              <div className="p-6 border-t border-white/20 bg-gradient-to-r from-red-500/10 to-pink-600/10 backdrop-blur-sm">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                    <span className="text-white text-lg font-bold">🔒</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">Режим администратора</div>
                    <div className="text-xs text-white/70 mt-1">Полный доступ к системе</div>
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-300">Активный сеанс</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Mobile Sidebar Overlay */}
        {(isMobile || isTablet) && sidebarOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn" 
              onClick={closeSidebar}
            />
            <div className="fixed inset-y-0 left-0 w-80 max-w-[90vw] bg-white/10 backdrop-blur-2xl border-r border-white/20 shadow-2xl z-50 transform transition-all duration-300 animate-slideInLeft">
              <div className="h-full flex flex-col">
                {/* Enhanced Mobile Sidebar Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/20 bg-gradient-to-r from-blue-500/20 to-purple-600/20">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-lg">⚡</span>
                      </div>
                      <div>
                        <h1 className="text-lg font-bold text-white drop-shadow-lg">WSL Admin</h1>
                        <p className="text-white/80 text-sm">Панель управления</p>
                      </div>
                    </div>
                    <div className="inline-flex items-center space-x-2 bg-white/10 rounded-full px-3 py-1 text-xs text-white border border-white/20">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      <span>Активный сеанс</span>
                    </div>
                  </div>
                  <button
                    onClick={closeSidebar}
                    className="group p-3 rounded-2xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300 touch-manipulation transform active:scale-95"
                  >
                    <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Enhanced Mobile Navigation */}
                <nav className="flex-1 p-6 space-y-4 overflow-y-auto">
                  {adminMenuItems.map((item, index) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={closeSidebar}
                      className={`group flex items-center space-x-4 p-4 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 transition-all duration-300 transform hover:scale-105 touch-manipulation active:scale-95 shadow-lg hover:shadow-xl`}
                      style={{
                        animationDelay: `${index * 100}ms`
                      }}
                    >
                      <div className={`w-14 h-14 bg-gradient-to-r ${item.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <span className="text-2xl">{item.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-white group-hover:text-blue-200 transition-colors">{item.label}</div>
                        <div className="text-sm text-white/70 group-hover:text-white/90 transition-colors mt-1">{item.description}</div>
                      </div>
                      <svg className="w-6 h-6 text-white/50 group-hover:text-white/80 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  ))}
                </nav>

                {/* Enhanced Mobile Sidebar Footer */}
                <div className="p-6 border-t border-white/20 bg-gradient-to-r from-red-500/10 to-pink-600/10">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                      <span className="text-white text-xl font-bold">🔒</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-white">Администратор</div>
                      <div className="text-sm text-white/80 mt-1">Полный доступ к системе</div>
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-300">Система активна</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Enhanced Main Content Area */}
        <div className={`transition-all duration-300 ${!isMobile && !isTablet ? 'ml-72' : ''}`}>
          <main className="min-h-screen relative">
            {/* Content Background Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}