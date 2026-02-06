import { StudyState } from '@/types/study';

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

const daysFromNow = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

export const getDefaultSeedData = (): StudyState => ({
  _version: 1,
  subjects: [
    { id: 'mat', name: 'Matemática', priority: 5, color: '#4338CA' },
    { id: 'port', name: 'Português', priority: 4, color: '#E11D48' },
    { id: 'bio', name: 'Biologia', priority: 3, color: '#059669' },
    { id: 'fis', name: 'Física', priority: 4, color: '#D97706' },
    { id: 'qui', name: 'Química', priority: 3, color: '#7C3AED' },
    { id: 'hist', name: 'História', priority: 3, color: '#0891B2' },
  ],
  topics: [
    { id: 'mat1', subjectId: 'mat', name: 'Funções e Gráficos', status: 'in_progress', tags: [] },
    { id: 'mat2', subjectId: 'mat', name: 'Geometria Plana', status: 'not_started', tags: [] },
    { id: 'mat3', subjectId: 'mat', name: 'Probabilidade e Estatística', status: 'completed', tags: [] },
    { id: 'mat4', subjectId: 'mat', name: 'Porcentagem e Juros', status: 'in_progress', tags: [] },
    { id: 'port1', subjectId: 'port', name: 'Interpretação de Texto', status: 'in_progress', tags: [] },
    { id: 'port2', subjectId: 'port', name: 'Gramática', status: 'not_started', tags: [] },
    { id: 'port3', subjectId: 'port', name: 'Literatura Brasileira', status: 'in_progress', tags: [] },
    { id: 'bio1', subjectId: 'bio', name: 'Genética', status: 'in_progress', tags: [] },
    { id: 'bio2', subjectId: 'bio', name: 'Ecologia', status: 'not_started', tags: [] },
    { id: 'bio3', subjectId: 'bio', name: 'Bioquímica e Citologia', status: 'completed', tags: [] },
    { id: 'fis1', subjectId: 'fis', name: 'Mecânica', status: 'in_progress', tags: [] },
    { id: 'fis2', subjectId: 'fis', name: 'Termodinâmica', status: 'not_started', tags: [] },
    { id: 'fis3', subjectId: 'fis', name: 'Eletricidade', status: 'not_started', tags: [] },
    { id: 'qui1', subjectId: 'qui', name: 'Química Orgânica', status: 'in_progress', tags: [] },
    { id: 'qui2', subjectId: 'qui', name: 'Estequiometria', status: 'not_started', tags: [] },
    { id: 'hist1', subjectId: 'hist', name: 'Brasil Colonial', status: 'completed', tags: [] },
    { id: 'hist2', subjectId: 'hist', name: 'Revolução Industrial', status: 'in_progress', tags: [] },
    { id: 'hist3', subjectId: 'hist', name: 'Guerras Mundiais', status: 'not_started', tags: [] },
  ],
  studySessions: [
    { id: 'ss1', topicId: 'mat1', subjectId: 'mat', date: daysAgo(0), minutesStudied: 65, questionsTotal: 15, questionsCorrect: 11, pagesRead: 0, videosWatched: 1, notes: '' },
    { id: 'ss2', topicId: 'port1', subjectId: 'port', date: daysAgo(0), minutesStudied: 45, questionsTotal: 20, questionsCorrect: 16, pagesRead: 5, videosWatched: 0, notes: '' },
    { id: 'ss3', topicId: 'fis1', subjectId: 'fis', date: daysAgo(1), minutesStudied: 55, questionsTotal: 12, questionsCorrect: 7, pagesRead: 3, videosWatched: 1, notes: 'Rever leis de Newton' },
    { id: 'ss4', topicId: 'mat3', subjectId: 'mat', date: daysAgo(1), minutesStudied: 40, questionsTotal: 18, questionsCorrect: 15, pagesRead: 0, videosWatched: 0, notes: '' },
    { id: 'ss5', topicId: 'bio1', subjectId: 'bio', date: daysAgo(2), minutesStudied: 50, questionsTotal: 10, questionsCorrect: 6, pagesRead: 8, videosWatched: 1, notes: '' },
    { id: 'ss6', topicId: 'qui1', subjectId: 'qui', date: daysAgo(2), minutesStudied: 35, questionsTotal: 8, questionsCorrect: 5, pagesRead: 0, videosWatched: 1, notes: '' },
    { id: 'ss7', topicId: 'hist2', subjectId: 'hist', date: daysAgo(3), minutesStudied: 60, questionsTotal: 14, questionsCorrect: 10, pagesRead: 12, videosWatched: 0, notes: '' },
    { id: 'ss8', topicId: 'mat1', subjectId: 'mat', date: daysAgo(3), minutesStudied: 50, questionsTotal: 20, questionsCorrect: 14, pagesRead: 0, videosWatched: 0, notes: '' },
    { id: 'ss9', topicId: 'port3', subjectId: 'port', date: daysAgo(4), minutesStudied: 40, questionsTotal: 10, questionsCorrect: 8, pagesRead: 15, videosWatched: 0, notes: '' },
    { id: 'ss10', topicId: 'bio3', subjectId: 'bio', date: daysAgo(5), minutesStudied: 70, questionsTotal: 25, questionsCorrect: 22, pagesRead: 4, videosWatched: 2, notes: 'Completei o assunto!' },
    { id: 'ss11', topicId: 'fis1', subjectId: 'fis', date: daysAgo(5), minutesStudied: 45, questionsTotal: 10, questionsCorrect: 6, pagesRead: 0, videosWatched: 1, notes: '' },
    { id: 'ss12', topicId: 'mat4', subjectId: 'mat', date: daysAgo(6), minutesStudied: 30, questionsTotal: 12, questionsCorrect: 9, pagesRead: 0, videosWatched: 0, notes: '' },
    { id: 'ss13', topicId: 'hist1', subjectId: 'hist', date: daysAgo(7), minutesStudied: 55, questionsTotal: 16, questionsCorrect: 14, pagesRead: 10, videosWatched: 0, notes: '' },
    { id: 'ss14', topicId: 'qui1', subjectId: 'qui', date: daysAgo(8), minutesStudied: 40, questionsTotal: 10, questionsCorrect: 4, pagesRead: 6, videosWatched: 1, notes: 'Dificuldade com nomenclatura' },
    { id: 'ss15', topicId: 'mat1', subjectId: 'mat', date: daysAgo(9), minutesStudied: 60, questionsTotal: 22, questionsCorrect: 16, pagesRead: 0, videosWatched: 0, notes: '' },
    { id: 'ss16', topicId: 'port1', subjectId: 'port', date: daysAgo(10), minutesStudied: 50, questionsTotal: 15, questionsCorrect: 12, pagesRead: 8, videosWatched: 0, notes: '' },
    { id: 'ss17', topicId: 'bio1', subjectId: 'bio', date: daysAgo(11), minutesStudied: 45, questionsTotal: 12, questionsCorrect: 8, pagesRead: 5, videosWatched: 1, notes: '' },
    { id: 'ss18', topicId: 'fis1', subjectId: 'fis', date: daysAgo(12), minutesStudied: 35, questionsTotal: 8, questionsCorrect: 4, pagesRead: 0, videosWatched: 1, notes: '' },
  ],
  reviews: [
    { id: 'r1', topicId: 'mat3', subjectId: 'mat', originalSessionId: 'ss4', scheduledDate: daysAgo(0), completed: false, type: 'D7' },
    { id: 'r2', topicId: 'bio1', subjectId: 'bio', originalSessionId: 'ss5', scheduledDate: daysAgo(0), completed: false, type: 'D1' },
    { id: 'r3', topicId: 'fis1', subjectId: 'fis', originalSessionId: 'ss3', scheduledDate: daysAgo(0), completed: false, type: 'D1' },
    { id: 'r4', topicId: 'port1', subjectId: 'port', originalSessionId: 'ss16', scheduledDate: daysAgo(-1), completed: false, type: 'D7' },
    { id: 'r5', topicId: 'hist2', subjectId: 'hist', originalSessionId: 'ss7', scheduledDate: daysFromNow(4), completed: false, type: 'D7' },
    { id: 'r6', topicId: 'mat1', subjectId: 'mat', originalSessionId: 'ss15', scheduledDate: daysAgo(2), completed: true, completedDate: daysAgo(2), minutesSpent: 15, questionsTotal: 10, questionsCorrect: 8, type: 'D7' },
    { id: 'r7', topicId: 'bio3', subjectId: 'bio', originalSessionId: 'ss10', scheduledDate: daysAgo(4), completed: true, completedDate: daysAgo(4), minutesSpent: 10, questionsTotal: 8, questionsCorrect: 7, type: 'D1' },
    { id: 'r8', topicId: 'qui1', subjectId: 'qui', originalSessionId: 'ss6', scheduledDate: daysAgo(-1), completed: false, type: 'D1' },
    { id: 'r9', topicId: 'mat4', subjectId: 'mat', originalSessionId: 'ss12', scheduledDate: daysFromNow(1), completed: false, type: 'D7' },
    { id: 'r10', topicId: 'hist1', subjectId: 'hist', originalSessionId: 'ss13', scheduledDate: daysAgo(0), completed: false, type: 'D7' },
  ],
  studyCycle: [
    { id: 'c1', subjectId: 'mat', minutesSuggested: 60, order: 0 },
    { id: 'c2', subjectId: 'fis', minutesSuggested: 50, order: 1 },
    { id: 'c3', subjectId: 'port', minutesSuggested: 45, order: 2 },
    { id: 'c4', subjectId: 'bio', minutesSuggested: 40, order: 3 },
    { id: 'c5', subjectId: 'qui', minutesSuggested: 35, order: 4 },
    { id: 'c6', subjectId: 'hist', minutesSuggested: 35, order: 5 },
    { id: 'c7', subjectId: 'mat', minutesSuggested: 60, order: 6 },
    { id: 'c8', subjectId: 'fis', minutesSuggested: 50, order: 7 },
  ],
  userProfile: {
    name: 'Estudante',
    objective: 'ENEM',
    weeklyGoalHours: 25,
    examDate: '2026-11-01',
    availability: {
      seg: 4, ter: 4, qua: 3, qui: 4, sex: 3, sab: 5, dom: 2,
    },
    reviewIntervals: [1, 7, 30],
  },
});
