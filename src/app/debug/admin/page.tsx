'use client';

import { useAdmin } from '../../../lib/hooks/useAdmin';
import { useState } from 'react';

export default function AdminDebugPage() {
  const { isAdmin, isLoading, error, adminData, checkAdminAccess } = useAdmin();
  const [testResult, setTestResult] = useState<string>('');

  const testAdminAPI = async () => {
    setTestResult('Testing...');
    try {
      const response = await fetch('/api/admin/security/validate', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.Telegram?.WebApp?.initData || ''}`
        }
      });
      
      const data = await response.json();
      setTestResult(`Status: ${response.status}\nData: ${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      setTestResult(`Error: ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🔧 Admin Debug Page</h1>
        
        <div className="space-y-6">
          {/* Admin Status */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Admin Status</h2>
            <div className="space-y-2 text-sm">
              <div>Loading: {isLoading ? '⏳ Yes' : '✅ No'}</div>
              <div>Is Admin: {isAdmin ? '👑 Yes' : '👤 No'}</div>
              <div>Error: {error || '✅ None'}</div>
            </div>
          </div>

          {/* Admin Data */}
          {adminData && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Admin Data</h2>
              <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto">
                {JSON.stringify(adminData, null, 2)}
              </pre>
            </div>
          )}

          {/* Telegram Data */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Telegram Data</h2>
            <div className="space-y-2 text-sm">
              <div>WebApp Available: {typeof window !== 'undefined' && window.Telegram?.WebApp ? '✅ Yes' : '❌ No'}</div>
              {typeof window !== 'undefined' && window.Telegram?.WebApp && (
                <>
                  <div>Platform: {window.Telegram.WebApp.platform}</div>
                  <div>Version: {window.Telegram.WebApp.version}</div>
                  <div>Init Data Length: {window.Telegram.WebApp.initData?.length || 0}</div>
                  <div>User ID: {window.Telegram.WebApp.initDataUnsafe?.user?.id || 'N/A'}</div>
                  <div>Username: {window.Telegram.WebApp.initDataUnsafe?.user?.username || 'N/A'}</div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-y-4">
              <button
                onClick={checkAdminAccess}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                🔄 Recheck Admin Access
              </button>
              
              <button
                onClick={testAdminAPI}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                🧪 Test Admin API
              </button>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Test Result</h2>
              <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto whitespace-pre-wrap">
                {testResult}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}