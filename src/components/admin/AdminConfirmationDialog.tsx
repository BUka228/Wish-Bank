'use client';

import React, { useState, useEffect } from 'react';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  requiresTyping?: boolean;
  requiredText?: string;
  details?: Array<{
    label: string;
    value: string;
    highlight?: boolean;
  }>;
  warnings?: string[];
  countdown?: number; // Seconds to wait before allowing confirmation
}

export default function AdminConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отменить',
  variant = 'warning',
  requiresTyping = false,
  requiredText = '',
  details = [],
  warnings = [],
  countdown = 0
}: ConfirmationDialogProps) {
  const [typedText, setTypedText] = useState('');
  const [remainingTime, setRemainingTime] = useState(countdown);
  const [isCountdownActive, setIsCountdownActive] = useState(countdown > 0);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setTypedText('');
      setRemainingTime(countdown);
      setIsCountdownActive(countdown > 0);
    }
  }, [isOpen, countdown]);

  // Countdown timer
  useEffect(() => {
    if (isCountdownActive && remainingTime > 0) {
      const timer = setTimeout(() => {
        setRemainingTime(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (remainingTime === 0) {
      setIsCountdownActive(false);
    }
  }, [isCountdownActive, remainingTime]);

  // Check if confirmation is allowed
  const canConfirm = () => {
    if (isCountdownActive || remainingTime > 0) return false;
    if (requiresTyping && typedText !== requiredText) return false;
    return true;
  };

  // Handle confirm
  const handleConfirm = () => {
    if (canConfirm()) {
      onConfirm();
      onClose();
    }
  };

  // Handle key press
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && canConfirm()) {
      handleConfirm();
    } else if (event.key === 'Escape') {
      onClose();
    }
  };

  // Get variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: (
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          iconBg: 'bg-red-100',
          confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        };
      case 'warning':
        return {
          icon: (
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          iconBg: 'bg-yellow-100',
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
        };
      case 'info':
        return {
          icon: (
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          iconBg: 'bg-blue-100',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
        };
    }
  };

  if (!isOpen) return null;

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        onKeyDown={handleKeyPress}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center">
            <div className={`flex-shrink-0 mx-auto flex items-center justify-center h-12 w-12 rounded-full ${styles.iconBg}`}>
              {styles.icon}
            </div>
            <div className="ml-4 text-left">
              <h3 className="text-lg font-medium text-gray-900">
                {title}
              </h3>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-4">
          <div className="text-sm text-gray-600 mb-4">
            {message}
          </div>

          {/* Details */}
          {details.length > 0 && (
            <div className="mb-4 bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Детали операции:</h4>
              <dl className="space-y-1">
                {details.map((detail, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <dt className="text-gray-600">{detail.label}:</dt>
                    <dd className={`font-medium ${detail.highlight ? 'text-red-600' : 'text-gray-900'}`}>
                      {detail.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Предупреждения:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Countdown */}
          {isCountdownActive && remainingTime > 0 && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-blue-800">
                  Подождите {remainingTime} сек. перед подтверждением
                </span>
              </div>
            </div>
          )}

          {/* Text confirmation */}
          {requiresTyping && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Для подтверждения введите: <code className="bg-gray-100 px-1 rounded">{requiredText}</code>
              </label>
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Введите "${requiredText}"`}
                autoFocus
              />
              {typedText && typedText !== requiredText && (
                <p className="mt-1 text-sm text-red-600">
                  Текст не совпадает
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm()}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmButton}`}
          >
            {isCountdownActive && remainingTime > 0 
              ? `${confirmText} (${remainingTime})`
              : confirmText
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for using confirmation dialogs
export function useConfirmationDialog() {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    props: Omit<ConfirmationDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>;
    onConfirm: () => void;
  } | null>(null);

  const showConfirmation = (
    props: Omit<ConfirmationDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>,
    onConfirm: () => void
  ) => {
    setDialogState({
      isOpen: true,
      props,
      onConfirm
    });
  };

  const hideConfirmation = () => {
    setDialogState(null);
  };

  const handleConfirm = () => {
    if (dialogState) {
      dialogState.onConfirm();
      hideConfirmation();
    }
  };

  const ConfirmationDialog = dialogState ? (
    <AdminConfirmationDialog
      {...dialogState.props}
      isOpen={dialogState.isOpen}
      onClose={hideConfirmation}
      onConfirm={handleConfirm}
    />
  ) : null;

  return {
    showConfirmation,
    hideConfirmation,
    ConfirmationDialog
  };
}

// Predefined confirmation dialogs for common admin operations
export const AdminConfirmations = {
  // User parameter changes
  userParameterChange: (userName: string, changes: Array<{label: string, oldValue: any, newValue: any}>) => ({
    title: 'Подтверждение изменения параметров',
    message: `Вы собираетесь изменить параметры пользователя "${userName}".`,
    variant: 'warning' as const,
    details: changes.map(change => ({
      label: change.label,
      value: `${change.oldValue} → ${change.newValue}`,
      highlight: Math.abs(Number(change.newValue) - Number(change.oldValue)) > 1000
    })),
    warnings: changes.some(c => Math.abs(Number(c.newValue) - Number(c.oldValue)) > 10000) 
      ? ['Обнаружены значительные изменения (>10,000)']
      : [],
    countdown: changes.some(c => Math.abs(Number(c.newValue) - Number(c.oldValue)) > 10000) ? 5 : 0
  }),

  // Mass operations
  massOperation: (operationType: string, affectedCount: number) => ({
    title: 'Подтверждение массовой операции',
    message: `Вы собираетесь выполнить "${operationType}" для ${affectedCount} элементов.`,
    variant: 'danger' as const,
    requiresTyping: affectedCount > 10,
    requiredText: 'ПОДТВЕРЖДАЮ',
    warnings: [
      'Массовые операции необратимы',
      'Рекомендуется создать резервную копию',
      `Будет затронуто ${affectedCount} элементов`
    ],
    countdown: 10
  }),

  // Shared wish deletion
  sharedWishDeletion: (wishDescription: string, participantCount: number) => ({
    title: 'Удаление общего желания',
    message: `Вы собираетесь удалить общее желание "${wishDescription}".`,
    variant: 'danger' as const,
    details: [
      { label: 'Участников', value: participantCount.toString(), highlight: participantCount > 10 }
    ],
    warnings: participantCount > 0 
      ? [`${participantCount} пользователей потеряют доступ к этому желанию`]
      : [],
    requiresTyping: participantCount > 5,
    requiredText: 'УДАЛИТЬ',
    countdown: participantCount > 10 ? 5 : 0
  }),

  // System maintenance
  systemMaintenance: (maintenanceType: string) => ({
    title: 'Системное обслуживание',
    message: `Вы собираетесь выполнить "${maintenanceType}".`,
    variant: 'warning' as const,
    warnings: [
      'Операция может повлиять на работу системы',
      'Рекомендуется выполнять в нерабочее время'
    ],
    countdown: 3
  })
};