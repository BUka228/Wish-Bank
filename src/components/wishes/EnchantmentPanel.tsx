'use client';

import { useState, useEffect } from 'react';
import { EnhancedWish as Wish, EnchantmentCosts, PriorityCostMultiplier } from '@/types/quest-economy';
import { StarIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface EnchantmentPanelProps {
  wish: Wish;
  isOpen: boolean;
  onClose: () => void;
  onEnchant: (enchantmentType: string, level?: number, value?: string) => Promise<void>;
  economySettings: {
    enchantment_costs: EnchantmentCosts;
    priority_cost_multiplier: PriorityCostMultiplier;
  };
  userMana: number;
}

export default function EnchantmentPanel({ wish, isOpen, onClose, onEnchant, economySettings, userMana }: EnchantmentPanelProps) {
  const [selectedPriority, setSelectedPriority] = useState(wish.enchantments?.priority || 1);
  const [selectedAura, setSelectedAura] = useState(wish.enchantments?.aura || '');

  useEffect(() => {
    if (isOpen) {
        setSelectedPriority(wish.enchantments?.priority || 1);
        setSelectedAura(wish.enchantments?.aura || '');
    }
  }, [isOpen, wish.enchantments]);

  if (!isOpen) return null;

  const getPriorityCost = (level: number) => {
    if (!economySettings?.enchantment_costs?.priority || !economySettings?.priority_cost_multiplier) return 9999;
    const baseCost = economySettings.enchantment_costs.priority;
    const multiplier = economySettings.priority_cost_multiplier[level] || 0;
    return baseCost * multiplier;
  };

  const auraCost = economySettings?.enchantment_costs?.aura || 9999;
  const auras = ['romantic', 'urgent', 'playful', 'mysterious'];

  const handleEnchant = async (type: string, level?: number, value?: string) => {
    try {
      await onEnchant(type, level, value);
      onClose();
    } catch (error) {
      console.error("Failed to enchant:", error);
      // Here you could show an error message to the user
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border-2 border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Усилить желание</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 border-b pb-4 border-gray-200 dark:border-gray-700 truncate">
          {wish.description}
        </p>

        {/* Priority Enchantment */}
        <div className="mb-6">
          <h4 className="font-semibold text-lg mb-2 text-gray-700 dark:text-gray-200">Приоритет</h4>
          <div className="flex justify-around bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl">
            {[1, 2, 3, 4, 5].map(level => {
              const cost = getPriorityCost(level);
              const isDisabled = userMana < cost || (wish.enchantments?.priority || 0) >= level;
              return (
                <button
                  key={level}
                  onClick={() => handleEnchant('priority', level)}
                  disabled={isDisabled}
                  className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${selectedPriority === level ? 'bg-yellow-400 text-white shadow-lg' : 'bg-white dark:bg-gray-600'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-200 dark:hover:bg-yellow-700'}`}
                >
                  <StarIcon className={`w-5 h-5 mx-auto mb-1 ${selectedPriority === level ? 'text-white' : 'text-yellow-400'}`} />
                  {level}
                  <span className="block text-xs opacity-80">{cost} M</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aura Enchantment */}
        <div className="mb-4">
          <h4 className="font-semibold text-lg mb-2 text-gray-700 dark:text-gray-200">Аура</h4>
          <div className="grid grid-cols-2 gap-3">
            {auras.map(aura => {
              const isDisabled = userMana < auraCost || wish.enchantments?.aura === aura;
              return (
                <button
                  key={aura}
                  onClick={() => handleEnchant('aura', undefined, aura)}
                  disabled={isDisabled}
                  className={`p-3 rounded-lg text-left flex items-center gap-3 transition-all ${selectedAura === aura ? 'bg-purple-500 text-white shadow-lg' : 'bg-gray-50 dark:bg-gray-700/50'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-100 dark:hover:bg-purple-900/50'}`}
                >
                  <SparklesIcon className={`w-5 h-5 ${selectedAura === aura ? 'text-white' : 'text-purple-500'}`} />
                  <div>
                    <p className="font-semibold">{aura.charAt(0).toUpperCase() + aura.slice(1)}</p>
                    <p className="text-xs opacity-80">{auraCost} маны</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
