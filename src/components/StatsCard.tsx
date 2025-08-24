'use client';

interface StatsCardProps {
  totalWishes: number;
  completedWishes: number;
  activeWishes: number;
}

export default function StatsCard({ totalWishes, completedWishes, activeWishes }: StatsCardProps) {
  const completionRate = totalWishes > 0 ? Math.round((completedWishes / totalWishes) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Статистика</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{activeWishes}</div>
          <div className="text-xs text-gray-600">Активных</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{completedWishes}</div>
          <div className="text-xs text-gray-600">Выполнено</div>
        </div>
        
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{totalWishes}</div>
          <div className="text-xs text-gray-600">Всего</div>
        </div>
        
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{completionRate}%</div>
          <div className="text-xs text-gray-600">Успешность</div>
        </div>
      </div>
    </div>
  );
}