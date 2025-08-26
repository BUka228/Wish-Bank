'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';
import { useAdmin } from '../lib/hooks/useAdmin';
import RankBadge from './ranks/RankBadge';
import QuotaDisplay from './economy/QuotaDisplay';

interface EnhancedNavigationProps {
  currentUser?: {
    id: string;
    name: string;
    username?: string;
    rank?: string;
    experience_points?: number;
    daily_quota_used?: number;
    weekly_quota_used?: number;
    monthly_quota_used?: number;
  };
}

export default function EnhancedNavigation({ currentUser }: EnhancedNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { isAdmin, isLoading: adminLoading } = useAdmin();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const menuItems = [
    {
      href: '/',
      icon: '🏠',
      label: 'Главная',
      color: 'blue',
      notifications: 0
    },
    {
      href: '/quests',
      icon: '🎯',
      label: 'Квесты',
      color: 'purple'
    },
    {
      href: '/events',
      icon: '🎲',
      label: 'События',
      color: 'green'
    },
    {
      href: '/wishes',
      icon: '⭐',
      label: 'Желания',
      color: 'pink'
    },
    {
      href: '/economy',
      icon: '💰',
      label: 'Экономика',
      color: 'yellow'
    },
    {
      href: '/ranks',
      icon: '🏆',
      label: 'Ранги',
      color: 'orange'
    },
    {
      href: '/rules',
      icon: '📋',
      label: 'Правила',
      color: 'gray'
    }
  ];

  // Admin menu items - only visible for admin users
  const adminMenuItems = [
    {
      href: '/admin/control-panel',
      icon: '⚙️',
      label: 'Панель управления',
      color: 'red'
    },
    {
      href: '/admin/mana',
      icon: '🔮',
      label: 'Управление маной',
      color: 'purple'
    }
  ];

  const getColorClasses = (color: string, isHover = false) => {
    const baseClasses = {
      blue: isHover ? 'bg-blue-200 dark:bg-blue-800/50' : 'bg-blue-100 dark:bg-blue-900/50',
      purple: isHover ? 'bg-purple-200 dark:bg-purple-800/50' : 'bg-purple-100 dark:bg-purple-900/50',
      green: isHover ? 'bg-green-200 dark:bg-green-800/50' : 'bg-green-100 dark:bg-green-900/50',
      pink: isHover ? 'bg-pink-200 dark:bg-pink-800/50' : 'bg-pink-100 dark:bg-pink-900/50',
      yellow: isHover ? 'bg-yellow-200 dark:bg-yellow-800/50' : 'bg-yellow-100 dark:bg-yellow-900/50',
      orange: isHover ? 'bg-orange-200 dark:bg-orange-800/50' : 'bg-orange-100 dark:bg-orange-900/50',
      red: isHover ? 'bg-red-200 dark:bg-red-800/50' : 'bg-red-100 dark:bg-red-900/50',
      gray: isHover ? 'bg-gray-200 dark:bg-gray-600' : 'bg-gray-100 dark:bg-gray-700/50'
    };
    return baseClasses[color as keyof typeof baseClasses] || baseClasses.gray;
  };

  return (
    <>
      {/* Enhanced Burger Button with Notifications */}
      <button
        onClick={toggleMenu}
        className="fixed top-4 right-4 z-50 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-all duration-200"
        aria-label="Меню"
      >
        <div className="w-6 h-6 flex flex-col justify-center items-center">
          <span
            className={`block w-6 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 ${
              isOpen ? 'rotate-45 translate-y-1.5' : ''
            }`}
          />
          <span
            className={`block w-6 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 mt-1 ${
              isOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`block w-6 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 mt-1 ${
              isOpen ? '-rotate-45 -translate-y-1.5' : ''
            }`}
          />
        </div>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={closeMenu}
        />
      )}

      {/* Enhanced Menu Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 pt-20 h-full overflow-y-auto">
          {/* Enhanced User Info with Rank */}
          {currentUser && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/50 dark:to-pink-900/50 rounded-xl border border-purple-100 dark:border-purple-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">{currentUser.name}</h3>
                  {currentUser.username && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">@{currentUser.username}</p>
                  )}
                </div>
              </div>
              
              {/* Rank Display */}
              {currentUser.rank && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <span className="text-lg">🎖️</span>
                    <div>
                      <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        {currentUser.rank}
                      </div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-400">
                        {currentUser.experience_points || 0} XP
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Quota Indicators */}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Дневная квота:</span>
                  <span>{currentUser.daily_quota_used || 0}/10</span>
                </div>
                <div className="flex justify-between">
                  <span>Недельная квота:</span>
                  <span>{currentUser.weekly_quota_used || 0}/50</span>
                </div>
                <div className="flex justify-between">
                  <span>Месячная квота:</span>
                  <span>{currentUser.monthly_quota_used || 0}/200</span>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Menu Items */}
          <nav className="space-y-2 mb-6">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group relative"
              >
                <div className={`w-10 h-10 ${getColorClasses(item.color)} rounded-lg flex items-center justify-center group-hover:${getColorClasses(item.color, true)} transition-colors`}>
                  <span className="text-xl">{item.icon}</span>
                </div>
                <span className="font-medium text-gray-700 dark:text-gray-200 flex-1">{item.label}</span>
              </Link>
            ))}

            {/* Admin Panel - Only visible for admin users */}
            {isAdmin && !adminLoading && (
              <>
                <div className="pt-4 pb-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-red-200 dark:via-red-700 to-transparent"></div>
                  <div className="text-center py-3">
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-full">
                      👑 АДМИН ПАНЕЛЬ
                    </span>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-red-200 dark:via-red-700 to-transparent"></div>
                </div>

                {adminMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors group relative border border-red-100 dark:border-red-800"
                  >
                    <div className={`w-10 h-10 ${getColorClasses(item.color)} rounded-lg flex items-center justify-center group-hover:${getColorClasses(item.color, true)} transition-colors`}>
                      <span className="text-xl">{item.icon}</span>
                    </div>
                    <span className="font-medium text-red-700 dark:text-red-300 flex-1">{item.label}</span>
                  </Link>
                ))}
              </>
            )}

            {/* Debug info for admin status */}
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              <div>Admin Loading: {adminLoading ? '⏳' : '✅'}</div>
              <div>Is Admin: {isAdmin ? '👑' : '👤'}</div>
              <div>Show Admin Panel: {isAdmin && !adminLoading ? '✅ YES' : '❌ NO'}</div>
            </div>
          </nav>

          {/* Settings Section */}
          <div className="border-t border-gray-100 dark:border-gray-600 pt-4 space-y-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            >
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 dark:group-hover:bg-yellow-800/50 transition-colors">
                <span className="text-xl">{theme === 'light' ? '🌙' : '☀️'}</span>
              </div>
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {theme === 'light' ? 'Темная тема' : 'Светлая тема'}
              </span>
            </button>

            {/* App Info */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">ℹ️</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-200 block">Банк Желаний</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">v2.0.0 - Квестовая система</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}