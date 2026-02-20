import { TimeSlot, Student } from '@/types/educational';
import { Subject } from '@/types/study';

export interface CycleSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectName: string;
  duration: number; // minutos
  topics: string[];
}

export interface StudyCycleResult {
  slots: CycleSlot[];
  totalMinutes: number;
  weeklyHours: number;
  distribution: Record<string, number>; // subjectId -> minutes
  recommendations: string[];
}

/**
 * Calcula o tempo final de um slot (adiciona 30min ao startTime)
 */
function calculateEndTime(startTime: string): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  let endMinutes = minutes + 30;
  let endHours = hours;
  
  if (endMinutes >= 60) {
    endMinutes -= 60;
    endHours += 1;
  }
  
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

/**
 * Agrupa slots livres consecutivos
 */
function groupConsecutiveFreeSlots(timeSlots: TimeSlot[]): Array<{
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

  // Organizar por dia e horário
  const byDay: Record<number, TimeSlot[]> = {};
  freeSlots.forEach(slot => {
    if (!byDay[slot.dayOfWeek]) byDay[slot.dayOfWeek] = [];
    byDay[slot.dayOfWeek].push(slot);
  });

  // Para cada dia, agrupar slots consecutivos
  Object.entries(byDay).forEach(([day, slots]) => {
    const dayNum = parseInt(day);
    slots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    let currentGroup: TimeSlot[] = [];
    
    slots.forEach((slot, idx) => {
      if (currentGroup.length === 0) {
        currentGroup.push(slot);
      } else {
        const lastSlot = currentGroup[currentGroup.length - 1];
        const expectedNext = calculateEndTime(lastSlot.startTime);
        
        if (slot.startTime === expectedNext) {
          currentGroup.push(slot);
        } else {
          // Finalizar grupo anterior
          if (currentGroup.length > 0) {
            grouped.push({
              dayOfWeek: dayNum,
              startTime: currentGroup[0].startTime,
              endTime: calculateEndTime(currentGroup[currentGroup.length - 1].startTime),
              duration: currentGroup.length * 30,
            });
          }
          currentGroup = [slot];
        }
      }

      // Último slot do dia
      if (idx === slots.length - 1 && currentGroup.length > 0) {
        grouped.push({
          dayOfWeek: dayNum,
          startTime: currentGroup[0].startTime,
          endTime: calculateEndTime(currentGroup[currentGroup.length - 1].startTime),
          duration: currentGroup.length * 30,
        });
      }
    });
  });

  return grouped;
}

/**
 * Gera orientações personalizadas baseadas no perfil do aluno
 */
function generateRecommendations(student: Student, totalMinutes: number): string[] {
  const recommendations: string[] = [];
  const hoursPerWeek = totalMinutes / 60;

  // Baseado no ritmo de aprendizagem
  if (student.learningPace === 'slow') {
    recommendations.push(
      '📚 Como você aprende em ritmo mais tranquilo, foque em compreensão profunda ao invés de quantidade.',
      '⏰ Divida tópicos complexos em sessões menores (30-45min) com pausas.',
      '🔄 Revise o conteúdo no dia seguinte para consolidar o aprendizado.'
    );
  } else if (student.learningPace === 'fast') {
    recommendations.push(
      '🚀 Aproveite seu ritmo acelerado para cobrir mais conteúdo, mas não pule revisões.',
      '🎯 Desafie-se com questões mais difíceis e aprofundamento teórico.',
      '📝 Use o tempo extra para criar resumos e mapas mentais.'
    );
  } else {
    recommendations.push(
      '⚖️ Mantenha um equilíbrio entre quantidade e qualidade nos estudos.',
      '📊 Alterne entre tópicos novos e revisões para melhor retenção.'
    );
  }

  // Baseado nos métodos de estudo
  if (student.studyMethods?.includes('pomodoro')) {
    recommendations.push(
      '🍅 Use a Técnica Pomodoro: 25min de foco + 5min de pausa. Após 4 ciclos, pause 15-30min.'
    );
  }
  
  if (student.studyMethods?.includes('mind_maps')) {
    recommendations.push(
      '🗺️ Crie mapas mentais ao final de cada tópico para visualizar conexões.'
    );
  }
  
  if (student.studyMethods?.includes('flashcards')) {
    recommendations.push(
      '🎴 Prepare flashcards durante o estudo e revise-os nos intervalos.'
    );
  }

  if (student.studyMethods?.includes('active_recall')) {
    recommendations.push(
      '🧠 Após estudar, feche o material e tente recordar os pontos principais.'
    );
  }

  // Baseado na carga horária
  if (hoursPerWeek < 10) {
    recommendations.push(
      '⚠️ Atenção: Você tem poucas horas livres. Priorize disciplinas com maior peso/dificuldade.',
      '💡 Considere estudar em finais de semana ou otimizar horários de deslocamento.'
    );
  } else if (hoursPerWeek > 30) {
    recommendations.push(
      '⚠️ Cuidado com sobrecarga! Mantenha equilíbrio entre estudos, descanso e lazer.',
      '🧘 Reserve pelo menos 1h por dia para atividades físicas e relaxamento.'
    );
  }

  // Orientação geral
  recommendations.push(
    '📅 Siga o cronograma, mas seja flexível para ajustes conforme necessário.',
    '📈 Registre seu progresso semanalmente para acompanhar evolução.',
    '🎯 Priorize qualidade sobre quantidade: é melhor estudar 1h com foco total do que 3h disperso.'
  );

  return recommendations;
}

/**
 * Gera ciclo de estudos inteligente baseado na grade horária do aluno
 */
export function generateSmartCycle(
  student: Student,
  timeSlots: TimeSlot[],
  subjects: Subject[],
  topicsBySubject: Record<string, string[]>
): StudyCycleResult {
  // 1. Identificar blocos de tempo livre
  const freeBlocks = groupConsecutiveFreeSlots(timeSlots);
  
  // 2. Calcular tempo total disponível
  const totalMinutes = freeBlocks.reduce((sum, block) => sum + block.duration, 0);
  
  // 3. Calcular distribuição por prioridade
  const totalPriority = subjects.reduce((sum, s) => sum + s.priority, 0);
  const distribution: Record<string, number> = {};
  
  subjects.forEach(subject => {
    const percentage = subject.priority / totalPriority;
    distribution[subject.id] = Math.round(totalMinutes * percentage);
  });

  // 4. Alocar disciplinas nos blocos livres
  const slots: CycleSlot[] = [];
  const subjectQueue = [...subjects].sort((a, b) => b.priority - a.priority);
  let remainingDistribution = { ...distribution };

  // Estratégia: Distribuir disciplinas de forma intercalada
  // Priorizar blocos maiores para disciplinas de maior prioridade
  const sortedBlocks = [...freeBlocks].sort((a, b) => b.duration - a.duration);

  sortedBlocks.forEach(block => {
    let blockRemaining = block.duration;
    let blockStart = block.startTime;

    // Tentar preencher o bloco com múltiplas disciplinas
    while (blockRemaining >= 30) {
      // Encontrar disciplina com maior tempo restante
      const subject = subjectQueue.find(s => remainingDistribution[s.id] > 0);
      if (!subject) break;

      // Determinar duração da sessão (mínimo 30min, máximo 90min ou o que sobrou)
      const maxSessionDuration = Math.min(90, blockRemaining, remainingDistribution[subject.id]);
      const sessionDuration = Math.max(30, Math.min(maxSessionDuration, 60));

      // Criar slot
      slots.push({
        dayOfWeek: block.dayOfWeek,
        startTime: blockStart,
        endTime: calculateEndTime(blockStart), // Simplificado, apenas 30min
        subjectId: subject.id,
        subjectName: subject.name,
        duration: sessionDuration,
        topics: topicsBySubject[subject.id]?.slice(0, 3) || [],
      });

      // Atualizar contadores
      remainingDistribution[subject.id] -= sessionDuration;
      blockRemaining -= sessionDuration;
      
      // Calcular próximo horário de início
      const [hours, minutes] = blockStart.split(':').map(Number);
      let newMinutes = minutes + sessionDuration;
      let newHours = hours;
      while (newMinutes >= 60) {
        newMinutes -= 60;
        newHours += 1;
      }
      blockStart = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    }
  });

  // 5. Gerar recomendações personalizadas
  const recommendations = generateRecommendations(student, totalMinutes);

  return {
    slots,
    totalMinutes,
    weeklyHours: totalMinutes / 60,
    distribution,
    recommendations,
  };
}

/**
 * Formata o ciclo para exibição semanal
 */
export function formatCycleForWeek(cycle: StudyCycleResult): Record<number, CycleSlot[]> {
  const byDay: Record<number, CycleSlot[]> = {};
  
  cycle.slots.forEach(slot => {
    if (!byDay[slot.dayOfWeek]) byDay[slot.dayOfWeek] = [];
    byDay[slot.dayOfWeek].push(slot);
  });

  // Ordenar por horário
  Object.keys(byDay).forEach(day => {
    byDay[parseInt(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  return byDay;
}
