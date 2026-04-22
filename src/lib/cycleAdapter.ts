import { Subject } from '@/types/study';
import { TimeSlot, Student, ScheduleSubject } from '@/types/educational';
import { generateSmartCycleV2, StudyCycleResult, DifficultyTopic } from './cycleGeneratorV2';

const DAY_MAP: Record<string, number> = {
  dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6,
};
const HOURS_MAP: Record<string, number> = {
  less1: 45, '1to2': 90, '2to4': 180, more4: 270,
};

export interface OnboardingData {
  dailyHours: string;
  studyDays: string[];
  studyStartTime?: string;
  examDate?: string;
}

export interface StoredEntry {
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

    busy.forEach((range, ri) => {
      let cur = range.start; let si = 0;
      while (cur < range.end) {
        slots.push({
          id: `cls-${dayOfWeek}-${ri}-${si}`,
          studentId, dayOfWeek,
          startTime: minutesToTime(cur),
          status: 'occupied', scheduleType: 'class',
          subjectId: range.subjectId,
          createdAt: now, updatedAt: now,
        });
        cur += 30; si++;
      }
    });

    let freeCount = 0;
    for (let min = startHour * 60; min < 22 * 60 && freeCount < targetFreeSlots; min += 30) {
      const isBusy = busy.some(r => min >= r.start && min < r.end);
      if (!isBusy) {
        slots.push({
          id: `free-${dayOfWeek}-${freeCount}`,
          studentId, dayOfWeek,
          startTime: minutesToTime(min),
          status: 'free', scheduleType: 'study',
          createdAt: now, updatedAt: now,
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
    id: userId, userId, coordinatorId: '', fullName: name,
    targetCareer: '', createdAt: now, updatedAt: now,
  } as unknown as Student;
}

export function generateStudentCycle(
  userId: string,
  name: string,
  onboarding: OnboardingData,
  subjects: Subject[],
  topicsBySubject: Record<string, string[]>,
  difficultyTopics: DifficultyTopic[] = [],
  externalEntries: StoredEntry[] = []
): StudyCycleResult {
  const classEntries = externalEntries.filter(e => !e.type || e.type === 'class');
  const timeSlots = buildTimeSlotsFromOnboarding(onboarding, userId, classEntries);
  const student = buildStudentFromProfile(userId, name);

  const scheduleSubjects: ScheduleSubject[] = subjects.map(s => ({
    id: s.id, coordinatorId: '', name: s.name,
    color: s.color || '#6366f1', createdAt: new Date().toISOString(),
  }));

  const cycleSubjects = subjects.map(s => ({ ...s, priority: s.priority ?? 3 }));

  return generateSmartCycleV2(
    student, timeSlots, cycleSubjects as Subject[],
    topicsBySubject, scheduleSubjects, {}, difficultyTopics
  );
}

export function extractDifficultyTopics(
  studySessions: Array<{
    subjectId: string; subjectName?: string;
    topicId?: string; topicName?: string;
    correctAnswers?: number; totalQuestions?: number;
  }>,
  subjects: Subject[]
): DifficultyTopic[] {
  const subjectMap = new Map(subjects.map(s => [s.id, s.name]));
  const topicStats: Record<string, { correct: number; total: number; subjectId: string; subjectName: string; topicName: string }> = {};

  studySessions.forEach(session => {
    if (!session.topicId || !session.totalQuestions || session.totalQuestions < 1) return;
    const key = session.topicId;
    if (!topicStats[key]) {
      topicStats[key] = {
        correct: 0, total: 0, subjectId: session.subjectId,
        subjectName: subjectMap.get(session.subjectId) ?? session.subjectName ?? '',
        topicName: session.topicName ?? '',
      };
    }
    topicStats[key].correct += session.correctAnswers ?? 0;
    topicStats[key].total += session.totalQuestions;
  });

  return Object.values(topicStats)
    .filter(t => t.total >= 5)
    .map(t => ({ subjectId: t.subjectId, subjectName: t.subjectName, topicName: t.topicName, accuracy: Math.round((t.correct / t.total) * 100) }))
    .filter(t => t.accuracy < 70);
}
