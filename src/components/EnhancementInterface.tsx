'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types/database';
import { Enhancement, EnhancedWish, AuraType } from '@/types/mana-system';
import { 
  MANA_TEXTS, 
  formatManaAmount, 
  formatCost, 
  getAuraName, 
  getPriorityDescription,
  getAuraDescription 
} from '@/lib/mana-localization';
import { ManaFloatingNumber, ManaGlowEffect, ManaSparkleEffect } from '@/components/ManaAnimations';

interface EnhancementInterfaceProps {
  wish: EnhancedWish;
  user: User;
  onEnhancementApplied?: (enhancement: Enhancement) => void;
  onClose?: () => void;
}

interface EnhancementCosts {
  nextPriorityLevel: number | null;
  aura: number | null;
}

interface CurrentLevels {
  priority: number;
  aura: string | null;
}

export default function EnhancementInterface({ 
  wish, 
  user, 
  onEnhancementApplied, 
  onClose 
}: EnhancementInterfaceProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [costs, setCosts] = useState<EnhancementCosts>({ nextPriorityLevel: null, aura: null });
  const [currentLevels, setCurrentLevels] = useState<CurrentLevels>({ priority: 0, aura: null });
  const [selectedAura, setSelectedAura] = useState<AuraType | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationType, setAnimationType] = useState<'priority' | 'aura' | null>(null);

  // Check if user can enhance this wish
  const canEnhance = wish.author_id === user.id && wish.status === 'active';

  // Load enhancement data
  useEffect(() => {
    loadEnhancementData();
  }, [wish.id]);

  const loadEnhancementData = async () => {
    try {
      const response = await fetch(`/api/wishes/${wish.id}/enhancements`);
      if (response.ok) {
        const data = await response.json();
        setCosts(data.costs);
        setCurrentLevels(data.currentLevels);
      }
    } catch (error) {
      console.error('Error loading enhancement data:', error);
    }
  };

  const applyPriorityEnhancement = async () => {
    if (!canEnhance || !costs.nextPriorityLevel) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const nextLevel = currentLevels.priority + 1;
      
      const response = await fetch('/api/wishes/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wishId: wish.id,
          type: 'priority',
          level: nextLevel
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setAnimationType('priority');
        setShowAnimation(true);
        
        // Update local state
        setCurrentLevels(prev => ({ ...prev, priority: nextLevel }));
        setCosts(prev => ({ 
          ...prev, 
          nextPriorityLevel: nextLevel >= 5 ? null : getPriorityCost(nextLevel + 1)
        }));
        
        onEnhancementApplied?.(data.enhancement);
        
        // Hide animation after delay
        setTimeout(() => {
          setShowAnimation(false);
          setAnimationType(null);
        }, 2000);
      } else {
        setError(data.error || 'Не удалось применить усиление приоритета');
      }
    } catch (error) {
      console.error('Error applying priority enhancement:', error);
      setError('Произошла ошибка при применении усиления');
    } finally {
      setLoading(false);
    }
  };

  const applyAuraEnhancement = async (auraType: AuraType) => {
    if (!canEnhance || !costs.aura) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/wishes/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wishId: wish.id,
          type: 'aura',
          auraType: auraType
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setAnimationType('aura');
        setShowAnimation(true);
        
        // Update local state
        setCurrentLevels(prev => ({ ...prev, aura: auraType }));
        setCosts(prev => ({ ...prev, aura: null }));
        
        onEnhancementApplied?.(data.enhancement);
        
        // Hide animation after delay
        setTimeout(() => {
          setShowAnimation(false);
          setAnimationType(null);
        }, 2000);
      } else {
        setError(data.error || 'Не удалось применить усиление ауры');
      }
    } catch (error) {
      console.error('Error applying aura enhancement:', error);
      setError('Произошла ошибка при применении усиления');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityCost = (level: number): number => {
    const costs = { 1: 10, 2: 25, 3: 50, 4: 100, 5: 200 };
    return costs[level as keyof typeof costs] || 0;
  };

  const getAuraIcon = (auraType: AuraType): string => {
    const icons = {
      romantic: '💕',
      gaming: '🎮',
      mysterious: '🔮'
    };
    return icons[auraType];
  };

  const getAuraColor = (auraType: AuraType): string => {
    const colors = {
      romantic: 'from-pink-400 to-rose-400',
      gaming: 'from-purple-400 to-indigo-400',
      mysterious: 'from-indigo-400 to-purple-400'
    };
    return colors[auraType];
  };

  if (!canEnhance) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-gray-100 dark:border-gray-700">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Усиления недоступны
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Только автор желания может применять усиления
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-gray-100 dark:border-gray-700 relative overflow-hidden">
      {/* Animation effects */}
      <ManaGlowEffect isActive={showAnimation && animationType === 'priority'} intensity="high" />
      <ManaSparkleEffect isActive={showAnimation} count={12} />
      
      {/* Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-50 via-blue-50 to-cyan-50 dark:from-purple-900/30 dark:via-blue-900/30 dark:to-cyan-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">✨</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {MANA_TEXTS.enhancements}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Усильте свое желание с помощью Маны
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="text-gray-500 dark:text-gray-400">✕</span>
            </button>
          )}
        </div>
        
        {/* Current Mana Balance */}
        <div className="mt-4 p-3 bg-white/70 dark:bg-gray-700/70 rounded-lg border border-white/50 dark:border-gray-600/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Ваш баланс:
            </span>
            <span className="text-lg font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {formatManaAmount(user.mana_balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mx-6 mt-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
          <p className="text-green-700 dark:text-green-300 text-sm">{success}</p>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Priority Enhancement Section */}
        <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-5 border border-orange-200 dark:border-orange-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-red-400 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🔥</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {MANA_TEXTS.priority}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Повысьте приоритет желания в списке
              </p>
            </div>
          </div>

          {/* Current Priority Level */}
          <div className="mb-4 p-3 bg-white/70 dark:bg-gray-700/70 rounded-lg border border-white/50 dark:border-gray-600/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Текущий уровень:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {currentLevels.priority || 1}
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`w-3 h-3 rounded-full ${
                        level <= (currentLevels.priority || 1)
                          ? 'bg-orange-400'
                          : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            {currentLevels.priority > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {getPriorityDescription(currentLevels.priority)}
              </p>
            )}
          </div>

          {/* Priority Enhancement Button */}
          {costs.nextPriorityLevel && currentLevels.priority < 5 ? (
            <button
              onClick={applyPriorityEnhancement}
              disabled={loading || user.mana_balance < costs.nextPriorityLevel}
              className={`w-full p-4 rounded-xl font-medium transition-all duration-200 ${
                loading || user.mana_balance < costs.nextPriorityLevel
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Применяется...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>🔥</span>
                  Повысить до уровня {currentLevels.priority + 1}
                  <span className="text-sm opacity-80">
                    ({formatCost(costs.nextPriorityLevel)})
                  </span>
                </span>
              )}
            </button>
          ) : (
            <div className="w-full p-4 bg-gray-100 dark:bg-gray-700 rounded-xl text-center">
              <span className="text-gray-500 dark:text-gray-400">
                {currentLevels.priority >= 5 
                  ? '🏆 Максимальный уровень достигнут'
                  : 'Усиление приоритета недоступно'
                }
              </span>
            </div>
          )}
        </div>

        {/* Aura Enhancement Section */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">✨</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {MANA_TEXTS.aura}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Добавьте визуальные эффекты желанию
              </p>
            </div>
          </div>

          {/* Current Aura */}
          {currentLevels.aura ? (
            <div className="mb-4 p-3 bg-white/70 dark:bg-gray-700/70 rounded-lg border border-white/50 dark:border-gray-600/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Текущая аура:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {getAuraIcon(currentLevels.aura as AuraType)}
                  </span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {getAuraName(currentLevels.aura)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {getAuraDescription(currentLevels.aura)}
              </p>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-white/70 dark:bg-gray-700/70 rounded-lg border border-white/50 dark:border-gray-600/50">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Аура не применена
              </span>
            </div>
          )}

          {/* Aura Selection */}
          {!currentLevels.aura && costs.aura ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Выберите тип ауры ({formatCost(costs.aura)}):
              </p>
              
              <div className="grid grid-cols-1 gap-3">
                {(['romantic', 'gaming', 'mysterious'] as AuraType[]).map((auraType) => (
                  <button
                    key={auraType}
                    onClick={() => applyAuraEnhancement(auraType)}
                    disabled={loading || user.mana_balance < costs.aura!}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      loading || user.mana_balance < costs.aura!
                        ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : selectedAura === auraType
                        ? `bg-gradient-to-r ${getAuraColor(auraType)} text-white border-transparent shadow-lg`
                        : 'bg-white dark:bg-gray-700 border-purple-200 dark:border-purple-600 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getAuraIcon(auraType)}</span>
                      <div className="text-left">
                        <div className="font-medium">
                          {getAuraName(auraType)}
                        </div>
                        <div className="text-sm opacity-80">
                          {getAuraDescription(auraType)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full p-4 bg-gray-100 dark:bg-gray-700 rounded-xl text-center">
              <span className="text-gray-500 dark:text-gray-400">
                {currentLevels.aura 
                  ? '✨ Аура уже применена'
                  : 'Усиление ауры недоступно'
                }
              </span>
            </div>
          )}
        </div>

        {/* Enhancement Tips */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <span>💡</span>
            Советы по усилениям
          </h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• {MANA_TEXTS.tips.priorityLevels}</li>
            <li>• {MANA_TEXTS.tips.auraEffects}</li>
            <li>• {MANA_TEXTS.tips.spendWisely}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}