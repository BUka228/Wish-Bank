'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const collectDebugInfo = () => {
      if (typeof window === 'undefined') return;
      
      const info = {
        // Telegram WebApp
        telegramWebApp: !!window.Telegram?.WebApp,
        telegramPlatform: window.Telegram?.WebApp?.platform,
        telegramVersion: window.Telegram?.WebApp?.version,
        telegramInitData: !!window.Telegram?.WebApp?.initData,
        telegramUser: !!window.Telegram?.WebApp?.initDataUnsafe?.user,
        
        // Browser info
        userAgent: navigator.userAgent,
        location: window.location.href,
        referrer: document.referrer,
        
        // Environment
        nodeEnv: process.env.NODE_ENV,
        
        // Telegram specific
        telegramInitDataLength: window.Telegram?.WebApp?.initData?.length || 0,
        telegramUserId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
        telegramUserName: window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name,
      };
      
      setDebugInfo(info);
    };

    if (typeof window === 'undefined') return;

    // Ждем загрузки Telegram WebApp
    let attempts = 0;
    const checkTelegram = () => {
      if (window.Telegram?.WebApp || attempts > 20) {
        collectDebugInfo();
      } else {
        attempts++;
        setTimeout(checkTelegram, 100);
      }
    };
    
    checkTelegram();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🔍 Debug Information</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <pre className="text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
        
        <div className="mt-6 space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Обновить информацию
          </button>
          
          {typeof window !== 'undefined' && window.Telegram?.WebApp && (
            <div className="space-y-2">
              <button
                onClick={() => {
                  if (window.Telegram?.WebApp) {
                    const tg = window.Telegram.WebApp;
                    alert(`Platform: ${tg.platform}\nVersion: ${tg.version}\nUser ID: ${tg.initDataUnsafe?.user?.id}`);
                  }
                }}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 block"
              >
                Показать Telegram данные
              </button>
              
              <button
                onClick={() => {
                  if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.close();
                  }
                }}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 block"
              >
                Закрыть WebApp
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}