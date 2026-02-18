import { Subject, Topic, StudySession, Review, StudyCycleItem } from '@/types/study';

export type SuggestionReason = 
  | 'review_overdue' 
  | 'review_today' 
  | 'low_performance' 
  | 'cycle_next' 
  | 'new_topic'
  | 'high_priority';

export interface StudySuggestion {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  reason: SuggestionReason;
  priority: number;
  estimatedMinutes: number;
  details: string;
  reviewId?: string;
}

interface SuggestionContext {
  subjects: Subject[];
  topics: Topic[];
  studySessions: StudySession[];
  reviews: Review[];
  studyCycle: StudyCycleItem[];
  availableMinutes?: number;
}

const REASON_PRIORITY = {
  review_overdue: 100,
  review_today: 90,
  low_performance: 70,
  high_priority: 60,
  cycle_next: 50,
  new_topic: 30,
};

const REASON_LABELS = {
  review_overdue: 'Revisão atrasada',
  review_today: 'Revisão agendada para hoje',
  low_performance: 'Desempenho baixo',
  high_priority: 'Alta prioridade',
  cycle_next: 'Próximo no ciclo',
  new_topic: 'Assunto novo',
};

export function getStudySuggestions(context: SuggestionContext): StudySuggestion[] {
  const { subjects, topics, studySessions, reviews, studyCycle } = context;
  const today = new Date().toISOString().split('T')[0];
  const suggestions: StudySuggestion[] = [];

  // 1. Revisões atrasadas (prioridade máxima)
  const overdueReviews = reviews.filter(r => !r.completed && r.scheduledDate < today);
  for (const review of overdueReviews) {
    const topic = topics.find(t => t.id === review.topicId);
    const subject = subjects.find(s => s.id === review.subjectId);
    if (topic && subject) {
      const daysLate = Math.floor((new Date(today).getTime() - new Date(review.scheduledDate).getTime()) / (1000 * 60 * 60 * 24));
      suggestions.push({
        topicId: topic.id,
        topicName: topic.name,
        subjectId: subject.id,
        subjectName: subject.name,
        subjectColor: subject.color,
        reason: 'review_overdue',
        priority: REASON_PRIORITY.review_overdue + daysLate,
        estimatedMinutes: 25,
        details: `Atrasada há ${daysLate} dia(s) - ${review.type}`,
        reviewId: review.id,
      });
    }
  }

  // 2. Revisões de hoje
  const todayReviews = reviews.filter(r => !r.completed && r.scheduledDate === today);
  for (const review of todayReviews) {
    const topic = topics.find(t => t.id === review.topicId);
    const subject = subjects.find(s => s.id === review.subjectId);
    if (topic && subject) {
      suggestions.push({
        topicId: topic.id,
        topicName: topic.name,
        subjectId: subject.id,
        subjectName: subject.name,
        subjectColor: subject.color,
        reason: 'review_today',
        priority: REASON_PRIORITY.review_today,
        estimatedMinutes: 25,
        details: `Revisão ${review.type} agendada`,
        reviewId: review.id,
      });
    }
  }

  // 3. Tópicos com baixo desempenho (< 70%)
  const topicsWithSessions = topics.filter(t => 
    studySessions.some(s => s.topicId === t.id)
  );

  for (const topic of topicsWithSessions) {
    const sessions = studySessions.filter(s => s.topicId === topic.id);
    const totalQ = sessions.reduce((sum, s) => sum + s.questionsTotal, 0);
    const totalC = sessions.reduce((sum, s) => sum + s.questionsCorrect, 0);
    const accuracy = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

    if (accuracy < 70 && totalQ >= 5) {
      const subject = subjects.find(s => s.id === topic.subjectId);
      if (subject) {
        suggestions.push({
          topicId: topic.id,
          topicName: topic.name,
          subjectId: subject.id,
          subjectName: subject.name,
          subjectColor: subject.color,
          reason: 'low_performance',
          priority: REASON_PRIORITY.low_performance + (70 - accuracy),
          estimatedMinutes: 45,
          details: `Taxa de acerto: ${accuracy}% - Precisa reforço`,
        });
      }
    }
  }

  // 4. Próximo no ciclo de estudos
  if (studyCycle.length > 0) {
    const sortedCycle = [...studyCycle].sort((a, b) => a.order - b.order);
    const lastSession = studySessions[0]; // Já vem ordenado por data desc
    
    let nextCycleItem = sortedCycle[0];
    if (lastSession) {
      const lastCycleIndex = sortedCycle.findIndex(c => c.subjectId === lastSession.subjectId);
      if (lastCycleIndex >= 0) {
        nextCycleItem = sortedCycle[(lastCycleIndex + 1) % sortedCycle.length];
      }
    }

    const subject = subjects.find(s => s.id === nextCycleItem.subjectId);
    if (subject) {
      // Pegar um tópico não concluído ou com menos sessões
      const subjectTopics = topics.filter(t => t.subjectId === subject.id);
      const notStarted = subjectTopics.filter(t => t.status === 'not_started');
      const inProgress = subjectTopics.filter(t => t.status === 'in_progress');
      
      const candidateTopic = notStarted[0] || inProgress[0] || subjectTopics[0];
      
      if (candidateTopic) {
        suggestions.push({
          topicId: candidateTopic.id,
          topicName: candidateTopic.name,
          subjectId: subject.id,
          subjectName: subject.name,
          subjectColor: subject.color,
          reason: 'cycle_next',
          priority: REASON_PRIORITY.cycle_next,
          estimatedMinutes: nextCycleItem.minutesSuggested,
          details: 'Próximo no seu ciclo de estudos',
        });
      }
    }
  }

  // 5. Disciplinas de alta prioridade sem estudo recente
  const highPrioritySubjects = subjects.filter(s => s.priority >= 4);
  for (const subject of highPrioritySubjects) {
    const recentSessions = studySessions.filter(s => {
      const sessionDate = new Date(s.date);
      const daysDiff = Math.floor((new Date(today).getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      return s.subjectId === subject.id && daysDiff <= 3;
    });

    if (recentSessions.length === 0) {
      const subjectTopics = topics.filter(t => t.subjectId === subject.id);
      const notStarted = subjectTopics.filter(t => t.status === 'not_started');
      const inProgress = subjectTopics.filter(t => t.status === 'in_progress');
      
      const candidateTopic = inProgress[0] || notStarted[0] || subjectTopics[0];
      
      if (candidateTopic) {
        suggestions.push({
          topicId: candidateTopic.id,
          topicName: candidateTopic.name,
          subjectId: subject.id,
          subjectName: subject.name,
          subjectColor: subject.color,
          reason: 'high_priority',
          priority: REASON_PRIORITY.high_priority + subject.priority,
          estimatedMinutes: 30,
          details: `Prioridade ${subject.priority}/5 - Sem estudo nos últimos 3 dias`,
        });
      }
    }
  }

  // 6. Tópicos novos (não iniciados)
  const newTopics = topics.filter(t => t.status === 'not_started');
  for (const topic of newTopics.slice(0, 3)) {
    const subject = subjects.find(s => s.id === topic.subjectId);
    if (subject && !suggestions.some(s => s.topicId === topic.id)) {
      suggestions.push({
        topicId: topic.id,
        topicName: topic.name,
        subjectId: subject.id,
        subjectName: subject.name,
        subjectColor: subject.color,
        reason: 'new_topic',
        priority: REASON_PRIORITY.new_topic + subject.priority,
        estimatedMinutes: 30,
        details: 'Assunto ainda não estudado',
      });
    }
  }

  // Remover duplicatas (priorizar primeira ocorrência)
  const uniqueSuggestions = suggestions.reduce((acc, curr) => {
    if (!acc.some(s => s.topicId === curr.topicId)) {
      acc.push(curr);
    }
    return acc;
  }, [] as StudySuggestion[]);

  // Ordenar por prioridade
  return uniqueSuggestions.sort((a, b) => b.priority - a.priority);
}

export function getTopSuggestion(context: SuggestionContext): StudySuggestion | null {
  const suggestions = getStudySuggestions(context);
  return suggestions[0] || null;
}

export function getSuggestionLabel(reason: SuggestionReason): string {
  return REASON_LABELS[reason];
}

export function getSuggestionIcon(reason: SuggestionReason): string {
  const icons = {
    review_overdue: '🚨',
    review_today: '🔄',
    low_performance: '📉',
    high_priority: '⭐',
    cycle_next: '➡️',
    new_topic: '🆕',
  };
  return icons[reason];
}
