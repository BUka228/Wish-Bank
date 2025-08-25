'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminSecurityGuard } from './AdminSecurityGuard';

interface User {
  id: string;
  telegram_id: string;
  name: string;
  username?: string;
  mana_balance: number;
  rank: string;
  experience_points: number;
  created_at: Date;
}

interface WishCategory {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  icon: string;
}

interface SharedWishCreate {
  description: string;
  category: string;
  priority?: number;
  isGlobal?: boolean;
  targetUsers?: string[];
  collectiveReward?: number;
  expiresAt?: string;
  reason: string;
}

interface SharedWishDetails {
  id: string;
  wishId: string;
  wishDescription: string;
  wishCategory: string;
  createdByAdmin: string;
  adminName: string;
  adminUsername: string;
  isGlobal: boolean;
  targetUsers: string[];
  participationCount: number;
  completionProgress: number;
  collectiveReward: number;
  expiresAt?: Date;
  createdAt: Date;
  metadata: Record<string, any>;
  status: 'active' | 'completed' | 'expired';
}

interface SharedWishParticipant {
  id: string;
  sharedWishId: string;
  userId: string;
  participationStatus: 'active' | 'completed' | 'opted_out';
  progressContribution: number;
  joinedAt: Date;
  completedAt?: Date;
  userName?: string;
  username?: string;
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

interface SharedWishManagerProps {
  className?: string;
}

const PRIORITY_OPTIONS = [
  { value: 1, label: 'Низкий', color: 'text-gray-600' },
  { value: 2, label: 'Обычный', color: 'text-blue-600' },
  { value: 3, label: 'Высокий', color: 'text-orange-600' },
  { value: 4, label: 'Критический', color: 'text-red-600' }
];

export default function SharedWishManager({ className = '' }: SharedWishManagerProps) {
  // State for creating shared wishes
  const [categories, setCategories] = useState<WishCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<SharedWishCreate>({
    description: '',
    category: '',
    priority: 2,
    isGlobal: true,
    targetUsers: [],
    collectiveReward: 0,
    expiresAt: '',
    reason: ''
  });
  
  // State for managing existing shared wishes
  const [sharedWishes, setSharedWishes] = useState<SharedWishDetails[]>([]);
  const [selectedWish, setSelectedWish] = useState<SharedWishDetails | null>(null);
  const [participants, setParticipants] = useState<SharedWishParticipant[]>([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'create' | 'manage' | 'dashboard'>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  });
  
  // Filters for manage tab
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'expired'>('all');
  const [globalFilter, setGlobalFilter] = useState<'all' | 'global' | 'targeted'>('all');
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<SharedWishDetails>>({});
  const [editReason, setEditReason] = useState('');
  
  // Dashboard state
  const [dashboardStats, setDashboardStats] = useState({
    totalActive: 0,
    totalCompleted: 0,
    totalParticipants: 0,
    averageProgress: 0,
    recentActivity: [] as any[]
  });

  // Load initial data
  useEffect(() => {
    loadCategories();
    loadUsers();
    loadSharedWishes();
    loadDashboardStats();
  }, []);

  // Load wish categories
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/wishes/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
        if (data.categories.length > 0 && !formData.category) {
          setFormData(prev => ({ ...prev, category: data.categories[0].id }));
        }
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  // Load users for targeting
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users/list?limit=200&sortBy=name&sortOrder=asc');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  // Load existing shared wishes
  const loadSharedWishes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (globalFilter === 'global') {
        params.append('isGlobal', 'true');
      } else if (globalFilter === 'targeted') {
        params.append('isGlobal', 'false');
      }
      
      const response = await fetch(`/api/admin/shared-wishes/manage?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSharedWishes(data.data.sharedWishes);
      } else {
        throw new Error('Failed to load shared wishes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading shared wishes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, globalFilter]);

  useEffect(() => {
    if (activeTab === 'manage') {
      loadSharedWishes();
    }
  }, [activeTab, loadSharedWishes]);

  // Validation functions
  const validateSharedWish = (data: SharedWishCreate): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate description
    if (!data.description.trim()) {
      errors.push({
        field: 'description',
        message: 'Описание общего желания обязательно',
        severity: 'error'
      });
    } else if (data.description.length < 10) {
      warnings.push({
        field: 'description',
        message: 'Рекомендуется более подробное описание (минимум 10 символов)',
        severity: 'warning'
      });
    } else if (data.description.length > 500) {
      errors.push({
        field: 'description',
        message: 'Описание не должно превышать 500 символов',
        severity: 'error'
      });
    }

    // Validate category
    if (!data.category) {
      errors.push({
        field: 'category',
        message: 'Категория обязательна для выбора',
        severity: 'error'
      });
    }

    // Validate reason
    if (!data.reason.trim()) {
      errors.push({
        field: 'reason',
        message: 'Причина создания общего желания обязательна',
        severity: 'error'
      });
    } else if (data.reason.length < 10) {
      warnings.push({
        field: 'reason',
        message: 'Рекомендуется более подробная причина (минимум 10 символов)',
        severity: 'warning'
      });
    }

    // Validate target users for non-global wishes
    if (!data.isGlobal && (!data.targetUsers || data.targetUsers.length === 0)) {
      errors.push({
        field: 'targetUsers',
        message: 'Для целевых желаний необходимо выбрать пользователей',
        severity: 'error'
      });
    } else if (!data.isGlobal && data.targetUsers && data.targetUsers.length > 50) {
      warnings.push({
        field: 'targetUsers',
        message: 'Большое количество целевых пользователей (>50). Рассмотрите возможность создания глобального желания',
        severity: 'warning'
      });
    }

    // Validate collective reward
    if (data.collectiveReward && data.collectiveReward < 0) {
      errors.push({
        field: 'collectiveReward',
        message: 'Награда не может быть отрицательной',
        severity: 'error'
      });
    } else if (data.collectiveReward && data.collectiveReward > 10000) {
      warnings.push({
        field: 'collectiveReward',
        message: 'Очень высокая награда (>10,000 маны). Убедитесь, что это правильно',
        severity: 'warning'
      });
    }

    // Validate expiration date
    if (data.expiresAt) {
      const expirationDate = new Date(data.expiresAt);
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      if (isNaN(expirationDate.getTime())) {
        errors.push({
          field: 'expiresAt',
          message: 'Неверный формат даты окончания',
          severity: 'error'
        });
      } else if (expirationDate <= now) {
        errors.push({
          field: 'expiresAt',
          message: 'Дата окончания должна быть в будущем',
          severity: 'error'
        });
      } else if (expirationDate <= oneHourFromNow) {
        warnings.push({
          field: 'expiresAt',
          message: 'Очень короткий срок выполнения (менее часа)',
          severity: 'warning'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  // Handle form changes
  const handleFormChange = (field: keyof SharedWishCreate, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Clear previous messages
    setError(null);
    setSuccess(null);
    setShowPreview(false);
    
    // Validate on change
    const validation = validateSharedWish(newFormData);
    setValidationResult(validation);
  };

  // Generate preview
  const generatePreview = () => {
    const validation = validateSharedWish(formData);
    setValidationResult(validation);
    
    if (validation.isValid) {
      setShowPreview(true);
    }
  };

  // Create shared wish
  const createSharedWish = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const validation = validateSharedWish(formData);
      if (!validation.isValid) {
        setValidationResult(validation);
        return;
      }

      const response = await fetch('/api/admin/shared-wishes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create shared wish');
      }

      const result = await response.json();
      
      setSuccess(`Общее желание успешно создано! ID: ${result.sharedWishId}`);
      
      // Reset form
      setFormData({
        description: '',
        category: categories[0]?.id || '',
        priority: 2,
        isGlobal: true,
        targetUsers: [],
        collectiveReward: 0,
        expiresAt: '',
        reason: ''
      });
      
      setShowPreview(false);
      setValidationResult({ isValid: true, errors: [], warnings: [] });
      
      // Refresh shared wishes list if on manage tab
      if (activeTab === 'manage') {
        loadSharedWishes();
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Load participants for selected wish
  const loadParticipants = async (wishId: string) => {
    try {
      const response = await fetch(`/api/admin/shared-wishes/manage?id=${wishId}&includeParticipants=true`);
      if (response.ok) {
        const data = await response.json();
        setParticipants(data.data.participants || []);
      }
    } catch (err) {
      console.error('Error loading participants:', err);
    }
  };

  // Handle wish selection
  const handleWishSelect = (wish: SharedWishDetails) => {
    setSelectedWish(wish);
    loadParticipants(wish.id);
    setEditMode(false);
    setEditFormData({});
    setEditReason('');
  };

  // Load dashboard statistics
  const loadDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/shared-wishes/manage');
      if (response.ok) {
        const data = await response.json();
        const wishes = data.data.sharedWishes;
        
        const stats = {
          totalActive: wishes.filter((w: SharedWishDetails) => w.status === 'active').length,
          totalCompleted: wishes.filter((w: SharedWishDetails) => w.status === 'completed').length,
          totalParticipants: wishes.reduce((sum: number, w: SharedWishDetails) => sum + w.participationCount, 0),
          averageProgress: wishes.length > 0 
            ? Math.round(wishes.reduce((sum: number, w: SharedWishDetails) => sum + w.completionProgress, 0) / wishes.length)
            : 0,
          recentActivity: wishes
            .sort((a: SharedWishDetails, b: SharedWishDetails) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
        };
        
        setDashboardStats(stats);
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  };

  // Start editing a wish
  const startEdit = (wish: SharedWishDetails) => {
    setEditMode(true);
    setEditFormData({
      isGlobal: wish.isGlobal,
      targetUsers: wish.targetUsers,
      collectiveReward: wish.collectiveReward,
      expiresAt: wish.expiresAt,
      metadata: wish.metadata
    });
    setEditReason('');
  };

  // Save edited wish
  const saveEdit = async () => {
    if (!selectedWish || !editReason.trim()) {
      setError('Причина изменения обязательна');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/shared-wishes/manage?id=${selectedWish.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...editFormData,
          reason: editReason
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update shared wish');
      }

      setSuccess('Общее желание успешно обновлено');
      setEditMode(false);
      setEditFormData({});
      setEditReason('');
      
      // Reload data
      await loadSharedWishes();
      await loadDashboardStats();
      
      // Update selected wish
      const updatedWish = { ...selectedWish, ...editFormData };
      setSelectedWish(updatedWish);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Delete wish
  const deleteWish = async (wishId: string, reason: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/shared-wishes/manage?id=${wishId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete shared wish');
      }

      setSuccess('Общее желание успешно удалено');
      setSelectedWish(null);
      
      // Reload data
      await loadSharedWishes();
      await loadDashboardStats();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Update participant status
  const updateParticipantStatus = async (participantId: string, status: string, reason: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/shared-wishes/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update_participant_status',
          participantId,
          status,
          reason
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update participant status');
      }

      setSuccess('Статус участника обновлен');
      
      // Reload participants and wish data
      if (selectedWish) {
        await loadParticipants(selectedWish.id);
        await loadSharedWishes();
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Validation display component
  const ValidationDisplay = ({ validation }: { validation: ValidationResult }) => {
    if (validation.errors.length === 0 && validation.warnings.length === 0) {
      return null;
    }

    return (
      <div className="space-y-2">
        {validation.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <svg className="w-4 h-4 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h4 className="text-sm font-medium text-red-800">Ошибки валидации</h4>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index}>• {error.message}</li>
              ))}
            </ul>
          </div>
        )}
        
        {validation.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <svg className="w-4 h-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h4 className="text-sm font-medium text-yellow-800">Предупреждения</h4>
            </div>
            <ul className="text-sm text-yellow-700 space-y-1">
              {validation.warnings.map((warning, index) => (
                <li key={index}>• {warning.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <AdminSecurityGuard>
      <div className={`p-6 space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Управление общими желаниями</h2>
            <p className="text-sm text-gray-600 mt-1">
              Создание и управление общими желаниями для пользователей
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('create')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'create'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Создать общее желание
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Дашборд прогресса
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Управление желаниями
            </button>
          </nav>
        </div>

        {/* Error/Success Messages */}
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

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800">{success}</span>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {/* Create Form */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Создание нового общего желания</h3>
              
              <div className="space-y-4">
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Описание желания *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    placeholder="Опишите общее желание подробно..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.description.length}/500 символов
                  </p>
                </div>

                {/* Category and Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Категория *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleFormChange('category', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Выберите категорию</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Приоритет
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => handleFormChange('priority', parseInt(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {PRIORITY_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Global vs Targeted */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Целевая аудитория
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="audience"
                        checked={formData.isGlobal}
                        onChange={() => handleFormChange('isGlobal', true)}
                        className="mr-2"
                      />
                      <span>Для всех пользователей (глобальное)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="audience"
                        checked={!formData.isGlobal}
                        onChange={() => handleFormChange('isGlobal', false)}
                        className="mr-2"
                      />
                      <span>Для конкретных пользователей</span>
                    </label>
                  </div>
                </div>

                {/* Target Users Selection */}
                {!formData.isGlobal && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Выберите пользователей *
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                      {users.map(user => (
                        <label key={user.id} className="flex items-center p-2 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={formData.targetUsers?.includes(user.id) || false}
                            onChange={(e) => {
                              const currentTargets = formData.targetUsers || [];
                              if (e.target.checked) {
                                handleFormChange('targetUsers', [...currentTargets, user.id]);
                              } else {
                                handleFormChange('targetUsers', currentTargets.filter(id => id !== user.id));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">
                            {user.name} (@{user.username || user.telegram_id}) - {user.rank}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Выбрано: {formData.targetUsers?.length || 0} пользователей
                    </p>
                  </div>
                )}

                {/* Collective Reward and Expiration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Коллективная награда (мана)
                    </label>
                    <input
                      type="number"
                      value={formData.collectiveReward}
                      onChange={(e) => handleFormChange('collectiveReward', parseInt(e.target.value) || 0)}
                      min="0"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Дата окончания (опционально)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={(e) => handleFormChange('expiresAt', e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Причина создания *
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => handleFormChange('reason', e.target.value)}
                    placeholder="Укажите причину создания этого общего желания..."
                    rows={2}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Validation Display */}
                <ValidationDisplay validation={validationResult} />

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={generatePreview}
                    disabled={!validationResult.isValid || loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Предпросмотр
                  </button>
                  
                  {showPreview && (
                    <button
                      onClick={createSharedWish}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Создание...
                        </>
                      ) : (
                        'Создать общее желание'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Preview */}
            {showPreview && validationResult.isValid && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">Предпросмотр общего желания</h3>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-blue-800">Описание:</span>
                    <p className="text-blue-700 mt-1">{formData.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-blue-800">Категория:</span>
                      <p className="text-blue-700">
                        {categories.find(c => c.id === formData.category)?.icon} {categories.find(c => c.id === formData.category)?.name}
                      </p>
                    </div>
                    
                    <div>
                      <span className="font-medium text-blue-800">Приоритет:</span>
                      <p className="text-blue-700">
                        {PRIORITY_OPTIONS.find(p => p.value === formData.priority)?.label}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-blue-800">Аудитория:</span>
                    <p className="text-blue-700">
                      {formData.isGlobal 
                        ? 'Все пользователи' 
                        : `${formData.targetUsers?.length || 0} выбранных пользователей`
                      }
                    </p>
                  </div>
                  
                  {(formData.collectiveReward || 0) > 0 && (
                    <div>
                      <span className="font-medium text-blue-800">Награда:</span>
                      <p className="text-blue-700">{formData.collectiveReward} маны</p>
                    </div>
                  )}
                  
                  {formData.expiresAt && (
                    <div>
                      <span className="font-medium text-blue-800">Окончание:</span>
                      <p className="text-blue-700">
                        {new Date(formData.expiresAt).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <span className="font-medium text-blue-800">Причина:</span>
                    <p className="text-blue-700">{formData.reason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Активные желания</p>
                    <p className="text-2xl font-semibold text-gray-900">{dashboardStats.totalActive}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Завершенные</p>
                    <p className="text-2xl font-semibold text-gray-900">{dashboardStats.totalCompleted}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Всего участников</p>
                    <p className="text-2xl font-semibold text-gray-900">{dashboardStats.totalParticipants}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Средний прогресс</p>
                    <p className="text-2xl font-semibold text-gray-900">{dashboardStats.averageProgress}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Visualization */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Визуализация прогресса</h3>
              
              {sharedWishes.length > 0 ? (
                <div className="space-y-4">
                  {sharedWishes.slice(0, 10).map(wish => (
                    <div key={wish.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {wish.wishDescription}
                          </h4>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{wish.participationCount} участников</span>
                            <span className={`px-2 py-1 rounded-full ${
                              wish.status === 'active' ? 'bg-green-100 text-green-800' :
                              wish.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {wish.status === 'active' ? 'Активное' :
                               wish.status === 'completed' ? 'Завершено' : 'Истекло'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {wish.completionProgress}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${
                            wish.completionProgress === 100 ? 'bg-green-500' :
                            wish.completionProgress >= 75 ? 'bg-blue-500' :
                            wish.completionProgress >= 50 ? 'bg-yellow-500' :
                            wish.completionProgress >= 25 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${wish.completionProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Нет данных для отображения
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Недавняя активность</h3>
              
              {dashboardStats.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {dashboardStats.recentActivity.map((wish: SharedWishDetails) => (
                    <div key={wish.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-3 h-3 rounded-full ${
                        wish.status === 'active' ? 'bg-green-500' :
                        wish.status === 'completed' ? 'bg-blue-500' : 'bg-red-500'
                      }`}></div>
                      
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {wish.wishDescription}
                        </p>
                        <p className="text-xs text-gray-500">
                          Создано {new Date(wish.createdAt).toLocaleDateString('ru-RU')} • 
                          {wish.participationCount} участников • 
                          {wish.completionProgress}% завершено
                        </p>
                      </div>
                      
                      <button
                        onClick={() => {
                          setActiveTab('manage');
                          handleWishSelect(wish);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Подробнее
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Нет недавней активности
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Статус
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Все статусы</option>
                    <option value="active">Активные</option>
                    <option value="completed">Завершенные</option>
                    <option value="expired">Истекшие</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип
                  </label>
                  <select
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Все типы</option>
                    <option value="global">Глобальные</option>
                    <option value="targeted">Целевые</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={loadSharedWishes}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Обновить
                  </button>
                </div>
              </div>
            </div>

            {/* Shared Wishes List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Wishes List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Общие желания</h3>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Загрузка...</p>
                  </div>
                ) : sharedWishes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Общие желания не найдены
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sharedWishes.map(wish => (
                      <div
                        key={wish.id}
                        onClick={() => handleWishSelect(wish)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedWish?.id === wish.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 line-clamp-2">
                            {wish.wishDescription}
                          </h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            wish.status === 'active' ? 'bg-green-100 text-green-800' :
                            wish.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {wish.status === 'active' ? 'Активное' :
                             wish.status === 'completed' ? 'Завершено' : 'Истекло'}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Участников: {wish.participationCount}</span>
                            <span>Прогресс: {wish.completionProgress}%</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span>{wish.isGlobal ? 'Глобальное' : 'Целевое'}</span>
                            <span>{new Date(wish.createdAt).toLocaleDateString('ru-RU')}</span>
                          </div>
                          
                          {wish.collectiveReward > 0 && (
                            <div className="text-blue-600">
                              Награда: {wish.collectiveReward} маны
                            </div>
                          )}
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${wish.completionProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Wish Details */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Детали желания</h3>
                  {selectedWish && selectedWish.status === 'active' && (
                    <div className="flex gap-2">
                      {!editMode ? (
                        <>
                          <button
                            onClick={() => startEdit(selectedWish)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Редактировать
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Укажите причину удаления:');
                              if (reason) {
                                deleteWish(selectedWish.id, reason);
                              }
                            }}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Удалить
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={saveEdit}
                            disabled={loading || !editReason.trim()}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={() => {
                              setEditMode(false);
                              setEditFormData({});
                              setEditReason('');
                            }}
                            className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            Отменить
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {selectedWish ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Описание</h4>
                      <p className="text-gray-700">{selectedWish.wishDescription}</p>
                    </div>
                    
                    {editMode ? (
                      /* Edit Form */
                      <div className="space-y-4 border-t pt-4">
                        <h5 className="font-medium text-gray-900">Редактирование параметров</h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Тип желания
                            </label>
                            <div className="space-y-2">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="editIsGlobal"
                                  checked={editFormData.isGlobal === true}
                                  onChange={() => setEditFormData(prev => ({ ...prev, isGlobal: true }))}
                                  className="mr-2"
                                />
                                <span>Глобальное</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="editIsGlobal"
                                  checked={editFormData.isGlobal === false}
                                  onChange={() => setEditFormData(prev => ({ ...prev, isGlobal: false }))}
                                  className="mr-2"
                                />
                                <span>Целевое</span>
                              </label>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Коллективная награда (мана)
                            </label>
                            <input
                              type="number"
                              value={editFormData.collectiveReward || 0}
                              onChange={(e) => setEditFormData(prev => ({ 
                                ...prev, 
                                collectiveReward: parseInt(e.target.value) || 0 
                              }))}
                              min="0"
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Дата окончания
                          </label>
                          <input
                            type="datetime-local"
                            value={editFormData.expiresAt ? new Date(editFormData.expiresAt).toISOString().slice(0, 16) : ''}
                            onChange={(e) => setEditFormData(prev => ({ 
                              ...prev, 
                              expiresAt: e.target.value ? new Date(e.target.value) : undefined 
                            }))}
                            min={new Date().toISOString().slice(0, 16)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Причина изменения *
                          </label>
                          <textarea
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            placeholder="Укажите причину внесения изменений..."
                            rows={2}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Категория:</span>
                          <p className="text-gray-900">{selectedWish.wishCategory}</p>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-600">Создатель:</span>
                          <p className="text-gray-900">{selectedWish.adminName}</p>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-600">Тип:</span>
                          <p className="text-gray-900">{selectedWish.isGlobal ? 'Глобальное' : 'Целевое'}</p>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-600">Статус:</span>
                          <p className="text-gray-900">
                            {selectedWish.status === 'active' ? 'Активное' :
                             selectedWish.status === 'completed' ? 'Завершено' : 'Истекло'}
                          </p>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-600">Участников:</span>
                          <p className="text-gray-900">{selectedWish.participationCount}</p>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-600">Прогресс:</span>
                          <p className="text-gray-900">{selectedWish.completionProgress}%</p>
                        </div>
                        
                        {selectedWish.collectiveReward > 0 && (
                          <div>
                            <span className="font-medium text-gray-600">Награда:</span>
                            <p className="text-gray-900">{selectedWish.collectiveReward} маны</p>
                          </div>
                        )}
                        
                        {selectedWish.expiresAt && (
                          <div>
                            <span className="font-medium text-gray-600">Окончание:</span>
                            <p className="text-gray-900">
                              {new Date(selectedWish.expiresAt).toLocaleString('ru-RU')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Progress Visualization */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-600">Прогресс выполнения</span>
                        <span className="text-sm text-gray-500">{selectedWish.completionProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${selectedWish.completionProgress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Participants Management */}
                    {participants.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-600 mb-2">
                          Участники ({participants.length})
                        </h5>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {participants.map(participant => (
                            <div key={participant.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {participant.userName || `User ${participant.userId.slice(0, 8)}`}
                                </span>
                                <div className="text-xs text-gray-500">
                                  Присоединился: {new Date(participant.joinedAt).toLocaleDateString('ru-RU')}
                                  {participant.completedAt && (
                                    <span> • Завершил: {new Date(participant.completedAt).toLocaleDateString('ru-RU')}</span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  participant.participationStatus === 'active' ? 'bg-green-100 text-green-800' :
                                  participant.participationStatus === 'completed' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {participant.participationStatus === 'active' ? 'Активен' :
                                   participant.participationStatus === 'completed' ? 'Завершил' : 'Отказался'}
                                </span>
                                
                                {selectedWish.status === 'active' && participant.participationStatus === 'active' && (
                                  <button
                                    onClick={() => {
                                      const reason = prompt('Укажите причину изменения статуса:');
                                      if (reason) {
                                        updateParticipantStatus(participant.id, 'completed', reason);
                                      }
                                    }}
                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                  >
                                    Завершить
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
                    Выберите общее желание для просмотра деталей
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminSecurityGuard>
  );
}