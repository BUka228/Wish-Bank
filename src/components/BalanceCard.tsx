'use client';

import { User } from '@/types/quest-economy'; // Using the correct centralized type
import { SparklesIcon, FireIcon } from '@heroicons/react/24/solid';

interface BalanceCardProps {
  user: User;
}

export default function BalanceCard({ user }: BalanceCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <span className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-white" />
          </span>
          Мана
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600">
          {user.name}
        </div>
      </div>

      <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl border-2 border-indigo-100 dark:border-indigo-700">
        <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-400 mb-2">
          {user.mana}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Текущий баланс маны</div>
      </div>

      <div className="mt-4 text-center">
        <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
          <FireIcon className="w-4 h-4 mr-1 text-red-500" />
          <span>Всего потрачено:</span>
          <span className="font-bold text-gray-700 dark:text-gray-200 ml-1">{user.mana_spent}</span>
        </div>
      </div>
    </div>
  );
}