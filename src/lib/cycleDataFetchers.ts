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
