import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Subject, Topic, StudySession, Review, StudyCycleItem, UserProfile, TopicStatus } from '@/types/study';
import { presetExams } from '@/data/presetExams';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface StudyContextType {
  subjects: Subject[];
  topics: Topic[];
  studySessions: StudySession[];
  reviews: Review[];
  studyCycle: StudyCycleItem[];
  userProfile: UserProfile;
  importedPresets: string[];
  loading: boolean;
  addSubject: (name: string, priority?: number, color?: string) => Promise<void>;
  updateSubject: (id: string, changes: Partial<Pick<Subject, 'name' | 'priority' | 'color'>>) => Promise<void>;
  removeSubject: (id: string) => Promise<void>;
  addTopic: (subjectId: string, name: string) => Promise<void>;
  updateTopicStatus: (topicId: string, status: TopicStatus) => Promise<void>;
  removeTopic: (id: string) => Promise<void>;
  addStudySession: (session: Omit<StudySession, 'id'>) => Promise<void>;
  markReviewDone: (reviewId: string, data?: { minutes?: number; questionsTotal?: number; questionsCorrect?: number }) => Promise<void>;
  importPreset: (presetId: string) => Promise<void>;
  generateCycle: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  refreshData: () => Promise<void>;
}

const SUBJECT_COLORS = ['#4338CA', '#E11D48', '#059669', '#D97706', '#7C3AED', '#0891B2', '#DC2626', '#2563EB', '#CA8A04', '#9333EA'];

const StudyContext = createContext<StudyContextType | null>(null);

export const useStudy = () => {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used within StudyProvider');
  return ctx;
};

const defaultProfile: UserProfile = {
  name: '', objective: '', weeklyGoalHours: 20, examDate: '',
  availability: { seg: 2, ter: 2, qua: 2, qui: 2, sex: 2, sab: 4, dom: 4 },
  reviewIntervals: [1, 7, 30],
};

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [studyCycle, setStudyCycle] = useState<StudyCycleItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultProfile);
  const [importedPresets, setImportedPresets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const [subRes, topRes, sessRes, revRes, cycRes, profRes, impRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('topics').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('study_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('reviews').select('*').eq('user_id', user.id).order('scheduled_date'),
        supabase.from('study_cycle').select('*').eq('user_id', user.id).order('sort_order'),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('imported_presets').select('preset_id').eq('user_id', user.id),
      ]);

      if (subRes.data) setSubjects(subRes.data.map((s: any) => ({ id: s.id, name: s.name, priority: s.priority, color: s.color })));
      if (topRes.data) setTopics(topRes.data.map((t: any) => ({ id: t.id, subjectId: t.subject_id, name: t.name, status: t.status as TopicStatus, tags: t.tags || [] })));
      if (sessRes.data) setStudySessions(sessRes.data.map((s: any) => ({
        id: s.id, topicId: s.topic_id, subjectId: s.subject_id, date: s.date,
        minutesStudied: s.minutes_studied, questionsTotal: s.questions_total,
        questionsCorrect: s.questions_correct, pagesRead: s.pages_read,
        videosWatched: s.videos_watched, notes: s.notes,
      })));
      if (revRes.data) setReviews(revRes.data.map((r: any) => ({
        id: r.id, topicId: r.topic_id, subjectId: r.subject_id,
        originalSessionId: r.original_session_id, scheduledDate: r.scheduled_date,
        completed: r.completed, completedDate: r.completed_date,
        minutesSpent: r.minutes_spent, questionsTotal: r.questions_total,
        questionsCorrect: r.questions_correct, type: r.type as Review['type'],
      })));
      if (cycRes.data) setStudyCycle(cycRes.data.map((c: any) => ({ id: c.id, subjectId: c.subject_id, minutesSuggested: c.minutes_suggested, order: c.sort_order })));
      if (profRes.data) {
        const p = profRes.data as any;
        setUserProfile({
          name: p.name || '', objective: p.objective || '',
          weeklyGoalHours: Number(p.weekly_goal_hours) || 20,
          examDate: p.exam_date || '',
          availability: (p.availability as Record<string, number>) || defaultProfile.availability,
          reviewIntervals: (p.review_intervals as number[]) || defaultProfile.reviewIntervals,
        });
      }
      if (impRes.data) setImportedPresets(impRes.data.map((i: any) => i.preset_id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refreshData(); }, [refreshData]);

  const addSubject = useCallback(async (name: string, priority = 3, color?: string) => {
    if (!user) return;
    const newColor = color || SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length];
    const { data, error } = await supabase.from('subjects').insert({ user_id: user.id, name, priority, color: newColor } as any).select().single();
    if (data && !error) setSubjects(prev => [...prev, { id: data.id, name: data.name, priority: data.priority, color: data.color }]);
  }, [user, subjects.length]);

  const updateSubject = useCallback(async (id: string, changes: Partial<Pick<Subject, 'name' | 'priority' | 'color'>>) => {
    if (!user) return;
    const { error } = await supabase.from('subjects').update(changes as any).eq('id', id).eq('user_id', user.id);
    if (!error) setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s));
  }, [user]);

  const removeSubject = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('subjects').delete().eq('id', id).eq('user_id', user.id);
    setSubjects(prev => prev.filter(s => s.id !== id));
    setTopics(prev => prev.filter(t => t.subjectId !== id));
  }, [user]);

  const addTopic = useCallback(async (subjectId: string, name: string) => {
    if (!user) return;
    const { data, error } = await supabase.from('topics').insert({ user_id: user.id, subject_id: subjectId, name } as any).select().single();
    if (data && !error) setTopics(prev => [...prev, { id: data.id, subjectId: data.subject_id, name: data.name, status: data.status as TopicStatus, tags: data.tags || [] }]);
  }, [user]);

  const updateTopicStatus = useCallback(async (topicId: string, status: TopicStatus) => {
    if (!user) return;
    const { error } = await supabase.from('topics').update({ status } as any).eq('id', topicId).eq('user_id', user.id);
    if (!error) setTopics(prev => prev.map(t => t.id === topicId ? { ...t, status } : t));
  }, [user]);

  const removeTopic = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('topics').delete().eq('id', id).eq('user_id', user.id);
    setTopics(prev => prev.filter(t => t.id !== id));
  }, [user]);

  const addStudySession = useCallback(async (session: Omit<StudySession, 'id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('study_sessions').insert({
      user_id: user.id, topic_id: session.topicId, subject_id: session.subjectId,
      date: session.date, minutes_studied: session.minutesStudied,
      questions_total: session.questionsTotal, questions_correct: session.questionsCorrect,
      pages_read: session.pagesRead, videos_watched: session.videosWatched, notes: session.notes,
    } as any).select().single();

    if (data && !error) {
      setStudySessions(prev => [{ id: data.id, ...session }, ...prev]);

      // Auto-schedule reviews
      const intervals = userProfile.reviewIntervals || [1, 7, 30];
      const types: Array<'D1' | 'D7' | 'D30'> = ['D1', 'D7', 'D30'];
      const reviewInserts = intervals.map((days, idx) => {
        const date = new Date(session.date);
        date.setDate(date.getDate() + days);
        return {
          user_id: user.id, topic_id: session.topicId, subject_id: session.subjectId,
          original_session_id: data.id, scheduled_date: date.toISOString().split('T')[0],
          type: types[idx] || 'D30',
        };
      });
      const { data: revData } = await supabase.from('reviews').insert(reviewInserts as any).select();
      if (revData) {
        const newReviews = revData.map((r: any) => ({
          id: r.id, topicId: r.topic_id, subjectId: r.subject_id,
          originalSessionId: r.original_session_id, scheduledDate: r.scheduled_date,
          completed: r.completed, type: r.type as Review['type'],
        }));
        setReviews(prev => [...prev, ...newReviews]);
      }

      // Update topic status
      const topic = topics.find(t => t.id === session.topicId);
      if (topic && topic.status === 'not_started') {
        await updateTopicStatus(session.topicId, 'in_progress');
      }
    }
  }, [user, userProfile.reviewIntervals, topics, updateTopicStatus]);

  const markReviewDone = useCallback(async (reviewId: string, data?: { minutes?: number; questionsTotal?: number; questionsCorrect?: number }) => {
    if (!user) return;
    const updates: any = { completed: true, completed_date: new Date().toISOString().split('T')[0] };
    if (data?.minutes !== undefined) updates.minutes_spent = data.minutes;
    if (data?.questionsTotal !== undefined) updates.questions_total = data.questionsTotal;
    if (data?.questionsCorrect !== undefined) updates.questions_correct = data.questionsCorrect;
    const { error } = await supabase.from('reviews').update(updates).eq('id', reviewId).eq('user_id', user.id);
    if (!error) setReviews(prev => prev.map(r => r.id === reviewId ? {
      ...r, completed: true, completedDate: updates.completed_date,
      minutesSpent: data?.minutes, questionsTotal: data?.questionsTotal, questionsCorrect: data?.questionsCorrect,
    } : r));
  }, [user]);

  const importPreset = useCallback(async (presetId: string) => {
    if (!user) return;
    if (importedPresets.includes(presetId)) return;

    const preset = presetExams.find(p => p.id === presetId);
    if (!preset) return;

    // Insert subjects
    const subjectInserts = preset.subjects.map((s, idx) => ({
      user_id: user.id, name: s.name, priority: s.priority,
      color: SUBJECT_COLORS[(subjects.length + idx) % SUBJECT_COLORS.length],
    }));
    const { data: subData } = await supabase.from('subjects').insert(subjectInserts as any).select();
    if (!subData) return;

    // Insert topics
    const topicInserts: any[] = [];
    preset.subjects.forEach((s, idx) => {
      const dbSubject = subData[idx];
      if (!dbSubject) return;
      s.topics.forEach(topicName => {
        topicInserts.push({ user_id: user.id, subject_id: dbSubject.id, name: topicName });
      });
    });
    await supabase.from('topics').insert(topicInserts as any);

    // Track import
    await supabase.from('imported_presets').insert({ user_id: user.id, preset_id: presetId } as any);
    setImportedPresets(prev => [...prev, presetId]);

    await refreshData();
  }, [user, importedPresets, subjects.length, refreshData]);

  const generateCycle = useCallback(async () => {
    if (!user || subjects.length === 0) return;
    const totalPriority = subjects.reduce((sum, s) => sum + s.priority, 0);
    const totalMinutes = Object.values(userProfile.availability).reduce((sum, h) => sum + h * 60, 0);

    // Clear old cycle
    await supabase.from('study_cycle').delete().eq('user_id', user.id);

    const items: any[] = [];
    let order = 0;
    for (let round = 0; round < 2; round++) {
      for (const subject of subjects) {
        const minutesSuggested = Math.max(Math.round((subject.priority / totalPriority) * totalMinutes / 2), 25);
        items.push({ user_id: user.id, subject_id: subject.id, minutes_suggested: minutesSuggested, sort_order: order++ });
      }
    }
    const { data } = await supabase.from('study_cycle').insert(items).select();
    if (data) setStudyCycle(data.map((c: any) => ({ id: c.id, subjectId: c.subject_id, minutesSuggested: c.minutes_suggested, order: c.sort_order })));
  }, [user, subjects, userProfile.availability]);

  const updateProfile = useCallback(async (profile: Partial<UserProfile>) => {
    if (!user) return;
    const dbUpdates: any = {};
    if (profile.name !== undefined) dbUpdates.name = profile.name;
    if (profile.objective !== undefined) dbUpdates.objective = profile.objective;
    if (profile.weeklyGoalHours !== undefined) dbUpdates.weekly_goal_hours = profile.weeklyGoalHours;
    if (profile.examDate !== undefined) dbUpdates.exam_date = profile.examDate || null;
    if (profile.availability !== undefined) dbUpdates.availability = profile.availability;
    if (profile.reviewIntervals !== undefined) dbUpdates.review_intervals = profile.reviewIntervals;

    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
    if (!error) setUserProfile(prev => ({ ...prev, ...profile }));
  }, [user]);

  return (
    <StudyContext.Provider value={{
      subjects, topics, studySessions, reviews, studyCycle, userProfile, importedPresets, loading,
      addSubject, updateSubject, removeSubject, addTopic, updateTopicStatus, removeTopic,
      addStudySession, markReviewDone, importPreset, generateCycle, updateProfile, refreshData,
    }}>
      {children}
    </StudyContext.Provider>
  );
};
