'use client';

import { useEffect, useState } from 'react';

interface ManaAnimationProps {
  type: 'gain' | 'spend' | 'transfer';
  amount: number;
  onComplete?: () => void;
}

export function ManaFloatingNumber({ type, amount, onComplete }: ManaAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  const getColorClass = () => {
    switch (type) {
      case 'gain': return 'text-green-500';
      case 'spend': return 'text-red-500';
      case 'transfer': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'gain': return '↗️';
      case 'spend': return '↘️';
      case 'transfer': return '↔️';
      default: return '✨';
    }
  };

  return (
    <div className={`absolute top-0 right-0 ${getColorClass()} font-bold text-lg animate-bounce z-50 pointer-events-none`}>
      <div className="flex items-center gap-1 bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-lg border">
        <span>{getIcon()}</span>
        <span>{type === 'gain' ? '+' : type === 'spend' ? '-' : ''}{amount}</span>
      </div>
    </div>
  );
}

interface ManaGlowEffectProps {
  isActive: boolean;
  intensity?: 'low' | 'medium' | 'high';
}

export function ManaGlowEffect({ isActive, intensity = 'medium' }: ManaGlowEffectProps) {
  if (!isActive) return null;

  const getGlowClass = () => {
    switch (intensity) {
      case 'low': return 'animate-pulse opacity-30';
      case 'medium': return 'animate-pulse opacity-50';
      case 'high': return 'animate-pulse opacity-70';
      default: return 'animate-pulse opacity-50';
    }
  };

  return (
    <div className={`absolute inset-0 bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 rounded-2xl blur-sm ${getGlowClass()} pointer-events-none`} />
  );
}

interface ManaSparkleEffectProps {
  isActive: boolean;
  count?: number;
}

export function ManaSparkleEffect({ isActive, count = 5 }: ManaSparkleEffectProps) {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    if (isActive) {
      const newSparkles = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2
      }));
      setSparkles(newSparkles);

      const timer = setTimeout(() => {
        setSparkles([]);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isActive, count]);

  if (!isActive || sparkles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute text-yellow-400 animate-ping"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            animationDelay: `${sparkle.delay}s`,
            animationDuration: '1.5s'
          }}
        >
          ✨
        </div>
      ))}
    </div>
  );
}

interface ManaRippleEffectProps {
  isActive: boolean;
  color?: 'purple' | 'blue' | 'green' | 'red';
}

export function ManaRippleEffect({ isActive, color = 'purple' }: ManaRippleEffectProps) {
  if (!isActive) return null;

  const getColorClass = () => {
    switch (color) {
      case 'purple': return 'border-purple-400';
      case 'blue': return 'border-blue-400';
      case 'green': return 'border-green-400';
      case 'red': return 'border-red-400';
      default: return 'border-purple-400';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className={`absolute inset-0 rounded-2xl border-2 ${getColorClass()} animate-ping opacity-75`} />
      <div className={`absolute inset-2 rounded-2xl border-2 ${getColorClass()} animate-ping opacity-50`} style={{ animationDelay: '0.2s' }} />
      <div className={`absolute inset-4 rounded-2xl border-2 ${getColorClass()} animate-ping opacity-25`} style={{ animationDelay: '0.4s' }} />
    </div>
  );
}