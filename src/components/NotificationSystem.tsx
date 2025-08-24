'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  type: 'quest' | 'event' | 'wish' | 'rank' | 'economy';
  title: string;
  message: string;
  icon: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

interface NotificationSystemProps {
  userId: string;
}

export default function NotificationSystem({ userId }: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const loadNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`/api/notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const getNotificationColor = (type: string) => {
    const colors = {
      quest: 'from-purple-500 to-blue-500',
      event: 'from-green-500 to-teal-500',
      wish: 'from-pink-500 to-rose-500',
      rank: 'from-yellow-500 to-orange-500',
      economy: 'from-indigo-500 to-purple-500'
    };
    return colors[type as keyof typeof colors] || colors.quest;
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} д назад`;
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-all duration-200"
        aria-label="Уведомления"
      >
        <div className="relative">
          <span className="text-xl">🔔</span>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
            >
              {Math.min(99, unreadCount)}
            </motion.div>
          )}
        </div>
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl z-40"
            >
              <div className="p-6 pt-20 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    Уведомления
                  </h2>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Прочитать все
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto space-y-3">
                  {notifications.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📭</div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Пока нет уведомлений
                      </p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                          notification.read
                            ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                            : 'bg-white dark:bg-gray-700 border-blue-200 dark:border-blue-600 shadow-md'
                        }`}
                        onClick={() => {
                          if (!notification.read) {
                            markAsRead(notification.id);
                          }
                          if (notification.actionUrl) {
                            window.location.href = notification.actionUrl;
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getNotificationColor(notification.type)} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-white text-lg">{notification.icon}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                              )}
                            </div>
                            
                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 line-clamp-2">
                              {notification.message}
                            </p>
                            
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {formatTime(notification.timestamp)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}