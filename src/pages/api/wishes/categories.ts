import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../lib/telegram-auth';

// Default wish categories with Russian names
const wishCategories = [
  {
    id: 'romantic',
    name: 'Романтические',
    nameEn: 'Romantic',
    description: 'Романтические желания и сюрпризы',
    icon: '💕'
  },
  {
    id: 'adventure',
    name: 'Приключения',
    nameEn: 'Adventure',
    description: 'Путешествия и активный отдых',
    icon: '🌍'
  },
  {
    id: 'relaxation',
    name: 'Отдых',
    nameEn: 'Relaxation',
    description: 'Спокойный отдых и релаксация',
    icon: '🧘'
  },
  {
    id: 'creative',
    name: 'Творчество',
    nameEn: 'Creative',
    description: 'Творческие занятия и хобби',
    icon: '🎨'
  },
  {
    id: 'food',
    name: 'Еда',
    nameEn: 'Food',
    description: 'Кулинарные желания и рестораны',
    icon: '🍽️'
  },
  {
    id: 'gifts',
    name: 'Подарки',
    nameEn: 'Gifts',
    description: 'Материальные подарки и сюрпризы',
    icon: '🎁'
  },
  {
    id: 'experiences',
    name: 'Впечатления',
    nameEn: 'Experiences',
    description: 'Новые впечатления и эмоции',
    icon: '✨'
  },
  {
    id: 'health',
    name: 'Здоровье',
    nameEn: 'Health',
    description: 'Забота о здоровье и красоте',
    icon: '💪'
  },
  {
    id: 'learning',
    name: 'Обучение',
    nameEn: 'Learning',
    description: 'Образование и развитие навыков',
    icon: '📚'
  },
  {
    id: 'general',
    name: 'Общие',
    nameEn: 'General',
    description: 'Общие желания',
    icon: '💫'
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ categories: wishCategories });

  } catch (error) {
    console.error('Get wish categories error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}