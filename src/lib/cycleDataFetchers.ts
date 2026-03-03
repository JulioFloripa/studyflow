import { supabase } from '@/integrations/supabase/client';
import type { DifficultyTopic } from './cycleGeneratorV2';

/**
 * Fetches syllabus items planned for the current week number,
 * grouped by schedule_subject_id.
 */
export async function fetchSyllabusWeekTopics(
  scheduleSubjectIds: string[]
): Promise<Record<string, string[]>> {
  if (scheduleSubjectIds.length === 0) return {};

  // Calculate current week of year
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const currentWeek = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);

  const { data } = await (supabase as any)
    .from('syllabus_items')
    .select('schedule_subject_id, name')
    .in('schedule_subject_id', scheduleSubjectIds)
    .eq('planned_week', currentWeek)
    .in('status', ['pending', 'current'])
    .order('sort_order');

  const result: Record<string, string[]> = {};
  if (data) {
    data.forEach((item: any) => {
      const id = item.schedule_subject_id;
      if (!result[id]) result[id] = [];
      result[id].push(item.name);
    });
  }
  return result;
}

/**
 * Fetches edital topics for the student's selected editais,
 * mapped to the student's subject IDs by case-insensitive name matching.
 * Returns Record<subjectId, topicNames[]> to merge with topicsBySubject.
 */
export async function fetchEditalTopicsForCycle(
  userId: string,
  subjectNameToId: Record<string, string> // lowercase subjectName -> subjectId
): Promise<Record<string, string[]>> {
  // 1. Get student's selected editais
  const { data: selections } = await (supabase as any)
    .from('student_edital_selections')
    .select('edital_id')
    .eq('user_id', userId);

  if (!selections || selections.length === 0) return {};

  const editalIds = selections.map((s: any) => s.edital_id);

  // 2. Get edital subjects with their topics
  const { data: editalSubjects } = await (supabase as any)
    .from('edital_subjects')
    .select('id, name, edital_id')
    .in('edital_id', editalIds);

  if (!editalSubjects || editalSubjects.length === 0) return {};

  const editalSubjectIds = editalSubjects.map((es: any) => es.id);

  const { data: editalTopics } = await (supabase as any)
    .from('edital_topics')
    .select('edital_subject_id, name')
    .in('edital_subject_id', editalSubjectIds)
    .order('sort_order');

  if (!editalTopics || editalTopics.length === 0) return {};

  // 3. Build editalSubjectId -> subjectId mapping via name matching
  const esIdToSubjectId: Record<string, string> = {};
  editalSubjects.forEach((es: any) => {
    const matched = subjectNameToId[es.name.toLowerCase().trim()];
    if (matched) {
      esIdToSubjectId[es.id] = matched;
    }
  });

  // 4. Group edital topics by matched subject ID
  const result: Record<string, string[]> = {};
  editalTopics.forEach((t: any) => {
    const subjectId = esIdToSubjectId[t.edital_subject_id];
    if (!subjectId) return;
    if (!result[subjectId]) result[subjectId] = [];
    // Avoid duplicates
    if (!result[subjectId].includes(t.name)) {
      result[subjectId].push(t.name);
    }
  });

  return result;
}

/**
 * Fetches topics with low performance (< 60% accuracy)
 * from study_sessions for a given user, returns as DifficultyTopic[].
 */
export async function fetchDifficultyTopics(
  userId: string,
  subjectMap: Record<string, string> // subjectId -> subjectName
): Promise<DifficultyTopic[]> {
  const { data: sessions } = await (supabase as any)
    .from('study_sessions')
    .select('subject_id, topic_id, questions_total, questions_correct')
    .eq('user_id', userId)
    .gt('questions_total', 0);

  if (!sessions || sessions.length === 0) return [];

  // Aggregate by topic
  const topicStats: Record<string, { subjectId: string; total: number; correct: number }> = {};
  sessions.forEach((s: any) => {
    const key = s.topic_id;
    if (!topicStats[key]) {
      topicStats[key] = { subjectId: s.subject_id, total: 0, correct: 0 };
    }
    topicStats[key].total += s.questions_total;
    topicStats[key].correct += s.questions_correct;
  });

  // Get topic names
  const topicIds = Object.keys(topicStats);
  if (topicIds.length === 0) return [];

  const { data: topicsData } = await (supabase as any)
    .from('topics')
    .select('id, name')
    .in('id', topicIds);

  const topicNameMap: Record<string, string> = {};
  topicsData?.forEach((t: any) => { topicNameMap[t.id] = t.name; });

  // Filter topics with < 60% accuracy
  const difficulties: DifficultyTopic[] = [];
  Object.entries(topicStats).forEach(([topicId, stats]) => {
    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    if (accuracy < 60) {
      difficulties.push({
        subjectId: stats.subjectId,
        subjectName: subjectMap[stats.subjectId] || 'Disciplina',
        topicName: topicNameMap[topicId] || 'Tópico',
        accuracy,
      });
    }
  });

  return difficulties.sort((a, b) => a.accuracy - b.accuracy);
}
