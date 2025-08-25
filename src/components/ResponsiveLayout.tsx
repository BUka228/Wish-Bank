'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useDeviceDetection } from '@/lib/mobile-detection';

interface ResponsiveLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function ResponsiveLayout({ children, className = '' }: ResponsiveLayoutProps) {
  const deviceInfo = useDeviceDetection();
  const { isMobile, isTablet, screenSize, orientation } = deviceInfo;
  
  // Layout classes based on device and orientation
  const getLayoutClasses = () => {
    const baseClasses = 'transition-all duration-300 ease-in-out';
    
    if (isMobile) {
      if (orientation === 'landscape') {
        return `${baseClasses} landscape-mobile px-2 py-1`;
      }
      return `${baseClasses} portrait-mobile px-3 py-2`;
    }
    
    if (isTablet) {
      if (orientation === 'landscape') {
        return `${baseClasses} landscape-tablet px-4 py-2 max-w-6xl mx-auto`;
      }
      return `${baseClasses} portrait-tablet px-4 py-3 max-w-2xl mx-auto`;
    }
    
    // Desktop
    return `${baseClasses} desktop px-6 py-4 max-w-4xl mx-auto`;
  };

  return (
    <div className={`${getLayoutClasses()} ${className}`}>
      {children}
    </div>
  );
}

interface OrientationAwareGridProps {
  children: ReactNode;
  className?: string;
  mobileColumns?: number;
  tabletColumns?: number;
  desktopColumns?: number;
}

export function OrientationAwareGrid({
  children,
  className = '',
  mobileColumns = 1,
  tabletColumns = 2,
  desktopColumns = 3
}: OrientationAwareGridProps) {
  const deviceInfo = useDeviceDetection();
  const { isMobile, isTablet, orientation } = deviceInfo;
  
  const getGridClasses = () => {
    let columns = desktopColumns;
    
    if (isMobile) {
      columns = orientation === 'landscape' ? Math.min(mobileColumns + 1, 2) : mobileColumns;
    } else if (isTablet) {
      columns = orientation === 'landscape' ? Math.min(tabletColumns + 1, 4) : tabletColumns;
    }
    
    return `grid grid-cols-${columns} gap-3 sm:gap-4 transition-all duration-300`;
  };

  return (
    <div className={`${getGridClasses()} ${className}`}>
      {children}
    </div>
  );
}

interface OrientationAwareHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
}

export function OrientationAwareHeader({
  title,
  subtitle,
  icon,
  className = ''
}: OrientationAwareHeaderProps) {
  const deviceInfo = useDeviceDetection();
  const { isMobile, orientation } = deviceInfo;
  
  const getHeaderClasses = () => {
    if (isMobile && orientation === 'landscape') {
      return 'text-center py-2';
    }
    
    if (isMobile) {
      return 'text-center py-4';
    }
    
    return 'text-center py-6';
  };
  
  const getTitleClasses = () => {
    if (isMobile && orientation === 'landscape') {
      return 'text-xl font-bold';
    }
    
    if (isMobile) {
      return 'text-2xl font-bold';
    }
    
    return 'text-3xl font-bold';
  };
  
  const getIconClasses = () => {
    if (isMobile && orientation === 'landscape') {
      return 'w-12 h-12 text-2xl';
    }
    
    if (isMobile) {
      return 'w-16 h-16 text-3xl';
    }
    
    return 'w-20 h-20 text-4xl';
  };

  return (
    <div className={`${getHeaderClasses()} ${className}`}>
      {icon && (
        <div className="mb-4">
          <div className={`inline-flex items-center justify-center ${getIconClasses()} bg-gradient-to-r from-pink-400 to-purple-400 rounded-full shadow-lg mb-4`}>
            {icon}
          </div>
        </div>
      )}
      <h1 className={`${getTitleClasses()} bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 bg-clip-text text-transparent mb-2`}>
        {title}
      </h1>
      {subtitle && (
        <p className={`text-gray-600 dark:text-gray-300 ${isMobile && orientation === 'landscape' ? 'text-xs px-4' : isMobile ? 'text-sm px-4' : 'text-sm'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

interface OrientationAwareTabsProps {
  children: ReactNode;
  className?: string;
}

export function OrientationAwareTabs({ children, className = '' }: OrientationAwareTabsProps) {
  const deviceInfo = useDeviceDetection();
  const { isMobile, orientation } = deviceInfo;
  
  const getTabsClasses = () => {
    if (isMobile && orientation === 'landscape') {
      return 'landscape-tabs';
    }
    
    return 'portrait-tabs';
  };

  return (
    <div className={`${getTabsClasses()} ${className}`}>
      {children}
    </div>
  );
}

// Hook for orientation-specific behavior
export function useOrientationAdaptation() {
  const deviceInfo = useDeviceDetection();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleOrientationChange = () => {
      setIsTransitioning(true);
      
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // End transition after animation completes
      timeoutId = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    };

    // Listen for orientation changes
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return {
    ...deviceInfo,
    isTransitioning,
    // Helper functions
    isLandscapeMobile: deviceInfo.isMobile && deviceInfo.orientation === 'landscape',
    isPortraitMobile: deviceInfo.isMobile && deviceInfo.orientation === 'portrait',
    isLandscapeTablet: deviceInfo.isTablet && deviceInfo.orientation === 'landscape',
    isPortraitTablet: deviceInfo.isTablet && deviceInfo.orientation === 'portrait'
  };
}