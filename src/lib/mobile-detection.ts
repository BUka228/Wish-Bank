/**
 * Mobile detection utilities for responsive design
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  orientation: 'portrait' | 'landscape';
  touchSupported: boolean;
  userAgent: string;
}

/**
 * Detect if the current device is mobile based on user agent
 */
export function isMobileDevice(userAgent?: string): boolean {
  if (typeof window === 'undefined' && !userAgent) {
    return false;
  }
  
  const ua = userAgent || (typeof window !== 'undefined' ? window.navigator.userAgent : '');
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

/**
 * Detect if the current device is a tablet
 */
export function isTabletDevice(userAgent?: string): boolean {
  if (typeof window === 'undefined' && !userAgent) {
    return false;
  }
  
  const ua = userAgent || (typeof window !== 'undefined' ? window.navigator.userAgent : '');
  
  return /iPad|Android(?!.*Mobile)/i.test(ua);
}

/**
 * Get screen size category based on window width
 */
export function getScreenSize(): 'xs' | 'sm' | 'md' | 'lg' | 'xl' {
  if (typeof window === 'undefined') {
    return 'md';
  }
  
  const width = window.innerWidth;
  
  if (width < 640) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  return 'xl';
}

/**
 * Get screen orientation
 */
export function getOrientation(): 'portrait' | 'landscape' {
  if (typeof window === 'undefined') {
    return 'portrait';
  }
  
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

/**
 * Check if touch is supported
 */
export function isTouchSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get comprehensive device information
 */
export function getDeviceInfo(userAgent?: string): DeviceInfo {
  const isMobile = isMobileDevice(userAgent);
  const isTablet = isTabletDevice(userAgent);
  
  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    screenSize: getScreenSize(),
    orientation: getOrientation(),
    touchSupported: isTouchSupported(),
    userAgent: userAgent || (typeof window !== 'undefined' ? window.navigator.userAgent : '')
  };
}

/**
 * React hook for device detection with responsive updates
 */
export function useDeviceDetection() {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      screenSize: 'md' as const,
      orientation: 'portrait' as const,
      touchSupported: false,
      userAgent: ''
    };
  }

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => getDeviceInfo());

  useEffect(() => {
    const updateDeviceInfo = () => {
      setDeviceInfo(getDeviceInfo());
    };

    // Listen for resize and orientation changes
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

/**
 * CSS breakpoints that match Tailwind CSS defaults
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const;

/**
 * Check if current screen width matches a breakpoint
 */
export function matchesBreakpoint(breakpoint: keyof typeof BREAKPOINTS): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return window.innerWidth >= BREAKPOINTS[breakpoint];
}

/**
 * Get optimal touch target size based on device
 */
export function getTouchTargetSize(deviceInfo: DeviceInfo): number {
  // Apple Human Interface Guidelines recommend 44pt minimum
  // Android Material Design recommends 48dp minimum
  // We use 48px as a safe default for all devices
  
  if (deviceInfo.isMobile) {
    return 48; // 48px minimum for mobile
  }
  
  if (deviceInfo.isTablet) {
    return 44; // 44px for tablets
  }
  
  return 40; // 40px for desktop (can be smaller since mouse is more precise)
}

/**
 * Detect if device supports hover interactions
 */
export function supportsHover(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return window.matchMedia('(hover: hover)').matches;
}

/**
 * Detect if device prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Import useState and useEffect for the hook
import { useState, useEffect } from 'react';