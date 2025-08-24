'use client';

import Link from 'next/link';
import BurgerMenu from '@/components/BurgerMenu';

export default function RulesPage() {
  const rules = [
    {
      type: 'green',
      emoji: '💚',
      title: 'ЗЕЛЁНЫЕ ЖЕЛАНИЯ',
      subtitle: 'Базовый уровень',
      cost: '1 зелёное',
      description: 'Простые, милые или смешные желания, которые можно исполнить прямо сейчас или в течение дня. Не требуют больших затрат и усилий.',
      examples: [
        'Сделай мне чай',
        'Расскажи анекдот',
        'Выбери, что будем смотреть'
      ],
      bgColor: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-200',
      accentColor: 'bg-green-500'
    },
    {
      type: 'blue',
      emoji: '💙',
      title: 'СИНИЕ ЖЕЛАНИЯ',
      subtitle: 'Повышенный уровень',
      cost: '10 зелёных ИЛИ 1 синее',
      description: 'Более сложные или личные желания. Могут требовать небольших приготовлений, времени (до недели) или креативности.',
      examples: [
        'Приготовь ужин по моему выбору',
        'Напиши мне стих',
        'Сыграй со мной в настолку'
      ],
      bgColor: 'from-blue-50 to-sky-50',
      borderColor: 'border-blue-200',
      accentColor: 'bg-blue-500'
    },
    {
      type: 'red',
      emoji: '❤️',
      title: 'КРАСНЫЕ ЖЕЛАНИЯ',
      subtitle: 'Легендарный уровень',
      cost: '10 синих ИЛИ 1 красное',
      description: 'Самые ценные и серьёзные желания. Исполнение может требовать значительных усилий, времени (месяц и больше), планирования или быть очень личным. Обоюдное согласие на исполнение — обязательно!',
      examples: [
        'Организуй нам поездку на выходные',
        'Исполни мою давнюю мечту (озвучиваю)'
      ],
      bgColor: 'from-red-50 to-pink-50',
      borderColor: 'border-red-200',
      accentColor: 'bg-red-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <BurgerMenu />
      
      <div className="max-w-4xl mx-auto p-4 pt-20">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-4"
          >
            <span className="text-xl">←</span>
            <span>Назад к приложению</span>
          </Link>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            📋 Правила Банка Желаний
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Система уровней желаний помогает справедливо распределять усилия и делает процесс исполнения желаний более интересным
          </p>
        </div>

        {/* Rules Cards */}
        <div className="space-y-8">
          {rules.map((rule) => (
            <div
              key={rule.type}
              className={`bg-gradient-to-r ${rule.bgColor} rounded-2xl border-2 ${rule.borderColor} p-6 shadow-lg hover:shadow-xl transition-all duration-300`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="text-5xl">{rule.emoji}</div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">
                    {rule.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className={`px-3 py-1 ${rule.accentColor} text-white rounded-full text-sm font-medium`}>
                      {rule.subtitle}
                    </span>
                    <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700">
                      Стоимость: {rule.cost}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">Условия:</h3>
                <p className="text-gray-700 leading-relaxed">
                  {rule.description}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Примеры:</h3>
                <div className="grid gap-2">
                  {rule.examples.map((example, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-white/70 rounded-lg border border-white/50"
                    >
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-700 font-medium">«{example}»</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Exchange Info */}
        <div className="mt-12 bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
            💱 Система обмена
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-blue-200">
              <div className="text-3xl mb-2">💚 → 💙</div>
              <div className="font-bold text-lg text-gray-800">10 зелёных = 1 синее</div>
              <div className="text-sm text-gray-600 mt-1">Накопите зелёные для более серьёзных желаний</div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-red-50 rounded-xl border border-red-200">
              <div className="text-3xl mb-2">💙 → ❤️</div>
              <div className="font-bold text-lg text-gray-800">10 синих = 1 красное</div>
              <div className="text-sm text-gray-600 mt-1">Самые ценные желания требуют терпения</div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border-2 border-yellow-200 p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>💡</span>
            Советы по использованию
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700">Начинайте с зелёных желаний для знакомства с системой</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700">Будьте конкретными в описании желаний</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700">Обсуждайте красные желания заранее</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-blue-500 font-bold">ℹ</span>
                <span className="text-gray-700">Исполнение желания должно приносить радость обеим сторонам</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-500 font-bold">ℹ</span>
                <span className="text-gray-700">Можно отказаться от исполнения, если это неудобно</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-500 font-bold">ℹ</span>
                <span className="text-gray-700">Дарите желания за хорошие поступки и помощь</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 pb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <span>🎯</span>
            <span>Перейти к Банку Желаний</span>
          </Link>
        </div>
      </div>
    </div>
  );
}