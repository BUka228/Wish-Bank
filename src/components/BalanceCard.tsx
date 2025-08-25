'use client';

import { User } from '@/types/database';

interface BalanceCardProps {
  user: User;
  onExchange?: (fromType: 'green' | 'blue', toType: 'blue' | 'red') => void;
}

const balanceConfig = {
  green: { emoji: '💚', label: 'Зеленые', color: 'text-green-600' },
  blue: { emoji: '💙', label: 'Синие', color: 'text-blue-600' },
  red: { emoji: '❤️', label: 'Красные', color: 'text-red-600' }
};

export default function BalanceCard({ user, onExchange }: BalanceCardProps) {
  const canExchangeGreen = user.green_balance >= 10;
  const canExchangeBlue = user.blue_balance >= 10;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-gray-100 dark:border-gray-700 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <span className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">💰</span>
          </span>
          Баланс желаний
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600">
          {user.name}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl border-2 border-green-100 dark:border-green-700 hover:shadow-md transition-all duration-200">
          <div className="text-4xl mb-2">{balanceConfig.green.emoji}</div>
          <div className={`text-3xl font-bold ${balanceConfig.green.color} dark:text-green-400 mb-1`}>
            {user.green_balance}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">{balanceConfig.green.label}</div>
        </div>

        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/30 dark:to-sky-900/30 rounded-xl border-2 border-blue-100 dark:border-blue-700 hover:shadow-md transition-all duration-200">
          <div className="text-4xl mb-2">{balanceConfig.blue.emoji}</div>
          <div className={`text-3xl font-bold ${balanceConfig.blue.color} dark:text-blue-400 mb-1`}>
            {user.blue_balance}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">{balanceConfig.blue.label}</div>
        </div>

        <div className="text-center p-4 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 rounded-xl border-2 border-red-100 dark:border-red-700 hover:shadow-md transition-all duration-200">
          <div className="text-4xl mb-2">{balanceConfig.red.emoji}</div>
          <div className={`text-3xl font-bold ${balanceConfig.red.color} dark:text-red-400 mb-1`}>
            {user.red_balance}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">{balanceConfig.red.label}</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <span className="font-medium">Обмен:</span> 10 зеленых = 1 синее | 10 синих = 1 красное
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onExchange?.('green', 'blue')}
            disabled={!canExchangeGreen}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
              canExchangeGreen
                ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 shadow-lg hover:shadow-xl'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border-2 border-gray-200 dark:border-gray-600'
            }`}
          >
            💚→💙 (10→1)
          </button>

          <button
            onClick={() => onExchange?.('blue', 'red')}
            disabled={!canExchangeBlue}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
              canExchangeBlue
                ? 'bg-gradient-to-r from-blue-500 to-red-500 text-white hover:from-blue-600 hover:to-red-600 shadow-lg hover:shadow-xl'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border-2 border-gray-200 dark:border-gray-600'
            }`}
          >
            💙→❤️ (10→1)
          </button>
        </div>
      </div>
    </div>
  );
}