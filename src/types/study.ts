export type TopicStatus = 'not_started' | 'in_progress' | 'completed';
export type SessionType = 'study' | 'class';
export type ClassMode = 'presencial' | 'online' | 'gravada';

export interface Subject {
  id: string;
  name: string;
  priority: number;
  color: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  status: TopicStatus;
  tags: string[];
}

export interface StudySession {
  id: string;
  topicId: string;
  subjectId: string;
  date: string;
  minutesStudied: number;
  questionsTotal: number;
  questionsCorrect: number;
  pagesRead: number;
  videosWatched: number;
  notes: string;
  sessionType: SessionType;
  classMode?: ClassMode;
}

export interface Review {
  id: string;
  topicId: string;
  subjectId: string;
  originalSessionId: string;
  scheduledDate: string;
  completed: boolean;
  completedDate?: string;
  minutesSpent?: number;
  questionsTotal?: number;
  questionsCorrect?: number;
  type: 'D1' | 'D7' | 'D30';
  easeFactor?: number; // 1-5: quão fácil foi a revisão
  nextInterval?: number; // dias até próxima revisão (calculado)
}

export interface StudyCycleItem {
  id: string;
  subjectId: string;
  minutesSuggested: number;
  order: number;
}

export interface ScheduleEntry {
  id: string;
  type: 'class' | 'sleep' | 'exercise';
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  label: string;
  repeats: boolean;
}

export interface UserProfile {
  name: string;
  objective: string;
  weeklyGoalHours: number;
  examDate: string;
  availability: Record<string, number>;
  reviewIntervals: number[];
  unlockedBadges?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onboarding_data?: Record<string, any>;
  studyStartTime?: string;
  activeEditalId?: string;
  wellnessDismissedAt?: number;
  theme?: string;
}

export interface PresetExam {
  id: string;
  name: string;
  description: string;
  subjects: {
    name: string;
    priority: number;
    topics: string[];
  }[];
}

export interface StudyState {
  subjects: Subject[];
  topics: Topic[];
  studySessions: StudySession[];
  reviews: Review[];
  studyCycle: StudyCycleItem[];
  userProfile: UserProfile;
  _version: number;
}
