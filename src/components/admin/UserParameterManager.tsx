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
  daily_quota_used: number;
  weekly_quota_used: number;
  monthly_quota_used: number;
  last_quota_reset: Date;
  created_at: Date;
  updated_at: Date;
  // Statistics
  total_wishes: number;
  completed_wishes: number;
  total_transactions: number;
  total_mana_earned: number;
  total_mana_spent: number;
  last_activity: Date;
}

interface UserParameterUpdate {
  mana_balance?: number;
  rank?: string;
  experience_points?: number;
  daily_quota_used?: number;
  weekly_quota_used?: number;
  monthly_quota_used?: number;
  reason: string;
}

interface UserParameterManagerProps {
  className?: string;
}

interface ParameterChange {
  field: string;
  oldValue: any;
  newValue: any;
  label: string;
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

const VALID_RANKS = [
  'Рядовой', 'Ефрейтор', 'Младший сержант', 'Сержант', 'Старший сержант',
  'Старшина', 'Прапорщик', 'Старший прапорщик', 'Младший лейтенант', 'Лейтенант',
  'Старший лейтенант', 'Капитан', 'Майор', 'Подполковник', 'Полковник',
  'Генерал-майор', 'Генерал-лейтенант', 'Генерал-полковник', 'Генерал армии', 'Маршал'
];

const RANK_COLORS = {
  'Рядовой': 'bg-gray-100 text-gray-800',
  'Ефрейтор': 'bg-green-100 text-green-800',
  'Младший сержант': 'bg-blue-100 text-blue-800',
  'Сержант': 'bg-purple-100 text-purple-800',
  'Старший сержант': 'bg-yellow-100 text-yellow-800',
  'Старшина': 'bg-pink-100 text-pink-800',
  'Прапорщик': 'bg-orange-100 text-orange-800',
  'Старший прапорщик': 'bg-red-100 text-red-800',
  'Младший лейтенант': 'bg-indigo-100 text-indigo-800',
  'Лейтенант': 'bg-cyan-100 text-cyan-800',
  'Старший лейтенант': 'bg-emerald-100 text-emerald-800',
  'Капитан': 'bg-amber-100 text-amber-800',
  'Майор': 'bg-rose-100 text-rose-800',
  'Подполковник': 'bg-violet-100 text-violet-800',
  'Полковник': 'bg-slate-100 text-slate-800',
  'Генерал-майор': 'bg-red-200 text-red-900',
  'Генерал-лейтенант': 'bg-purple-200 text-purple-900',
  'Генерал-полковник': 'bg-blue-200 text-blue-900',
  'Генерал армии': 'bg-gradient-to-r from-red-200 to-purple-200 text-red-900',
  'Маршал': 'bg-gradient-to-r from-purple-200 to-yellow-200 text-purple-900 font-bold'
};

export default function UserParameterManager({ className = '' }: UserParameterManagerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [rankFilter, setRankFilter] = useState('');
  const [minManaFilter, setMinManaFilter] = useState('');
  const [maxManaFilter, setMaxManaFilter] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Form states
  const [formData, setFormData] = useState<UserParameterUpdate>({
    reason: ''
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewChanges, setPreviewChanges] = useState<ParameterChange[]>([]);
  
  // Validation states
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Load users data
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        limit: '100',
        sortBy,
        sortOrder
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (rankFilter) params.append('rank', rankFilter);
      if (minManaFilter) params.append('minMana', minManaFilter);
      if (maxManaFilter) params.append('maxMana', maxManaFilter);
      
      const response = await fetch(`/api/admin/users/list?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка загрузки пользователей');
      }
      
      const data = await response.json();
      setUsers(data.users);
      setFilteredUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, rankFilter, minManaFilter, maxManaFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Enter to generate preview
      if (event.ctrlKey && event.key === 'Enter' && selectedUser && validationResult.isValid && formData.reason.trim()) {
        event.preventDefault();
        generatePreview();
      }
      
      // Escape to close dialogs or reset form
      if (event.key === 'Escape') {
        if (showConfirmDialog) {
          setShowConfirmDialog(false);
          setConfirmDialogData(null);
        } else if (showPreview) {
          setShowPreview(false);
        } else if (selectedUser) {
          resetForm();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedUser, validationResult.isValid, formData.reason, showConfirmDialog, showPreview]);

  // Handle user selection
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setFormData({
      mana_balance: user.mana_balance,
      rank: user.rank,
      experience_points: user.experience_points,
      daily_quota_used: user.daily_quota_used,
      weekly_quota_used: user.weekly_quota_used,
      monthly_quota_used: user.monthly_quota_used,
      reason: ''
    });
    setShowPreview(false);
    setPreviewChanges([]);
  };

  // Input sanitization functions
  const sanitizeNumberInput = (value: string): number => {
    const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : Math.max(0, Math.floor(num));
  };

  const sanitizeTextInput = (value: string): string => {
    return value.trim().replace(/[<>]/g, ''); // Basic XSS protection
  };

  // Validation functions
  const validateParameters = (data: UserParameterUpdate): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate reason
    const sanitizedReason = sanitizeTextInput(data.reason || '');
    if (!sanitizedReason || sanitizedReason.length === 0) {
      errors.push({
        field: 'reason',
        message: 'Причина изменений обязательна для заполнения',
        severity: 'error'
      });
    } else if (sanitizedReason.length > 500) {
      errors.push({
        field: 'reason',
        message: 'Причина не должна превышать 500 символов',
        severity: 'error'
      });
    } else if (sanitizedReason.length < 10) {
      warnings.push({
        field: 'reason',
        message: 'Рекомендуется указать более подробную причину (минимум 10 символов)',
        severity: 'warning'
      });
    }

    // Validate mana_balance
    if (data.mana_balance !== undefined) {
      if (typeof data.mana_balance !== 'number' || isNaN(data.mana_balance)) {
        errors.push({
          field: 'mana_balance',
          message: 'Баланс маны должен быть числом',
          severity: 'error'
        });
      } else if (data.mana_balance < 0) {
        errors.push({
          field: 'mana_balance',
          message: 'Баланс маны не может быть отрицательным',
          severity: 'error'
        });
      } else if (!Number.isInteger(data.mana_balance)) {
        errors.push({
          field: 'mana_balance',
          message: 'Баланс маны должен быть целым числом',
          severity: 'error'
        });
      } else if (data.mana_balance > 1000000) {
        warnings.push({
          field: 'mana_balance',
          message: 'Очень высокий баланс маны (>1,000,000). Убедитесь, что это правильно',
          severity: 'warning'
        });
      }
    }

    // Validate rank
    if (data.rank !== undefined) {
      if (!VALID_RANKS.includes(data.rank)) {
        errors.push({
          field: 'rank',
          message: `Недопустимый ранг. Допустимые ранги: ${VALID_RANKS.join(', ')}`,
          severity: 'error'
        });
      }
    }

    // Validate experience_points
    if (data.experience_points !== undefined) {
      if (typeof data.experience_points !== 'number' || isNaN(data.experience_points)) {
        errors.push({
          field: 'experience_points',
          message: 'Очки опыта должны быть числом',
          severity: 'error'
        });
      } else if (data.experience_points < 0) {
        errors.push({
          field: 'experience_points',
          message: 'Очки опыта не могут быть отрицательными',
          severity: 'error'
        });
      } else if (!Number.isInteger(data.experience_points)) {
        errors.push({
          field: 'experience_points',
          message: 'Очки опыта должны быть целым числом',
          severity: 'error'
        });
      } else if (data.experience_points > 1000000) {
        warnings.push({
          field: 'experience_points',
          message: 'Очень высокие очки опыта (>1,000,000). Убедитесь, что это правильно',
          severity: 'warning'
        });
      }
    }

    // Validate quota values
    const quotaFields = [
      { field: 'daily_quota_used', label: 'Дневная квота', max: 100 },
      { field: 'weekly_quota_used', label: 'Недельная квота', max: 500 },
      { field: 'monthly_quota_used', label: 'Месячная квота', max: 2000 }
    ];

    quotaFields.forEach(({ field, label, max }) => {
      const value = (data as any)[field];
      if (value !== undefined) {
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            field,
            message: `${label} должна быть числом`,
            severity: 'error'
          });
        } else if (value < 0) {
          errors.push({
            field,
            message: `${label} не может быть отрицательной`,
            severity: 'error'
          });
        } else if (!Number.isInteger(value)) {
          errors.push({
            field,
            message: `${label} должна быть целым числом`,
            severity: 'error'
          });
        } else if (value > max) {
          warnings.push({
            field,
            message: `${label} превышает рекомендуемое значение (>${max}). Убедитесь, что это правильно`,
            severity: 'warning'
          });
        }
      }
    });

    // Cross-field validation
    if (selectedUser && data.experience_points !== undefined && data.rank !== undefined) {
      const rankIndex = VALID_RANKS.indexOf(data.rank);
      const expectedMinExp = rankIndex * 1000; // Simple calculation
      
      if (data.experience_points < expectedMinExp) {
        warnings.push({
          field: 'experience_points',
          message: `Опыт (${data.experience_points}) может быть недостаточным для ранга "${data.rank}" (ожидается минимум ${expectedMinExp})`,
          severity: 'warning'
        });
      }
    }

    // Additional business logic validation
    if (selectedUser && data.mana_balance !== undefined) {
      const currentBalance = selectedUser.mana_balance;
      const difference = Math.abs(data.mana_balance - currentBalance);
      
      if (difference > currentBalance * 2 && currentBalance > 0) {
        warnings.push({
          field: 'mana_balance',
          message: `Изменение баланса более чем в 2 раза (${currentBalance} → ${data.mana_balance}). Проверьте правильность`,
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

  // Handle form changes with validation
  const handleFormChange = (field: keyof UserParameterUpdate, value: any) => {
    let sanitizedValue = value;
    
    // Sanitize input based on field type
    if (field === 'reason') {
      sanitizedValue = sanitizeTextInput(value);
    } else if (typeof value === 'string' && ['mana_balance', 'experience_points', 'daily_quota_used', 'weekly_quota_used', 'monthly_quota_used'].includes(field)) {
      sanitizedValue = sanitizeNumberInput(value);
    }
    
    const newFormData = {
      ...formData,
      [field]: sanitizedValue
    };
    
    setFormData(newFormData);
    setShowPreview(false);
    setError(null); // Clear any previous errors
    
    // Validate on change
    const validation = validateParameters(newFormData);
    setValidationResult(validation);
  };

  // Generate preview of changes
  const generatePreview = () => {
    if (!selectedUser) return;
    
    // Validate first
    const validation = validateParameters(formData);
    setValidationResult(validation);
    
    if (!validation.isValid) {
      return; // Don't show preview if there are validation errors
    }
    
    const changes: ParameterChange[] = [];
    
    if (formData.mana_balance !== undefined && formData.mana_balance !== selectedUser.mana_balance) {
      changes.push({
        field: 'mana_balance',
        oldValue: selectedUser.mana_balance,
        newValue: formData.mana_balance,
        label: 'Баланс маны'
      });
    }
    
    if (formData.rank !== undefined && formData.rank !== selectedUser.rank) {
      changes.push({
        field: 'rank',
        oldValue: selectedUser.rank,
        newValue: formData.rank,
        label: 'Ранг'
      });
    }
    
    if (formData.experience_points !== undefined && formData.experience_points !== selectedUser.experience_points) {
      changes.push({
        field: 'experience_points',
        oldValue: selectedUser.experience_points,
        newValue: formData.experience_points,
        label: 'Очки опыта'
      });
    }
    
    if (formData.daily_quota_used !== undefined && formData.daily_quota_used !== selectedUser.daily_quota_used) {
      changes.push({
        field: 'daily_quota_used',
        oldValue: selectedUser.daily_quota_used,
        newValue: formData.daily_quota_used,
        label: 'Использованная дневная квота'
      });
    }
    
    if (formData.weekly_quota_used !== undefined && formData.weekly_quota_used !== selectedUser.weekly_quota_used) {
      changes.push({
        field: 'weekly_quota_used',
        oldValue: selectedUser.weekly_quota_used,
        newValue: formData.weekly_quota_used,
        label: 'Использованная недельная квота'
      });
    }
    
    if (formData.monthly_quota_used !== undefined && formData.monthly_quota_used !== selectedUser.monthly_quota_used) {
      changes.push({
        field: 'monthly_quota_used',
        oldValue: selectedUser.monthly_quota_used,
        newValue: formData.monthly_quota_used,
        label: 'Использованная месячная квота'
      });
    }
    
    setPreviewChanges(changes);
    setShowPreview(true);
  };

  // Show confirmation dialog for critical changes
  const showConfirmationDialog = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialogData({ title, message, onConfirm });
    setShowConfirmDialog(true);
  };

  // Check if changes are critical and need confirmation
  const isCriticalChange = (changes: ParameterChange[]): boolean => {
    return changes.some(change => {
      if (change.field === 'mana_balance') {
        const diff = Math.abs(change.newValue - change.oldValue);
        return diff > 10000; // Large mana changes
      }
      if (change.field === 'rank') {
        const oldIndex = VALID_RANKS.indexOf(change.oldValue);
        const newIndex = VALID_RANKS.indexOf(change.newValue);
        return Math.abs(newIndex - oldIndex) > 2; // Rank changes by more than 2 levels
      }
      if (change.field === 'experience_points') {
        const diff = Math.abs(change.newValue - change.oldValue);
        return diff > 50000; // Large experience changes
      }
      return false;
    });
  };

  // Apply changes with validation and confirmation
  const applyChanges = async () => {
    if (!selectedUser) return;
    
    // Final validation
    const validation = validateParameters(formData);
    setValidationResult(validation);
    
    if (!validation.isValid) {
      return;
    }
    
    // Check if critical changes need confirmation
    if (isCriticalChange(previewChanges)) {
      const criticalChanges = previewChanges.filter(change => {
        if (change.field === 'mana_balance') {
          const diff = Math.abs(change.newValue - change.oldValue);
          return diff > 10000;
        }
        if (change.field === 'rank') {
          const oldIndex = VALID_RANKS.indexOf(change.oldValue);
          const newIndex = VALID_RANKS.indexOf(change.newValue);
          return Math.abs(newIndex - oldIndex) > 2;
        }
        if (change.field === 'experience_points') {
          const diff = Math.abs(change.newValue - change.oldValue);
          return diff > 50000;
        }
        return false;
      });
      
      const criticalChangesList = criticalChanges.map(c => `${c.label}: ${c.oldValue} → ${c.newValue}`).join('\n');
      
      showConfirmationDialog(
        'Критические изменения',
        `Вы собираетесь внести критические изменения:\n\n${criticalChangesList}\n\nПользователь: ${selectedUser.name}\nПричина: ${formData.reason}\n\nВы уверены, что хотите продолжить?`,
        () => performApplyChanges()
      );
      return;
    }
    
    // Apply changes directly if not critical
    await performApplyChanges();
  };

  // Perform the actual API call
  const performApplyChanges = async () => {
    if (!selectedUser) return;
    
    try {
      setUpdating(true);
      setError(null);
      
      const response = await fetch(`/api/admin/users/${selectedUser.id}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error types
        if (response.status === 400) {
          if (errorData.code === 'VALIDATION_ERROR') {
            setValidationResult({
              isValid: false,
              errors: errorData.details?.map((detail: string) => ({
                field: 'general',
                message: detail,
                severity: 'error' as const
              })) || [{ field: 'general', message: errorData.error, severity: 'error' as const }],
              warnings: []
            });
            return;
          }
        } else if (response.status === 404) {
          throw new Error('Пользователь не найден. Возможно, он был удален.');
        } else if (response.status === 403) {
          throw new Error('Недостаточно прав для выполнения этой операции.');
        } else if (response.status >= 500) {
          throw new Error('Ошибка сервера. Попробуйте позже или обратитесь к администратору.');
        }
        
        throw new Error(errorData.error || 'Ошибка применения изменений');
      }
      
      const result = await response.json();
      
      // Show success message with details
      const successMessage = `Изменения успешно применены!\n\nИзменено полей: ${result.changes.length}\nПользователь: ${selectedUser.name}`;
      
      if (result.warnings && result.warnings.length > 0) {
        const warningsText = result.warnings.join('\n');
        alert(`${successMessage}\n\nПредупреждения:\n${warningsText}`);
      } else {
        alert(successMessage);
      }
      
      // Reload users and reset form
      await loadUsers();
      setSelectedUser(null);
      setFormData({ reason: '' });
      setShowPreview(false);
      setPreviewChanges([]);
      setValidationResult({ isValid: true, errors: [], warnings: [] });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка применения изменений';
      setError(errorMessage);
      
      // Also show in alert for immediate feedback
      alert(`Ошибка: ${errorMessage}`);
    } finally {
      setUpdating(false);
      setShowConfirmDialog(false);
      setConfirmDialogData(null);
    }
  };

  // Reset form
  const resetForm = () => {
    if (selectedUser) {
      setFormData({
        mana_balance: selectedUser.mana_balance,
        rank: selectedUser.rank,
        experience_points: selectedUser.experience_points,
        daily_quota_used: selectedUser.daily_quota_used,
        weekly_quota_used: selectedUser.weekly_quota_used,
        monthly_quota_used: selectedUser.monthly_quota_used,
        reason: ''
      });
    }
    setShowPreview(false);
    setPreviewChanges([]);
    setValidationResult({ isValid: true, errors: [], warnings: [] });
    setError(null);
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

  // Confirmation dialog component
  const ConfirmationDialog = () => {
    if (!showConfirmDialog || !confirmDialogData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">{confirmDialogData.title}</h3>
          </div>
          
          <div className="mb-6">
            <p className="text-sm text-gray-600 whitespace-pre-line">{confirmDialogData.message}</p>
          </div>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setShowConfirmDialog(false);
                setConfirmDialogData(null);
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Отменить
            </button>
            <button
              onClick={confirmDialogData.onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Подтвердить
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка пользователей...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800 mb-2">Ошибка загрузки</h3>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button 
              onClick={loadUsers}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Повторить попытку
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminSecurityGuard>
      <div className={`p-6 space-y-6 ${className}`}>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Управление параметрами пользователей</h2>
            <p className="text-sm text-gray-600 mt-1">
              Горячие клавиши: Ctrl+Enter - предпросмотр, Escape - отмена/сброс
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={loadUsers}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Загрузка...
                </>
              ) : (
                'Обновить данные'
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Search and Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Поиск и выбор пользователя</h3>
            
            {/* Search and Filters */}
            <div className="space-y-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Поиск по имени, username или Telegram ID"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={rankFilter}
                  onChange={(e) => setRankFilter(e.target.value)}
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Все ранги</option>
                  {VALID_RANKS.map(rank => (
                    <option key={rank} value={rank}>{rank}</option>
                  ))}
                </select>
                
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="updated_at-desc">По дате обновления ↓</option>
                  <option value="mana_balance-desc">По балансу маны ↓</option>
                  <option value="experience_points-desc">По опыту ↓</option>
                  <option value="name-asc">По имени ↑</option>
                  <option value="last_activity-desc">По активности ↓</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={minManaFilter}
                  onChange={(e) => setMinManaFilter(e.target.value)}
                  placeholder="Мин. мана"
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={maxManaFilter}
                  onChange={(e) => setMaxManaFilter(e.target.value)}
                  placeholder="Макс. мана"
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Users List */}
            <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Пользователи не найдены
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedUser?.id === user.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{user.name}</h4>
                          {user.username && (
                            <p className="text-sm text-gray-600">@{user.username}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 text-xs rounded-full ${RANK_COLORS[user.rank as keyof typeof RANK_COLORS] || 'bg-gray-100 text-gray-800'}`}>
                              {user.rank}
                            </span>
                            <span className="text-sm text-gray-600">
                              {user.mana_balance.toLocaleString()} маны
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div>{user.experience_points} опыта</div>
                          <div>{user.total_wishes} желаний</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Parameter Editing Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Редактирование параметров</h3>
            
            {selectedUser ? (
              <div className="space-y-4">
                {/* Selected User Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Выбранный пользователь:</h4>
                  <div className="text-sm text-gray-600">
                    <div><strong>Имя:</strong> {selectedUser.name}</div>
                    {selectedUser.username && <div><strong>Username:</strong> @{selectedUser.username}</div>}
                    <div><strong>Telegram ID:</strong> {selectedUser.telegram_id}</div>
                    <div><strong>Последняя активность:</strong> {new Date(selectedUser.last_activity).toLocaleString('ru-RU')}</div>
                  </div>
                </div>

                {/* Parameter Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Баланс маны
                      {selectedUser && (
                        <span className="text-xs text-gray-500 ml-2">
                          (текущий: {selectedUser.mana_balance.toLocaleString()})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={formData.mana_balance || ''}
                      onChange={(e) => handleFormChange('mana_balance', e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                        validationResult.errors.some(e => e.field === 'mana_balance') 
                          ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                          : validationResult.warnings.some(w => w.field === 'mana_balance')
                          ? 'border-yellow-300 bg-yellow-50 focus:ring-yellow-500'
                          : 'border-gray-300'
                      }`}
                      min="0"
                      step="1"
                      placeholder="Введите новый баланс маны"
                    />
                    {validationResult.errors.find(e => e.field === 'mana_balance') && (
                      <p className="text-xs text-red-600 mt-1">
                        {validationResult.errors.find(e => e.field === 'mana_balance')?.message}
                      </p>
                    )}
                    {validationResult.warnings.find(w => w.field === 'mana_balance') && (
                      <p className="text-xs text-yellow-600 mt-1">
                        {validationResult.warnings.find(w => w.field === 'mana_balance')?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ранг
                      {selectedUser && (
                        <span className="text-xs text-gray-500 ml-2">
                          (текущий: {selectedUser.rank})
                        </span>
                      )}
                    </label>
                    <select
                      value={formData.rank || ''}
                      onChange={(e) => handleFormChange('rank', e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                        validationResult.errors.some(e => e.field === 'rank') 
                          ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                          : 'border-gray-300'
                      }`}
                    >
                      {VALID_RANKS.map(rank => (
                        <option key={rank} value={rank}>{rank}</option>
                      ))}
                    </select>
                    {validationResult.errors.find(e => e.field === 'rank') && (
                      <p className="text-xs text-red-600 mt-1">
                        {validationResult.errors.find(e => e.field === 'rank')?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Очки опыта
                      {selectedUser && (
                        <span className="text-xs text-gray-500 ml-2">
                          (текущие: {selectedUser.experience_points.toLocaleString()})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={formData.experience_points || ''}
                      onChange={(e) => handleFormChange('experience_points', e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                        validationResult.errors.some(e => e.field === 'experience_points') 
                          ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                          : validationResult.warnings.some(w => w.field === 'experience_points')
                          ? 'border-yellow-300 bg-yellow-50 focus:ring-yellow-500'
                          : 'border-gray-300'
                      }`}
                      min="0"
                      step="1"
                      placeholder="Введите новые очки опыта"
                    />
                    {validationResult.errors.find(e => e.field === 'experience_points') && (
                      <p className="text-xs text-red-600 mt-1">
                        {validationResult.errors.find(e => e.field === 'experience_points')?.message}
                      </p>
                    )}
                    {validationResult.warnings.find(w => w.field === 'experience_points') && (
                      <p className="text-xs text-yellow-600 mt-1">
                        {validationResult.warnings.find(w => w.field === 'experience_points')?.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Дневная квота
                        {selectedUser && (
                          <span className="text-xs text-gray-500 block">
                            (текущая: {selectedUser.daily_quota_used})
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        value={formData.daily_quota_used || ''}
                        onChange={(e) => handleFormChange('daily_quota_used', e.target.value)}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                          validationResult.errors.some(e => e.field === 'daily_quota_used') 
                            ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                            : validationResult.warnings.some(w => w.field === 'daily_quota_used')
                            ? 'border-yellow-300 bg-yellow-50 focus:ring-yellow-500'
                            : 'border-gray-300'
                        }`}
                        min="0"
                        step="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Недельная квота
                        {selectedUser && (
                          <span className="text-xs text-gray-500 block">
                            (текущая: {selectedUser.weekly_quota_used})
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        value={formData.weekly_quota_used || ''}
                        onChange={(e) => handleFormChange('weekly_quota_used', e.target.value)}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                          validationResult.errors.some(e => e.field === 'weekly_quota_used') 
                            ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                            : validationResult.warnings.some(w => w.field === 'weekly_quota_used')
                            ? 'border-yellow-300 bg-yellow-50 focus:ring-yellow-500'
                            : 'border-gray-300'
                        }`}
                        min="0"
                        step="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Месячная квота
                        {selectedUser && (
                          <span className="text-xs text-gray-500 block">
                            (текущая: {selectedUser.monthly_quota_used})
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        value={formData.monthly_quota_used || ''}
                        onChange={(e) => handleFormChange('monthly_quota_used', e.target.value)}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                          validationResult.errors.some(e => e.field === 'monthly_quota_used') 
                            ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                            : validationResult.warnings.some(w => w.field === 'monthly_quota_used')
                            ? 'border-yellow-300 bg-yellow-50 focus:ring-yellow-500'
                            : 'border-gray-300'
                        }`}
                        min="0"
                        step="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Причина изменений <span className="text-red-500">*</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({formData.reason.length}/500 символов)
                      </span>
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => handleFormChange('reason', e.target.value)}
                      placeholder="Укажите подробную причину изменения параметров пользователя (минимум 10 символов)"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                        validationResult.errors.some(e => e.field === 'reason') 
                          ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                          : validationResult.warnings.some(w => w.field === 'reason')
                          ? 'border-yellow-300 bg-yellow-50 focus:ring-yellow-500'
                          : 'border-gray-300'
                      }`}
                      rows={3}
                      maxLength={500}
                      required
                    />
                    {validationResult.errors.find(e => e.field === 'reason') && (
                      <p className="text-xs text-red-600 mt-1">
                        {validationResult.errors.find(e => e.field === 'reason')?.message}
                      </p>
                    )}
                    {validationResult.warnings.find(w => w.field === 'reason') && (
                      <p className="text-xs text-yellow-600 mt-1">
                        {validationResult.warnings.find(w => w.field === 'reason')?.message}
                      </p>
                    )}
                  </div>

                  {/* Validation Display */}
                  <ValidationDisplay validation={validationResult} />

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={generatePreview}
                      disabled={!validationResult.isValid || !formData.reason.trim()}
                      className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Предварительный просмотр
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Сбросить
                    </button>
                  </div>
                </div>

                {/* Preview Changes */}
                {showPreview && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-3">Предварительный просмотр изменений</h4>
                    
                    {previewChanges.length === 0 ? (
                      <p className="text-blue-700">Изменения не обнаружены</p>
                    ) : (
                      <div className="space-y-2">
                        {previewChanges.map((change, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="font-medium text-blue-900">{change.label}:</span>
                            <span className="text-blue-700">
                              <span className="line-through text-red-600">{change.oldValue}</span>
                              {' → '}
                              <span className="text-green-600 font-medium">{change.newValue}</span>
                            </span>
                          </div>
                        ))}
                        
                        <div className="mt-4 pt-3 border-t border-blue-200">
                          <div className="text-sm text-blue-700">
                            <strong>Причина:</strong> {formData.reason}
                          </div>
                        </div>
                        
                        <div className="mt-4 flex gap-3">
                          <button
                            onClick={applyChanges}
                            disabled={updating || previewChanges.length === 0}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                          >
                            {updating ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Применение изменений...
                              </>
                            ) : (
                              `Применить изменения (${previewChanges.length})`
                            )}
                          </button>
                          <button
                            onClick={() => setShowPreview(false)}
                            disabled={updating}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            Отменить
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p>Выберите пользователя для редактирования параметров</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog />
    </AdminSecurityGuard>
  );
}