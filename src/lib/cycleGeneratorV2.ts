import { TimeSlot, Student, ScheduleSubject } from '@/types/educational';
import { Subject } from '@/types/study';

export interface CycleSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectName: string;
  duration: number; // minutos
  topics: string[];
  type: 'immediate_review' | 'deep_study' | 'spaced_review' | 'practice';
  linkedToClass?: boolean;
}

export interface CycleDiagnostic {
  dailyHours: Record<number, number>; // day -> hours
  dailySubjectCount: Record<number, number>; // day -> unique subjects
  subjectHours: Record<string, number>; // subjectName -> hours
  subjectPercentages: Record<string, number>; // subjectName -> %
  standardDeviation: number;
  maxDailyHours: number;
  minDailyHours: number;
  range: number; // max - min
  alerts: string[];
  suggestions: string[];
  isBalanced: boolean;
}

export interface StudyCycleResult {
  slots: CycleSlot[];
  totalMinutes: number;
  weeklyHours: number;
  distribution: Record<string, number>; // subjectId -> minutes
  recommendations: string[];
  diagnostic: CycleDiagnostic;
  classSchedule: Array<{
    dayOfWeek: number;
    startTime: string;
    subjectId: string;
    subjectName: string;
  }>;
}

interface ClassSession {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectName: string;
}

interface FreeBlock {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  duration: number;
}

// ─── Constants ───────────────────────────────────────────────────────
const MAX_HOURS_PER_DAY = 10;
const MAX_MINUTES_PER_DAY = MAX_HOURS_PER_DAY * 60;
const MAX_SESSIONS_SAME_SUBJECT_PER_DAY = 2;
const MAX_WEEKLY_HOURS = 70;
const MIN_SESSION_MINUTES = 30;
const MAX_SESSION_MINUTES = 60;
const TARGET_STD_DEV = 1.5; // hours
const TARGET_RANGE = 3; // hours

// ─── Helpers ─────────────────────────────────────────────────────────

function calculateEndTime(startTime: string, durationMinutes: number = 30): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.map(v => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / values.length);
}

// ─── Extract class schedule ──────────────────────────────────────────

function extractClassSchedule(timeSlots: TimeSlot[], scheduleSubjects: ScheduleSubject[]): ClassSession[] {
  const classSessions: ClassSession[] = [];
  const classSlots = timeSlots.filter(slot => slot.scheduleType === 'class' && slot.subjectId);
  const subjectMap = new Map(scheduleSubjects.map(s => [s.id, s.name]));

  const byDay: Record<number, TimeSlot[]> = {};
  classSlots.forEach(slot => {
    if (!byDay[slot.dayOfWeek]) byDay[slot.dayOfWeek] = [];
    byDay[slot.dayOfWeek].push(slot);
  });

  Object.entries(byDay).forEach(([day, slots]) => {
    const dayNum = parseInt(day);
    slots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    let currentGroup: TimeSlot[] = [];

    slots.forEach((slot, idx) => {
      if (currentGroup.length === 0) {
        currentGroup.push(slot);
      } else {
        const lastSlot = currentGroup[currentGroup.length - 1];
        const expectedNext = calculateEndTime(lastSlot.startTime, 30);
        const sameSubject = lastSlot.subjectId === slot.subjectId;

        if (slot.startTime === expectedNext && sameSubject) {
          currentGroup.push(slot);
        } else {
          if (currentGroup[0].subjectId) {
            classSessions.push({
              dayOfWeek: dayNum,
              startTime: currentGroup[0].startTime,
              endTime: calculateEndTime(currentGroup[currentGroup.length - 1].startTime, 30),
              subjectId: currentGroup[0].subjectId,
              subjectName: subjectMap.get(currentGroup[0].subjectId) || 'Disciplina',
            });
          }
          currentGroup = [slot];
        }
      }

      if (idx === slots.length - 1 && currentGroup.length > 0 && currentGroup[0].subjectId) {
        classSessions.push({
          dayOfWeek: dayNum,
          startTime: currentGroup[0].startTime,
          endTime: calculateEndTime(currentGroup[currentGroup.length - 1].startTime, 30),
          subjectId: currentGroup[0].subjectId,
          subjectName: subjectMap.get(currentGroup[0].subjectId) || 'Disciplina',
        });
      }
    });
  });

  return classSessions;
}

// ─── Group free slots ────────────────────────────────────────────────

function groupFreeSlots(timeSlots: TimeSlot[]): FreeBlock[] {
  const freeSlots = timeSlots.filter(slot => slot.status === 'free');
  const grouped: FreeBlock[] = [];

  const byDay: Record<number, TimeSlot[]> = {};
  freeSlots.forEach(slot => {
    if (!byDay[slot.dayOfWeek]) byDay[slot.dayOfWeek] = [];
    byDay[slot.dayOfWeek].push(slot);
  });

  Object.entries(byDay).forEach(([day, slots]) => {
    const dayNum = parseInt(day);
    slots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    let currentGroup: TimeSlot[] = [];

    slots.forEach((slot, idx) => {
      if (currentGroup.length === 0) {
        currentGroup.push(slot);
      } else {
        const lastSlot = currentGroup[currentGroup.length - 1];
        const expectedNext = calculateEndTime(lastSlot.startTime, 30);

        if (slot.startTime === expectedNext) {
          currentGroup.push(slot);
        } else {
          grouped.push({
            dayOfWeek: dayNum,
            startTime: currentGroup[0].startTime,
            endTime: calculateEndTime(currentGroup[currentGroup.length - 1].startTime, 30),
            duration: currentGroup.length * 30,
          });
          currentGroup = [slot];
        }
      }

      if (idx === slots.length - 1 && currentGroup.length > 0) {
        grouped.push({
          dayOfWeek: dayNum,
          startTime: currentGroup[0].startTime,
          endTime: calculateEndTime(currentGroup[currentGroup.length - 1].startTime, 30),
          duration: currentGroup.length * 30,
        });
      }
    });
  });

  return grouped;
}

// ─── Compute ideal distribution ──────────────────────────────────────

/**
 * Computes target minutes per subject proportionally to priority,
 * but ensures ALL subjects get a minimum allocation.
 */
function computeIdealDistribution(
  subjects: Subject[],
  totalAvailableMinutes: number
): Record<string, number> {
  if (subjects.length === 0) return {};

  // Minimum 2% of total or 60 min, whichever is smaller
  const minPerSubject = Math.min(60, Math.floor(totalAvailableMinutes * 0.02));
  const reservedMin = minPerSubject * subjects.length;
  const distributableMinutes = Math.max(0, totalAvailableMinutes - reservedMin);

  const totalPriority = subjects.reduce((sum, s) => sum + s.priority, 0);
  const distribution: Record<string, number> = {};

  subjects.forEach(subject => {
    const proportional = totalPriority > 0
      ? Math.round(distributableMinutes * (subject.priority / totalPriority))
      : Math.round(distributableMinutes / subjects.length);
    distribution[subject.id] = minPerSubject + proportional;
  });

  return distribution;
}

// ─── Balanced allocation engine ──────────────────────────────────────

interface DayAllocation {
  day: number;
  totalMinutes: number;
  subjectSessions: Record<string, number>; // subjectId -> session count
  slots: CycleSlot[];
}

function allocateBalanced(
  freeBlocks: FreeBlock[],
  subjects: Subject[],
  idealDistribution: Record<string, number>,
  classesByDay: Record<number, ClassSession[]>,
  topicsBySubject: Record<string, string[]>
): CycleSlot[] {
  // Track per-day allocations
  const dayAlloc: Record<number, DayAllocation> = {};
  for (let d = 0; d <= 6; d++) {
    dayAlloc[d] = { day: d, totalMinutes: 0, subjectSessions: {}, slots: [] };
  }

  // Track remaining target per subject
  const remaining: Record<string, number> = { ...idealDistribution };
  const subjectNameMap = new Map(subjects.map(s => [s.id, s.name]));

  // Sort free blocks: prefer weekdays first, then by start time
  const sortedBlocks = [...freeBlocks].sort((a, b) => {
    // Weekdays (1-5) first, then weekend (0, 6)
    const aIsWeekday = a.dayOfWeek >= 1 && a.dayOfWeek <= 5;
    const bIsWeekday = b.dayOfWeek >= 1 && b.dayOfWeek <= 5;
    if (aIsWeekday !== bIsWeekday) return aIsWeekday ? -1 : 1;
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime.localeCompare(b.startTime);
  });

  for (const block of sortedBlocks) {
    const da = dayAlloc[block.dayOfWeek];
    let blockRemaining = block.duration;
    let currentTime = block.startTime;

    // Cap daily minutes
    const dayBudget = MAX_MINUTES_PER_DAY - da.totalMinutes;
    if (dayBudget <= 0) continue;
    blockRemaining = Math.min(blockRemaining, dayBudget);

    // Phase 1: Immediate review for today's classes
    const dayClasses = classesByDay[block.dayOfWeek] || [];
    for (const cls of dayClasses) {
      if (blockRemaining < MIN_SESSION_MINUTES) break;
      // Skip if already reviewed
      const alreadyReviewed = da.slots.some(
        s => s.subjectId === cls.subjectId && s.type === 'immediate_review'
      );
      if (alreadyReviewed) continue;

      const sessionDur = Math.min(MAX_SESSION_MINUTES, blockRemaining);
      da.slots.push({
        dayOfWeek: block.dayOfWeek,
        startTime: currentTime,
        endTime: calculateEndTime(currentTime, sessionDur),
        subjectId: cls.subjectId,
        subjectName: cls.subjectName,
        duration: sessionDur,
        topics: topicsBySubject[cls.subjectId]?.slice(0, 3) || [],
        type: 'immediate_review',
        linkedToClass: true,
      });
      da.totalMinutes += sessionDur;
      da.subjectSessions[cls.subjectId] = (da.subjectSessions[cls.subjectId] || 0) + 1;
      remaining[cls.subjectId] = Math.max(0, (remaining[cls.subjectId] || 0) - sessionDur);
      blockRemaining -= sessionDur;
      currentTime = calculateEndTime(currentTime, sessionDur);
    }

    // Phase 2: Balanced allocation of remaining time
    while (blockRemaining >= MIN_SESSION_MINUTES) {
      // Pick the subject with the most remaining quota that hasn't exceeded daily limit
      const candidate = pickNextSubject(subjects, remaining, da);
      if (!candidate) break;

      const sessionDur = Math.min(MAX_SESSION_MINUTES, blockRemaining);

      da.slots.push({
        dayOfWeek: block.dayOfWeek,
        startTime: currentTime,
        endTime: calculateEndTime(currentTime, sessionDur),
        subjectId: candidate.id,
        subjectName: candidate.name,
        duration: sessionDur,
        topics: topicsBySubject[candidate.id]?.slice(0, 3) || [],
        type: 'deep_study',
        linkedToClass: false,
      });

      da.totalMinutes += sessionDur;
      da.subjectSessions[candidate.id] = (da.subjectSessions[candidate.id] || 0) + 1;
      remaining[candidate.id] = Math.max(0, (remaining[candidate.id] || 0) - sessionDur);
      blockRemaining -= sessionDur;
      currentTime = calculateEndTime(currentTime, sessionDur);
    }
  }

  // Collect all slots
  const allSlots: CycleSlot[] = [];
  for (let d = 0; d <= 6; d++) {
    allSlots.push(...dayAlloc[d].slots);
  }
  return allSlots;
}

/**
 * Picks the next subject to allocate, ensuring:
 * - Max 2 sessions of the same subject per day
 * - Prefers subjects with highest remaining quota
 * - Avoids repeating the last allocated subject (intercalation)
 */
function pickNextSubject(
  subjects: Subject[],
  remaining: Record<string, number>,
  dayAlloc: DayAllocation
): Subject | null {
  const lastSlot = dayAlloc.slots[dayAlloc.slots.length - 1];
  const lastSubjectId = lastSlot?.subjectId;

  // Sort candidates by remaining quota descending, then priority descending
  const candidates = subjects
    .filter(s => {
      const sessionsToday = dayAlloc.subjectSessions[s.id] || 0;
      return sessionsToday < MAX_SESSIONS_SAME_SUBJECT_PER_DAY;
    })
    .sort((a, b) => {
      const remA = remaining[a.id] || 0;
      const remB = remaining[b.id] || 0;
      // Primary: remaining quota
      if (remB !== remA) return remB - remA;
      // Secondary: priority
      return b.priority - a.priority;
    });

  if (candidates.length === 0) return null;

  // Try to avoid consecutive same-subject (intercalation)
  const nonRepeat = candidates.filter(c => c.id !== lastSubjectId);
  if (nonRepeat.length > 0) return nonRepeat[0];

  return candidates[0];
}

// ─── Diagnostics ─────────────────────────────────────────────────────

function generateDiagnostic(
  slots: CycleSlot[],
  subjects: Subject[],
  totalMinutes: number
): CycleDiagnostic {
  const dailyMinutes: Record<number, number> = {};
  const dailySubjects: Record<number, Set<string>> = {};
  const subjectMinutes: Record<string, number> = {};

  for (let d = 0; d <= 6; d++) {
    dailyMinutes[d] = 0;
    dailySubjects[d] = new Set();
  }
  subjects.forEach(s => { subjectMinutes[s.id] = 0; });

  slots.forEach(slot => {
    dailyMinutes[slot.dayOfWeek] += slot.duration;
    dailySubjects[slot.dayOfWeek].add(slot.subjectId);
    subjectMinutes[slot.subjectId] = (subjectMinutes[slot.subjectId] || 0) + slot.duration;
  });

  const dailyHours: Record<number, number> = {};
  const dailySubjectCount: Record<number, number> = {};
  const activeDayHours: number[] = [];

  for (let d = 0; d <= 6; d++) {
    dailyHours[d] = parseFloat((dailyMinutes[d] / 60).toFixed(1));
    dailySubjectCount[d] = dailySubjects[d].size;
    if (dailyMinutes[d] > 0) activeDayHours.push(dailyHours[d]);
  }

  const subjectHours: Record<string, number> = {};
  const subjectPercentages: Record<string, number> = {};
  const subjectNameMap = new Map(subjects.map(s => [s.id, s.name]));

  subjects.forEach(s => {
    const mins = subjectMinutes[s.id] || 0;
    const name = s.name;
    subjectHours[name] = parseFloat((mins / 60).toFixed(1));
    subjectPercentages[name] = totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0;
  });

  const sd = parseFloat(stdDev(activeDayHours).toFixed(2));
  const maxH = activeDayHours.length > 0 ? Math.max(...activeDayHours) : 0;
  const minH = activeDayHours.length > 0 ? Math.min(...activeDayHours) : 0;
  const range = parseFloat((maxH - minH).toFixed(1));

  // Generate alerts
  const alerts: string[] = [];
  const suggestions: string[] = [];

  if (sd > TARGET_STD_DEV) {
    alerts.push(`⚠️ Desvio Padrão ${sd}h está acima do ideal (${TARGET_STD_DEV}h). Distribuição desequilibrada.`);
  }
  if (range > TARGET_RANGE) {
    alerts.push(`⚠️ Diferença entre dia mais pesado e mais leve: ${range}h (ideal < ${TARGET_RANGE}h).`);
  }
  if (maxH > MAX_HOURS_PER_DAY) {
    alerts.push(`🚫 Dia com ${maxH}h excede o limite de ${MAX_HOURS_PER_DAY}h.`);
  }
  if (totalMinutes / 60 > MAX_WEEKLY_HOURS) {
    alerts.push(`🚫 Total semanal ${(totalMinutes / 60).toFixed(1)}h excede ${MAX_WEEKLY_HOURS}h.`);
  }

  // Check for subjects with 0 time
  const zeroSubjects = subjects.filter(s => (subjectMinutes[s.id] || 0) === 0);
  if (zeroSubjects.length > 0) {
    alerts.push(`❌ Disciplinas sem tempo alocado: ${zeroSubjects.map(s => s.name).join(', ')}`);
    suggestions.push(`💡 Reduza tempo de disciplinas dominantes para incluir: ${zeroSubjects.map(s => s.name).join(', ')}`);
  }

  // Check for dominant subjects (>40% of total)
  subjects.forEach(s => {
    const pct = totalMinutes > 0 ? ((subjectMinutes[s.id] || 0) / totalMinutes) * 100 : 0;
    if (pct > 40) {
      alerts.push(`⚠️ ${s.name} ocupa ${pct.toFixed(0)}% do tempo total (máximo recomendado: 40%)`);
      suggestions.push(`💡 Reduza ${s.name} e redistribua para outras disciplinas.`);
    }
  });

  if (alerts.length === 0) {
    suggestions.push('✅ Distribuição equilibrada! Nenhum ajuste necessário.');
  }

  const isBalanced = sd <= TARGET_STD_DEV && range <= TARGET_RANGE && zeroSubjects.length === 0 && maxH <= MAX_HOURS_PER_DAY;

  return {
    dailyHours,
    dailySubjectCount,
    subjectHours,
    subjectPercentages,
    standardDeviation: sd,
    maxDailyHours: maxH,
    minDailyHours: minH,
    range,
    alerts,
    suggestions,
    isBalanced,
  };
}

// ─── Recommendations ─────────────────────────────────────────────────

function generateRecommendations(
  student: Student,
  totalMinutes: number,
  hasClassSchedule: boolean
): string[] {
  const recommendations: string[] = [];
  const hoursPerWeek = totalMinutes / 60;

  if (hasClassSchedule) {
    recommendations.push(
      '🎯 AULA DADA É AULA ESTUDADA: Revise o conteúdo no mesmo dia para consolidar 80% mais!',
      '📚 Revisão Imediata: Nos primeiros horários livres após a aula, revise os tópicos vistos.',
      '🔄 Revisão Espaçada: Revise novamente após 1 dia, 1 semana e 1 mês.'
    );
  }

  if (student.learningPace === 'slow') {
    recommendations.push(
      '📖 Foque em compreensão profunda ao invés de quantidade.',
      '⏰ Divida tópicos complexos em sessões de 30-45min com pausas.'
    );
  } else if (student.learningPace === 'fast') {
    recommendations.push(
      '🚀 Aproveite seu ritmo para cobrir mais conteúdo e aprofundar.',
      '🎯 Desafie-se com questões avançadas.'
    );
  }

  if (student.studyMethods?.includes('pomodoro')) {
    recommendations.push('🍅 Técnica Pomodoro: 25min foco + 5min pausa');
  }
  if (student.studyMethods?.includes('active_recall')) {
    recommendations.push('🧠 Após estudar, feche o material e tente recordar os pontos principais');
  }
  if (student.studyMethods?.includes('spaced_repetition')) {
    recommendations.push('📅 Revise em intervalos crescentes: 1 dia, 3 dias, 1 semana, 1 mês');
  }

  if (hoursPerWeek < 10) {
    recommendations.push('⚠️ Poucas horas livres. Priorize disciplinas com maior peso.');
  } else if (hoursPerWeek > 30) {
    recommendations.push('⚠️ Cuidado com sobrecarga! Mantenha equilíbrio com descanso.');
  }

  recommendations.push(
    '📊 Alterne entre disciplinas para evitar fadiga cognitiva',
    '🎯 Qualidade > Quantidade: 1h focado vale mais que 3h disperso'
  );

  return recommendations;
}

// ─── Main Entry Point ────────────────────────────────────────────────

export function generateSmartCycleV2(
  student: Student,
  timeSlots: TimeSlot[],
  subjects: Subject[],
  topicsBySubject: Record<string, string[]>,
  scheduleSubjects: ScheduleSubject[] = []
): StudyCycleResult {
  // 1. Extract class schedule
  const classSchedule = extractClassSchedule(timeSlots, scheduleSubjects);

  // 2. Identify free blocks
  const freeBlocks = groupFreeSlots(timeSlots);

  // 3. Calculate available time
  const totalAvailable = freeBlocks.reduce((sum, b) => sum + b.duration, 0);

  // 4. Compute ideal distribution ensuring all subjects get time
  const idealDistribution = computeIdealDistribution(subjects, totalAvailable);

  // 5. Organize classes by day
  const classesByDay: Record<number, ClassSession[]> = {};
  classSchedule.forEach(cls => {
    if (!classesByDay[cls.dayOfWeek]) classesByDay[cls.dayOfWeek] = [];
    classesByDay[cls.dayOfWeek].push(cls);
  });

  // 6. Run balanced allocation
  const slots = allocateBalanced(freeBlocks, subjects, idealDistribution, classesByDay, topicsBySubject);

  // 7. Compute actual distribution
  const distribution: Record<string, number> = {};
  subjects.forEach(s => { distribution[s.id] = 0; });
  const totalMinutes = slots.reduce((sum, s) => {
    distribution[s.subjectId] = (distribution[s.subjectId] || 0) + s.duration;
    return sum + s.duration;
  }, 0);

  // 8. Generate diagnostic
  const diagnostic = generateDiagnostic(slots, subjects, totalMinutes);

  // 9. Generate recommendations
  const recommendations = generateRecommendations(student, totalMinutes, classSchedule.length > 0);

  return {
    slots,
    totalMinutes,
    weeklyHours: totalMinutes / 60,
    distribution,
    recommendations,
    diagnostic,
    classSchedule: classSchedule.map(cls => ({
      dayOfWeek: cls.dayOfWeek,
      startTime: cls.startTime,
      subjectId: cls.subjectId,
      subjectName: cls.subjectName,
    })),
  };
}

/**
 * Formata ciclo para exibição semanal
 */
export function formatCycleForWeek(cycle: StudyCycleResult): Record<number, CycleSlot[]> {
  const byDay: Record<number, CycleSlot[]> = {};

  cycle.slots.forEach(slot => {
    if (!byDay[slot.dayOfWeek]) byDay[slot.dayOfWeek] = [];
    byDay[slot.dayOfWeek].push(slot);
  });

  Object.keys(byDay).forEach(day => {
    byDay[parseInt(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  return byDay;
}
