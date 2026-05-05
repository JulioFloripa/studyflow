import { TimeSlot } from '@/types/educational';
import { Subject, Review, StudySession, UserProfile } from '@/types/study';
import { DifficultyTopic } from '@/lib/cycleGeneratorV2';
import { HORARIOS_BASE } from '@/lib/cronograma/constants';

// agenda day names → profile keys
const AGENDA_TO_PROFILE_KEY: Record<string, string> = {
  Segunda: 'seg', Terça: 'ter', Quarta: 'qua',
  Quinta: 'qui', Sexta: 'sex', Sábado: 'sab', Domingo: 'dom',
};

// profile keys → dayOfWeek (0=Dom..6=Sáb)
const PROFILE_KEY_TO_DOW: Record<string, number> = {
  dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6,
};

interface AgendaItem {
  id: string;
  nome: string;
  tipo: string;
  dias: string[];
  inicio: string;
  fim: string;
}

function slotsInRange(inicio: string, fim: string): string[] {
  const result: string[] = [];
  let i = HORARIOS_BASE.indexOf(inicio);
  const end = HORARIOS_BASE.indexOf(fim);
  if (i < 0) return result;
  while (i < end && i < HORARIOS_BASE.length) { result.push(HORARIOS_BASE[i]); i++; }
  return result;
}

/**
 * Converts userProfile.availability + agenda items into TimeSlot[] for cycleGeneratorV2.
 * Per-day free slots are capped to availability[day] hours.
 */
export function buildStudentTimeSlots(
  userProfile: UserProfile,
  agendaItems: AgendaItem[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let counter = 0;

  for (const [profileKey, dayOfWeek] of Object.entries(PROFILE_KEY_TO_DOW)) {
    const availHours = (userProfile.availability?.[profileKey] ?? 0);
    const maxFreeSlots = Math.floor(availHours * 2); // 30-min blocks

    // Collect occupied ranges from agenda
    const occupiedTimes = new Set<string>();
    agendaItems
      .filter(item => item.dias.some(d => AGENDA_TO_PROFILE_KEY[d] === profileKey))
      .forEach(item => slotsInRange(item.inicio, item.fim).forEach(t => occupiedTimes.add(t)));

    // Candidates for free study slots (not occupied by agenda)
    const candidateFree = HORARIOS_BASE.filter(h => !occupiedTimes.has(h));
    const freeSet = new Set(candidateFree.slice(0, maxFreeSlots));

    HORARIOS_BASE.forEach(hora => {
      const agendaOccupied = occupiedTimes.has(hora);
      const free = !agendaOccupied && freeSet.has(hora);
      slots.push({
        id: `s-${counter++}`,
        studentId: 'self',
        dayOfWeek,
        startTime: hora,
        status: free ? 'free' : 'occupied',
        scheduleType: free ? 'study' : 'other',
        createdAt: '',
        updatedAt: '',
      });
    });
  }

  return slots;
}

/**
 * Builds DifficultyTopic[] from overdue reviews (top priority) + low-accuracy sessions.
 */
export function buildDifficultyTopics(
  studySessions: StudySession[],
  subjects: Subject[],
  reviews: Review[],
  today: string
): DifficultyTopic[] {
  const subjectMap = new Map(subjects.map(s => [s.id, s.name]));
  const result: DifficultyTopic[] = [];

  // 1. Overdue reviews → accuracy = 0 (always scheduled first)
  const overdueBySubject: Record<string, number> = {};
  reviews
    .filter(r => !r.completed && r.scheduledDate < today)
    .forEach(r => { overdueBySubject[r.subjectId] = (overdueBySubject[r.subjectId] || 0) + 1; });

  Object.entries(overdueBySubject).forEach(([subjectId, count]) => {
    result.push({
      subjectId,
      subjectName: subjectMap.get(subjectId) || 'Disciplina',
      topicName: `${count} revisão${count > 1 ? 'ões' : ''} atrasada${count > 1 ? 's' : ''}`,
      accuracy: 0,
    });
  });

  const overdueSubjectIds = new Set(Object.keys(overdueBySubject));

  // 2. Low-accuracy topics from sessions (< 70%, at least 5 questions answered)
  const statsMap: Record<string, { subjectId: string; total: number; correct: number }> = {};
  studySessions.forEach(s => {
    if (!s.questionsTotal || s.questionsTotal < 5) return;
    const key = s.subjectId;
    if (!statsMap[key]) statsMap[key] = { subjectId: s.subjectId, total: 0, correct: 0 };
    statsMap[key].total += s.questionsTotal;
    statsMap[key].correct += s.questionsCorrect || 0;
  });

  Object.values(statsMap).forEach(stats => {
    if (overdueSubjectIds.has(stats.subjectId)) return; // already covered
    const accuracy = Math.round((stats.correct / stats.total) * 100);
    if (accuracy < 70) {
      result.push({
        subjectId: stats.subjectId,
        subjectName: subjectMap.get(stats.subjectId) || 'Disciplina',
        topicName: `Desempenho abaixo de 70% (${accuracy}%)`,
        accuracy,
      });
    }
  });

  return result;
}

/**
 * Creates a minimal Student-shaped object from UserProfile for cycleGeneratorV2.
 */
export function profileToStudent(userProfile: UserProfile) {
  return {
    id: 'self',
    coordinatorId: '',
    fullName: userProfile.name || 'Aluno',
    weeklyGoalHours: userProfile.weeklyGoalHours || 20,
    examDate: userProfile.examDate,
    learningPace: undefined as any,
    studyMethods: [] as any[],
    createdAt: '',
    updatedAt: '',
  };
}
