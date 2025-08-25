'use client';

import { useState, useEffect } from 'react';
import { EnhancedWish, WishFilter as WishFilterType } from '@/types/quest-economy';
import { User } from '@/types/database';
import MobileOptimizedWishCard from './MobileOptimizedWishCard';
import VirtualizedWishList from './VirtualizedWishList';
import WishFilter from './WishFilter';
import { SwipeableTabs } from '../TouchInteractions';
import { useDeviceDetection } from '@/lib/mobile-detection';
import { useOrientationAdaptation, OrientationAwareGrid } from '../ResponsiveLayout';
import LazyLoadWrapper from '../LazyLoadWrapper';
import { getOptimalAnimationConfig, performanceMonitor } from '@/lib/mobile-animations';

interface MobileOptimizedWishTabsProps {
  currentUserId: string;
  currentUser?: User;
  wishes: {
    my: EnhancedWish[];
    assigned: EnhancedWish[];
    shared: EnhancedWish[];
  };
  onWishUpdate: () => void;
}

type TabType = 'my' | 'assigned' | 'shared';

export default function MobileOptimizedWishTabs({ 
  currentUserId, 
  currentUser, 
  wishes, 
  onWishUpdate 
}: MobileOptimizedWishTabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [filteredWishes, setFilteredWishes] = useState<{
    my: EnhancedWish[];
    assigned: EnhancedWish[];
    shared: EnhancedWish[];
  }>({ my: [], assigned: [], shared: [] });
  const [filter, setFilter] = useState<WishFilterType>({});
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const deviceInfo = useDeviceDetection();
  const { isMobile, isTablet, screenSize, orientation } = deviceInfo;
  const orientationInfo = useOrientationAdaptation();
  const { isLandscapeMobile, isPortraitMobile, isTransitioning } = orientationInfo;
  const animationConfig = getOptimalAnimationConfig();

  const tabTypes: TabType[] = ['my', 'assigned', 'shared'];
  const currentTabType = tabTypes[activeTab];

  // Filter wishes for each tab
  const filterWishesForTab = (tabWishes: EnhancedWish[]) => {
    let filtered = [...tabWishes];

    // Apply filters
    if (filter.status) {
      filtered = filtered.filter(w => w.status === filter.status);
    }
    if (filter.category) {
      filtered = filtered.filter(w => w.category === filter.category);
    }
    if (filter.type) {
      filtered = filtered.filter(w => w.type === filter.type);
    }
    if (filter.is_shared !== undefined) {
      filtered = filtered.filter(w => w.is_shared === filter.is_shared);
    }
    if (filter.is_gift !== undefined) {
      filtered = filtered.filter(w => w.is_gift === filter.is_gift);
    }
    if (filter.is_historical !== undefined) {
      filtered = filtered.filter(w => w.is_historical === filter.is_historical);
    }
    if (filter.priority) {
      filtered = filtered.filter(w => w.priority === filter.priority);
    }

    // Sort: active first, then by priority and date
    filtered.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return filtered;
  };

  // Apply filters when wishes or filter changes
  useEffect(() => {
    setFilteredWishes({
      my: filterWishesForTab(wishes.my),
      assigned: filterWishesForTab(wishes.assigned),
      shared: filterWishesForTab(wishes.shared)
    });
  }, [wishes, filter]);

  // Action handlers with performance monitoring
  const handleCompleteWish = async (wishId: string) => {
    const endTiming = performanceMonitor.startTiming('wish-complete');
    
    try {
      const response = await fetch(`/api/wishes/${wishId}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Ошибка выполнения желания');
      }

      onWishUpdate();
      
      // Show success feedback on mobile
      if (isMobile && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка выполнения желания');
    } finally {
      endTiming();
    }
  };

  const handleCancelWish = async (wishId: string) => {
    const endTiming = performanceMonitor.startTiming('wish-cancel');
    
    try {
      const response = await fetch(`/api/wishes/${wishId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Ошибка отмены желания');
      }

      onWishUpdate();
      
      // Show feedback on mobile
      if (isMobile && navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отмены желания');
    } finally {
      endTiming();
    }
  };

  // Statistics for tabs
  const stats = {
    my: wishes.my.length,
    assigned: wishes.assigned.length,
    shared: wishes.shared.length
  };

  const tabLabels = [
    `Мои (${stats.my})`,
    `Для меня (${stats.assigned})`,
    `Общие (${stats.shared})`
  ];

  const tabConfig = [
    {
      label: 'Мои желания',
      emoji: '⚡',
      description: 'Желания, которые я создал'
    },
    {
      label: 'Для меня',
      emoji: '🎯',
      description: 'Желания, назначенные мне'
    },
    {
      label: 'Общие',
      emoji: '🤝',
      description: 'Наши общие желания'
    }
  ];

  const renderTabContent = (tabIndex: number) => {
    const tabType = tabTypes[tabIndex];
    const tabWishes = filteredWishes[tabType];
    const config = tabConfig[tabIndex];

    return (
      <div className={`${isLandscapeMobile ? 'p-2' : isMobile ? 'p-3' : 'p-4'} space-y-3 sm:space-y-4 ${isTransitioning ? 'opacity-75' : 'opacity-100'} transition-opacity duration-300`}>
        {/* Tab description - orientation aware */}
        {!isLandscapeMobile && (
          <div className={`bg-gray-50 dark:bg-gray-700/50 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-gray-200 dark:border-gray-600`}>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
              <span className="font-semibold">{config.label}:</span> {config.description}
            </p>
          </div>
        )}

        {/* Wishes list with orientation-aware layout */}
        {tabWishes.length === 0 ? (
          <div className={`text-center ${isLandscapeMobile ? 'py-4' : 'py-8 sm:py-12'}`}>
            <div className={`${isLandscapeMobile ? 'text-3xl' : isMobile ? 'text-4xl' : 'text-6xl'} mb-4`}>{config.emoji}</div>
            <h3 className={`${isLandscapeMobile ? 'text-base' : isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-800 dark:text-gray-200 mb-2`}>
              Желаний не найдено
            </h3>
            <p className={`text-gray-600 dark:text-gray-400 mb-6 ${isLandscapeMobile ? 'text-xs px-2' : isMobile ? 'text-sm px-4' : ''}`}>
              {tabType === 'my' 
                ? 'Вы еще не создали ни одного желания'
                : tabType === 'assigned'
                ? 'Вам еще не назначили ни одного желания'
                : 'У вас пока нет общих желаний'
              }
            </p>
          </div>
        ) : (
          <LazyLoadWrapper
            fallback={
              <div className={isLandscapeMobile ? 'grid grid-cols-2 gap-2' : 'space-y-3'}>
                {Array.from({ length: isLandscapeMobile ? 4 : 3 }).map((_, i) => (
                  <div key={i} className={`mobile-skeleton ${isLandscapeMobile ? 'h-24' : 'h-32'} rounded-lg`} />
                ))}
              </div>
            }
            minHeight={200}
          >
            {tabWishes.length > 15 && isMobile && !isLandscapeMobile ? (
              // Use virtualization for long lists on mobile portrait
              <VirtualizedWishList
                wishes={tabWishes}
                currentUserId={currentUserId}
                currentUser={currentUser}
                onComplete={handleCompleteWish}
                onCancel={handleCancelWish}
                onEnhancementUpdate={onWishUpdate}
                isMobile={isMobile}
                containerHeight={400}
                itemHeight={160}
              />
            ) : isLandscapeMobile ? (
              // Grid layout for landscape mobile
              <OrientationAwareGrid
                mobileColumns={2}
                tabletColumns={3}
                desktopColumns={4}
                className="gap-2"
              >
                {tabWishes.map((wish) => (
                  <LazyLoadWrapper
                    key={wish.id}
                    fallback={<div className="mobile-skeleton h-24 rounded-lg" />}
                    rootMargin="50px"
                    once={true}
                  >
                    <MobileOptimizedWishCard
                      wish={wish}
                      onComplete={handleCompleteWish}
                      onCancel={handleCancelWish}
                      currentUserId={currentUserId}
                      currentUser={currentUser}
                      onEnhancementUpdate={onWishUpdate}
                      isMobile={isMobile}
                    />
                  </LazyLoadWrapper>
                ))}
              </OrientationAwareGrid>
            ) : (
              // Regular rendering for portrait and larger screens
              <div className={`space-y-3 ${isMobile ? 'space-y-2' : 'space-y-3'}`}>
                {tabWishes.map((wish) => (
                  <LazyLoadWrapper
                    key={wish.id}
                    fallback={<div className="mobile-skeleton h-32 rounded-lg" />}
                    rootMargin="100px"
                    once={true}
                  >
                    <MobileOptimizedWishCard
                      wish={wish}
                      onComplete={handleCompleteWish}
                      onCancel={handleCancelWish}
                      currentUserId={currentUserId}
                      currentUser={currentUser}
                      onEnhancementUpdate={onWishUpdate}
                      isMobile={isMobile}
                    />
                  </LazyLoadWrapper>
                ))}
              </div>
            )}
          </LazyLoadWrapper>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">❌</span>
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-200">Ошибка</h3>
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        </div>
        <button
          onClick={onWishUpdate}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors min-h-[44px]"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 sm:space-y-6 ${isTransitioning ? 'pointer-events-none' : ''}`}>
      {/* Header - compact in landscape */}
      {!isLandscapeMobile && (
        <div className="text-center">
          <h1 className={`${isMobile ? 'text-xl' : 'text-2xl sm:text-3xl'} font-bold text-gray-800 dark:text-gray-200 mb-2`}>
            💫 Управление желаниями
          </h1>
          <p className={`text-gray-600 dark:text-gray-400 ${isMobile ? 'text-xs px-4' : 'text-sm'}`}>
            {isMobile ? 'Свайпайте для переключения вкладок' : 'Свайпайте влево/вправо для переключения между вкладками'}
          </p>
        </div>
      )}

      {/* Device info debug (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 text-center">
          {screenSize} | {orientation} | {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'} | {isTransitioning ? 'Transitioning' : 'Stable'}
        </div>
      )}

      {/* Filter toggle for mobile */}
      {isMobile && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium min-h-[44px]"
          >
            <span>🔍</span>
            {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
          </button>
        </div>
      )}

      {/* Filters - collapsible on mobile */}
      <div className={`${isMobile && !showFilters ? 'hidden' : 'block'}`}>
        <WishFilter
          filter={filter}
          onFilterChange={setFilter}
          showSharedFilters={currentTabType === 'shared'}
        />
      </div>

      {/* Swipeable Tabs with responsive styling */}
      <div className={`${isMobile ? 'mx-0' : 'mx-auto max-w-4xl'}`}>
        <SwipeableTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabLabels={tabLabels}
        >
          {tabTypes.map((_, index) => renderTabContent(index))}
        </SwipeableTabs>
      </div>

      {/* Mobile-specific quick actions */}
      {isMobile && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-12 h-12 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-purple-700 transition-colors"
          >
            ↑
          </button>
        </div>
      )}
    </div>
  );
}