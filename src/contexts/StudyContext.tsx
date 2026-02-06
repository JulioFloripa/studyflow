import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Subject, Topic, StudySession, Review, StudyCycleItem, UserProfile, StudyState, TopicStatus } from '@/types/study';
import { getDefaultSeedData } from '@/data/seedData';
import { presetExams } from '@/data/presetExams';

interface StudyContextType {
  subjects: Subject[];
  topics: Topic[];
  studySessions: StudySession[];
  reviews: Review[];
  studyCycle: StudyCycleItem[];
  userProfile: UserProfile;
  addSubject: (name: string, priority?: number, color?: string) => void;
  removeSubject: (id: string) => void;
  addTopic: (subjectId: string, name: string) => void;
  updateTopicStatus: (topicId: string, status: TopicStatus) => void;
  removeTopic: (id: string) => void;
  addStudySession: (session: Omit<StudySession, 'id'>) => void;
  markReviewDone: (reviewId: string, data?: { minutes?: number; questionsTotal?: number; questionsCorrect?: number }) => void;
  importPreset: (presetId: string) => void;
  generateCycle: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  resetData: () => void;
}

const STORAGE_KEY = 'studyflow-data';
const STORAGE_VERSION = 1;

const generateId = () => Math.random().toString(36).substr(2, 9);

const SUBJECT_COLORS = ['#4338CA', '#E11D48', '#059669', '#D97706', '#7C3AED', '#0891B2', '#DC2626', '#2563EB', '#CA8A04', '#9333EA'];

const StudyContext = createContext<StudyContextType | null>(null);

export const useStudy = () => {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used within StudyProvider');
  return ctx;
};

const loadData = (): StudyState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed._version === STORAGE_VERSION) return parsed;
    }
  } catch { /* fall through */ }
  return getDefaultSeedData();
};

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StudyState>(loadData);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const update = useCallback((changes: Partial<StudyState>) => {
    setState(prev => ({ ...prev, ...changes }));
  }, []);

  const addSubject = useCallback((name: string, priority = 3, color?: string) => {
    const newColor = color || SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length];
    const newSubject: Subject = { id: generateId(), name, priority, color: newColor };
    update({ subjects: [...state.subjects, newSubject] });
  }, [state.subjects, update]);

  const removeSubject = useCallback((id: string) => {
    update({
      subjects: state.subjects.filter(s => s.id !== id),
      topics: state.topics.filter(t => t.subjectId !== id),
    });
  }, [state.subjects, state.topics, update]);

  const addTopic = useCallback((subjectId: string, name: string) => {
    const newTopic: Topic = { id: generateId(), subjectId, name, status: 'not_started', tags: [] };
    update({ topics: [...state.topics, newTopic] });
  }, [state.topics, update]);

  const updateTopicStatus = useCallback((topicId: string, status: TopicStatus) => {
    update({ topics: state.topics.map(t => t.id === topicId ? { ...t, status } : t) });
  }, [state.topics, update]);

  const removeTopic = useCallback((id: string) => {
    update({ topics: state.topics.filter(t => t.id !== id) });
  }, [state.topics, update]);

  const addStudySession = useCallback((session: Omit<StudySession, 'id'>) => {
    const id = generateId();
    const newSession: StudySession = { ...session, id };

    const intervals = state.userProfile.reviewIntervals || [1, 7, 30];
    const types: Array<'D1' | 'D7' | 'D30'> = ['D1', 'D7', 'D30'];
    const newReviews: Review[] = intervals.map((days, idx) => {
      const date = new Date(session.date);
      date.setDate(date.getDate() + days);
      return {
        id: generateId(),
        topicId: session.topicId,
        subjectId: session.subjectId,
        originalSessionId: id,
        scheduledDate: date.toISOString().split('T')[0],
        completed: false,
        type: types[idx] || 'D30',
      };
    });

    const topic = state.topics.find(t => t.id === session.topicId);
    let updatedTopics = state.topics;
    if (topic && topic.status === 'not_started') {
      updatedTopics = state.topics.map(t => t.id === session.topicId ? { ...t, status: 'in_progress' as TopicStatus } : t);
    }

    update({
      studySessions: [...state.studySessions, newSession],
      reviews: [...state.reviews, ...newReviews],
      topics: updatedTopics,
    });
  }, [state.studySessions, state.reviews, state.topics, state.userProfile.reviewIntervals, update]);

  const markReviewDone = useCallback((reviewId: string, data?: { minutes?: number; questionsTotal?: number; questionsCorrect?: number }) => {
    update({
      reviews: state.reviews.map(r => r.id === reviewId ? {
        ...r,
        completed: true,
        completedDate: new Date().toISOString().split('T')[0],
        minutesSpent: data?.minutes,
        questionsTotal: data?.questionsTotal,
        questionsCorrect: data?.questionsCorrect,
      } : r),
    });
  }, [state.reviews, update]);

  const importPreset = useCallback((presetId: string) => {
    const preset = presetExams.find(p => p.id === presetId);
    if (!preset) return;

    const newSubjects: Subject[] = [];
    const newTopics: Topic[] = [];

    preset.subjects.forEach((s, idx) => {
      const subjectId = generateId();
      newSubjects.push({
        id: subjectId,
        name: s.name,
        priority: s.priority,
        color: SUBJECT_COLORS[(state.subjects.length + idx) % SUBJECT_COLORS.length],
      });
      s.topics.forEach(topicName => {
        newTopics.push({
          id: generateId(),
          subjectId,
          name: topicName,
          status: 'not_started',
          tags: [],
        });
      });
    });

    update({
      subjects: [...state.subjects, ...newSubjects],
      topics: [...state.topics, ...newTopics],
    });
  }, [state.subjects, state.topics, update]);

  const generateCycle = useCallback(() => {
    if (state.subjects.length === 0) return;
    const totalPriority = state.subjects.reduce((sum, s) => sum + s.priority, 0);
    const totalMinutes = Object.values(state.userProfile.availability).reduce((sum, h) => sum + h * 60, 0);

    const cycle: StudyCycleItem[] = [];
    let order = 0;

    for (let round = 0; round < 2; round++) {
      for (const subject of state.subjects) {
        const minutesSuggested = Math.max(Math.round((subject.priority / totalPriority) * totalMinutes / 2), 25);
        cycle.push({ id: generateId(), subjectId: subject.id, minutesSuggested, order: order++ });
      }
    }

    update({ studyCycle: cycle });
  }, [state.subjects, state.userProfile.availability, update]);

  const updateProfile = useCallback((profile: Partial<UserProfile>) => {
    update({ userProfile: { ...state.userProfile, ...profile } });
  }, [state.userProfile, update]);

  const resetData = useCallback(() => {
    const fresh = getDefaultSeedData();
    setState(fresh);
  }, []);

  return (
    <StudyContext.Provider value={{
      subjects: state.subjects,
      topics: state.topics,
      studySessions: state.studySessions,
      reviews: state.reviews,
      studyCycle: state.studyCycle,
      userProfile: state.userProfile,
      addSubject, removeSubject, addTopic, updateTopicStatus, removeTopic,
      addStudySession, markReviewDone, importPreset, generateCycle, updateProfile, resetData,
    }}>
      {children}
    </StudyContext.Provider>
  );
};
