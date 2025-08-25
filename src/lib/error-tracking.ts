import { performanceMonitor } from './performance-monitor';

export interface ErrorContext {
  userId?: string;
  userAgent?: string;
  url?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: ErrorContext;
  fingerprint: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: Map<string, ErrorReport> = new Map();
  private maxErrors = 1000;

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  constructor() {
    // Set up global error handlers
    this.setupGlobalHandlers();
  }

  // Track an error
  trackError(
    error: Error | string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    context: ErrorContext = {}
  ): string {
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? undefined : error.stack;
    const fingerprint = this.generateFingerprint(message, stack, context);
    
    const now = new Date();
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if we've seen this error before
    const existingError = this.errors.get(fingerprint);
    
    if (existingError) {
      // Update existing error
      existingError.count++;
      existingError.lastSeen = now;
      existingError.severity = this.getHigherSeverity(existingError.severity, severity);
    } else {
      // Create new error report
      const errorReport: ErrorReport = {
        id: errorId,
        message,
        stack,
        timestamp: now,
        severity,
        context,
        fingerprint,
        count: 1,
        firstSeen: now,
        lastSeen: now
      };
      
      this.errors.set(fingerprint, errorReport);
      
      // Trim errors if we exceed max
      if (this.errors.size > this.maxErrors) {
        this.trimOldErrors();
      }
    }

    // Record in performance monitor
    performanceMonitor.recordError(
      message,
      stack,
      context.component,
      context.userId,
      context.userAgent,
      context.url,
      severity
    );

    // Log to console based on severity
    this.logError(message, severity, context, stack);

    // Send to external services if configured
    this.sendToExternalServices(message, severity, context, stack);

    return errorId;
  }

  // Track API errors
  trackAPIError(
    endpoint: string,
    method: string,
    statusCode: number,
    error: Error | string,
    context: ErrorContext = {}
  ): string {
    const severity = this.getAPISeverity(statusCode);
    const enhancedContext = {
      ...context,
      action: `${method} ${endpoint}`,
      metadata: {
        ...context.metadata,
        statusCode,
        endpoint,
        method
      }
    };

    return this.trackError(error, severity, enhancedContext);
  }

  // Track component errors
  trackComponentError(
    componentName: string,
    error: Error | string,
    props?: any,
    context: ErrorContext = {}
  ): string {
    const enhancedContext = {
      ...context,
      component: componentName,
      metadata: {
        ...context.metadata,
        props: props ? this.sanitizeProps(props) : undefined
      }
    };

    return this.trackError(error, 'high', enhancedContext);
  }

  // Track database errors
  trackDatabaseError(
    query: string,
    error: Error | string,
    context: ErrorContext = {}
  ): string {
    const enhancedContext = {
      ...context,
      action: 'database_query',
      metadata: {
        ...context.metadata,
        query: query.substring(0, 200) // Truncate long queries
      }
    };

    return this.trackError(error, 'high', enhancedContext);
  }

  // Get error statistics
  getErrorStats(timeRangeHours: number = 24): {
    totalErrors: number;
    uniqueErrors: number;
    errorsBySeverity: Record<string, number>;
    topErrors: ErrorReport[];
    errorTrends: Array<{ hour: number; count: number }>;
  } {
    const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recentErrors = Array.from(this.errors.values())
      .filter(error => error.lastSeen > cutoff);

    const errorsBySeverity = recentErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + error.count;
      return acc;
    }, {} as Record<string, number>);

    const topErrors = recentErrors
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate hourly trends
    const errorTrends = this.calculateErrorTrends(recentErrors, timeRangeHours);

    return {
      totalErrors: recentErrors.reduce((sum, error) => sum + error.count, 0),
      uniqueErrors: recentErrors.length,
      errorsBySeverity,
      topErrors,
      errorTrends
    };
  }

  // Get errors by component
  getErrorsByComponent(timeRangeHours: number = 24): Record<string, number> {
    const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recentErrors = Array.from(this.errors.values())
      .filter(error => error.lastSeen > cutoff);

    return recentErrors.reduce((acc, error) => {
      const component = error.context.component || 'unknown';
      acc[component] = (acc[component] || 0) + error.count;
      return acc;
    }, {} as Record<string, number>);
  }

  // Get errors by user
  getErrorsByUser(timeRangeHours: number = 24): Record<string, number> {
    const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recentErrors = Array.from(this.errors.values())
      .filter(error => error.lastSeen > cutoff && error.context.userId);

    return recentErrors.reduce((acc, error) => {
      const userId = error.context.userId!;
      acc[userId] = (acc[userId] || 0) + error.count;
      return acc;
    }, {} as Record<string, number>);
  }

  // Clear old errors
  clearOldErrors(olderThanHours: number = 168): number { // Default 7 days
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let cleared = 0;

    const entries = Array.from(this.errors.entries());
    for (const [fingerprint, error] of entries) {
      if (error.lastSeen < cutoff) {
        this.errors.delete(fingerprint);
        cleared++;
      }
    }

    return cleared;
  }

  // Export errors for analysis
  exportErrors(format: 'json' | 'csv' = 'json'): string {
    const errors = Array.from(this.errors.values());
    
    if (format === 'csv') {
      const headers = ['id', 'message', 'severity', 'count', 'component', 'firstSeen', 'lastSeen'];
      const rows = errors.map(error => [
        error.id,
        error.message.replace(/"/g, '""'),
        error.severity,
        error.count,
        error.context.component || '',
        error.firstSeen.toISOString(),
        error.lastSeen.toISOString()
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(errors, null, 2);
  }

  // Private methods
  private setupGlobalHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.trackError(
          event.reason instanceof Error ? event.reason : String(event.reason),
          'high',
          {
            action: 'unhandled_promise_rejection',
            url: window.location.href,
            userAgent: navigator.userAgent
          }
        );
      });

      // Handle global errors
      window.addEventListener('error', (event) => {
        this.trackError(
          event.error || event.message,
          'high',
          {
            action: 'global_error',
            url: window.location.href,
            userAgent: navigator.userAgent,
            metadata: {
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno
            }
          }
        );
      });
    }

    // Handle Node.js unhandled rejections
    if (typeof process !== 'undefined') {
      process.on('unhandledRejection', (reason, promise) => {
        this.trackError(
          reason instanceof Error ? reason : String(reason),
          'critical',
          {
            action: 'unhandled_promise_rejection_node',
            metadata: { promise: promise.toString() }
          }
        );
      });

      process.on('uncaughtException', (error) => {
        this.trackError(
          error,
          'critical',
          {
            action: 'uncaught_exception_node'
          }
        );
      });
    }
  }

  private generateFingerprint(message: string, stack?: string, context: ErrorContext = {}): string {
    // Create a unique fingerprint for grouping similar errors
    const key = [
      message.replace(/\d+/g, 'N'), // Replace numbers with N
      context.component || '',
      context.action || '',
      stack?.split('\n')[0] || '' // First line of stack trace
    ].join('|');
    
    return Buffer.from(key).toString('base64').substring(0, 32);
  }

  private getHigherSeverity(
    current: 'low' | 'medium' | 'high' | 'critical',
    new_: 'low' | 'medium' | 'high' | 'critical'
  ): 'low' | 'medium' | 'high' | 'critical' {
    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    return severityOrder[new_] > severityOrder[current] ? new_ : current;
  }

  private getAPISeverity(statusCode: number): 'low' | 'medium' | 'high' | 'critical' {
    if (statusCode >= 500) return 'critical';
    if (statusCode >= 400) return 'high';
    if (statusCode >= 300) return 'medium';
    return 'low';
  }

  private sanitizeProps(props: any): any {
    // Remove sensitive data from props
    const sanitized = { ...props };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private logError(
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context: ErrorContext,
    stack?: string
  ): void {
    const logData = {
      message,
      severity,
      context,
      stack: stack?.substring(0, 500) // Truncate stack trace
    };

    switch (severity) {
      case 'critical':
        console.error('🚨 CRITICAL ERROR:', logData);
        break;
      case 'high':
        console.error('❌ HIGH ERROR:', logData);
        break;
      case 'medium':
        console.warn('⚠️ MEDIUM ERROR:', logData);
        break;
      case 'low':
        console.info('ℹ️ LOW ERROR:', logData);
        break;
    }
  }

  private sendToExternalServices(
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context: ErrorContext,
    stack?: string
  ): void {
    // Here you would integrate with external error tracking services
    // like Sentry, Rollbar, Bugsnag, etc.
    
    // Example for Sentry (if configured):
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(new Error(message), {
    //     level: severity,
    //     contexts: { custom: context },
    //     extra: { stack }
    //   });
    // }
  }

  private trimOldErrors(): void {
    // Remove oldest errors when we exceed max
    const errors = Array.from(this.errors.entries())
      .sort(([, a], [, b]) => a.lastSeen.getTime() - b.lastSeen.getTime());
    
    const toRemove = errors.slice(0, errors.length - this.maxErrors + 100);
    for (const [fingerprint] of toRemove) {
      this.errors.delete(fingerprint);
    }
  }

  private calculateErrorTrends(errors: ErrorReport[], timeRangeHours: number): Array<{ hour: number; count: number }> {
    const trends: Array<{ hour: number; count: number }> = [];
    const now = new Date();
    
    for (let i = timeRangeHours - 1; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const hourErrors = errors.filter(error => 
        error.lastSeen >= hourStart && error.lastSeen < hourEnd
      );
      
      const count = hourErrors.reduce((sum, error) => sum + error.count, 0);
      trends.push({ hour: i, count });
    }
    
    return trends;
  }
}

// Singleton instance
export const errorTracker = ErrorTracker.getInstance();

// Utility functions
export function trackError(
  error: Error | string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  context: ErrorContext = {}
): string {
  return errorTracker.trackError(error, severity, context);
}

export function trackAPIError(
  endpoint: string,
  method: string,
  statusCode: number,
  error: Error | string,
  context: ErrorContext = {}
): string {
  return errorTracker.trackAPIError(endpoint, method, statusCode, error, context);
}

export function trackComponentError(
  componentName: string,
  error: Error | string,
  props?: any,
  context: ErrorContext = {}
): string {
  return errorTracker.trackComponentError(componentName, error, props, context);
}

export function trackDatabaseError(
  query: string,
  error: Error | string,
  context: ErrorContext = {}
): string {
  return errorTracker.trackDatabaseError(query, error, context);
}

// React hook for error tracking
export function useErrorTracking(componentName: string) {
  return {
    trackError: (error: Error | string, severity?: 'low' | 'medium' | 'high' | 'critical') => {
      return trackComponentError(componentName, error, undefined, {
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      });
    },
    trackAPIError: (endpoint: string, method: string, statusCode: number, error: Error | string) => {
      return trackAPIError(endpoint, method, statusCode, error, {
        component: componentName,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      });
    }
  };
}

export default errorTracker;