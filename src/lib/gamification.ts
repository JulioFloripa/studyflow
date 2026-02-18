import { StudySession } from '@/types/study';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface UserStats {
  totalHours: number;
  totalSessions: number;
  totalQuestions: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export const AVAILABLE_BADGES: Badge[] = [
  {
    id: 'first_session',
    name: 'Primeira Sessão',
    description: 'Registrou sua primeira sessão de estudos',
    icon: '🎯',
  },
  {
    id: 'week_warrior',
    name: 'Guerreiro Semanal',
    description: 'Estudou todos os dias da semana',
    icon: '🔥',
  },
  {
    id: 'century_questions',
    name: 'Centurião',
    description: 'Respondeu 100 questões',
    icon: '💯',
  },
  {
    id: 'marathon',
    name: 'Maratonista',
    description: 'Estudou por 10 horas em uma semana',
    icon: '🏃',
  },
  {
    id: 'consistency_master',
    name: 'Mestre da Consistência',
    description: 'Manteve um streak de 30 dias',
    icon: '👑',
  },
  {
    id: 'perfectionist',
    name: 'Perfeccionista',
    description: 'Acertou 100% das questões em uma sessão (mín. 10 questões)',
    icon: '⭐',
  },
  {
    id: 'early_bird',
    name: 'Madrugador',
    description: 'Estudou antes das 7h da manhã',
    icon: '🌅',
  },
  {
    id: 'night_owl',
    name: 'Coruja Noturna',
    description: 'Estudou depois das 23h',
    icon: '🦉',
  },
  {
    id: 'review_champion',
    name: 'Campeão de Revisões',
    description: 'Completou 50 revisões',
    icon: '🔄',
  },
  {
    id: 'knowledge_seeker',
    name: 'Buscador de Conhecimento',
    description: 'Estudou 100 horas no total',
    icon: '📚',
  },
];

export function calculateLevel(totalMinutes: number): { level: number; xp: number; xpToNextLevel: number } {
  // Sistema de XP: 1 minuto = 1 XP
  const xp = totalMinutes;
  
  // Fórmula de level: level = floor(sqrt(xp / 100))
  // Level 1: 100 XP (1.67h)
  // Level 2: 400 XP (6.67h)
  // Level 3: 900 XP (15h)
  // Level 4: 1600 XP (26.67h)
  // Level 5: 2500 XP (41.67h)
  // Level 10: 10000 XP (166.67h)
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 100)));
  const xpForCurrentLevel = level * level * 100;
  const xpForNextLevel = (level + 1) * (level + 1) * 100;
  const xpToNextLevel = xpForNextLevel - xp;

  return { level, xp, xpToNextLevel };
}

export function calculateStreak(sessions: StudySession[]): { current: number; longest: number } {
  if (sessions.length === 0) return { current: 0, longest: 0 };

  // Ordenar por data (mais recente primeiro)
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  
  // Pegar datas únicas
  const uniqueDates = Array.from(new Set(sorted.map(s => s.date))).sort((a, b) => b.localeCompare(a));
  
  if (uniqueDates.length === 0) return { current: 0, longest: 0 };

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Calcular streak atual
  let currentStreak = 0;
  if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
    currentStreak = 1;
    let expectedDate = new Date(uniqueDates[0]);
    
    for (let i = 1; i < uniqueDates.length; i++) {
      expectedDate.setDate(expectedDate.getDate() - 1);
      const expectedDateStr = expectedDate.toISOString().split('T')[0];
      
      if (uniqueDates[i] === expectedDateStr) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calcular longest streak
  let longestStreak = 0;
  let tempStreak = 1;
  
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const current = new Date(uniqueDates[i]);
    const next = new Date(uniqueDates[i + 1]);
    const diffDays = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { current: currentStreak, longest: longestStreak };
}

export function checkUnlockedBadges(
  sessions: StudySession[],
  reviews: Array<{ completed: boolean }>,
  previousBadges: string[] = []
): { badges: Badge[]; newlyUnlocked: Badge[] } {
  const unlocked: Badge[] = [];
  const newlyUnlocked: Badge[] = [];

  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutesStudied, 0);
  const totalQuestions = sessions.reduce((sum, s) => sum + s.questionsTotal, 0);
  const completedReviews = reviews.filter(r => r.completed).length;
  const { current: currentStreak } = calculateStreak(sessions);

  const checks: Record<string, boolean> = {
    first_session: sessions.length >= 1,
    century_questions: totalQuestions >= 100,
    marathon: (() => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const weekSessions = sessions.filter(s => s.date >= weekAgo);
      const weekMinutes = weekSessions.reduce((sum, s) => sum + s.minutesStudied, 0);
      return weekMinutes >= 600; // 10 horas
    })(),
    week_warrior: currentStreak >= 7,
    consistency_master: currentStreak >= 30,
    perfectionist: sessions.some(s => s.questionsTotal >= 10 && s.questionsCorrect === s.questionsTotal),
    early_bird: sessions.some(s => {
      const hour = new Date(s.date).getHours();
      return hour < 7;
    }),
    night_owl: sessions.some(s => {
      const hour = new Date(s.date).getHours();
      return hour >= 23;
    }),
    review_champion: completedReviews >= 50,
    knowledge_seeker: totalMinutes >= 6000, // 100 horas
  };

  for (const badge of AVAILABLE_BADGES) {
    if (checks[badge.id]) {
      unlocked.push({ ...badge, unlockedAt: new Date().toISOString() });
      if (!previousBadges.includes(badge.id)) {
        newlyUnlocked.push({ ...badge, unlockedAt: new Date().toISOString() });
      }
    }
  }

  return { badges: unlocked, newlyUnlocked };
}

export function getUserStats(
  sessions: StudySession[],
  reviews: Array<{ completed: boolean }>
): UserStats {
  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutesStudied, 0);
  const totalQuestions = sessions.reduce((sum, s) => sum + s.questionsTotal, 0);
  const { current: currentStreak, longest: longestStreak } = calculateStreak(sessions);
  const { level, xp, xpToNextLevel } = calculateLevel(totalMinutes);

  return {
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    totalSessions: sessions.length,
    totalQuestions,
    currentStreak,
    longestStreak,
    level,
    xp,
    xpToNextLevel,
  };
}

export function getLevelTitle(level: number): string {
  if (level >= 20) return 'Mestre Supremo';
  if (level >= 15) return 'Sábio';
  if (level >= 10) return 'Expert';
  if (level >= 7) return 'Avançado';
  if (level >= 5) return 'Intermediário';
  if (level >= 3) return 'Aprendiz';
  return 'Iniciante';
}
