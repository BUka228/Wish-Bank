'use client';

import { useState, useEffect, useRef, ReactNode, Suspense } from 'react';

interface LazyLoadWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  once?: boolean;
  className?: string;
  minHeight?: number;
}

export default function LazyLoadWrapper({
  children,
  fallback = <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-32" />,
  rootMargin = '50px',
  threshold = 0.1,
  once = true,
  className = '',
  minHeight = 128
}: LazyLoadWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            setHasLoaded(true);
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [rootMargin, threshold, once]);

  const shouldRender = once ? hasLoaded || isVisible : isVisible;

  return (
    <div
      ref={elementRef}
      className={className}
      style={{ minHeight: shouldRender ? 'auto' : minHeight }}
    >
      {shouldRender ? (
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
}

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  className = '',
  width,
  height,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjYWFhIiBkeT0iLjNlbSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TG9hZGluZy4uLjwvdGV4dD48L3N2Zz4=',
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(img);
        }
      },
      {
        rootMargin: '50px'
      }
    );

    observer.observe(img);

    return () => {
      observer.unobserve(img);
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        ref={imgRef}
        src={isVisible ? src : placeholder}
        alt={alt}
        width={width}
        height={height}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
      />
      
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
          <div className="text-gray-400 text-sm">Загрузка...</div>
        </div>
      )}
      
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <div className="text-gray-500 text-sm text-center">
            <div className="text-2xl mb-2">📷</div>
            <div>Ошибка загрузки</div>
          </div>
        </div>
      )}
    </div>
  );
}

interface LazyComponentProps {
  loader: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: ReactNode;
  props?: any;
  errorFallback?: ReactNode;
}

export function LazyComponent({
  loader,
  fallback = <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-32" />,
  props = {},
  errorFallback = <div className="text-red-500 text-center p-4">Ошибка загрузки компонента</div>
}: LazyComponentProps) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    loader()
      .then((module) => {
        if (isMounted) {
          setComponent(() => module.default);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [loader]);

  if (error) {
    return <>{errorFallback}</>;
  }

  if (isLoading || !Component) {
    return <>{fallback}</>;
  }

  return <Component {...props} />;
}

// Hook for preloading components
export function usePreloadComponent(loader: () => Promise<{ default: React.ComponentType<any> }>) {
  useEffect(() => {
    // Preload on idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        loader().catch(() => {
          // Ignore preload errors
        });
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        loader().catch(() => {
          // Ignore preload errors
        });
      }, 100);
    }
  }, [loader]);
}