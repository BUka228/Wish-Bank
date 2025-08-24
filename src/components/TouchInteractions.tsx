'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface SwipeableTabsProps {
  children: ReactNode[];
  activeTab: number;
  onTabChange: (index: number) => void;
  tabLabels: string[];
}

export function SwipeableTabs({ children, activeTab, onTabChange, tabLabels }: SwipeableTabsProps) {
  const [startX, setStartX] = useState<number | null>(null);
  const [currentX, setCurrentX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startX || !isDragging) return;
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!startX || !currentX || !isDragging) {
      setStartX(null);
      setCurrentX(null);
      setIsDragging(false);
      return;
    }

    const diffX = startX - currentX;
    const threshold = 50; // Minimum swipe distance

    if (Math.abs(diffX) > threshold) {
      if (diffX > 0 && activeTab < children.length - 1) {
        // Swipe left - next tab
        onTabChange(activeTab + 1);
      } else if (diffX < 0 && activeTab > 0) {
        // Swipe right - previous tab
        onTabChange(activeTab - 1);
      }
    }

    setStartX(null);
    setCurrentX(null);
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!startX || !isDragging) return;
    setCurrentX(e.clientX);
  };

  const handleMouseUp = () => {
    if (!startX || !currentX || !isDragging) {
      setStartX(null);
      setCurrentX(null);
      setIsDragging(false);
      return;
    }

    const diffX = startX - currentX;
    const threshold = 50;

    if (Math.abs(diffX) > threshold) {
      if (diffX > 0 && activeTab < children.length - 1) {
        onTabChange(activeTab + 1);
      } else if (diffX < 0 && activeTab > 0) {
        onTabChange(activeTab - 1);
      }
    }

    setStartX(null);
    setCurrentX(null);
    setIsDragging(false);
  };

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="flex bg-white dark:bg-gray-800 rounded-t-2xl border-b border-gray-200 dark:border-gray-600 overflow-x-auto">
        {tabLabels.map((label, index) => (
          <button
            key={index}
            onClick={() => onTabChange(index)}
            className={`flex-1 min-w-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === index
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        ref={containerRef}
        className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-b-2xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(-${activeTab * 100}%)`,
            width: `${children.length * 100}%`
          }}
        >
          {children.map((child, index) => (
            <div key={index} className="w-full flex-shrink-0">
              {child}
            </div>
          ))}
        </div>

        {/* Swipe indicator */}
        {isDragging && startX && currentX && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {startX - currentX > 50 && activeTab < children.length - 1 && '→'}
            {currentX - startX > 50 && activeTab > 0 && '←'}
          </div>
        )}
      </div>

      {/* Tab indicators */}
      <div className="flex justify-center mt-4 space-x-2">
        {children.map((_, index) => (
          <button
            key={index}
            onClick={() => onTabChange(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              activeTab === index
                ? 'bg-purple-600 dark:bg-purple-400'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

interface TouchOptimizedButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  className?: string;
}

export function TouchOptimizedButton({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  className = ''
}: TouchOptimizedButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const baseClasses = 'font-medium rounded-xl transition-all duration-150 select-none';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 active:from-purple-700 active:to-blue-700',
    secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 active:bg-gray-400 dark:active:bg-gray-500',
    danger: 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 active:from-red-700 active:to-pink-700'
  };

  const sizeClasses = {
    small: 'px-3 py-2 text-sm min-h-[40px]',
    medium: 'px-4 py-3 text-base min-h-[48px]',
    large: 'px-6 py-4 text-lg min-h-[56px]'
  };

  const disabledClasses = 'opacity-50 cursor-not-allowed';
  const pressedClasses = 'scale-95 shadow-inner';

  const handleTouchStart = () => {
    if (!disabled) {
      setIsPressed(true);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    if (!disabled) {
      onClick();
    }
  };

  const handleMouseDown = () => {
    if (!disabled) {
      setIsPressed(true);
    }
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleClick = () => {
    if (!disabled) {
      onClick();
    }
  };

  return (
    <button
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? disabledClasses : ''}
        ${isPressed ? pressedClasses : 'shadow-lg hover:shadow-xl'}
        ${className}
      `}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

interface MobileOptimizedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
}

export function MobileOptimizedModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium'
}: MobileOptimizedModalProps) {
  const [startY, setStartY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startY) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!startY || !currentY) {
      setStartY(null);
      setCurrentY(null);
      return;
    }

    const diffY = currentY - startY;
    const threshold = 100;

    if (diffY > threshold) {
      onClose();
    }

    setStartY(null);
    setCurrentY(null);
  };

  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-md',
    large: 'max-w-2xl',
    fullscreen: 'w-full h-full max-w-none'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`
          relative bg-white dark:bg-gray-800 w-full mx-4 mb-0 sm:mb-4 rounded-t-2xl sm:rounded-2xl shadow-2xl
          ${sizeClasses[size]}
          ${size === 'fullscreen' ? 'h-full sm:h-auto max-h-[90vh]' : 'max-h-[90vh]'}
        `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag indicator for mobile */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}