'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';

interface BurgerMenuProps {
  currentUser?: { name: string; username?: string };
}

export default function BurgerMenu({ currentUser }: BurgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Burger Button */}
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

      {/* Menu Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 pt-20">
          {/* User Info */}
          {currentUser && (
            <div className="mb-8 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/50 dark:to-pink-900/50 rounded-xl border border-purple-100 dark:border-purple-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">{currentUser.name}</h3>
                  {currentUser.username && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">@{currentUser.username}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Menu Items */}
          <nav className="space-y-2">
            <Link
              href="/"
              onClick={closeMenu}
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                <span className="text-xl">🏠</span>
              </div>
              <span className="font-medium text-gray-700 dark:text-gray-200">Главная</span>
            </Link>

            <Link
              href="/rules"
              onClick={closeMenu}
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors">
                <span className="text-xl">📋</span>
              </div>
              <span className="font-medium text-gray-700 dark:text-gray-200">Правила</span>
            </Link>

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

            <div className="pt-4 border-t border-gray-100 dark:border-gray-600">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">ℹ️</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-200 block">Банк Желаний</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">v1.0.0</span>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}