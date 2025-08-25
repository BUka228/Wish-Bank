'use client';

import { User } from '@/types/database';
import { useState } from 'react';
import { MANA_TEXTS } from '@/lib/mana-localization';

interface ManaQuickActionsProps {
  users: User[];
  currentUser: User;
  onGiveMana: (recipientId: string, amount: number, reason: string) => void;
  onCreateWish: (description: string, assigneeId?: string) => void;
}

export default function ManaQuickActions({ users, currentUser, onGiveMana, onCreateWish }: ManaQuickActionsProps) {
  const [activeTab, setActiveTab] = useState<'give' | 'create'>('create');
  const [manaAmount, setManaAmount] = useState(10);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  
  const otherUsers = users.filter(u => u.id !== currentUser.id);
  const [selectedRecipient, setSelectedRecipient] = useState(otherUsers[0]?.id || '');
  const [selectedAssignee, setSelectedAssignee] = useState('');

  const manaAmounts = [10, 25, 50, 100, 200];

  const handleGiveMana = () => {
    if (!selectedRecipient || !reason.trim() || manaAmount <= 0) return;
    onGiveMana(selectedRecipient, manaAmount, reason);
    setReason('');
  };

  const handleCreateWish = () => {
    if (!description.trim()) return;
    onCreateWish(description, selectedAssignee || undefined);
    setDescription('');
  };

  const canGiveMana = currentUser.mana_balance >= manaAmount;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-gray-100 dark:border-gray-700 backdrop-blur-sm">
      <div className="flex mb-6 bg-gradient-to-r from-purple-50 to-cyan-50 dark:from-purple-900/30 dark:to-cyan-900/30 rounded-xl p-1 border border-purple-100 dark:border-purple-700">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'create'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-lg border border-gray-200 dark:border-gray-600'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
        >
          ✨ {MANA_TEXTS.interface.createWish}
        </button>
        <button
          onClick={() => setActiveTab('give')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'give'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-lg border border-gray-200 dark:border-gray-600'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
        >
          🎁 {MANA_TEXTS.interface.giftMana}
        </button>
      </div>

      {activeTab === 'create' ? (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Для кого (необязательно)
            </label>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
            >
              <option value="">Любой может выполнить</option>
              {otherUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.username ? `(@${user.username})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Описание желания
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Что вы хотите? Создание желания теперь бесплатно!"
              rows={3}
              className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 resize-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200 dark:border-green-700">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
              <span className="text-lg">🆓</span>
              <span className="font-medium">{MANA_TEXTS.interface.freeWishCreation} {MANA_TEXTS.interface.useManaForEnhancements}</span>
            </div>
          </div>

          <button
            onClick={handleCreateWish}
            disabled={!description.trim()}
            className={`w-full py-4 px-4 rounded-xl font-medium transition-all duration-200 ${
              description.trim()
                ? 'bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border-2 border-gray-300 dark:border-gray-600'
            }`}
          >
            ✨ {MANA_TEXTS.interface.createWish} бесплатно
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Кому подарить Ману
            </label>
            <select
              value={selectedRecipient}
              onChange={(e) => setSelectedRecipient(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
            >
              {otherUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.username ? `(@${user.username})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Количество Маны
            </label>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {manaAmounts.map(amount => (
                <button
                  key={amount}
                  onClick={() => setManaAmount(amount)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${
                    manaAmount === amount
                      ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white border-transparent shadow-lg'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={manaAmount}
              onChange={(e) => setManaAmount(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              max={currentUser.mana_balance}
              className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Причина подарка
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="За что дарите Ману?"
              className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {!canGiveMana && (
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-700">
              <div className="text-red-700 dark:text-red-300 text-sm">
                ⚠️ Недостаточно Маны. У вас: {currentUser.mana_balance}, требуется: {manaAmount}
              </div>
            </div>
          )}

          <button
            onClick={handleGiveMana}
            disabled={!selectedRecipient || !reason.trim() || !canGiveMana}
            className={`w-full py-4 px-4 rounded-xl font-medium transition-all duration-200 ${
              selectedRecipient && reason.trim() && canGiveMana
                ? 'bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border-2 border-gray-300 dark:border-gray-600'
            }`}
          >
            🎁 Подарить {manaAmount} Маны
          </button>
        </div>
      )}
    </div>
  );
}