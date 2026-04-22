/**
 * cycleAdapter.ts
 * Adapta os dados do onboarding para o cycleGeneratorV2.
 * Lê a agenda semanal (ws_classes_v2) para:
 *  - criar slots de aula (occupied) nos horários corretos
 *  - criar slots livres apenas fora dos horários de aula
 *  - passar as aulas ao gerador para ativar a revisão imediata pós-aula
 */

import { Subject } from '@/types/study';
import { TimeSlot, Student, ScheduleSubject } from '@/types/educational';
import { generateSmartCycleV2, StudyCycleResult, DifficultyTopic } from './cycleGeneratorV2';

const DAY_MAP: Record<string, number> = {
  dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6,
};

const HOURS_MAP: Record<string, number> = {
  less1: 45,
  '1to2': 90,
  '2to4': 180,
  more4: 270,
};

const STORAGE_KEY_CLASSES = 'ws_classes_v2';

export interface OnboardingData {
  dailyHours: string;       // 'less1' | '1to2' | '2to4' | 'more4'
  studyDays: string[];      // ['seg', 'ter', ...]
  studyStartTime?: string;  // '08:00'
  examDate?: string;
}

interface StoredEntry {
  id: string;
  type?: 'class' | 'sleep' | 'exercise';
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId?: string;
  repeats: boolean;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function loadStoredClasses(): StoredEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_CLASSES) || '[]');
  } catch {
    return [];
  }
}

/**
 * Gera TimeSlots a partir do onboarding + agenda semanal.
 * - Slots de aula (occupied/class) nos horários cadastrados
 * - Slots livres (free/study) fora dos horários de aula, na quantidade certa por dia
 */
function buildTimeSlotsFromOnboarding(
  onboarding: OnboardingData,
  studentId: string,
  classEntries: StoredEntry[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const minutesPerDay = HOURS_MAP[onboarding.dailyHours] ?? 90;
  const targetFreeSlots = Math.floor(minutesPerDay / 30);
  const startHour = onboarding.studyStartTime
    ? parseInt(onboarding.studyStartTime.split(':')[0])
    : 8;
  const now = new Date().toISOString();

  // Índice de intervalos ocupados por dia
  const busyByDay: Record<number, Array<{ start: number; end: number; subjectId: string }>> = {};
  classEntries.forEach(cls => {
    if (!busyByDay[cls.dayOfWeek]) busyByDay[cls.dayOfWeek] = [];
    busyByDay[cls.dayOfWeek].push({
      start: timeToMin(cls.startTime),
      end: timeToMin(cls.endTime),
      subjectId: cls.subjectId || '',
    });
  });

  onboarding.studyDays.forEach(dayStr => {
    const dayOfWeek = DAY_MAP[dayStr];
    if (dayOfWeek === undefined) return;

    const busy = busyByDay[dayOfWeek] || [];

    // 1. Slots de aula — o gerador usa para agendar revisão imediata pós-aula
    busy.forEach((range, ri) => {
      let cur = range.start;
      let si = 0;
      while (cur < range.end) {
        slots.push({
          id: `cls-${dayOfWeek}-${ri}-${si}`,
          studentId,
          dayOfWeek,
          startTime: minutesToTime(cur),
          status: 'occupied',
          scheduleType: 'class',
          subjectId: range.subjectId,
          createdAt: now,
          updatedAt: now,
        });
        cur += 30;
        si++;
      }
    });

    // 2. Slots livres — pula horários de aula, gera a quantidade configurada no onboarding
    let freeCount = 0;
    for (let min = startHour * 60; min < 22 * 60 && freeCount < targetFreeSlots; min += 30) {
      const isBusy = busy.some(r => min >= r.start && min < r.end);
      if (!isBusy) {
        slots.push({
          id: `free-${dayOfWeek}-${freeCount}`,
          studentId,
          dayOfWeek,
          startTime: minutesToTime(min),
          status: 'free',
          scheduleType: 'study',
          createdAt: now,
          updatedAt: now,
        });
        freeCount++;
      }
    }
  });

  return slots;
}

function buildStudentFromProfile(userId: string, name: string): Student {
  const now = new Date().toISOString();
  return {
    id: userId,
    userId,
    coordinatorId: '',
    fullName: name,
    targetCareer: '',
    createdAt: now,
    updatedAt: now,
  } as unknown as Student;
}

/**
 * Gera o ciclo semanal completo a partir dos dados do estudante.
 * Integra automaticamente com a Agenda Semanal (ws_classes_v2).
 */
export function generateStudentCycle(
  userId: string,
  name: string,
  onboarding: OnboardingData,
  subjects: Subject[],
  topicsBySubject: Record<string, string[]>,
  difficultyTopics: DifficultyTopic[] = []
): StudyCycleResult {
  // Carrega apenas entradas do tipo 'class' (ignora sono e exercício)
  const allEntries = loadStoredClasses();
  const classEntries = allEntries.filter(e => !e.type || e.type === 'class');

  const timeSlots = buildTimeSlotsFromOnboarding(onboarding, userId, classEntries);
  const student = buildStudentFromProfile(userId, name);

  // Passa disciplinas como ScheduleSubjects para o gerador conseguir resolver nomes nas aulas
  const scheduleSubjects: ScheduleSubject[] = subjects.map(s => ({
    id: s.id,
    coordinatorId: '',
    name: s.name,
    color: s.color || '#6366f1',
    createdAt: new Date().toISOString(),
  }));

  const cycleSubjects = subjects.map(s => ({ ...s, priority: s.priority ?? 3 }));

  return generateSmartCycleV2(
    student,
    timeSlots,
    cycleSubjects as Subject[],
    topicsBySubject,
    scheduleSubjects,
    {},
    difficultyTopics
  );
}

/**
 * Extrai tópicos de dificuldade a partir das sessões de estudo.
 * Considera dificuldade quando acerto < 70% com pelo menos 5 questões.
 */
export function extractDifficultyTopics(
  studySessions: Array<{
    subjectId: string;
    subjectName?: string;
    topicId?: string;
    topicName?: string;
    correctAnswers?: number;
    totalQuestions?: number;
  }>,
  subjects: Subject[]
): DifficultyTopic[] {
  const subjectMap = new Map(subjects.map(s => [s.id, s.name]));
  const topicStats: Record<string, {
    correct: number; total: number;
    subjectId: string; subjectName: string; topicName: string;
  }> = {};

  studySessions.forEach(session => {
    if (!session.topicId || !session.totalQuestions || session.totalQuestions < 1) return;
    const key = session.topicId;
    if (!topicStats[key]) {
      topicStats[key] = {
        correct: 0, total: 0,
        subjectId: session.subjectId,
        subjectName: subjectMap.get(session.subjectId) ?? session.subjectName ?? '',
        topicName: session.topicName ?? '',
      };
    }
    topicStats[key].correct += session.correctAnswers ?? 0;
    topicStats[key].total += session.totalQuestions;
  });

  return Object.values(topicStats)
    .filter(t => t.total >= 5)
    .map(t => ({
      subjectId: t.subjectId,
      subjectName: t.subjectName,
      topicName: t.topicName,
      accuracy: Math.round((t.correct / t.total) * 100),
    }))
    .filter(t => t.accuracy < 70);
}
