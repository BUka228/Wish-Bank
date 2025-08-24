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
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Баланс желаний</h2>
        <div className="text-sm text-gray-500">{user.name}</div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl mb-1">{balanceConfig.green.emoji}</div>
          <div className={`text-2xl font-bold ${balanceConfig.green.color}`}>
            {user.green_balance}
          </div>
          <div className="text-xs text-gray-500">{balanceConfig.green.label}</div>
        </div>

        <div className="text-center">
          <div className="text-3xl mb-1">{balanceConfig.blue.emoji}</div>
          <div className={`text-2xl font-bold ${balanceConfig.blue.color}`}>
            {user.blue_balance}
          </div>
          <div className="text-xs text-gray-500">{balanceConfig.blue.label}</div>
        </div>

        <div className="text-center">
          <div className="text-3xl mb-1">{balanceConfig.red.emoji}</div>
          <div className={`text-2xl font-bold ${balanceConfig.red.color}`}>
            {user.red_balance}
          </div>
          <div className="text-xs text-gray-500">{balanceConfig.red.label}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-gray-500 text-center mb-3">
          Обмен: 10 зеленых = 1 синее | 10 синих = 1 красное
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onExchange?.('green', 'blue')}
            disabled={!canExchangeGreen}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              canExchangeGreen
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            💚→💙 (10→1)
          </button>

          <button
            onClick={() => onExchange?.('blue', 'red')}
            disabled={!canExchangeBlue}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              canExchangeBlue
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            💙→❤️ (10→1)
          </button>
        </div>
      </div>
    </div>
  );
}