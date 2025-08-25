import { NextApiRequest, NextApiResponse } from 'next';
import React from 'react';
import { performanceMonitor } from './performance-monitor';
import { trackAPIError, trackDatabaseError } from './error-tracking';
import { cacheManager } from './cache-manager';
import { dbPerformance } from './db-pool';

export interface APIMiddlewareOptions {
  enablePerformanceTracking?: boolean;
  enableErrorTracking?: boolean;
  enableCaching?: boolean;
  cacheTTL?: number;
  slowQueryThreshold?: number;
  enableRateLimiting?: boolean;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

const defaultOptions: APIMiddlewareOptions = {
  enablePerformanceTracking: true,
  enableErrorTracking: true,
  enableCaching: false,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  slowQueryThreshold: 2000, // 2 seconds
  enableRateLimiting: false,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  }
};

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function withAPIMiddleware(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>,
  options: APIMiddlewareOptions = {}
) {
  const config = { ...defaultOptions, ...options };

  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();
    const endpoint = req.url || 'unknown';
    const method = req.method || 'GET';
    const userAgent = req.headers['user-agent'];
    const userId = extractUserId(req);
    const clientIP = getClientIP(req);

    try {
      // Rate limiting
      if (config.enableRateLimiting) {
        const rateLimitResult = checkRateLimit(clientIP, config.rateLimit!);
        if (!rateLimitResult.allowed) {
          const responseTime = Date.now() - startTime;
          
          if (config.enablePerformanceTracking) {
            performanceMonitor.recordAPIMetric(
              endpoint,
              method,
              429,
              responseTime,
              userId,
              userAgent,
              'Rate limit exceeded'
            );
          }

          if (config.enableErrorTracking) {
            trackAPIError(endpoint, method, 429, 'Rate limit exceeded', {
              userId,
              userAgent,
              url: endpoint,
              metadata: { clientIP, rateLimitInfo: rateLimitResult }
            });
          }

          return res.status(429).json({
            error: 'Too many requests',
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
          });
        }
      }

      // Check cache if enabled
      if (config.enableCaching && method === 'GET') {
        const cacheKey = generateCacheKey(req);
        const cachedResponse = cacheManager.get(cacheKey);
        
        if (cachedResponse) {
          const responseTime = Date.now() - startTime;
          
          if (config.enablePerformanceTracking) {
            performanceMonitor.recordAPIMetric(
              endpoint,
              method,
              200,
              responseTime,
              userId,
              userAgent
            );
            performanceMonitor.recordMetric('api_cache_hit', 1, 'count', { endpoint });
          }

          return res.status(200).json(cachedResponse);
        }
      }

      // Execute the handler
      const result = await handler(req, res);
      const responseTime = Date.now() - startTime;

      // Cache the response if enabled and successful
      if (config.enableCaching && method === 'GET' && res.statusCode === 200) {
        const cacheKey = generateCacheKey(req);
        // Note: In a real implementation, you'd need to capture the response data
        // This is a simplified example
        performanceMonitor.recordMetric('api_cache_miss', 1, 'count', { endpoint });
      }

      // Record performance metrics
      if (config.enablePerformanceTracking) {
        performanceMonitor.recordAPIMetric(
          endpoint,
          method,
          res.statusCode || 200,
          responseTime,
          userId,
          userAgent
        );

        // Alert on slow queries
        if (responseTime > config.slowQueryThreshold!) {
          performanceMonitor.recordMetric('slow_api_request', responseTime, 'ms', {
            endpoint,
            method,
            threshold: config.slowQueryThreshold!.toString()
          });
        }
      }

      return result;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const statusCode = error.statusCode || 500;

      // Record error metrics
      if (config.enablePerformanceTracking) {
        performanceMonitor.recordAPIMetric(
          endpoint,
          method,
          statusCode,
          responseTime,
          userId,
          userAgent,
          error.message
        );
      }

      // Track error
      if (config.enableErrorTracking) {
        trackAPIError(endpoint, method, statusCode, error, {
          userId,
          userAgent,
          url: endpoint,
          metadata: {
            clientIP,
            responseTime,
            requestBody: sanitizeRequestBody(req.body),
            query: req.query
          }
        });
      }

      // Return error response
      if (!res.headersSent) {
        return res.status(statusCode).json({
          error: error.message || 'Internal server error',
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
      }

      throw error;
    }
  };
}

// Database operation wrapper with monitoring
export function withDatabaseMonitoring<T>(
  operation: () => Promise<T>,
  queryName: string,
  query?: string
): Promise<T> {
  return dbPerformance.monitorQuery(queryName, async () => {
    try {
      return await operation();
    } catch (error: any) {
      if (query) {
        trackDatabaseError(query, error);
      }
      throw error;
    }
  });
}

// Component wrapper with error boundary and performance monitoring
export function withComponentMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  return (props: P) => {
    const startTime = React.useRef(performance.now());
    const [hasError, setHasError] = React.useState(false);

    React.useEffect(() => {
      const renderTime = performance.now() - startTime.current;
      const propsSize = JSON.stringify(props).length;
      
      performanceMonitor.recordComponentMetric(displayName, renderTime, propsSize);
    }, []);

    const handleError = React.useCallback((error: Error) => {
      setHasError(true);
      performanceMonitor.recordError(
        `Component Error: ${displayName} - ${error.message}`,
        error.stack,
        displayName,
        undefined,
        typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        typeof window !== 'undefined' ? window.location.href : undefined,
        'high'
      );
    }, []);

    if (hasError) {
      return React.createElement('div', {
        className: 'error-boundary p-4 border border-red-300 rounded bg-red-50'
      }, [
        React.createElement('h3', { key: 'title', className: 'text-red-800 font-medium' }, 'Something went wrong'),
        React.createElement('p', { key: 'message', className: 'text-red-600 text-sm mt-1' }, 
          'This component encountered an error. Please refresh the page.'),
        React.createElement('button', {
          key: 'retry',
          className: 'mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700',
          onClick: () => setHasError(false)
        }, 'Retry')
      ]);
    }

    try {
      return React.createElement(WrappedComponent, props);
    } catch (error: any) {
      handleError(error);
      return null;
    }
  };
}

// Utility functions
function extractUserId(req: NextApiRequest): string | undefined {
  // Try to extract user ID from various sources
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      // This would need actual JWT decoding logic
      const token = authHeader.replace('Bearer ', '');
      // Decode JWT and extract user ID
      return 'user-from-token';
    } catch {
      // Ignore token parsing errors
    }
  }

  // Try to get from cookies
  const userCookie = req.cookies.userId;
  if (userCookie) {
    return userCookie;
  }

  return undefined;
}

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.socket.remoteAddress;
  
  return ip || 'unknown';
}

function checkRateLimit(
  clientIP: string,
  rateLimit: { windowMs: number; maxRequests: number }
): { allowed: boolean; count: number; resetTime: number } {
  const now = Date.now();
  const key = `rate_limit_${clientIP}`;
  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetTime) {
    // New window or expired
    const resetTime = now + rateLimit.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, count: 1, resetTime };
  }

  // Increment count
  existing.count++;
  rateLimitStore.set(key, existing);

  return {
    allowed: existing.count <= rateLimit.maxRequests,
    count: existing.count,
    resetTime: existing.resetTime
  };
}

function generateCacheKey(req: NextApiRequest): string {
  const url = req.url || '';
  const query = JSON.stringify(req.query);
  const userId = extractUserId(req) || 'anonymous';
  
  return `api_${Buffer.from(`${url}_${query}_${userId}`).toString('base64')}`;
}

function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'authorization'];
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// Cleanup rate limit store periodically
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, value] of entries) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

export default withAPIMiddleware;