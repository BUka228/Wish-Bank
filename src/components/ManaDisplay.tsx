'use client';

import { User } from '@/types/database';
import { useState, useEffect } from 'react';
import { MANA_TEXTS, formatManaAmount } from '@/lib/mana-localization';
import { ManaFloatingNumber, ManaGlowEffect, ManaSparkleEffect, ManaRippleEffect } from '@/components/ManaAnimations';

interface ManaDisplayProps {
  user: User;
  showAnimation?: boolean;
  onManaChange?: (newAmount: number) => void;
}

export default function ManaDisplay({ user, showAnimation = false, onManaChange }: ManaDisplayProps) {
  const [displayMana, setDisplayMana] = useState(user.mana_balance);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDelta, setAnimationDelta] = useState(0);
  const [showFloatingNumber, setShowFloatingNumber] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const [showRipple, setShowRipple] = useState(false);

  // Handle mana changes with animation
  useEffect(() => {
    if (showAnimation && user.mana_balance !== displayMana) {
      const delta = user.mana_balance - displayMana;
      setAnimationDelta(delta);
      setIsAnimating(true);
      
      // Trigger visual effects
      setShowFloatingNumber(true);
      setShowGlow(true);
      setShowRipple(true);
      
      if (delta > 0) {
        setShowSparkles(true);
      }
      
      // Animate the counter
      const duration = 1000; // 1 second
      const steps = 30;
      const stepValue = delta / steps;
      let currentStep = 0;
      
      const interval = setInterval(() => {
        currentStep++;
        const newValue = displayMana + (stepValue * currentStep);
        
        if (currentStep >= steps) {
          setDisplayMana(user.mana_balance);
          setIsAnimating(false);
          setAnimationDelta(0);
          clearInterval(interval);
          onManaChange?.(user.mana_balance);
          
          // Stop effects
          setTimeout(() => {
            setShowGlow(false);
            setShowRipple(false);
            setShowSparkles(false);
          }, 500);
        } else {
          setDisplayMana(Math.round(newValue));
        }
      }, duration / steps);
      
      return () => clearInterval(interval);
    } else {
      setDisplayMana(user.mana_balance);
    }
  }, [user.mana_balance, showAnimation, displayMana, onManaChange]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-gray-100 dark:border-gray-700 backdrop-blur-sm relative overflow-hidden">
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-cyan-500/5 animate-pulse"></div>
      
      {/* Animation effects */}
      <ManaGlowEffect isActive={showGlow} intensity="medium" />
      <ManaSparkleEffect isActive={showSparkles} count={8} />
      <ManaRippleEffect isActive={showRipple} color={animationDelta > 0 ? 'green' : 'red'} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <span className="w-8 h-8 bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 rounded-lg flex items-center justify-center animate-pulse">
              <span className="text-white text-sm">✨</span>
            </span>
{MANA_TEXTS.mana}
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600">
            {user.name}
          </div>
        </div>

        {/* Main Mana Display */}
        <div className="text-center p-8 bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-purple-900/30 dark:via-blue-900/30 dark:to-cyan-900/30 rounded-2xl border-2 border-purple-100 dark:border-purple-700 hover:shadow-lg transition-all duration-300 relative">
          {/* Mana icon with glow effect */}
          <div className="text-6xl mb-4 relative">
            <span className="relative z-10">✨</span>
            <div className="absolute inset-0 text-6xl animate-ping opacity-20">✨</div>
          </div>
          
          {/* Mana amount with animation */}
          <div className={`text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2 transition-all duration-300 ${
            isAnimating ? 'scale-110' : 'scale-100'
          }`}>
            {displayMana.toLocaleString('ru-RU')}
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">{MANA_TEXTS.manaUnits}</div>
          
          {/* Floating number animation */}
          {showFloatingNumber && animationDelta !== 0 && (
            <ManaFloatingNumber
              type={animationDelta > 0 ? 'gain' : 'spend'}
              amount={Math.abs(animationDelta)}
              onComplete={() => setShowFloatingNumber(false)}
            />
          )}
        </div>

        {/* Mana info section */}
        <div className="mt-6 space-y-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <span className="font-medium">{MANA_TEXTS.mana}</span> — {MANA_TEXTS.interface.universalCurrency}
          </div>
          
          {/* Mana usage tips */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 text-center">
              <div className="font-medium text-purple-700 dark:text-purple-300">{MANA_TEXTS.priority}</div>
              <div className="text-purple-600 dark:text-purple-400">{MANA_TEXTS.interface.priorityCost}</div>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 text-center">
              <div className="font-medium text-blue-700 dark:text-blue-300">{MANA_TEXTS.aura}</div>
              <div className="text-blue-600 dark:text-blue-400">{MANA_TEXTS.interface.auraCost}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}