'use client';

import { User } from '@/lib/db';

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
    <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-100 backdrop-blur-sm bg-white/90">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">💰</span>
          </span>
          Баланс желаний
        </h2>
        <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
          {user.name}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-100 hover:shadow-md transition-all duration-200">
          <div className="text-4xl mb-2">{balanceConfig.green.emoji}</div>
          <div className={`text-3xl font-bold ${balanceConfig.green.color} mb-1`}>
            {user.green_balance}
          </div>
          <div className="text-xs text-gray-600 font-medium">{balanceConfig.green.label}</div>
        </div>

        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl border-2 border-blue-100 hover:shadow-md transition-all duration-200">
          <div className="text-4xl mb-2">{balanceConfig.blue.emoji}</div>
          <div className={`text-3xl font-bold ${balanceConfig.blue.color} mb-1`}>
            {user.blue_balance}
          </div>
          <div className="text-xs text-gray-600 font-medium">{balanceConfig.blue.label}</div>
        </div>

        <div className="text-center p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border-2 border-red-100 hover:shadow-md transition-all duration-200">
          <div className="text-4xl mb-2">{balanceConfig.red.emoji}</div>
          <div className={`text-3xl font-bold ${balanceConfig.red.color} mb-1`}>
            {user.red_balance}
          </div>
          <div className="text-xs text-gray-600 font-medium">{balanceConfig.red.label}</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs text-gray-500 text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="font-medium">Обмен:</span> 10 зеленых = 1 синее | 10 синих = 1 красное
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onExchange?.('green', 'blue')}
            disabled={!canExchangeGreen}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
              canExchangeGreen
                ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 shadow-lg hover:shadow-xl'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
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
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
            }`}
          >
            💙→❤️ (10→1)
          </button>
        </div>
      </div>
    </div>
  );
}