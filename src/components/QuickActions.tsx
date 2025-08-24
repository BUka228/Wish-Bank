'use client';

import { User } from '@/lib/db';
import { useState } from 'react';

interface QuickActionsProps {
  users: User[];
  currentUser: User;
  onGiveWish: (recipientId: string, type: 'green' | 'blue' | 'red', reason: string) => void;
  onCreateWish: (type: 'green' | 'blue' | 'red', description: string, assigneeId?: string) => void;
}

export default function QuickActions({ users, currentUser, onGiveWish, onCreateWish }: QuickActionsProps) {
  const [activeTab, setActiveTab] = useState<'give' | 'create'>('give');
  const [selectedType, setSelectedType] = useState<'green' | 'blue' | 'red'>('green');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  
  const otherUsers = users.filter(u => u.id !== currentUser.id);
  const [selectedRecipient, setSelectedRecipient] = useState(otherUsers[0]?.id || '');
  const [selectedAssignee, setSelectedAssignee] = useState(otherUsers[0]?.id || '');

  const wishTypeConfig = {
    green: { emoji: '💚', label: 'Зеленое', color: 'bg-green-500 hover:bg-green-600' },
    blue: { emoji: '💙', label: 'Синее', color: 'bg-blue-500 hover:bg-blue-600' },
    red: { emoji: '❤️', label: 'Красное', color: 'bg-red-500 hover:bg-red-600' }
  };

  const handleGiveWish = () => {
    if (!selectedRecipient || !reason.trim()) return;
    onGiveWish(selectedRecipient, selectedType, reason);
    setReason('');
  };

  const handleCreateWish = () => {
    if (!description.trim()) return;
    onCreateWish(selectedType, description, selectedAssignee);
    setDescription('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-100 backdrop-blur-sm bg-white/90">
      <div className="flex mb-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-1 border border-purple-100">
        <button
          onClick={() => setActiveTab('give')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'give'
              ? 'bg-white text-gray-900 shadow-lg border border-gray-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          🎁 Дать желание
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'create'
              ? 'bg-white text-gray-900 shadow-lg border border-gray-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          ✨ Создать желание
        </button>
      </div>

      {/* Выбор типа желания */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Тип желания
        </label>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(wishTypeConfig).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setSelectedType(type as 'green' | 'blue' | 'red')}
              className={`py-3 px-3 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                selectedType === type
                  ? `${config.color} text-white shadow-lg border-transparent`
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-lg mb-1">{config.emoji}</div>
              <div className="text-xs">{config.label}</div>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'give' ? (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Кому дать
            </label>
            <select
              value={selectedRecipient}
              onChange={(e) => setSelectedRecipient(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
            >
              {otherUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.username ? `(@${user.username})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Причина
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="За что даете желание?"
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
            />
          </div>

          <button
            onClick={handleGiveWish}
            disabled={!selectedRecipient || !reason.trim()}
            className={`w-full py-4 px-4 rounded-xl font-medium transition-all duration-200 ${
              selectedRecipient && reason.trim()
                ? `${wishTypeConfig[selectedType].color} text-white shadow-lg hover:shadow-xl`
                : 'bg-gray-200 text-gray-400 cursor-not-allowed border-2 border-gray-300'
            }`}
          >
            🎁 Дать {wishTypeConfig[selectedType].label.toLowerCase()} желание
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Для кого (необязательно)
            </label>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
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
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Описание желания
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Что вы хотите?"
              rows={3}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
            />
          </div>

          <button
            onClick={handleCreateWish}
            disabled={!description.trim()}
            className={`w-full py-4 px-4 rounded-xl font-medium transition-all duration-200 ${
              description.trim()
                ? `${wishTypeConfig[selectedType].color} text-white shadow-lg hover:shadow-xl`
                : 'bg-gray-200 text-gray-400 cursor-not-allowed border-2 border-gray-300'
            }`}
          >
            ✨ Создать {wishTypeConfig[selectedType].label.toLowerCase()} желание
          </button>
        </div>
      )}
    </div>
  );
}