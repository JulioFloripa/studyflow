import { TimeSlot, Student, ScheduleType, ScheduleSubject } from '@/types/educational';
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
  linkedToClass?: boolean; // Se está vinculado a uma aula presencial
}

export interface StudyCycleResult {
  slots: CycleSlot[];
  totalMinutes: number;
  weeklyHours: number;
  distribution: Record<string, number>; // subjectId -> minutes
  recommendations: string[];
  classSchedule: Array<{ // Horários de aula para referência
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

/**
 * Calcula o tempo final de um slot
 */
function calculateEndTime(startTime: string, durationMinutes: number = 30): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes + durationMinutes;
  
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

/**
 * Converte horário HH:MM para minutos desde meia-noite
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Extrai horários de aula do time_grid
 */
function extractClassSchedule(timeSlots: TimeSlot[], scheduleSubjects: ScheduleSubject[]): ClassSession[] {
  const classSessions: ClassSession[] = [];
  
  // Filtrar apenas slots de aula presencial
  const classSlots = timeSlots.filter(
    slot => slot.scheduleType === 'class' && slot.subjectId
  );
  
  // Mapear subject IDs para nomes
  const subjectMap = new Map(scheduleSubjects.map(s => [s.id, s.name]));
  
  // Agrupar slots consecutivos da mesma disciplina
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
          // Finalizar grupo anterior
          if (currentGroup.length > 0 && currentGroup[0].subjectId) {
            classSessions.push({
              dayOfWeek: dayNum,
              startTime: currentGroup[0].startTime,
              endTime: calculateEndTime(
                currentGroup[currentGroup.length - 1].startTime,
                30
              ),
              subjectId: currentGroup[0].subjectId,
              subjectName: subjectMap.get(currentGroup[0].subjectId) || 'Disciplina',
            });
          }
          currentGroup = [slot];
        }
      }
      
      // Último slot
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

/**
 * Agrupa slots livres consecutivos
 */
function groupFreeSlots(timeSlots: TimeSlot[]): Array<{
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  duration: number;
}> {
  const freeSlots = timeSlots.filter(slot => slot.status === 'free');
  const grouped: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    duration: number;
  }> = [];

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
          if (currentGroup.length > 0) {
            grouped.push({
              dayOfWeek: dayNum,
              startTime: currentGroup[0].startTime,
              endTime: calculateEndTime(currentGroup[currentGroup.length - 1].startTime, 30),
              duration: currentGroup.length * 30,
            });
          }
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

/**
 * Gera recomendações personalizadas
 */
function generateRecommendations(
  student: Student,
  totalMinutes: number,
  hasClassSchedule: boolean
): string[] {
  const recommendations: string[] = [];
  const hoursPerWeek = totalMinutes / 60;

  // Recomendação sobre "aula dada é aula estudada"
  if (hasClassSchedule) {
    recommendations.push(
      '🎯 AULA DADA É AULA ESTUDADA: Revise o conteúdo no mesmo dia para consolidar 80% mais!',
      '📚 Revisão Imediata: Nos primeiros horários livres após a aula, revise os tópicos vistos.',
      '🔄 Revisão Espaçada: Revise novamente após 1 dia, 1 semana e 1 mês para retenção de longo prazo.'
    );
  }

  // Baseado no ritmo
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

  // Métodos de estudo
  if (student.studyMethods?.includes('pomodoro')) {
    recommendations.push('🍅 Técnica Pomodoro: 25min foco + 5min pausa');
  }
  
  if (student.studyMethods?.includes('active_recall')) {
    recommendations.push('🧠 Após estudar, feche o material e tente recordar os pontos principais');
  }

  if (student.studyMethods?.includes('spaced_repetition')) {
    recommendations.push('📅 Revise em intervalos crescentes: 1 dia, 3 dias, 1 semana, 1 mês');
  }

  // Carga horária
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

/**
 * Gera ciclo inteligente com método "aula dada é aula estudada"
 */
export function generateSmartCycleV2(
  student: Student,
  timeSlots: TimeSlot[],
  subjects: Subject[],
  topicsBySubject: Record<string, string[]>,
  scheduleSubjects: ScheduleSubject[] = []
): StudyCycleResult {
  // 1. Extrair horários de aula (usando disciplinas do horário)
  const classSchedule = extractClassSchedule(timeSlots, scheduleSubjects);
  
  // 2. Identificar blocos livres
  const freeBlocks = groupFreeSlots(timeSlots);
  
  // 3. Calcular tempo total
  const totalMinutes = freeBlocks.reduce((sum, block) => sum + block.duration, 0);
  
  // 4. Organizar blocos livres por dia
  const freeBlocksByDay: Record<number, typeof freeBlocks> = {};
  freeBlocks.forEach(block => {
    if (!freeBlocksByDay[block.dayOfWeek]) freeBlocksByDay[block.dayOfWeek] = [];
    freeBlocksByDay[block.dayOfWeek].push(block);
  });
  
  // 5. Organizar aulas por dia
  const classesByDay: Record<number, ClassSession[]> = {};
  classSchedule.forEach(cls => {
    if (!classesByDay[cls.dayOfWeek]) classesByDay[cls.dayOfWeek] = [];
    classesByDay[cls.dayOfWeek].push(cls);
  });
  
  // 6. Gerar slots de estudo
  const slots: CycleSlot[] = [];
  const distribution: Record<string, number> = {};
  
  // Inicializar distribuição
  subjects.forEach(s => { distribution[s.id] = 0; });
  
  // Para cada dia da semana
  for (let day = 0; day <= 6; day++) {
    const dayClasses = classesByDay[day] || [];
    const dayFreeBlocks = (freeBlocksByDay[day] || []).sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
    
    if (dayClasses.length === 0) {
      // Sem aulas neste dia: distribuir normalmente por prioridade
      dayFreeBlocks.forEach(block => {
        let remaining = block.duration;
        let currentTime = block.startTime;
        
        // Alternar entre disciplinas de maior prioridade
        const sortedSubjects = [...subjects].sort((a, b) => b.priority - a.priority);
        let subjectIndex = 0;
        
        while (remaining >= 30) {
          const subject = sortedSubjects[subjectIndex % sortedSubjects.length];
          const duration = Math.min(60, remaining); // Máximo 60min por sessão
          
          slots.push({
            dayOfWeek: day,
            startTime: currentTime,
            endTime: calculateEndTime(currentTime, duration),
            subjectId: subject.id,
            subjectName: subject.name,
            duration,
            topics: topicsBySubject[subject.id]?.slice(0, 3) || [],
            type: 'deep_study',
            linkedToClass: false,
          });
          
          distribution[subject.id] = (distribution[subject.id] || 0) + duration;
          remaining -= duration;
          currentTime = calculateEndTime(currentTime, duration);
          subjectIndex++;
        }
      });
    } else {
      // Com aulas: aplicar "aula dada é aula estudada"
      dayFreeBlocks.forEach(block => {
        let remaining = block.duration;
        let currentTime = block.startTime;
        
        // Fase 1: Revisão imediata das aulas do dia (prioridade)
        const unreviewedClasses = dayClasses.filter(cls => {
          // Verificar se já não alocamos revisão para esta aula
          const alreadyReviewed = slots.some(
            s => s.dayOfWeek === day && s.subjectId === cls.subjectId && s.type === 'immediate_review'
          );
          return !alreadyReviewed;
        });
        
        for (const cls of unreviewedClasses) {
          if (remaining < 30) break;
          
          // Alocar 30-60min para revisão
          const reviewDuration = Math.min(60, remaining);
          
          slots.push({
            dayOfWeek: day,
            startTime: currentTime,
            endTime: calculateEndTime(currentTime, reviewDuration),
            subjectId: cls.subjectId,
            subjectName: cls.subjectName,
            duration: reviewDuration,
            topics: topicsBySubject[cls.subjectId]?.slice(0, 3) || [],
            type: 'immediate_review',
            linkedToClass: true,
          });
          
          distribution[cls.subjectId] = (distribution[cls.subjectId] || 0) + reviewDuration;
          remaining -= reviewDuration;
          currentTime = calculateEndTime(currentTime, reviewDuration);
        }
        
        // Fase 2: Aprofundamento ou outras disciplinas
        if (remaining >= 30) {
          const sortedSubjects = [...subjects].sort((a, b) => b.priority - a.priority);
          let subjectIndex = 0;
          
          while (remaining >= 30) {
            const subject = sortedSubjects[subjectIndex % sortedSubjects.length];
            const duration = Math.min(60, remaining);
            
            slots.push({
              dayOfWeek: day,
              startTime: currentTime,
              endTime: calculateEndTime(currentTime, duration),
              subjectId: subject.id,
              subjectName: subject.name,
              duration,
              topics: topicsBySubject[subject.id]?.slice(0, 3) || [],
              type: 'deep_study',
              linkedToClass: false,
            });
            
            distribution[subject.id] = (distribution[subject.id] || 0) + duration;
            remaining -= duration;
            currentTime = calculateEndTime(currentTime, duration);
            subjectIndex++;
          }
        }
      });
    }
  }
  
  // 7. Gerar recomendações
  const recommendations = generateRecommendations(student, totalMinutes, classSchedule.length > 0);
  
  return {
    slots,
    totalMinutes,
    weeklyHours: totalMinutes / 60,
    distribution,
    recommendations,
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
