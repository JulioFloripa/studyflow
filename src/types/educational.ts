// Tipos para o Sistema Educacional Completo

export interface Class {
  id: string;
  coordinatorId: string;
  name: string;
  description?: string;
  year: number;
  semester?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LearningStyle {
  visual?: number; // 0-10
  auditory?: number; // 0-10
  kinesthetic?: number; // 0-10
  reading?: number; // 0-10
}

export type StudyMethod = 
  | 'pomodoro'
  | 'spaced_repetition'
  | 'mind_maps'
  | 'flashcards'
  | 'active_recall'
  | 'feynman'
  | 'cornell_notes'
  | 'summarization'
  | 'practice_tests';

export type LearningPace = 'slow' | 'moderate' | 'fast';

export interface AcademicHistory {
  subjects?: {
    name: string;
    grade?: number;
    difficulty?: 'low' | 'medium' | 'high';
  }[];
  strengths?: string[];
  weaknesses?: string[];
  notes?: string;
}

export interface Student {
  id: string;
  userId?: string;
  coordinatorId: string;
  classId?: string;
  
  // Dados Pessoais
  fullName: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  
  // Dados Acadêmicos
  targetCareer?: string;
  targetUniversity?: string;
  currentGrade?: string;
  
  // Dados Pedagógicos
  learningStyle?: LearningStyle;
  studyMethods?: StudyMethod[];
  learningPace?: LearningPace;
  specialNeeds?: string;
  academicHistory?: AcademicHistory;
  
  // Observações
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export type TimeSlotStatus = 'free' | 'occupied' | 'custom';

export type ScheduleType = 'class' | 'study' | 'free' | 'other';

export interface TimeSlot {
  id: string;
  studentId: string;
  dayOfWeek: number; // 0=domingo, 1=segunda, ..., 6=sábado
  startTime: string; // "HH:MM" formato 24h
  status: TimeSlotStatus;
  label?: string;
  color?: string;
  subjectId?: string; // Disciplina vinculada (ex: Biologia, Matemática)
  scheduleType?: ScheduleType; // Tipo: aula, estudo, livre, outro
  inheritedFromClass?: boolean; // Indica se foi herdado da turma
  createdAt: string;
  updatedAt: string;
}

export interface ClassTimeTemplate {
  id: string;
  classId: string;
  dayOfWeek: number; // 0=domingo, 1=segunda, ..., 6=sábado
  startTime: string; // "HH:MM" formato 24h
  label: string; // Ex: "Aula", "Laboratório", "Estágio"
  color?: string;
  status: TimeSlotStatus;
  subjectId?: string; // Disciplina vinculada
  scheduleType?: ScheduleType; // Tipo: aula, estudo, livre, outro
  createdAt: string;
  updatedAt: string;
}

export interface TimeGrid {
  [dayOfWeek: number]: {
    [startTime: string]: TimeSlot;
  };
}

export interface CustomCycle {
  id: string;
  studentId: string;
  cycleData: any; // JSON com estrutura do ciclo
  generatedAt: string;
  generatedBy?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReportType = 
  | 'weekly_schedule'
  | 'study_plan'
  | 'progress'
  | 'performance';

export interface GeneratedReport {
  id: string;
  studentId: string;
  reportType: ReportType;
  reportData: any;
  pdfUrl?: string;
  generatedAt: string;
  generatedBy?: string;
  createdAt: string;
}

// Helpers para grade horária
export const TIME_SLOTS = Array.from({ length: 34 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

export const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

export const DAY_LABELS_SHORT: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

export const STUDY_METHOD_LABELS: Record<StudyMethod, string> = {
  pomodoro: 'Técnica Pomodoro',
  spaced_repetition: 'Repetição Espaçada',
  mind_maps: 'Mapas Mentais',
  flashcards: 'Flashcards',
  active_recall: 'Recordação Ativa',
  feynman: 'Técnica Feynman',
  cornell_notes: 'Notas Cornell',
  summarization: 'Resumos',
  practice_tests: 'Testes Práticos',
};

export const LEARNING_PACE_LABELS: Record<LearningPace, string> = {
  slow: 'Lento (precisa de mais tempo)',
  moderate: 'Moderado (ritmo equilibrado)',
  fast: 'Rápido (aprende facilmente)',
};
