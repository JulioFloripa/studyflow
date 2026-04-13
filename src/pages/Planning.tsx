/**
 * Planning.tsx — Plano de Estudos Inteligente
 *
 * Relatório semanal gerado pelo algoritmo com base nas aulas cadastradas
 * na Agenda Semanal + horas disponíveis do onboarding.
 *
 * Layout imprimível em A4 para o estudante colar na parede ou agenda.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Printer, RefreshCw,
  BookOpen, Clock, BarChart2, Zap, CheckCircle, AlertTriangle,
  Star, RotateCcw, Target, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStudy } from '@/contexts/StudyContext';
import { generateStudentCycle, extractDifficultyTopics } from '@/lib/cycleAdapter';
import { formatCycleForWeek, CycleSlot } from '@/lib/cycleGeneratorV2';
import { useAuth } from '@/hooks/useAuth';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const DAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const STORAGE_KEY_CLASSES = 'ws_classes_v2';

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
function fmtDateFull(d: Date): string {
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtHours(min: number): string {
  const h = Math.floor(min / 60); const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}
function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number); return h * 60 + m;
}

// Aulas salvas pela Agenda Semanal
interface ClassEntry {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  repeats: boolean;
}
function loadClasses(): ClassEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_CLASSES) || '[]'); } catch { return []; }
}

const SESSION_ICONS: Record<string, React.ReactNode> = {
  immediate_review: <RotateCcw size={12} />,
  spaced_review:    <RefreshCw size={12} />,
  difficulty_review:<AlertTriangle size={12} />,
  deep_study:       <Zap size={12} />,
  syllabus_week:    <BookOpen size={12} />,
  practice:         <Star size={12} />,
};
const SESSION_LABELS: Record<string, string> = {
  immediate_review: 'Revisão Imediata',
  spaced_review:    'Revisão Espaçada',
  difficulty_review:'Reforço',
  deep_study:       'Estudo Profundo',
  syllabus_week:    'Conteúdo Novo',
  practice:         'Exercícios',
};
const SESSION_COLORS: Record<string, string> = {
  immediate_review: '#10b981',
  spaced_review:    '#a855f7',
  difficulty_review:'#f97316',
  deep_study:       '#3b82f6',
  syllabus_week:    '#06b6d4',
  practice:         '#f59e0b',
};

// ─── Componente de bloco de estudo ────────────────────────────────────────────
const StudyBlock: React.FC<{ slot: CycleSlot; isPostClass?: boolean }> = ({ slot, isPostClass }) => {
  const color = slot.color || SESSION_COLORS[slot.type] || '#6366f1';
  const label = SESSION_LABELS[slot.type] || slot.type;
  const icon  = SESSION_ICONS[slot.type] || <BookOpen size={12} />;

  return (
    <div
      className="rounded-lg p-3 mb-2 relative overflow-hidden"
      style={{
        background: color + '15',
        borderLeft: `3px solid ${color}`,
        border: `1px solid ${color}30`,
      }}
    >
      {isPostClass && (
        <span
          className="absolute top-1.5 right-1.5 text-xs px-1.5 py-0.5 rounded font-semibold"
          style={{ background: '#f59e0b20', color: '#f59e0b', fontSize: '10px' }}
        >
          ★ Pós-aula
        </span>
      )}
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-bold text-sm truncate pr-12" style={{ color }}>
          {slot.subjectName}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span className="flex items-center gap-1">{icon} {label}</span>
        <span className="flex items-center gap-1"><Clock size={10} /> {fmtHours(slot.duration)}</span>
        <span>{slot.startTime}</span>
      </div>
      {slot.topics && slot.topics.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {slot.topics.slice(0, 2).map((t, i) => (
            <div key={i} className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              • {t}
            </div>
          ))}
          {slot.topics.length > 2 && (
            <div className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
              +{slot.topics.length - 2} tópicos
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
const Planning: React.FC = () => {
  const { user } = useAuth();
  const { subjects, topics, studySessions, userProfile, loading } = useStudy();

  const [weekOffset, setWeekOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [seed, setSeed] = useState(() => Math.random());

  const handleRefresh = useCallback(() => {
    setSeed(Math.random());
    setRefreshKey(k => k + 1);
    toast.success('Plano atualizado com nova distribuição!');
  }, []);

  const monday = useMemo(() => addDays(getMonday(new Date()), weekOffset * 7), [weekOffset]);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);
  const isCurrentWeek = weekOffset === 0;
  const todayDow = new Date().getDay();

  // Carregar aulas da Agenda Semanal
  const classes = useMemo(() => loadClasses(), []);

  // Construir hint de disciplinas por dia (aulas cadastradas)
  const classDaySubjects = useMemo(() => {
    const map: Record<number, Set<string>> = {};
    classes.forEach(c => {
      if (!map[c.dayOfWeek]) map[c.dayOfWeek] = new Set();
      map[c.dayOfWeek].add(c.subjectId);
    });
    return map;
  }, [classes]);

  // Dados do onboarding
  const onboarding = useMemo(() => {
    const od = userProfile?.onboarding_data as Record<string, unknown> | undefined;
    const savedStart = (od?.studyStartTime as string) || localStorage.getItem('plan_startTime') || '08:00';
    return {
      dailyHours: (od?.dailyHours as string) || '1to2',
      studyDays: (od?.studyDays as string[]) || ['seg', 'ter', 'qua', 'qui', 'sex'],
      studyStartTime: savedStart,
    };
  }, [userProfile]);

  const topicsBySubject = useMemo(() => {
    const map: Record<string, string[]> = {};
    topics.forEach(t => { if (!map[t.subjectId]) map[t.subjectId] = []; map[t.subjectId].push(t.name); });
    return map;
  }, [topics]);

  const difficultyTopics = useMemo(() =>
    extractDifficultyTopics(
      studySessions.map(s => ({
        subjectId: s.subjectId, topicId: s.topicId,
        topicName: topics.find(t => t.id === s.topicId)?.name,
        correctAnswers: s.questionsCorrect, totalQuestions: s.questionsTotal,
      })), subjects
    ), [studySessions, topics, subjects]);

  // Gerar ciclo — eleva prioridade das disciplinas que têm aula
  const cycleResult = useMemo(() => {
    if (subjects.length === 0) return null;
    const subjectsWithHint = subjects.map(s => ({
      ...s,
      priority: Object.values(classDaySubjects).some(set => set.has(s.id))
        ? Math.min((s.priority || 3) + 1, 5)
        : (s.priority || 3),
    }));
    try {
      // Usa seed para embaralhar a ordem das disciplinas e gerar variação real
      const shuffled = [...subjectsWithHint].sort(() => seed - 0.5);
      return generateStudentCycle(
        user?.id || 'anon',
        userProfile?.full_name || 'Estudante',
        onboarding, shuffled, topicsBySubject, difficultyTopics
      );
    } catch { return null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, onboarding, topicsBySubject, difficultyTopics, classDaySubjects, refreshKey, seed]);

  const byDay = useMemo(() => {
    if (!cycleResult) return {} as Record<number, CycleSlot[]>;
    try { return formatCycleForWeek(cycleResult); } catch { return {}; }
  }, [cycleResult]);

  // Dias da semana com slots
  const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Seg → Dom
  const activeDays = useMemo(() =>
    DAYS_ORDER.filter(dow => (byDay[dow] ?? []).length > 0 || (classDaySubjects[dow]?.size ?? 0) > 0),
    [byDay, classDaySubjects]
  );

  // Estatísticas
  const stats = useMemo(() => {
    if (!cycleResult) return null;
    const allSlots = Object.values(byDay).flat();
    const totalMin = allSlots.reduce((s, sl) => s + sl.duration, 0);
    const byType: Record<string, number> = {};
    allSlots.forEach(sl => { byType[sl.type] = (byType[sl.type] || 0) + sl.duration; });
    const bySubject: Record<string, number> = {};
    allSlots.forEach(sl => { bySubject[sl.subjectId] = (bySubject[sl.subjectId] || 0) + sl.duration; });
    const reviewMin = (byType.immediate_review || 0) + (byType.spaced_review || 0) + (byType.difficulty_review || 0);
    const newContentMin = byType.syllabus_week || 0;
    const practiceMin = byType.practice || 0;
    const deepMin = byType.deep_study || 0;
    return { totalMin, reviewMin, newContentMin, practiceMin, deepMin, bySubject, sessionsCount: allSlots.length };
  }, [byDay, cycleResult]);

  // ── Estado vazio ─────────────────────────────────────────────────────────────
  if (!loading && subjects.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Target size={48} style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Nenhum edital importado</h2>
        <p className="text-sm text-center max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          Acesse <strong>Plano de Estudos</strong> para importar um edital.
          O planejamento semanal será gerado automaticamente.
        </p>
      </div>
    );
  }

  const studentName = userProfile?.full_name || 'Estudante';

  return (
    <>
      {/* ── CSS de impressão ─────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { background: white !important; color: #1e293b !important; font-size: 11px; }
          .no-print { display: none !important; }
          .print-page { background: white !important; padding: 0 !important; }
          .print-card { background: white !important; border: 1px solid #e2e8f0 !important; break-inside: avoid; }
          .print-block { background: #f8fafc !important; border-left-color: inherit !important; }
          .print-header { color: #1e293b !important; }
          .print-muted { color: #64748b !important; }
        }
      `}</style>

      <div className="p-4 md:p-6 max-w-7xl mx-auto print-page">

        {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Target size={24} style={{ color: '#3b82f6' }} />
              Plano de Estudos
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Gerado pelo algoritmo com base nas suas aulas e disponibilidade
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-accent/50"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              <RefreshCw size={14} /> Atualizar Plano
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: '#3b82f6' }}
            >
              <Printer size={14} /> Imprimir
            </button>
          </div>
        </div>

        {/* ── Navegação de semana ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 no-print">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {fmtDate(weekDates[0])} – {fmtDate(weekDates[6])}
            </div>
            {isCurrentWeek && (
              <div className="text-xs font-medium" style={{ color: '#3b82f6' }}>Semana atual</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isCurrentWeek && (
              <button onClick={() => setWeekOffset(0)} className="text-xs hover:underline px-2" style={{ color: '#3b82f6' }}>
                Hoje
              </button>
            )}
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* ── Cabeçalho de impressão ────────────────────────────────────────────── */}
        <div className="hidden print:block mb-6">
          <div className="flex items-center justify-between border-b-2 border-gray-200 pb-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Plano de Estudos Semanal</h1>
              <p className="text-gray-600">{studentName} · {fmtDate(weekDates[0])} a {fmtDate(weekDates[6])}</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div>StudyFlow</div>
              <div>Gerado em {new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>
        </div>

        {/* ── KPIs ─────────────────────────────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total semanal', value: fmtHours(stats.totalMin), icon: <Clock size={18} />, color: '#3b82f6' },
              { label: 'Revisão Ativa', value: fmtHours(stats.reviewMin), icon: <RotateCcw size={18} />, color: '#a855f7' },
              { label: 'Conteúdo Novo', value: fmtHours(stats.newContentMin), icon: <BookOpen size={18} />, color: '#06b6d4' },
              { label: 'Exercícios', value: fmtHours(stats.practiceMin), icon: <Star size={18} />, color: '#f59e0b' },
            ].map(item => (
              <div
                key={item.label}
                className="rounded-xl p-4 border print-card"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center gap-2 mb-1" style={{ color: item.color }}>
                  {item.icon}
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    {item.label}
                  </span>
                </div>
                <div className="text-2xl font-bold print-header" style={{ color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Recomendações ─────────────────────────────────────────────────────── */}
        {cycleResult && cycleResult.recommendations.length > 0 && (
          <div
            className="rounded-xl p-4 mb-6 border print-card"
            style={{ background: '#3b82f615', borderColor: '#3b82f630' }}
          >
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#3b82f6' }}>
              <TrendingUp size={14} /> Recomendações do algoritmo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {cycleResult.recommendations.map((rec, i) => (
                <p key={i} className="text-sm print-muted" style={{ color: 'var(--text-secondary)' }}>• {rec}</p>
              ))}
            </div>
          </div>
        )}

        {/* ── Grade semanal ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {DAYS_ORDER.map(dow => {
            const date = weekDates[dow === 0 ? 6 : dow - 1];
            const slots = byDay[dow] ?? [];
            const dayClasses = classes.filter(c => c.repeats || weekOffset === 0).filter(c => c.dayOfWeek === dow);
            const isToday = isCurrentWeek && dow === todayDow;

            if (slots.length === 0 && dayClasses.length === 0) return null;

            const dayTotalMin = slots.reduce((s, sl) => s + sl.duration, 0);
            const classTotalMin = dayClasses.reduce((s, c) => s + (timeToMin(c.endTime) - timeToMin(c.startTime)), 0);

            return (
              <div
                key={dow}
                className="rounded-xl border overflow-hidden print-card"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: isToday ? '#3b82f6' : 'var(--border-color)',
                  boxShadow: isToday ? '0 0 0 1px #3b82f6' : 'none',
                }}
              >
                {/* Cabeçalho do dia */}
                <div
                  className="px-4 py-3 border-b"
                  style={{
                    borderColor: 'var(--border-color)',
                    background: isToday ? '#3b82f610' : 'transparent',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold print-header" style={{ color: isToday ? '#3b82f6' : 'var(--text-primary)' }}>
                        {DAY_FULL[dow]}
                      </div>
                      <div className="text-xs print-muted" style={{ color: 'var(--text-secondary)' }}>
                        {date ? fmtDate(date) : ''}
                        {isToday && <span className="ml-1 text-blue-500 font-medium">· Hoje</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      {dayTotalMin > 0 && (
                        <div className="text-xs font-semibold" style={{ color: '#a855f7' }}>
                          {fmtHours(dayTotalMin)} estudo
                        </div>
                      )}
                      {classTotalMin > 0 && (
                        <div className="text-xs" style={{ color: '#3b82f6' }}>
                          {fmtHours(classTotalMin)} aula
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3">
                  {/* Blocos de aula (fixos) */}
                  {dayClasses.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#3b82f6' }}>
                        Aulas
                      </div>
                      {dayClasses.map(c => {
                        const subject = subjects.find(s => s.id === c.subjectId);
                        const color = subject?.color || '#3b82f6';
                        const dur = timeToMin(c.endTime) - timeToMin(c.startTime);
                        return (
                          <div
                            key={c.id}
                            className="rounded-lg p-2 mb-1.5 print-block"
                            style={{
                              background: color + '15',
                              borderLeft: `3px solid ${color}`,
                              border: `1px solid ${color}30`,
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs" style={{ color }}>
                                {subject?.name || 'Disciplina'}
                              </span>
                              <span className="text-xs print-muted" style={{ color: 'var(--text-secondary)' }}>
                                {c.startTime}–{c.endTime}
                              </span>
                            </div>
                            <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                              <Clock size={10} /> {dur}min
                              <span className="ml-1 px-1 rounded text-xs" style={{ background: color + '20', color }}>
                                Aula presencial
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Blocos de estudo (algoritmo) */}
                  {slots.length > 0 && (
                    <div>
                      {dayClasses.length > 0 && (
                        <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#a855f7' }}>
                          Estudo
                        </div>
                      )}
                      {slots.map((slot, i) => (
                        <StudyBlock
                          key={i}
                          slot={slot}
                          isPostClass={classDaySubjects[dow]?.has(slot.subjectId) ?? false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Distribuição por disciplina ───────────────────────────────────────── */}
        {stats && (
          <div
            className="rounded-xl border p-5 mb-6 print-card"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
          >
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 print-header" style={{ color: 'var(--text-primary)' }}>
              <BarChart2 size={16} style={{ color: '#3b82f6' }} />
              Distribuição semanal por disciplina
            </h3>
            <div className="space-y-3">
              {subjects
                .filter(s => (stats.bySubject[s.id] ?? 0) > 0)
                .sort((a, b) => (stats.bySubject[b.id] ?? 0) - (stats.bySubject[a.id] ?? 0))
                .map(subject => {
                  const min = stats.bySubject[subject.id] ?? 0;
                  const pct = stats.totalMin > 0 ? Math.round((min / stats.totalMin) * 100) : 0;
                  const color = subject.color || '#6366f1';
                  const hasClass = Object.values(classDaySubjects).some(set => set.has(subject.id));
                  return (
                    <div key={subject.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                          <span className="font-medium print-header" style={{ color: 'var(--text-primary)' }}>
                            {subject.name}
                          </span>
                          {hasClass && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#3b82f615', color: '#3b82f6' }}>
                              tem aula
                            </span>
                          )}
                        </div>
                        <span className="print-muted" style={{ color: 'var(--text-secondary)' }}>
                          {fmtHours(min)} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-color)' }}>
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── Legenda dos tipos de sessão ───────────────────────────────────────── */}
        <div
          className="rounded-xl border p-4 mb-6 print-card"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 print-muted" style={{ color: 'var(--text-secondary)' }}>
            Legenda
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(SESSION_LABELS).map(([type, label]) => (
              <div key={type} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: SESSION_COLORS[type] }} />
                <span className="print-muted" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Rodapé de impressão ───────────────────────────────────────────────── */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          <div className="flex items-center justify-between">
            <span>StudyFlow — Plano gerado automaticamente por algoritmo de revisão espaçada (SM-2)</span>
            <span>{fmtDateFull(new Date())}</span>
          </div>
          <div className="mt-1 text-gray-300">
            "A revisão ativa é 3× mais eficiente que a releitura passiva." — Cognitive Science Research
          </div>
        </div>

        {/* ── Nota sobre Agenda Semanal ─────────────────────────────────────────── */}
        {classes.length === 0 && (
          <div
            className="rounded-xl border border-dashed p-4 text-center no-print"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <CheckCircle size={20} className="mx-auto mb-2 opacity-40" style={{ color: 'var(--text-secondary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              <strong>Dica:</strong> Cadastre suas aulas na <strong>Agenda Semanal</strong> para que o algoritmo
              priorize as disciplinas que você teve aula no mesmo dia (efeito de memória fresca).
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default Planning;
