'use client';

import { useEffect, useState } from 'react';
import { User } from '@/types/database';
import { EnhancedWish } from '@/types/quest-economy';
import WishTabs from '@/components/wishes/WishTabs';
import MobileOptimizedWishTabs from '@/components/wishes/MobileOptimizedWishTabs';
import EnhancedNavigation from '@/components/EnhancedNavigation';

import { useDeviceDetection } from '@/lib/mobile-detection';
import ResponsiveLayout, { OrientationAwareHeader } from '@/components/ResponsiveLayout';

export default function WishesPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [wishes, setWishes] = useState<{
    my: EnhancedWish[];
    assigned: EnhancedWish[];
    shared: EnhancedWish[];
  }>({
    my: [],
    assigned: [],
    shared: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const deviceInfo = useDeviceDetection();
  const { isMobile, isTablet, screenSize, orientation } = deviceInfo;

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      // Get current user from Telegram or mock data
      let userData;
      
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        const user = tg.initDataUnsafe?.user;
        
        if (user) {
          const response = await fetch('/api/users/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              initData: tg.initData,
              id: user.id.toString(),
              first_name: user.first_name,
              last_name: user.last_name,
              username: user.username
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            userData = data.user;
          }
        }
      } else {
        // Mock user for development
        const response = await fetch('/api/users/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: '123456789',
            first_name: 'Тестовый',
            last_name: 'Пользователь',
            username: 'testuser'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          userData = data.user;
        }
      }

      if (userData) {
        setCurrentUser(userData);
        await loadWishes(userData.id);
      }
    } catch (err) {
      console.error('Initialization error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadWishes = async (userId: string) => {
    try {
      const [myResponse, assignedResponse, sharedResponse] = await Promise.all([
        fetch(`/api/wishes/my?userId=${userId}`),
        fetch(`/api/wishes/assigned?userId=${userId}`),
        fetch(`/api/wishes/shared?userId=${userId}`)
      ]);

      const [myData, assignedData, sharedData] = await Promise.all([
        myResponse.ok ? myResponse.json() : { wishes: [] },
        assignedResponse.ok ? assignedResponse.json() : { wishes: [] },
        sharedResponse.ok ? sharedResponse.json() : { wishes: [] }
      ]);

      setWishes({
        my: myData.wishes || [],
        assigned: assignedData.wishes || [],
        shared: sharedData.wishes || []
      });
    } catch (err) {
      console.error('Failed to load wishes:', err);
    }
  };

  const handleWishUpdate = () => {
    if (currentUser) {
      loadWishes(currentUser.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 dark:from-gray-900 dark:via-pink-900 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-200 dark:border-pink-700 border-t-pink-500 dark:border-t-pink-400 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">⭐</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Загружаем желания...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 dark:from-red-900/20 dark:via-pink-900/20 dark:to-orange-900/20 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Ошибка загрузки</h2>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-600 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            🔄 Перезагрузить
          </button>
        </div>
      </div>
    );
  }

  const WishTabsComponent = isMobile || isTablet ? MobileOptimizedWishTabs : WishTabs;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 dark:from-gray-900 dark:via-pink-900 dark:to-purple-900 ${isMobile ? 'pb-20' : ''} orientation-transition`}>
      {currentUser && (
        <>
          <EnhancedNavigation currentUser={currentUser} />

        </>
      )}
      
      <ResponsiveLayout className="space-y-4 sm:space-y-6">
        {/* Header - orientation aware */}
        <OrientationAwareHeader
          title="Желания"
          subtitle="Управляйте своими желаниями и создавайте общие цели"
          icon={<span>⭐</span>}
        />
        
        {/* Device info for debugging */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-center text-xs text-gray-500">
            {screenSize} | {orientation} | {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
          </div>
        )}

        {/* Wish Tabs - responsive component selection */}
        {currentUser && (
          <WishTabsComponent
            currentUserId={currentUser.id}
            currentUser={currentUser}
            wishes={wishes}
            onWishUpdate={handleWishUpdate}
          />
        )}
      </ResponsiveLayout>
    </div>
  );
}