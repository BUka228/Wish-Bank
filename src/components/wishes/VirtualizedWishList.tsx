'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { EnhancedWish } from '@/types/quest-economy';
import { User } from '@/types/database';
import MobileOptimizedWishCard from './MobileOptimizedWishCard';

interface VirtualizedWishListProps {
  wishes: EnhancedWish[];
  currentUserId: string;
  currentUser?: User;
  onComplete?: (wishId: string) => void;
  onCancel?: (wishId: string) => void;
  onEnhancementUpdate?: () => void;
  isMobile?: boolean;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
}

export default function VirtualizedWishList({
  wishes,
  currentUserId,
  currentUser,
  onComplete,
  onCancel,
  onEnhancementUpdate,
  isMobile = false,
  itemHeight = isMobile ? 200 : 250, // Estimated height per item
  containerHeight = isMobile ? 400 : 600, // Container height
  overscan = 3 // Number of items to render outside visible area
}: VirtualizedWishListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const scrollElementRef = useRef<HTMLDivElement | null>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (!wishes.length) return { start: 0, end: 0 };

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(wishes.length, start + visibleCount + overscan * 2);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, wishes.length, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return wishes.slice(visibleRange.start, visibleRange.end).map((wish, index) => ({
      wish,
      index: visibleRange.start + index
    }));
  }, [wishes, visibleRange]);

  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!containerRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              observer.unobserve(img);
            }
          }
        });
      },
      {
        root: containerRef,
        rootMargin: '50px'
      }
    );

    // Observe all lazy images
    const lazyImages = containerRef.querySelectorAll('img[data-src]');
    lazyImages.forEach((img) => observer.observe(img));

    return () => observer.disconnect();
  }, [containerRef, visibleItems]);

  // Performance optimization: debounce scroll events
  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement) return;

    let ticking = false;

    const handleScrollOptimized = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (scrollElement) {
            setScrollTop(scrollElement.scrollTop);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    scrollElement.addEventListener('scroll', handleScrollOptimized, { passive: true });
    
    return () => {
      scrollElement.removeEventListener('scroll', handleScrollOptimized);
    };
  }, [containerRef]);

  // Empty state
  if (!wishes.length) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⭐</div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
          Желаний не найдено
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Здесь пока нет желаний для отображения
        </p>
      </div>
    );
  }

  // For small lists, render normally without virtualization
  if (wishes.length <= 10) {
    return (
      <div className="space-y-3">
        {wishes.map((wish) => (
          <MobileOptimizedWishCard
            key={wish.id}
            wish={wish}
            onComplete={onComplete}
            onCancel={onCancel}
            currentUserId={currentUserId}
            currentUser={currentUser}
            onEnhancementUpdate={onEnhancementUpdate}
            isMobile={isMobile}
          />
        ))}
      </div>
    );
  }

  const totalHeight = wishes.length * itemHeight;

  return (
    <div className="relative">
      {/* Scroll container */}
      <div
        ref={(el) => {
          setContainerRef(el);
          if (scrollElementRef.current !== el) {
            scrollElementRef.current = el;
          }
        }}
        className="overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* Total height spacer */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Visible items */}
          <div
            style={{
              transform: `translateY(${visibleRange.start * itemHeight}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0
            }}
          >
            {visibleItems.map(({ wish, index }) => (
              <div
                key={wish.id}
                style={{
                  height: itemHeight,
                  paddingBottom: isMobile ? '8px' : '12px'
                }}
                className="flex flex-col"
              >
                <div className="flex-1">
                  <MobileOptimizedWishCard
                    wish={wish}
                    onComplete={onComplete}
                    onCancel={onCancel}
                    currentUserId={currentUserId}
                    currentUser={currentUser}
                    onEnhancementUpdate={onEnhancementUpdate}
                    isMobile={isMobile}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      {wishes.length > 10 && (
        <div className="absolute right-2 top-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          {Math.floor((scrollTop / (totalHeight - containerHeight)) * 100) || 0}%
        </div>
      )}

      {/* Loading indicator for bottom */}
      {scrollTop > totalHeight - containerHeight - 100 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-xs">
          Конец списка
        </div>
      )}
    </div>
  );
}