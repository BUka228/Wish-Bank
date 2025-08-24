'use client';

import { useState, useEffect } from 'react';

interface ExchangeRate {
  from: 'green' | 'blue' | 'red';
  to: 'green' | 'blue' | 'red';
  rate: number;
  description: string;
}

interface ExchangeCalculatorProps {
  currentUserId: string;
  partnerUserId: string;
  partnerName: string;
  onExchange?: () => void;
}

const defaultExchangeRates: ExchangeRate[] = [
  { from: 'green', to: 'blue', rate: 3, description: '3 зеленых = 1 синее' },
  { from: 'green', to: 'red', rate: 5, description: '5 зеленых = 1 красное' },
  { from: 'blue', to: 'green', rate: 0.33, description: '1 синее = 3 зеленых' },
  { from: 'blue', to: 'red', rate: 2, description: '2 синих = 1 красное' },
  { from: 'red', to: 'green', rate: 0.2, description: '1 красное = 5 зеленых' },
  { from: 'red', to: 'blue', rate: 0.5, description: '1 красное = 2 синих' }
];

const wishTypeConfig = {
  green: { emoji: '💚', label: 'Зеленые', color: 'green' },
  blue: { emoji: '💙', label: 'Синие', color: 'blue' },
  red: { emoji: '❤️', label: 'Красные', color: 'red' }
};

export default function ExchangeCalculator({ 
  currentUserId, 
  partnerUserId, 
  partnerName, 
  onExchange 
}: ExchangeCalculatorProps) {
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>(defaultExchangeRates);
  const [fromType, setFromType] = useState<'green' | 'blue' | 'red'>('green');
  const [toType, setToType] = useState<'green' | 'blue' | 'red'>('blue');
  const [fromAmount, setFromAmount] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);

  // Загрузка балансов и курсов обмена
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Загружаем балансы пользователя
      const balanceResponse = await fetch('/api/economy/balance');
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalances(balanceData.balances);
      }

      // Загружаем актуальные курсы обмена
      const ratesResponse = await fetch('/api/economy/exchange-rates');
      if (ratesResponse.ok) {
        const ratesData = await ratesResponse.json();
        setExchangeRates(ratesData.rates || defaultExchangeRates);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Получение курса обмена
  const getExchangeRate = (from: string, to: string): ExchangeRate | null => {
    return exchangeRates.find(rate => rate.from === from && rate.to === to) || null;
  };

  // Расчет результата обмена
  const calculateExchange = (): { toAmount: number; rate: ExchangeRate | null } => {
    const rate = getExchangeRate(fromType, toType);
    if (!rate) return { toAmount: 0, rate: null };
    
    const toAmount = Math.floor(fromAmount / rate.rate);
    return { toAmount, rate };
  };

  // Выполнение обмена
  const handleExchange = async () => {
    const { toAmount, rate } = calculateExchange();
    
    if (!rate || toAmount <= 0) {
      setError('Невозможно выполнить обмен с указанными параметрами');
      return;
    }

    if (balances[fromType] < fromAmount) {
      setError(`Недостаточно ${wishTypeConfig[fromType].label.toLowerCase()} желаний`);
      return;
    }

    setExchanging(true);
    try {
      const response = await fetch('/api/economy/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_type: fromType,
          to_type: toType,
          from_amount: fromAmount,
          to_amount: toAmount
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка обмена');
      }

      await loadData(); // Обновляем балансы
      setFromAmount(1); // Сбрасываем количество
      onExchange?.();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка выполнения обмена');
    } finally {
      setExchanging(false);
    }
  };

  const { toAmount, rate } = calculateExchange();
  const canExchange = rate && toAmount > 0 && balances[fromType] >= fromAmount;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin text-3xl mb-3">🔄</div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка калькулятора обмена...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">
        🔄 Калькулятор обмена желаний
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Текущие балансы */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">💰 Ваши балансы</h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(wishTypeConfig).map(([type, config]) => (
            <div key={type} className="text-center">
              <div className="text-2xl mb-1">{config.emoji}</div>
              <div className="text-xl font-bold text-gray-800 dark:text-gray-200">
                {balances[type] || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {config.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Калькулятор обмена */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Отдаю */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">📤 Отдаю</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Тип желания
              </label>
              <select
                value={fromType}
                onChange={(e) => setFromType(e.target.value as 'green' | 'blue' | 'red')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(wishTypeConfig).map(([type, config]) => (
                  <option key={type} value={type}>
                    {config.emoji} {config.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Количество
              </label>
              <input
                type="number"
                min="1"
                max={balances[fromType] || 0}
                value={fromAmount}
                onChange={(e) => setFromAmount(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Доступно: {balances[fromType] || 0}
              </p>
            </div>
          </div>

          {/* Получаю */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">📥 Получаю</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Тип желания
              </label>
              <select
                value={toType}
                onChange={(e) => setToType(e.target.value as 'green' | 'blue' | 'red')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(wishTypeConfig).map(([type, config]) => (
                  <option key={type} value={type}>
                    {config.emoji} {config.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Количество
              </label>
              <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-gray-100">
                <span className="text-2xl font-bold">{toAmount}</span>
              </div>
              {rate && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Курс: {rate.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Предварительный просмотр обмена */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">
            🔍 Предварительный просмотр обмена
          </h4>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-2xl mb-1">{wishTypeConfig[fromType].emoji}</div>
              <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                -{fromAmount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {wishTypeConfig[fromType].label}
              </div>
            </div>
            
            <div className="text-2xl text-blue-600 dark:text-blue-400">
              ➡️
            </div>
            
            <div className="text-center">
              <div className="text-2xl mb-1">{wishTypeConfig[toType].emoji}</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                +{toAmount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {wishTypeConfig[toType].label}
              </div>
            </div>
          </div>
        </div>

        {/* Кнопка обмена */}
        <div className="flex gap-4">
          <button
            onClick={handleExchange}
            disabled={!canExchange || exchanging}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exchanging ? '⏳ Обмениваем...' : '🔄 Выполнить обмен'}
          </button>
        </div>

        {!canExchange && !exchanging && (
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            {!rate ? 'Обмен между выбранными типами недоступен' :
             toAmount <= 0 ? 'Недостаточно желаний для обмена' :
             balances[fromType] < fromAmount ? `Недостаточно ${wishTypeConfig[fromType].label.toLowerCase()}` :
             'Проверьте параметры обмена'}
          </div>
        )}
      </div>

      {/* Таблица курсов */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">
          📊 Актуальные курсы обмена
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exchangeRates.map((rate, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500">
              <div className="flex items-center gap-2">
                <span className="text-lg">{wishTypeConfig[rate.from].emoji}</span>
                <span className="text-xl">→</span>
                <span className="text-lg">{wishTypeConfig[rate.to].emoji}</span>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {rate.description}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Информация */}
      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          💡 Как работает обмен
        </h4>
        <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          <p>• Обмен позволяет конвертировать один тип желаний в другой</p>
          <p>• Курсы обмена отражают ценность разных типов желаний</p>
          <p>• Красные желания самые ценные, зеленые - самые доступные</p>
          <p>• Обмен происходит мгновенно и необратимо</p>
        </div>
      </div>
    </div>
  );
}