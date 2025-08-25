'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InAppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  icon: string;
  timestamp: Date | string;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  data?: Record<string, any>;
}

interface InAppNotificationHistoryProps {
  userId: string;
  onClose?: () => void;
}

export default function InAppNotificationHistory({ userId, onClose }: InAppNotificationHistoryProps) {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadNotifications(true);
  }, [filter, typeFilter]);

  const loadNotifications = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      }

      const currentPage = reset ? 1 : page;
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        filter,
        type: typeFilter
      });

      const response = await fetch(`/api/notifications?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${window.Telegram?.WebApp?.initData || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load notifications');
      }

      const data = await response.json();
      const newNotifications = data.notifications || [];

      if (reset) {
        setNotifications(newNotifications);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
      }

      setHasMore(newNotifications.length === ITEMS_PER_PAGE);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      loadNotifications(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.Telegram?.WebApp?.initData || ''}`
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.Telegram?.WebApp?.initData || ''}`
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: InAppNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-500 bg-gray-100',
      normal: 'text-blue-500 bg-blue-100',
      high: 'text-orange-500 bg-orange-100',
      urgent: 'text-red-500 bg-red-100'
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      shared_wish_created: 'from-purple-500 to-blue-500',
      shared_wish_progress: 'from-green-500 to-teal-500',
      shared_wish_completed: 'from-yellow-500 to-orange-500',
      shared_wish_reminder: 'from-orange-500 to-red-500',
      shared_wish_expired: 'from-gray-500 to-gray-600',
      quest: 'from-purple-500 to-blue-500',
      event: 'from-green-500 to-teal-500',
      wish: 'from-pink-500 to-rose-500',
      rank: 'from-yellow-500 to-orange-500',
      economy: 'from-indigo-500 to-purple-500'
    };
    return colors[type as keyof typeof colors] || colors.quest;
  };

  const formatTime = (date: Date | string) => {
    const now = new Date();
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'недавно';
    }
    
    const diff = now.getTime() - dateObj.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} д назад`;
    return dateObj.toLocaleDateString('ru-RU');
  };

  const getUniqueTypes = () => {
    const typeSet = new Set(notifications.map(n => n.type));
    const types = Array.from(typeSet);
    return types.map(type => ({
      value: type,
      label: getTypeLabel(type)
    }));
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      shared_wish_created: 'Новые общие желания',
      shared_wish_progress: 'Прогресс желаний',
      shared_wish_completed: 'Выполненные желания',
      shared_wish_reminder: 'Напоминания',
      shared_wish_expired: 'Истекшие желания',
      quest: 'Квесты',
      event: 'События',
      wish: 'Желания',
      rank: 'Ранги',
      economy: 'Экономика'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'read' && !notification.read) return false;
    if (filter === 'unread' && notification.read) return false;
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">История уведомлений</h2>
          <p className="text-sm text-gray-600 mt-1">
            Все ваши уведомления в одном месте
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                {unreadCount} непрочитанных
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Прочитать все
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Статус:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все</option>
              <option value="unread">Непрочитанные</option>
              <option value="read">Прочитанные</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Тип:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все типы</option>
              {getUniqueTypes().map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {loading && filteredNotifications.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'all' ? 'Пока нет уведомлений' : 
               filter === 'unread' ? 'Нет непрочитанных уведомлений' : 
               'Нет прочитанных уведомлений'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md ${
                  notification.read
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-white border-blue-200 shadow-sm'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getTypeColor(notification.type)} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-lg">{notification.icon}</span>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`font-semibold text-sm truncate ${
                        notification.read ? 'text-gray-600' : 'text-gray-900'
                      }`}>
                        {notification.title}
                      </h3>
                      
                      {/* Priority Badge */}
                      {notification.priority !== 'normal' && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(notification.priority)}`}>
                          {notification.priority === 'high' ? 'Важно' : 
                           notification.priority === 'urgent' ? 'Срочно' : 
                           notification.priority}
                        </span>
                      )}
                      
                      {/* Unread Indicator */}
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                    
                    <p className={`text-sm mb-2 line-clamp-2 ${
                      notification.read ? 'text-gray-500' : 'text-gray-700'
                    }`}>
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        {formatTime(notification.timestamp)}
                      </p>
                      
                      {notification.actionUrl && (
                        <span className="text-xs text-blue-600 hover:text-blue-800">
                          Перейти →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Load More Button */}
        {hasMore && !loading && filteredNotifications.length > 0 && (
          <div className="text-center pt-4">
            <button
              onClick={loadMore}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Загрузить еще
            </button>
          </div>
        )}

        {/* Loading More Indicator */}
        {loading && filteredNotifications.length > 0 && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </div>
  );
}