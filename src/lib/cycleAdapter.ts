/**
 * cycleAdapter.ts
 * Adapta os dados do onboarding do estudante para o formato esperado
 * pelo cycleGeneratorV2, sem necessidade de grade de turma.
 */

import { Subject } from '@/types/study';
import { TimeSlot, Student } from '@/types/educational';
import { generateSmartCycleV2, StudyCycleResult, DifficultyTopic } from './cycleGeneratorV2';

// Mapeamento de dias do onboarding para número (0=dom, 1=seg, ...)
const DAY_MAP: Record<string, number> = {
  dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6,
};

// Mapeamento de horas disponíveis por dia (em minutos)
const HOURS_MAP: Record<string, number> = {
  less1: 45,
  '1to2': 90,
  '2to4': 180,
  more4: 270,
};

export interface OnboardingData {
  dailyHours: string;       // 'less1' | '1to2' | '2to4' | 'more4'
  studyDays: string[];      // ['seg', 'ter', 'qua', 'qui', 'sex']
  studyStartTime?: string;  // '07:00' — horário preferido para iniciar (padrão: 08:00)
  examDate?: string;        // data da prova para contagem regressiva
}

/**
 * Gera blocos de tempo livres a partir dos dados de disponibilidade do onboarding.
 * Cria slots de 30 minutos para cada dia disponível, respeitando o total de minutos/dia.
 */
function buildTimeSlotsFromOnboarding(
  onboarding: OnboardingData,
  studentId: string
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const minutesPerDay = HOURS_MAP[onboarding.dailyHours] ?? 90;
  const slotsPerDay = Math.floor(minutesPerDay / 30);
  const startHour = onboarding.studyStartTime
    ? parseInt(onboarding.studyStartTime.split(':')[0])
    : 8;
  const now = new Date().toISOString();

  onboarding.studyDays.forEach(dayStr => {
    const dayOfWeek = DAY_MAP[dayStr];
    if (dayOfWeek === undefined) return;

    for (let i = 0; i < slotsPerDay; i++) {
      const totalMinutes = startHour * 60 + i * 30;
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const startTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

      slots.push({
        id: `slot-${dayOfWeek}-${i}`,
        studentId,
        dayOfWeek,
        startTime,
        status: 'free',
        scheduleType: 'study',
        createdAt: now,
        updatedAt: now,
      });
    }
  });

  return slots;
}

/**
 * Constrói o objeto Student mínimo necessário para o cycleGeneratorV2.
 * Usa "as unknown as Student" para evitar preencher campos opcionais desnecessários.
 */
function buildStudentFromProfile(
  userId: string,
  name: string,
  onboarding: OnboardingData
): Student {
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
 * Função principal: gera o ciclo semanal completo a partir dos dados do estudante.
 */
export function generateStudentCycle(
  userId: string,
  name: string,
  onboarding: OnboardingData,
  subjects: Subject[],
  topicsBySubject: Record<string, string[]>,
  difficultyTopics: DifficultyTopic[] = []
): StudyCycleResult {
  const timeSlots = buildTimeSlotsFromOnboarding(onboarding, userId);
  const student = buildStudentFromProfile(userId, name, onboarding);

  // Converter subjects do StudyContext para o formato do cycleGeneratorV2
  const cycleSubjects = subjects.map(s => ({
    id: s.id,
    name: s.name,
    priority: s.priority,
    color: s.color,
  }));

  return generateSmartCycleV2(
    student,
    timeSlots,
    cycleSubjects as Subject[],
    topicsBySubject,
    [], // sem grade de aulas (scheduleSubjects)
    {}, // sem tópicos da semana do coordenador
    difficultyTopics
  );
}

/**
 * Extrai tópicos de dificuldade a partir das sessões de estudo do estudante.
 * Considera dificuldade quando taxa de acerto < 70% com pelo menos 5 questões.
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
        correct: 0,
        total: 0,
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
