export type TopicStatus = 'not_started' | 'in_progress' | 'completed';

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
}

export interface StudyCycleItem {
  id: string;
  subjectId: string;
  minutesSuggested: number;
  order: number;
}

export interface UserProfile {
  name: string;
  objective: string;
  weeklyGoalHours: number;
  examDate: string;
  availability: Record<string, number>;
  reviewIntervals: number[];
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
