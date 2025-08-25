'use client';

import { useEffect, useState } from 'react';
import InAppNotificationHistory from '@/components/notifications/InAppNotificationHistory';
import { validateTelegramWebAppData } from '@/lib/telegram-auth';

export default function NotificationHistoryPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          const webApp = window.Telegram.WebApp;
          webApp.ready();
          
          if (webApp.initDataUnsafe?.user) {
            setUser(webApp.initDataUnsafe.user);
          }
        }
      } catch (error) {
        console.error('Error initializing user:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Доступ запрещен</h1>
          <p className="text-gray-600">Пожалуйста, откройте приложение через Telegram</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <InAppNotificationHistory 
        userId={user.id} 
        onClose={() => window.history.back()}
      />
    </div>
  );
}