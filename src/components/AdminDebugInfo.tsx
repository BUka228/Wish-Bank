'use client';

import { useAdmin } from '../lib/hooks/useAdmin';

export default function AdminDebugInfo() {
  const { isAdmin, isLoading, error, adminData } = useAdmin();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h4 className="font-bold mb-2">🔧 Admin Debug Info</h4>
      <div className="space-y-1">
        <div>Loading: {isLoading ? '✅' : '❌'}</div>
        <div>Is Admin: {isAdmin ? '✅' : '❌'}</div>
        <div>Error: {error || 'None'}</div>
        {adminData && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div>Admin ID: {adminData.admin.id.substring(0, 8)}...</div>
            <div>Name: {adminData.admin.name}</div>
            <div>Username: {adminData.admin.username || 'N/A'}</div>
            <div>Telegram ID: {adminData.admin.telegram_id}</div>
            <div>Operations Allowed: {adminData.config.operations_allowed ? '✅' : '❌'}</div>
          </div>
        )}
      </div>
    </div>
  );
}