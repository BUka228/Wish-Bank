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
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('give')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'give'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🎁 Дать желание
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'create'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ✨ Создать желание
        </button>
      </div>

      {/* Выбор типа желания */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Тип желания
        </label>
        <div className="flex gap-2">
          {Object.entries(wishTypeConfig).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setSelectedType(type as 'green' | 'blue' | 'red')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                selectedType === type
                  ? `${config.color} text-white`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {config.emoji} {config.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'give' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Кому дать
            </label>
            <select
              value={selectedRecipient}
              onChange={(e) => setSelectedRecipient(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {otherUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.username ? `(@${user.username})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Причина
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="За что даете желание?"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleGiveWish}
            disabled={!selectedRecipient || !reason.trim()}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              selectedRecipient && reason.trim()
                ? `${wishTypeConfig[selectedType].color} text-white`
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            🎁 Дать {wishTypeConfig[selectedType].label.toLowerCase()} желание
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Для кого (необязательно)
            </label>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание желания
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Что вы хотите?"
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <button
            onClick={handleCreateWish}
            disabled={!description.trim()}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              description.trim()
                ? `${wishTypeConfig[selectedType].color} text-white`
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            ✨ Создать {wishTypeConfig[selectedType].label.toLowerCase()} желание
          </button>
        </div>
      )}
    </div>
  );
}