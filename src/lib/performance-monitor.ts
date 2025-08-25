import { NextRequest, NextResponse } from 'next/server';
import React from 'react';

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  metadata?: any;
}

export interface APIMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userAgent?: string;
  userId?: string;
  errorMessage?: string;
}

export interface ComponentMetrics {
  componentName: string;
  renderTime: number;
  propsSize: number;
  timestamp: Date;
  userId?: string;
}

export interface ErrorMetric {
  id: string;
  message: string;
  stack?: string;
  component?: string;
  userId?: string;
  userAgent?: string;
  url?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: APIMetrics[] = [];
  private componentMetrics: ComponentMetrics[] = [];
  private errorMetrics: ErrorMetric[] = [];
  private maxMetricsHistory = 1000;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Record a custom performance metric
  recordMetric(
    name: string,
    value: number,
    unit: string = 'ms',
    tags: Record<string, string> = {},
    metadata?: any
  ): void {
    const metric: PerformanceMetric = {
      id: this.generateId(),
      name,
      value,
      unit,
      timestamp: new Date(),
      tags,
      metadata
    };

    this.metrics.push(metric);
    this.trimHistory(this.metrics);

    // Log significant metrics
    if (this.isSignificantMetric(name, value)) {
      console.warn(`Performance Alert: ${name} = ${value}${unit}`, tags);
    }
  }

  // Record API performance metrics
  recordAPIMetric(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
    userAgent?: string,
    errorMessage?: string
  ): void {
    const metric: APIMetrics = {
      endpoint,
      method,
      statusCode,
      responseTime,
      timestamp: new Date(),
      userId,
      userAgent,
      errorMessage
    };

    this.apiMetrics.push(metric);
    this.trimHistory(this.apiMetrics);

    // Record as general metric
    this.recordMetric(
      'api_response_time',
      responseTime,
      'ms',
      { endpoint, method, status: statusCode.toString() }
    );

    // Alert on slow APIs
    if (responseTime > 2000) {
      console.warn(`Slow API detected: ${method} ${endpoint} took ${responseTime}ms`);
    }

    // Alert on errors
    if (statusCode >= 400) {
      this.recordError(
        `API Error: ${method} ${endpoint}`,
        errorMessage || `HTTP ${statusCode}`,
        undefined,
        userId,
        userAgent,
        endpoint,
        statusCode >= 500 ? 'high' : 'medium'
      );
    }
  }

  // Record component performance metrics
  recordComponentMetric(
    componentName: string,
    renderTime: number,
    propsSize: number = 0,
    userId?: string
  ): void {
    const metric: ComponentMetrics = {
      componentName,
      renderTime,
      propsSize,
      timestamp: new Date(),
      userId
    };

    this.componentMetrics.push(metric);
    this.trimHistory(this.componentMetrics);

    // Record as general metric
    this.recordMetric(
      'component_render_time',
      renderTime,
      'ms',
      { component: componentName }
    );

    // Alert on slow components
    if (renderTime > 100) {
      console.warn(`Slow component render: ${componentName} took ${renderTime}ms`);
    }
  }

  // Record error metrics
  recordError(
    message: string,
    stack?: string,
    component?: string,
    userId?: string,
    userAgent?: string,
    url?: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    const error: ErrorMetric = {
      id: this.generateId(),
      message,
      stack,
      component,
      userId,
      userAgent,
      url,
      timestamp: new Date(),
      severity
    };

    this.errorMetrics.push(error);
    this.trimHistory(this.errorMetrics);

    // Log error based on severity
    const logMethod = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
    console[logMethod](`[${severity.toUpperCase()}] ${message}`, {
      component,
      userId,
      url,
      stack: stack?.substring(0, 200)
    });

    // Record as metric
    this.recordMetric(
      'error_count',
      1,
      'count',
      { severity, component: component || 'unknown' }
    );
  }

  // Get performance statistics
  getStats(timeRangeMinutes: number = 60): {
    apiStats: any;
    componentStats: any;
    errorStats: any;
    systemStats: any;
  } {
    const cutoff = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
    
    const recentAPIMetrics = this.apiMetrics.filter(m => m.timestamp > cutoff);
    const recentComponentMetrics = this.componentMetrics.filter(m => m.timestamp > cutoff);
    const recentErrorMetrics = this.errorMetrics.filter(m => m.timestamp > cutoff);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    return {
      apiStats: this.calculateAPIStats(recentAPIMetrics),
      componentStats: this.calculateComponentStats(recentComponentMetrics),
      errorStats: this.calculateErrorStats(recentErrorMetrics),
      systemStats: this.calculateSystemStats(recentMetrics)
    };
  }

  // Create middleware for API monitoring
  createAPIMiddleware() {
    return (handler: Function) => {
      return async (req: NextRequest, ...args: any[]) => {
        const startTime = Date.now();
        const endpoint = req.url || 'unknown';
        const method = req.method || 'GET';
        
        try {
          const response = await handler(req, ...args);
          const responseTime = Date.now() - startTime;
          
          // Extract status code from response
          let statusCode = 200;
          if (response instanceof NextResponse) {
            statusCode = response.status;
          } else if (response && typeof response === 'object' && 'status' in response) {
            statusCode = response.status as number;
          }

          this.recordAPIMetric(
            endpoint,
            method,
            statusCode,
            responseTime,
            this.extractUserId(req),
            req.headers.get('user-agent') || undefined
          );

          return response;
        } catch (error: any) {
          const responseTime = Date.now() - startTime;
          
          this.recordAPIMetric(
            endpoint,
            method,
            500,
            responseTime,
            this.extractUserId(req),
            req.headers.get('user-agent') || undefined,
            error.message
          );

          throw error;
        }
      };
    };
  }

  // Create React component wrapper for monitoring
  createComponentWrapper<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    componentName?: string
  ) {
    const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
    
    return (props: P) => {
      const startTime = performance.now();
      
      React.useEffect(() => {
        const renderTime = performance.now() - startTime;
        const propsSize = JSON.stringify(props).length;
        
        this.recordComponentMetric(displayName, renderTime, propsSize);
      }, []);

      try {
        return React.createElement(WrappedComponent, props);
      } catch (error: any) {
        this.recordError(
          `Component Error: ${displayName}`,
          error.stack,
          displayName,
          undefined,
          navigator.userAgent,
          window.location.href,
          'high'
        );
        throw error;
      }
    };
  }

  // Get performance dashboard data
  getDashboardData() {
    const stats = this.getStats(60); // Last hour
    const recentErrors = this.errorMetrics
      .filter(e => e.timestamp > new Date(Date.now() - 60 * 60 * 1000))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    const slowestAPIs = this.apiMetrics
      .filter(m => m.timestamp > new Date(Date.now() - 60 * 60 * 1000))
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 10);

    const slowestComponents = this.componentMetrics
      .filter(m => m.timestamp > new Date(Date.now() - 60 * 60 * 1000))
      .sort((a, b) => b.renderTime - a.renderTime)
      .slice(0, 10);

    return {
      stats,
      recentErrors,
      slowestAPIs,
      slowestComponents,
      totalMetrics: this.metrics.length,
      totalAPIMetrics: this.apiMetrics.length,
      totalComponentMetrics: this.componentMetrics.length,
      totalErrors: this.errorMetrics.length
    };
  }

  // Export metrics for external monitoring systems
  exportMetrics(format: 'json' | 'prometheus' = 'json') {
    if (format === 'prometheus') {
      return this.exportPrometheusMetrics();
    }
    
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics.slice(-100), // Last 100 metrics
      apiMetrics: this.apiMetrics.slice(-100),
      componentMetrics: this.componentMetrics.slice(-100),
      errorMetrics: this.errorMetrics.slice(-50)
    };
  }

  // Clear all metrics (for testing or reset)
  clearMetrics(): void {
    this.metrics = [];
    this.apiMetrics = [];
    this.componentMetrics = [];
    this.errorMetrics = [];
  }

  // Private helper methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private trimHistory<T>(array: T[]): void {
    if (array.length > this.maxMetricsHistory) {
      array.splice(0, array.length - this.maxMetricsHistory);
    }
  }

  private isSignificantMetric(name: string, value: number): boolean {
    const thresholds: Record<string, number> = {
      'api_response_time': 2000,
      'component_render_time': 100,
      'database_query_time': 1000,
      'memory_usage': 100 * 1024 * 1024, // 100MB
    };

    return value > (thresholds[name] || Infinity);
  }

  private extractUserId(req: NextRequest): string | undefined {
    // Try to extract user ID from various sources
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      // Extract from JWT or other auth token
      try {
        const token = authHeader.replace('Bearer ', '');
        // This would need actual JWT decoding logic
        return 'user-from-token';
      } catch {
        // Ignore token parsing errors
      }
    }

    // Try to get from cookies or other headers
    return undefined;
  }

  private calculateAPIStats(metrics: APIMetrics[]) {
    if (metrics.length === 0) return null;

    const responseTimes = metrics.map(m => m.responseTime);
    const statusCodes = metrics.reduce((acc, m) => {
      acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const endpointStats = metrics.reduce((acc, m) => {
      if (!acc[m.endpoint]) {
        acc[m.endpoint] = { count: 0, totalTime: 0, errors: 0 };
      }
      acc[m.endpoint].count++;
      acc[m.endpoint].totalTime += m.responseTime;
      if (m.statusCode >= 400) acc[m.endpoint].errors++;
      return acc;
    }, {} as Record<string, any>);

    return {
      totalRequests: metrics.length,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      medianResponseTime: this.calculateMedian(responseTimes),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      statusCodes,
      endpointStats,
      errorRate: metrics.filter(m => m.statusCode >= 400).length / metrics.length
    };
  }

  private calculateComponentStats(metrics: ComponentMetrics[]) {
    if (metrics.length === 0) return null;

    const renderTimes = metrics.map(m => m.renderTime);
    const componentStats = metrics.reduce((acc, m) => {
      if (!acc[m.componentName]) {
        acc[m.componentName] = { count: 0, totalTime: 0 };
      }
      acc[m.componentName].count++;
      acc[m.componentName].totalTime += m.renderTime;
      return acc;
    }, {} as Record<string, any>);

    return {
      totalRenders: metrics.length,
      averageRenderTime: renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length,
      medianRenderTime: this.calculateMedian(renderTimes),
      p95RenderTime: this.calculatePercentile(renderTimes, 95),
      componentStats
    };
  }

  private calculateErrorStats(metrics: ErrorMetric[]) {
    const severityCount = metrics.reduce((acc, m) => {
      acc[m.severity] = (acc[m.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const componentErrors = metrics.reduce((acc, m) => {
      const component = m.component || 'unknown';
      acc[component] = (acc[component] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: metrics.length,
      severityBreakdown: severityCount,
      componentErrors,
      errorRate: metrics.length // This would need total requests to calculate properly
    };
  }

  private calculateSystemStats(metrics: PerformanceMetric[]) {
    const metricsByName = metrics.reduce((acc, m) => {
      if (!acc[m.name]) acc[m.name] = [];
      acc[m.name].push(m.value);
      return acc;
    }, {} as Record<string, number[]>);

    const stats: Record<string, any> = {};
    for (const [name, values] of Object.entries(metricsByName)) {
      stats[name] = {
        count: values.length,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        median: this.calculateMedian(values)
      };
    }

    return stats;
  }

  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private exportPrometheusMetrics(): string {
    let output = '';
    
    // API metrics
    const apiStats = this.calculateAPIStats(this.apiMetrics);
    if (apiStats) {
      output += `# HELP api_requests_total Total number of API requests\n`;
      output += `# TYPE api_requests_total counter\n`;
      output += `api_requests_total ${apiStats.totalRequests}\n\n`;
      
      output += `# HELP api_response_time_seconds API response time in seconds\n`;
      output += `# TYPE api_response_time_seconds histogram\n`;
      output += `api_response_time_seconds_sum ${apiStats.averageResponseTime * apiStats.totalRequests / 1000}\n`;
      output += `api_response_time_seconds_count ${apiStats.totalRequests}\n\n`;
    }

    // Error metrics
    const errorStats = this.calculateErrorStats(this.errorMetrics);
    if (errorStats) {
      output += `# HELP errors_total Total number of errors\n`;
      output += `# TYPE errors_total counter\n`;
      output += `errors_total ${errorStats.totalErrors}\n\n`;
    }

    return output;
  }
}

// Singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React hook for component performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const startTime = React.useRef(performance.now());
  
  React.useEffect(() => {
    return () => {
      const renderTime = performance.now() - startTime.current;
      performanceMonitor.recordComponentMetric(componentName, renderTime);
    };
  }, [componentName]);

  return {
    recordMetric: (name: string, value: number, unit?: string) => {
      performanceMonitor.recordMetric(name, value, unit, { component: componentName });
    },
    recordError: (message: string, error?: Error) => {
      performanceMonitor.recordError(
        message,
        error?.stack,
        componentName,
        undefined,
        navigator.userAgent,
        window.location.href
      );
    }
  };
}

// Error boundary for React components
export class PerformanceErrorBoundary extends React.Component<
  { children: React.ReactNode; componentName?: string },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    performanceMonitor.recordError(
      `React Error: ${error.message}`,
      error.stack,
      this.props.componentName || 'ErrorBoundary',
      undefined,
      navigator.userAgent,
      window.location.href,
      'high'
    );
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', null, 'Something went wrong. Please refresh the page.');
    }

    return this.props.children;
  }
}

export default performanceMonitor;