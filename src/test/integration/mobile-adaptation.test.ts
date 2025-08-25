/**
 * Integration tests for mobile adaptation functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock mobile detection
const mockIsMobile = vi.fn();
const mockGetScreenSize = vi.fn();
const mockGetOrientation = vi.fn();

vi.mock('../../lib/mobile-detection', () => ({
  isMobile: mockIsMobile,
  getScreenSize: mockGetScreenSize,
  getOrientation: mockGetOrientation
}));

// Mock IntersectionObserver for virtualization
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock ResizeObserver for responsive components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

describe('Mobile Adaptation Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mobile setup
    mockIsMobile.mockReturnValue(true);
    mockGetScreenSize.mockReturnValue('sm');
    mockGetOrientation.mockReturnValue('portrait');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MobileOptimizedWishCard', () => {
    it('should render with touch-friendly dimensions on mobile', async () => {
      const mockWish = {
        id: 'wish-1',
        description: 'Test wish',
        category: 'general',
        mana_cost: 50,
        created_at: new Date(),
        user_id: 'user-1',
        status: 'active' as const
      };

      const { MobileOptimizedWishCard } = await import('../../components/wishes/MobileOptimizedWishCard');
      
      render(<MobileOptimizedWishCard wish={mockWish} />);

      const wishCard = screen.getByTestId('mobile-wish-card');
      expect(wishCard).toBeInTheDocument();
      
      // Check for touch-friendly minimum dimensions (44px)
      const styles = window.getComputedStyle(wishCard);
      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
    });

    it('should handle swipe gestures for navigation', async () => {
      const mockWish = {
        id: 'wish-1',
        description: 'Test wish',
        category: 'general',
        mana_cost: 50,
        created_at: new Date(),
        user_id: 'user-1',
        status: 'active' as const
      };

      const onSwipeLeft = vi.fn();
      const onSwipeRight = vi.fn();

      const { MobileOptimizedWishCard } = await import('../../components/wishes/MobileOptimizedWishCard');
      
      render(
        <MobileOptimizedWishCard 
          wish={mockWish} 
          onSwipeLeft={onSwipeLeft}
          onSwipeRight={onSwipeRight}
        />
      );

      const wishCard = screen.getByTestId('mobile-wish-card');
      
      // Simulate swipe left gesture
      fireEvent.touchStart(wishCard, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      fireEvent.touchMove(wishCard, {
        touches: [{ clientX: 50, clientY: 100 }]
      });
      fireEvent.touchEnd(wishCard, {
        changedTouches: [{ clientX: 50, clientY: 100 }]
      });

      await waitFor(() => {
        expect(onSwipeLeft).toHaveBeenCalled();
      });
    });

    it('should adapt layout for landscape orientation', async () => {
      mockGetOrientation.mockReturnValue('landscape');

      const mockWish = {
        id: 'wish-1',
        description: 'Test wish',
        category: 'general',
        mana_cost: 50,
        created_at: new Date(),
        user_id: 'user-1',
        status: 'active' as const
      };

      const { MobileOptimizedWishCard } = await import('../../components/wishes/MobileOptimizedWishCard');
      
      render(<MobileOptimizedWishCard wish={mockWish} />);

      const wishCard = screen.getByTestId('mobile-wish-card');
      expect(wishCard).toHaveClass('landscape-layout');
    });
  });

  describe('MobileOptimizedWishTabs', () => {
    it('should render swipeable tabs on mobile', async () => {
      const mockTabs = [
        { id: 'active', label: 'Active', count: 5 },
        { id: 'completed', label: 'Completed', count: 3 },
        { id: 'shared', label: 'Shared', count: 2 }
      ];

      const onTabChange = vi.fn();

      const { MobileOptimizedWishTabs } = await import('../../components/wishes/MobileOptimizedWishTabs');
      
      render(
        <MobileOptimizedWishTabs 
          tabs={mockTabs}
          activeTab="active"
          onTabChange={onTabChange}
        />
      );

      const tabContainer = screen.getByTestId('mobile-wish-tabs');
      expect(tabContainer).toBeInTheDocument();
      
      // Check that all tabs are rendered
      mockTabs.forEach(tab => {
        expect(screen.getByText(tab.label)).toBeInTheDocument();
        expect(screen.getByText(tab.count.toString())).toBeInTheDocument();
      });
    });

    it('should handle tab swipe navigation', async () => {
      const mockTabs = [
        { id: 'active', label: 'Active', count: 5 },
        { id: 'completed', label: 'Completed', count: 3 }
      ];

      const onTabChange = vi.fn();

      const { MobileOptimizedWishTabs } = await import('../../components/wishes/MobileOptimizedWishTabs');
      
      render(
        <MobileOptimizedWishTabs 
          tabs={mockTabs}
          activeTab="active"
          onTabChange={onTabChange}
        />
      );

      const tabContainer = screen.getByTestId('mobile-wish-tabs');
      
      // Simulate swipe to next tab
      fireEvent.touchStart(tabContainer, {
        touches: [{ clientX: 200, clientY: 50 }]
      });
      fireEvent.touchMove(tabContainer, {
        touches: [{ clientX: 100, clientY: 50 }]
      });
      fireEvent.touchEnd(tabContainer, {
        changedTouches: [{ clientX: 100, clientY: 50 }]
      });

      await waitFor(() => {
        expect(onTabChange).toHaveBeenCalledWith('completed');
      });
    });

    it('should show tab indicators for navigation', async () => {
      const mockTabs = [
        { id: 'active', label: 'Active', count: 5 },
        { id: 'completed', label: 'Completed', count: 3 },
        { id: 'shared', label: 'Shared', count: 2 }
      ];

      const { MobileOptimizedWishTabs } = await import('../../components/wishes/MobileOptimizedWishTabs');
      
      render(
        <MobileOptimizedWishTabs 
          tabs={mockTabs}
          activeTab="active"
          onTabChange={vi.fn()}
        />
      );

      const indicators = screen.getAllByTestId('tab-indicator');
      expect(indicators).toHaveLength(mockTabs.length);
      
      // First indicator should be active
      expect(indicators[0]).toHaveClass('active');
      expect(indicators[1]).not.toHaveClass('active');
      expect(indicators[2]).not.toHaveClass('active');
    });
  });

  describe('VirtualizedWishList', () => {
    it('should render only visible items for performance', async () => {
      const mockWishes = Array.from({ length: 100 }, (_, i) => ({
        id: `wish-${i}`,
        description: `Test wish ${i}`,
        category: 'general',
        mana_cost: 50,
        created_at: new Date(),
        user_id: 'user-1',
        status: 'active' as const
      }));

      const { VirtualizedWishList } = await import('../../components/wishes/VirtualizedWishList');
      
      render(
        <VirtualizedWishList 
          wishes={mockWishes}
          itemHeight={80}
          containerHeight={400}
        />
      );

      const listContainer = screen.getByTestId('virtualized-wish-list');
      expect(listContainer).toBeInTheDocument();
      
      // Should only render visible items (approximately 5-6 items for 400px container with 80px items)
      const renderedItems = screen.getAllByTestId(/^wish-item-/);
      expect(renderedItems.length).toBeLessThan(10);
      expect(renderedItems.length).toBeGreaterThan(0);
    });

    it('should handle scroll events and update visible items', async () => {
      const mockWishes = Array.from({ length: 50 }, (_, i) => ({
        id: `wish-${i}`,
        description: `Test wish ${i}`,
        category: 'general',
        mana_cost: 50,
        created_at: new Date(),
        user_id: 'user-1',
        status: 'active' as const
      }));

      const { VirtualizedWishList } = await import('../../components/wishes/VirtualizedWishList');
      
      render(
        <VirtualizedWishList 
          wishes={mockWishes}
          itemHeight={80}
          containerHeight={400}
        />
      );

      const listContainer = screen.getByTestId('virtualized-wish-list');
      
      // Simulate scroll
      fireEvent.scroll(listContainer, { target: { scrollTop: 240 } });

      await waitFor(() => {
        // Should render different items after scroll
        const renderedItems = screen.getAllByTestId(/^wish-item-/);
        expect(renderedItems.length).toBeGreaterThan(0);
      });
    });

    it('should support pull-to-refresh on mobile', async () => {
      const mockWishes = Array.from({ length: 10 }, (_, i) => ({
        id: `wish-${i}`,
        description: `Test wish ${i}`,
        category: 'general',
        mana_cost: 50,
        created_at: new Date(),
        user_id: 'user-1',
        status: 'active' as const
      }));

      const onRefresh = vi.fn();

      const { VirtualizedWishList } = await import('../../components/wishes/VirtualizedWishList');
      
      render(
        <VirtualizedWishList 
          wishes={mockWishes}
          itemHeight={80}
          containerHeight={400}
          onRefresh={onRefresh}
        />
      );

      const listContainer = screen.getByTestId('virtualized-wish-list');
      
      // Simulate pull-to-refresh gesture
      fireEvent.touchStart(listContainer, {
        touches: [{ clientX: 200, clientY: 100 }]
      });
      fireEvent.touchMove(listContainer, {
        touches: [{ clientX: 200, clientY: 200 }]
      });
      fireEvent.touchEnd(listContainer, {
        changedTouches: [{ clientX: 200, clientY: 200 }]
      });

      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('ResponsiveLayout', () => {
    it('should adapt layout for different screen sizes', async () => {
      const { ResponsiveLayout } = await import('../../components/ResponsiveLayout');
      
      // Test mobile layout
      mockGetScreenSize.mockReturnValue('xs');
      const { rerender } = render(
        <ResponsiveLayout>
          <div data-testid="content">Test content</div>
        </ResponsiveLayout>
      );

      let container = screen.getByTestId('responsive-layout');
      expect(container).toHaveClass('mobile-layout');

      // Test tablet layout
      mockGetScreenSize.mockReturnValue('md');
      rerender(
        <ResponsiveLayout>
          <div data-testid="content">Test content</div>
        </ResponsiveLayout>
      );

      container = screen.getByTestId('responsive-layout');
      expect(container).toHaveClass('tablet-layout');

      // Test desktop layout
      mockIsMobile.mockReturnValue(false);
      mockGetScreenSize.mockReturnValue('lg');
      rerender(
        <ResponsiveLayout>
          <div data-testid="content">Test content</div>
        </ResponsiveLayout>
      );

      container = screen.getByTestId('responsive-layout');
      expect(container).toHaveClass('desktop-layout');
    });

    it('should handle orientation changes', async () => {
      const onOrientationChange = vi.fn();

      const { ResponsiveLayout } = await import('../../components/ResponsiveLayout');
      
      render(
        <ResponsiveLayout onOrientationChange={onOrientationChange}>
          <div data-testid="content">Test content</div>
        </ResponsiveLayout>
      );

      // Simulate orientation change
      mockGetOrientation.mockReturnValue('landscape');
      
      // Trigger resize event to simulate orientation change
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        expect(onOrientationChange).toHaveBeenCalledWith('landscape');
      });
    });
  });

  describe('TouchInteractions', () => {
    it('should handle touch gestures correctly', async () => {
      const onTap = vi.fn();
      const onLongPress = vi.fn();
      const onSwipe = vi.fn();

      const { TouchInteractions } = await import('../../components/TouchInteractions');
      
      render(
        <TouchInteractions
          onTap={onTap}
          onLongPress={onLongPress}
          onSwipe={onSwipe}
        >
          <div data-testid="touch-area">Touch me</div>
        </TouchInteractions>
      );

      const touchArea = screen.getByTestId('touch-area');

      // Test tap gesture
      fireEvent.touchStart(touchArea, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      fireEvent.touchEnd(touchArea, {
        changedTouches: [{ clientX: 100, clientY: 100 }]
      });

      await waitFor(() => {
        expect(onTap).toHaveBeenCalled();
      });

      // Test long press gesture
      fireEvent.touchStart(touchArea, {
        touches: [{ clientX: 100, clientY: 100 }]
      });

      // Wait for long press duration
      await new Promise(resolve => setTimeout(resolve, 500));

      fireEvent.touchEnd(touchArea, {
        changedTouches: [{ clientX: 100, clientY: 100 }]
      });

      await waitFor(() => {
        expect(onLongPress).toHaveBeenCalled();
      });

      // Test swipe gesture
      fireEvent.touchStart(touchArea, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      fireEvent.touchMove(touchArea, {
        touches: [{ clientX: 200, clientY: 100 }]
      });
      fireEvent.touchEnd(touchArea, {
        changedTouches: [{ clientX: 200, clientY: 100 }]
      });

      await waitFor(() => {
        expect(onSwipe).toHaveBeenCalledWith('right');
      });
    });

    it('should provide haptic feedback on supported devices', async () => {
      // Mock haptic feedback API
      const mockVibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true
      });

      const onTap = vi.fn();

      const { TouchInteractions } = await import('../../components/TouchInteractions');
      
      render(
        <TouchInteractions
          onTap={onTap}
          enableHapticFeedback={true}
        >
          <div data-testid="touch-area">Touch me</div>
        </TouchInteractions>
      );

      const touchArea = screen.getByTestId('touch-area');

      // Test tap with haptic feedback
      fireEvent.touchStart(touchArea, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      fireEvent.touchEnd(touchArea, {
        changedTouches: [{ clientX: 100, clientY: 100 }]
      });

      await waitFor(() => {
        expect(onTap).toHaveBeenCalled();
        expect(mockVibrate).toHaveBeenCalledWith(10); // Light haptic feedback
      });
    });
  });

  describe('Performance Optimizations', () => {
    it('should lazy load images in mobile view', async () => {
      const { LazyLoadWrapper } = await import('../../components/LazyLoadWrapper');
      
      render(
        <LazyLoadWrapper>
          <img 
            src="test-image.jpg" 
            alt="Test image"
            data-testid="lazy-image"
          />
        </LazyLoadWrapper>
      );

      const image = screen.getByTestId('lazy-image');
      
      // Image should not be loaded initially
      expect(image).toHaveAttribute('src', '');
      
      // Simulate intersection (image coming into view)
      const mockIntersectionObserver = vi.mocked(global.IntersectionObserver);
      const mockObserve = mockIntersectionObserver.mock.results[0].value.observe;
      
      // Trigger intersection callback
      const callback = mockIntersectionObserver.mock.calls[0][0];
      callback([{ isIntersecting: true, target: image }], mockObserve);

      await waitFor(() => {
        expect(image).toHaveAttribute('src', 'test-image.jpg');
      });
    });

    it('should debounce scroll events for performance', async () => {
      const onScroll = vi.fn();

      const { VirtualizedWishList } = await import('../../components/wishes/VirtualizedWishList');
      
      render(
        <VirtualizedWishList 
          wishes={[]}
          itemHeight={80}
          containerHeight={400}
          onScroll={onScroll}
        />
      );

      const listContainer = screen.getByTestId('virtualized-wish-list');
      
      // Trigger multiple scroll events rapidly
      for (let i = 0; i < 10; i++) {
        fireEvent.scroll(listContainer, { target: { scrollTop: i * 10 } });
      }

      // Should debounce and only call once after delay
      await waitFor(() => {
        expect(onScroll).toHaveBeenCalledTimes(1);
      }, { timeout: 300 });
    });
  });
});