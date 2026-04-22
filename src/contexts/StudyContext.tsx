import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Subject, Topic, StudySession, Review, StudyCycleItem, UserProfile, ScheduleEntry, TopicStatus, SessionType, ClassMode } from '@/types/study';
import { presetExams } from '@/data/presetExams';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { calculateNextReview, getReviewType, type EaseFactor } from '@/lib/spacedRepetition';
import { localDateStr, addDaysLocal } from '@/lib/dateUtils';

interface StudyContextType {
  subjects: Subject[];
  topics: Topic[];
  studySessions: StudySession[];
  reviews: Review[];
  studyCycle: StudyCycleItem[];
  scheduleEntries: ScheduleEntry[];
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
  markReviewDone: (reviewId: string, data?: { minutes?: number; questionsTotal?: number; questionsCorrect?: number; easeFactor?: EaseFactor }) => Promise<void>;
  importPreset: (presetId: string) => Promise<void>;
  removePreset: (presetId: string) => Promise<void>;
  generateCycle: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  addScheduleEntries: (entries: Omit<ScheduleEntry, 'id'>[]) => Promise<void>;
  updateScheduleEntry: (id: string, changes: Partial<Omit<ScheduleEntry, 'id'>>) => Promise<void>;
  removeScheduleEntry: (id: string) => Promise<void>;
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
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultProfile);
  const [importedPresets, setImportedPresets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Atualiza dados sem ativar o spinner de loading (usado após salvar sessões)
  const refreshSilent = useCallback(async () => {
    if (!user) return;
    const [subRes, topRes, sessRes, revRes] = await Promise.all([
      supabase.from('subjects').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('topics').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('study_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('reviews').select('*').eq('user_id', user.id).order('scheduled_date'),
    ]);
    if (subRes.data) setSubjects(subRes.data.map((s: any) => ({ id: s.id, name: s.name, priority: s.priority, color: s.color })));
    if (topRes.data) setTopics(topRes.data.map((t: any) => ({ id: t.id, subjectId: t.subject_id, name: t.name, status: t.status as TopicStatus, tags: t.tags || [] })));
    if (sessRes.data) setStudySessions(sessRes.data.map((s: any) => ({
      id: s.id, topicId: s.topic_id, subjectId: s.subject_id, date: s.date,
      minutesStudied: s.minutes_studied, questionsTotal: s.questions_total,
      questionsCorrect: s.questions_correct, pagesRead: s.pages_read,
      videosWatched: s.videos_watched, notes: s.notes,
      sessionType: (s.session_type as SessionType) || 'study',
      classMode: s.class_mode as ClassMode | undefined,
    })));
    if (revRes.data) setReviews(revRes.data.map((r: any) => ({
      id: r.id, topicId: r.topic_id, subjectId: r.subject_id,
      originalSessionId: r.original_session_id, scheduledDate: r.scheduled_date,
      completed: r.completed, completedDate: r.completed_date,
      minutesSpent: r.minutes_spent, questionsTotal: r.questions_total,
      questionsCorrect: r.questions_correct, type: r.type as Review['type'],
    })));
  }, [user]);

  const refreshData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const [subRes, topRes, sessRes, revRes, cycRes, profRes, impRes, schedRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('topics').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('study_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('reviews').select('*').eq('user_id', user.id).order('scheduled_date'),
        supabase.from('study_cycle').select('*').eq('user_id', user.id).order('sort_order'),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('imported_presets').select('preset_id').eq('user_id', user.id),
        supabase.from('schedule_entries').select('*').eq('user_id', user.id).order('day_of_week'),
      ]);

      if (subRes.data) setSubjects(subRes.data.map((s: any) => ({ id: s.id, name: s.name, priority: s.priority, color: s.color })));
      if (topRes.data) setTopics(topRes.data.map((t: any) => ({ id: t.id, subjectId: t.subject_id, name: t.name, status: t.status as TopicStatus, tags: t.tags || [] })));
      if (sessRes.data) setStudySessions(sessRes.data.map((s: any) => ({
        id: s.id, topicId: s.topic_id, subjectId: s.subject_id, date: s.date,
        minutesStudied: s.minutes_studied, questionsTotal: s.questions_total,
        questionsCorrect: s.questions_correct, pagesRead: s.pages_read,
        videosWatched: s.videos_watched, notes: s.notes,
        sessionType: (s.session_type as SessionType) || 'study',
        classMode: s.class_mode as ClassMode | undefined,
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
          onboarding_data: p.onboarding_data ?? undefined,
          studyStartTime: p.study_start_time || '08:00',
          activeEditalId: p.active_edital_id || undefined,
          wellnessDismissedAt: p.wellness_dismissed_at || undefined,
          theme: p.theme || 'dark',
        });
      }
      if (impRes.data) setImportedPresets(impRes.data.map((i: any) => i.preset_id));
      if (schedRes.data) setScheduleEntries(schedRes.data.map((e: any) => ({
        id: e.id, type: e.type, dayOfWeek: e.day_of_week,
        startTime: e.start_time, endTime: e.end_time,
        subjectId: e.subject_id || '', label: e.label || '', repeats: e.repeats,
      })));
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
      session_type: session.sessionType || 'study',
      class_mode: session.classMode || null,
    } as any).select().single();

    if (data && !error) {
      // Agendar revisões automaticamente
      const intervals = userProfile.reviewIntervals || [1, 7, 30];
      const types: Array<'D1' | 'D7' | 'D30'> = ['D1', 'D7', 'D30'];
      const reviewInserts = intervals.map((days, idx) => ({
        user_id: user.id, topic_id: session.topicId, subject_id: session.subjectId,
        original_session_id: data.id,
        scheduled_date: addDaysLocal(session.date, days),
        type: types[idx] || 'D30',
      }));
      await supabase.from('reviews').insert(reviewInserts as any);

      // Atualizar status do tópico no banco
      const topic = topics.find(t => t.id === session.topicId);
      if (topic && topic.status === 'not_started') {
        await supabase.from('topics').update({ status: 'in_progress' } as any)
          .eq('id', session.topicId).eq('user_id', user.id);
      }

      // Sincronizar todas as telas silenciosamente (sem spinner)
      await refreshSilent();
    }
  }, [user, userProfile.reviewIntervals, topics, refreshSilent]);

  const markReviewDone = useCallback(async (reviewId: string, data?: { minutes?: number; questionsTotal?: number; questionsCorrect?: number; easeFactor?: EaseFactor }) => {
    if (!user) return;
    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;

    const updates: any = { completed: true, completed_date: localDateStr() };
    if (data?.minutes !== undefined) updates.minutes_spent = data.minutes;
    if (data?.questionsTotal !== undefined) updates.questions_total = data.questionsTotal;
    if (data?.questionsCorrect !== undefined) updates.questions_correct = data.questionsCorrect;
    if (data?.easeFactor !== undefined) updates.ease_factor = data.easeFactor;

    if (data?.easeFactor) {
      const currentInterval = review.type === 'D1' ? 1 : review.type === 'D7' ? 7 : 30;
      const { nextInterval } = calculateNextReview(currentInterval, data.easeFactor, review.easeFactor);
      updates.next_interval = nextInterval;

      const nextType = getReviewType(nextInterval);
      await supabase.from('reviews').insert({
        user_id: user.id,
        topic_id: review.topicId,
        subject_id: review.subjectId,
        original_session_id: review.originalSessionId,
        scheduled_date: addDaysLocal(review.scheduledDate, nextInterval),
        type: nextType,
      } as any);
    }

    const { error } = await supabase.from('reviews').update(updates).eq('id', reviewId).eq('user_id', user.id);
    if (!error) {
      setReviews(prev => prev.map(r => r.id === reviewId ? {
        ...r, completed: true, completedDate: updates.completed_date,
        minutesSpent: data?.minutes, questionsTotal: data?.questionsTotal,
        questionsCorrect: data?.questionsCorrect, easeFactor: data?.easeFactor,
        nextInterval: updates.next_interval,
      } : r));
      await refreshData();
    }
  }, [user, reviews, refreshData]);

  const importPreset = useCallback(async (presetId: string) => {
    if (!user) return;
    if (importedPresets.includes(presetId)) return;

    const preset = presetExams.find(p => p.id === presetId);
    if (!preset) return;

    const subjectInserts = preset.subjects.map((s, idx) => ({
      user_id: user.id, name: s.name, priority: s.priority,
      color: SUBJECT_COLORS[(subjects.length + idx) % SUBJECT_COLORS.length],
    }));
    const { data: subData } = await supabase.from('subjects').insert(subjectInserts as any).select();
    if (!subData) return;

    const topicInserts: any[] = [];
    preset.subjects.forEach((s, idx) => {
      const dbSubject = subData[idx];
      if (!dbSubject) return;
      s.topics.forEach(topicName => {
        topicInserts.push({ user_id: user.id, subject_id: dbSubject.id, name: topicName });
      });
    });
    await supabase.from('topics').insert(topicInserts as any);

    await supabase.from('imported_presets').insert({ user_id: user.id, preset_id: presetId } as any);
    setImportedPresets(prev => [...prev, presetId]);

    await refreshData();
  }, [user, importedPresets, subjects.length, refreshData]);

  const removePreset = useCallback(async (presetId: string) => {
    if (!user) return;
    const preset = presetExams.find(p => p.id === presetId);
    if (!preset) return;

    // Remover disciplinas e tópicos do preset (apenas os que têm o mesmo nome)
    const presetSubjectNames = preset.subjects.map(s => s.name);
    const subjectsToRemove = subjects.filter(s => presetSubjectNames.includes(s.name));
    for (const s of subjectsToRemove) {
      await supabase.from('topics').delete().eq('subject_id', s.id).eq('user_id', user.id);
      await supabase.from('subjects').delete().eq('id', s.id).eq('user_id', user.id);
    }
    await supabase.from('imported_presets').delete().eq('user_id', user.id).eq('preset_id', presetId);
    setImportedPresets(prev => prev.filter(p => p !== presetId));
    await refreshData();
  }, [user, importedPresets, subjects, refreshData]);

  const generateCycle = useCallback(async () => {
    if (!user || subjects.length === 0) return;
    const totalPriority = subjects.reduce((sum, s) => sum + s.priority, 0);
    const totalMinutes = Object.values(userProfile.availability).reduce((sum, h) => sum + h * 60, 0);

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
    if (profile.studyStartTime !== undefined) dbUpdates.study_start_time = profile.studyStartTime;
    if (profile.activeEditalId !== undefined) dbUpdates.active_edital_id = profile.activeEditalId || null;
    if (profile.wellnessDismissedAt !== undefined) dbUpdates.wellness_dismissed_at = profile.wellnessDismissedAt;
    if (profile.theme !== undefined) dbUpdates.theme = profile.theme;

    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
    if (!error) setUserProfile(prev => ({ ...prev, ...profile }));
  }, [user]);

  const addScheduleEntries = useCallback(async (entries: Omit<ScheduleEntry, 'id'>[]) => {
    if (!user) return;
    const rows = entries.map(e => ({
      user_id: user.id, type: e.type, day_of_week: e.dayOfWeek,
      start_time: e.startTime, end_time: e.endTime,
      subject_id: e.subjectId || null, label: e.label || null, repeats: e.repeats,
    }));
    const { data, error } = await supabase.from('schedule_entries').insert(rows as any).select();
    if (!error && data) {
      setScheduleEntries(prev => [...prev, ...data.map((e: any) => ({
        id: e.id, type: e.type, dayOfWeek: e.day_of_week,
        startTime: e.start_time, endTime: e.end_time,
        subjectId: e.subject_id || '', label: e.label || '', repeats: e.repeats,
      }))]);
    }
  }, [user]);

  const updateScheduleEntry = useCallback(async (id: string, changes: Partial<Omit<ScheduleEntry, 'id'>>) => {
    if (!user) return;
    const dbChanges: any = {};
    if (changes.type !== undefined) dbChanges.type = changes.type;
    if (changes.dayOfWeek !== undefined) dbChanges.day_of_week = changes.dayOfWeek;
    if (changes.startTime !== undefined) dbChanges.start_time = changes.startTime;
    if (changes.endTime !== undefined) dbChanges.end_time = changes.endTime;
    if (changes.subjectId !== undefined) dbChanges.subject_id = changes.subjectId || null;
    if (changes.label !== undefined) dbChanges.label = changes.label || null;
    if (changes.repeats !== undefined) dbChanges.repeats = changes.repeats;
    dbChanges.updated_at = new Date().toISOString();
    const { error } = await supabase.from('schedule_entries').update(dbChanges).eq('id', id).eq('user_id', user.id);
    if (!error) setScheduleEntries(prev => prev.map(e => e.id === id ? { ...e, ...changes } : e));
  }, [user]);

  const removeScheduleEntry = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('schedule_entries').delete().eq('id', id).eq('user_id', user.id);
    setScheduleEntries(prev => prev.filter(e => e.id !== id));
  }, [user]);

  return (
    <StudyContext.Provider value={{
      subjects, topics, studySessions, reviews, studyCycle, scheduleEntries, userProfile, importedPresets, loading,
      addSubject, updateSubject, removeSubject, addTopic, updateTopicStatus, removeTopic,
      addStudySession, markReviewDone, importPreset, removePreset, generateCycle,
      updateProfile, addScheduleEntries, updateScheduleEntry, removeScheduleEntry, refreshData,
    }}>
      {children}
    </StudyContext.Provider>
  );
};
