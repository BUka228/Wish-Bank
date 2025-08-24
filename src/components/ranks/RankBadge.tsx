'use client';

import { Rank } from '@/types/quest-economy';

interface RankBadgeProps {
  rank: Rank;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
  showProgress?: boolean;
  currentExperience?: number;
  nextRank?: Rank;
  className?: string;
}

const sizeConfig = {
  small: {
    container: 'w-8 h-8',
    emoji: 'text-lg',
    text: 'text-xs',
    padding: 'p-1'
  },
  medium: {
    container: 'w-12 h-12',
    emoji: 'text-2xl',
    text: 'text-sm',
    padding: 'p-2'
  },
  large: {
    container: 'w-16 h-16',
    emoji: 'text-3xl',
    text: 'text-base',
    padding: 'p-3'
  }
};

// Русские военные звания с эмодзи
const rankEmojis: Record<string, string> = {
  'Рядовой': '🪖',
  'Ефрейтор': '🎖️',
  'Младший сержант': '🏅',
  'Сержант': '🎗️',
  'Старший сержант': '🏆',
  'Старшина': '👑',
  'Прапорщик': '⭐',
  'Старший прапорщик': '🌟',
  'Младший лейтенант': '💫',
  'Лейтенант': '✨',
  'Старший лейтенант': '🔥',
  'Капитан': '💎',
  'Майор': '👨‍✈️',
  'Подполковник': '🦅',
  'Полковник': '🛡️',
  'Генерал-майор': '⚔️',
  'Генерал-лейтенант': '🗡️',
  'Генерал-полковник': '👨‍💼',
  'Генерал армии': '🎖️👑',
  'Маршал': '🏛️'
};

const getRankColor = (rankName: string): string => {
  // Определяем цвет на основе уровня звания
  const lowerRanks = ['Рядовой', 'Ефрейтор'];
  const sergeantRanks = ['Младший сержант', 'Сержант', 'Старший сержант', 'Старшина'];
  const ensignRanks = ['Прапорщик', 'Старший прапорщик'];
  const officerRanks = ['Младший лейтенант', 'Лейтенант', 'Старший лейтенант', 'Капитан'];
  const seniorOfficerRanks = ['Майор', 'Подполковник', 'Полковник'];
  const generalRanks = ['Генерал-майор', 'Генерал-лейтенант', 'Генерал-полковник', 'Генерал армии', 'Маршал'];

  if (lowerRanks.includes(rankName)) return 'gray';
  if (sergeantRanks.includes(rankName)) return 'green';
  if (ensignRanks.includes(rankName)) return 'blue';
  if (officerRanks.includes(rankName)) return 'purple';
  if (seniorOfficerRanks.includes(rankName)) return 'orange';
  if (generalRanks.includes(rankName)) return 'red';
  return 'gray';
};

const getColorClasses = (color: string, size: string): string => {
  const baseClasses = sizeConfig[size as keyof typeof sizeConfig];
  
  switch (color) {
    case 'gray':
      return `${baseClasses.container} bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300`;
    case 'green':
      return `${baseClasses.container} bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300`;
    case 'blue':
      return `${baseClasses.container} bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300`;
    case 'purple':
      return `${baseClasses.container} bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300`;
    case 'orange':
      return `${baseClasses.container} bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-300`;
    case 'red':
      return `${baseClasses.container} bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-600 text-red-700 dark:text-red-300`;
    default:
      return `${baseClasses.container} bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300`;
  }
};

export default function RankBadge({ 
  rank, 
  size = 'medium', 
  showName = true, 
  showProgress = false,
  currentExperience,
  nextRank,
  className = '' 
}: RankBadgeProps) {
  const rankColor = getRankColor(rank.name);
  const colorClasses = getColorClasses(rankColor, size);
  const sizeConf = sizeConfig[size];
  const emoji = rank.emoji || rankEmojis[rank.name] || '🎖️';

  // Расчет прогресса до следующего ранга
  let progressPercentage = 0;
  let experienceToNext = 0;
  
  if (showProgress && currentExperience !== undefined && nextRank) {
    const currentRankExp = rank.min_experience;
    const nextRankExp = nextRank.min_experience;
    const progressExp = currentExperience - currentRankExp;
    const totalExpNeeded = nextRankExp - currentRankExp;
    
    progressPercentage = Math.min((progressExp / totalExpNeeded) * 100, 100);
    experienceToNext = nextRankExp - currentExperience;
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Значок ранга */}
      <div className={`${colorClasses} rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-shadow duration-200`}>
        <span className={sizeConf.emoji}>{emoji}</span>
      </div>

      {/* Информация о ранге */}
      {showName && (
        <div className="flex flex-col">
          <span className={`font-bold text-gray-800 dark:text-gray-200 ${sizeConf.text}`}>
            {rank.name}
          </span>
          
          {size !== 'small' && (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {rank.min_experience.toLocaleString()} опыта
            </span>
          )}
          
          {/* Прогресс до следующего ранга */}
          {showProgress && nextRank && currentExperience !== undefined && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                  До {nextRank.name}:
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {experienceToNext > 0 ? experienceToNext.toLocaleString() : 'Достигнут!'}
                </span>
              </div>
              
              {experienceToNext > 0 && (
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Компонент для отображения сравнения рангов
interface RankComparisonProps {
  currentRank: Rank;
  targetRank: Rank;
  currentExperience: number;
}

export function RankComparison({ currentRank, targetRank, currentExperience }: RankComparisonProps) {
  const experienceNeeded = targetRank.min_experience - currentExperience;
  const isAchievable = experienceNeeded <= 0;

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
      <RankBadge rank={currentRank} size="small" showName={false} />
      
      <div className="flex-1 text-center">
        <div className="text-2xl text-gray-400 dark:text-gray-500">→</div>
        {!isAchievable && (
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {experienceNeeded.toLocaleString()} опыта
          </div>
        )}
      </div>
      
      <RankBadge rank={targetRank} size="small" showName={false} />
      
      <div className="text-sm">
        {isAchievable ? (
          <span className="text-green-600 dark:text-green-400 font-medium">
            ✅ Достигнут!
          </span>
        ) : (
          <span className="text-gray-600 dark:text-gray-400">
            Нужно {experienceNeeded.toLocaleString()} опыта
          </span>
        )}
      </div>
    </div>
  );
}

// Компонент для отображения списка всех рангов
interface RankListProps {
  ranks: Rank[];
  currentRank: Rank;
  currentExperience: number;
}

export function RankList({ ranks, currentRank, currentExperience }: RankListProps) {
  const sortedRanks = [...ranks].sort((a, b) => a.min_experience - b.min_experience);

  return (
    <div className="space-y-2">
      {sortedRanks.map((rank) => {
        const isCurrentRank = rank.id === currentRank.id;
        const isAchieved = currentExperience >= rank.min_experience;
        const isNext = !isAchieved && rank.min_experience > currentRank.min_experience;

        return (
          <div
            key={rank.id}
            className={`p-3 rounded-lg border transition-all duration-200 ${
              isCurrentRank
                ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                : isAchieved
                ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/30'
                : isNext
                ? 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/30'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <RankBadge rank={rank} size="small" />
              
              <div className="text-right">
                {isCurrentRank && (
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Текущий ранг
                  </span>
                )}
                {isAchieved && !isCurrentRank && (
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                    ✅ Достигнут
                  </span>
                )}
                {isNext && (
                  <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                    🎯 Следующий
                  </span>
                )}
                {!isAchieved && !isNext && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Заблокирован
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}