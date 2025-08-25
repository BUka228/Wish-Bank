'use client';

import React, { useState, useEffect } from 'react';
import { usePerformanceMonitor } from '../lib/performance-monitor';

interface DashboardData {
  timestamp: string;
  status: {
    overall: string;
    database: string;
    cache: string;
    application: string;
  };
  application: {
    stats: any;
    uptime: number;
    recentErrors: any[];
    slowestAPIs: any[];
    slowestComponents: any[];
  };
  cache: {
    totalEntries: number;
    totalHits: number;
    totalMisses: number;
    hitRate: number;
    memoryUsage: number;
    topKeys: any[];
  };
  database: {
    activeConnections: number;
    databaseSize: number;
    slowQueries: number;
    performanceIssues: any[];
  } | null;
  alerts: any[];
  recommendations: any[];
}

export default function PerformanceDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState(60);
  
  const { recordMetric } = usePerformanceMonitor('PerformanceDashboard');

  useEffect(() => {
    fetchDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, timeRange]);

  const fetchDashboardData = async () => {
    try {
      const startTime = Date.now();
      const response = await fetch(`/api/performance/dashboard?timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const dashboardData = await response.json();
      setData(dashboardData);
      setError(null);
      
      const fetchTime = Date.now() - startTime;
      recordMetric('dashboard_fetch_time', fetchTime);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading performance data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600 font-medium">Error loading dashboard</div>
          <button 
            onClick={fetchDashboardData}
            className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
      </div>
    );
  }

  if (!data) {
    return <div>No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
        <div className="flex items-center space-x-4">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(parseInt(e.target.value))}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value={15}>Last 15 minutes</option>
            <option value={60}>Last hour</option>
            <option value={240}>Last 4 hours</option>
            <option value={1440}>Last 24 hours</option>
          </select>
          <label className="flex items-center text-sm">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            Auto-refresh
          </label>
          <button 
            onClick={fetchDashboardData}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(data.status).map(([component, status]) => (
          <div key={component} className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 capitalize">{component}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                {status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b">
            <h2 className="text-lg font-medium text-gray-900">Active Alerts</h2>
          </div>
          <div className="p-4 space-y-3">
            {data.alerts.map((alert, index) => (
              <div key={index} className={`border rounded-lg p-3 ${getAlertColor(alert.severity)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium uppercase">{alert.severity}</span>
                    <span className="text-sm font-medium">{alert.component}</span>
                  </div>
                  <span className="text-xs text-gray-500">{alert.type}</span>
                </div>
                <div className="text-sm mt-1">{alert.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Metrics */}
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b">
            <h2 className="text-lg font-medium text-gray-900">Application</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Uptime</div>
                <div className="font-medium">{formatDuration(data.application.uptime)}</div>
              </div>
              <div>
                <div className="text-gray-500">Total Errors</div>
                <div className="font-medium">{data.application.stats.errorStats?.totalErrors || 0}</div>
              </div>
              {data.application.stats.apiStats && (
                <>
                  <div>
                    <div className="text-gray-500">API Requests</div>
                    <div className="font-medium">{data.application.stats.apiStats.totalRequests}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Avg Response Time</div>
                    <div className="font-medium">{Math.round(data.application.stats.apiStats.averageResponseTime)}ms</div>
                  </div>
                </>
              )}
            </div>
            
            {data.application.slowestAPIs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Slowest APIs</h4>
                <div className="space-y-1">
                  {data.application.slowestAPIs.slice(0, 3).map((api, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="truncate">{api.method} {api.endpoint}</span>
                      <span className="font-medium">{api.responseTime}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cache Metrics */}
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b">
            <h2 className="text-lg font-medium text-gray-900">Cache</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Hit Rate</div>
                <div className="font-medium">{Math.round(data.cache.hitRate * 100)}%</div>
              </div>
              <div>
                <div className="text-gray-500">Total Entries</div>
                <div className="font-medium">{data.cache.totalEntries}</div>
              </div>
              <div>
                <div className="text-gray-500">Memory Usage</div>
                <div className="font-medium">{formatBytes(data.cache.memoryUsage)}</div>
              </div>
              <div>
                <div className="text-gray-500">Total Hits</div>
                <div className="font-medium">{data.cache.totalHits}</div>
              </div>
            </div>
            
            {data.cache.topKeys.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Top Cache Keys</h4>
                <div className="space-y-1">
                  {data.cache.topKeys.slice(0, 3).map((key, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="truncate">{key.key}</span>
                      <span className="font-medium">{key.hits} hits</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Database Metrics */}
        {data.database && (
          <div className="bg-white rounded-lg border">
            <div className="px-4 py-3 border-b">
              <h2 className="text-lg font-medium text-gray-900">Database</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Active Connections</div>
                  <div className="font-medium">{data.database.activeConnections}</div>
                </div>
                <div>
                  <div className="text-gray-500">Database Size</div>
                  <div className="font-medium">{formatBytes(data.database.databaseSize)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Slow Queries</div>
                  <div className="font-medium">{data.database.slowQueries}</div>
                </div>
                <div>
                  <div className="text-gray-500">Performance Issues</div>
                  <div className="font-medium">{data.database.performanceIssues.length}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <div className="bg-white rounded-lg border">
            <div className="px-4 py-3 border-b">
              <h2 className="text-lg font-medium text-gray-900">Recommendations</h2>
            </div>
            <div className="p-4 space-y-3">
              {data.recommendations.slice(0, 5).map((rec, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-3">
                  <div className="text-sm font-medium">{rec.message}</div>
                  <div className="text-xs text-gray-600 mt-1">{rec.action}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Priority: <span className="font-medium">{rec.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
}