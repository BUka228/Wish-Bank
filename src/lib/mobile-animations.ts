/**
 * Mobile-optimized animations and performance utilities
 */

// Check if user prefers reduced motion
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Check if device has limited performance
export function isLowPerformanceDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  // Check for low-end device indicators
  const connection = (navigator as any).connection;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemory = (navigator as any).deviceMemory || 4;
  
  // Consider device low-performance if:
  // - Less than 4 CPU cores
  // - Less than 2GB RAM
  // - Slow network connection
  const isLowCPU = hardwareConcurrency < 4;
  const isLowRAM = deviceMemory < 2;
  const isSlowNetwork = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
  
  return isLowCPU || isLowRAM || isSlowNetwork;
}

// Animation configuration based on device capabilities
export interface AnimationConfig {
  duration: number;
  easing: string;
  enabled: boolean;
  useTransform: boolean;
  useOpacity: boolean;
}

export function getOptimalAnimationConfig(): AnimationConfig {
  const reducedMotion = prefersReducedMotion();
  const lowPerformance = isLowPerformanceDevice();
  
  if (reducedMotion) {
    return {
      duration: 0,
      easing: 'linear',
      enabled: false,
      useTransform: false,
      useOpacity: false
    };
  }
  
  if (lowPerformance) {
    return {
      duration: 150,
      easing: 'ease-out',
      enabled: true,
      useTransform: true,
      useOpacity: false // Opacity animations can be expensive
    };
  }
  
  return {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    enabled: true,
    useTransform: true,
    useOpacity: true
  };
}

// CSS class generator for optimized animations
export function getAnimationClasses(type: 'fade' | 'slide' | 'scale' | 'bounce'): string {
  const config = getOptimalAnimationConfig();
  
  if (!config.enabled) {
    return '';
  }
  
  const baseClasses = 'transition-all';
  const durationClass = `duration-${config.duration}`;
  
  switch (type) {
    case 'fade':
      return config.useOpacity 
        ? `${baseClasses} ${durationClass} ease-out opacity-0 hover:opacity-100`
        : '';
    
    case 'slide':
      return config.useTransform
        ? `${baseClasses} ${durationClass} ease-out transform translate-x-0 hover:translate-x-1`
        : '';
    
    case 'scale':
      return config.useTransform
        ? `${baseClasses} ${durationClass} ease-out transform scale-100 hover:scale-105 active:scale-95`
        : '';
    
    case 'bounce':
      return config.useTransform && !isLowPerformanceDevice()
        ? `${baseClasses} ${durationClass} ease-out transform hover:animate-bounce`
        : '';
    
    default:
      return baseClasses;
  }
}

// Performance-optimized scroll handler
export function createOptimizedScrollHandler(callback: (scrollTop: number) => void) {
  let ticking = false;
  
  return (event: Event) => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const target = event.target as HTMLElement;
        callback(target.scrollTop);
        ticking = false;
      });
      ticking = true;
    }
  };
}

// Debounced resize handler
export function createOptimizedResizeHandler(callback: () => void, delay: number = 100) {
  let timeoutId: NodeJS.Timeout;
  
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
  };
}

// Touch gesture utilities
export interface TouchGesture {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
}

export function createTouchGestureHandler(
  onSwipe?: (gesture: TouchGesture) => void,
  onTap?: (x: number, y: number) => void,
  threshold: number = 50
) {
  let startTouch: Touch | null = null;
  let startTime: number = 0;
  
  const handleTouchStart = (e: TouchEvent) => {
    startTouch = e.touches[0];
    startTime = Date.now();
  };
  
  const handleTouchEnd = (e: TouchEvent) => {
    if (!startTouch) return;
    
    const endTouch = e.changedTouches[0];
    const deltaX = endTouch.clientX - startTouch.clientX;
    const deltaY = endTouch.clientY - startTouch.clientY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = Date.now() - startTime;
    
    // Determine if it's a tap or swipe
    if (distance < 10 && duration < 300) {
      // It's a tap
      onTap?.(endTouch.clientX, endTouch.clientY);
    } else if (distance > threshold) {
      // It's a swipe
      let direction: TouchGesture['direction'] = null;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }
      
      const gesture: TouchGesture = {
        startX: startTouch.clientX,
        startY: startTouch.clientY,
        currentX: endTouch.clientX,
        currentY: endTouch.clientY,
        deltaX,
        deltaY,
        direction,
        distance
      };
      
      onSwipe?.(gesture);
    }
    
    startTouch = null;
  };
  
  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd
  };
}

// Intersection Observer utilities for performance
export function createOptimizedIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  const defaultOptions: IntersectionObserverInit = {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };
  
  return new IntersectionObserver(callback, defaultOptions);
}

// Memory management utilities
export function cleanupUnusedElements(container: HTMLElement) {
  // Remove elements that are far from viewport
  const rect = container.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const cleanupThreshold = viewportHeight * 3; // 3 viewport heights
  
  const children = Array.from(container.children) as HTMLElement[];
  
  children.forEach((child) => {
    const childRect = child.getBoundingClientRect();
    const distanceFromViewport = Math.abs(childRect.top - rect.top);
    
    if (distanceFromViewport > cleanupThreshold) {
      // Mark for cleanup but don't remove immediately
      child.style.display = 'none';
    } else if (child.style.display === 'none') {
      // Restore if back in range
      child.style.display = '';
    }
  });
}

// Performance monitoring
export class MobilePerformanceMonitor {
  private metrics: { [key: string]: number[] } = {};
  
  startTiming(label: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      
      if (!this.metrics[label]) {
        this.metrics[label] = [];
      }
      
      this.metrics[label].push(duration);
      
      // Keep only last 100 measurements
      if (this.metrics[label].length > 100) {
        this.metrics[label] = this.metrics[label].slice(-100);
      }
      
      // Log slow operations in development
      if (process.env.NODE_ENV === 'development' && duration > 16) {
        console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
      }
    };
  }
  
  getAverageTime(label: string): number {
    const times = this.metrics[label];
    if (!times || times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }
  
  getMetrics(): { [key: string]: { average: number; count: number; max: number } } {
    const result: { [key: string]: { average: number; count: number; max: number } } = {};
    
    Object.keys(this.metrics).forEach((label) => {
      const times = this.metrics[label];
      result[label] = {
        average: this.getAverageTime(label),
        count: times.length,
        max: Math.max(...times)
      };
    });
    
    return result;
  }
  
  reset(): void {
    this.metrics = {};
  }
}

// Global performance monitor instance
export const performanceMonitor = new MobilePerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor(label: string) {
  const startTiming = () => performanceMonitor.startTiming(label);
  const getMetrics = () => performanceMonitor.getMetrics();
  
  return { startTiming, getMetrics };
}