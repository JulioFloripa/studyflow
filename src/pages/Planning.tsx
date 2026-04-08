/**
 * Planning.tsx — Planejamento Semanal Inteligente
 *
 * Arquitetura:
 * 1. O algoritmo (cycleGeneratorV2) distribui os tópicos nos horários livres
 *    usando revisão espaçada (SM-2) + interleaving + prioridade por disciplina.
 * 2. Se o estudante cadastrou aulas, o algoritmo eleva a prioridade das
 *    disciplinas que tiveram aula naquele dia (memória fresca).
 * 3. O plano gerado pode ser editado: o estudante pode trocar a disciplina
 *    de qualquer bloco ou remover um bloco.
 * 4. Configurações de disponibilidade (horário de início, aulas) são salvas
 *    no localStorage e persistidas no Supabase via onboarding_data.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw, Settings2, X,
  BookOpen, Clock, Zap, Brain,
  Plus, Trash2, Printer, CalendarDays, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStudy } from '@/contexts/StudyContext';
import { generateStudentCycle, extractDifficultyTopics } from '@/lib/cycleAdapter';
import { formatCycleForWeek, CycleSlot } from '@/lib/cycleGeneratorV2';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ─── Constantes ───────────────────────────────────────────────────────
const cardBg = 'hsl(222 47% 9%)';
const border = 'hsl(222 47% 16%)';
const muted = 'hsl(215 20% 50%)';
const primaryBlue = 'hsl(217 91% 60%)';
const primaryGradient = 'linear-gradient(135deg, hsl(217 91% 60%), hsl(240 80% 65%))';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_IDS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const DAY_MAP: Record<string, number> = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };

const SESSION_TYPE_LABELS: Record<string, string> = {
  immediate_review: 'Revisão Imediata',
  spaced_review: 'Revisão Espaçada',
  difficulty_review: 'Reforço',
  deep_study: 'Estudo Profundo',
  syllabus_week: 'Conteúdo da Semana',
  practice: 'Exercícios',
};

const SESSION_TYPE_COLORS: Record<string, string> = {
  immediate_review: 'hsl(142 71% 45%)',
  spaced_review: 'hsl(280 80% 65%)',
  difficulty_review: 'hsl(15 80% 55%)',
  deep_study: 'hsl(217 91% 60%)',
  syllabus_week: 'hsl(195 80% 50%)',
  practice: 'hsl(35 90% 55%)',
};

function getSubjectColor(name: string, fallback?: string): string {
  if (fallback) return fallback;
  const map: [string, string][] = [
    ['Matem', 'hsl(217 91% 60%)'], ['Física', 'hsl(280 80% 65%)'],
    ['Quím', 'hsl(142 71% 45%)'], ['Biolog', 'hsl(160 60% 45%)'],
    ['Portugu', 'hsl(35 90% 55%)'], ['Histór', 'hsl(15 80% 55%)'],
    ['Geograf', 'hsl(195 80% 50%)'], ['Filosofia', 'hsl(260 60% 60%)'],
    ['Inglês', 'hsl(50 80% 55%)'], ['Espanhol', 'hsl(50 80% 55%)'],
  ];
  for (const [k, v] of map) if (name.includes(k)) return v;
  const h = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return `hsl(${h % 360} 70% 55%)`;
}

function minutesToHM(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h${min > 0 ? ` ${min}min` : ''}` : `${min}min`;
}

// ─── Tipos locais ─────────────────────────────────────────────────────
interface ClassEntry {
  id: string;
  dayId: string;
  startTime: string;
  endTime: string;
  subjectId: string;
}

interface PlanBlock extends CycleSlot {
  uid: string;
  classHint?: boolean;
}

// ─── Componente ───────────────────────────────────────────────────────
const Planning: React.FC = () => {
  const { user } = useAuth();
  const { subjects, topics, studySessions, userProfile, loading } = useStudy();

  // ── Configuração ────────────────────────────────────────────────────
  const [showConfig, setShowConfig] = useState(false);
  const [startTime, setStartTime] = useState<string>(() =>
    localStorage.getItem('plan_startTime') || '08:00');
  const [classes, setClasses] = useState<ClassEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('plan_classes') || '[]'); } catch { return []; }
  });
  const [newClass, setNewClass] = useState<Omit<ClassEntry, 'id'>>({
    dayId: 'seg', startTime: '07:00', endTime: '08:30', subjectId: '',
  });

  // ── Plano editável ──────────────────────────────────────────────────
  const [editOverrides, setEditOverrides] = useState<Record<string, string | null>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('plan_startTime', startTime); }, [startTime]);
  useEffect(() => { localStorage.setItem('plan_classes', JSON.stringify(classes)); }, [classes]);

  // ── Dados derivados ─────────────────────────────────────────────────
  const onboarding = useMemo(() => {
    const od = userProfile?.onboarding_data as Record<string, unknown> | undefined;
    return {
      dailyHours: (od?.dailyHours as string) || '1to2',
      studyDays: (od?.studyDays as string[]) || ['seg', 'ter', 'qua', 'qui', 'sex'],
      studyStartTime: startTime,
    };
  }, [userProfile, startTime]);

  const topicsBySubject = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const t of topics) {
      if (!map[t.subjectId]) map[t.subjectId] = [];
      map[t.subjectId].push(t.name);
    }
    return map;
  }, [topics]);

  const difficultyTopics = useMemo(() =>
    extractDifficultyTopics(
      studySessions.map(s => ({
        subjectId: s.subjectId,
        topicId: s.topicId,
        topicName: topics.find(t => t.id === s.topicId)?.name,
        correctAnswers: s.questionsCorrect,
        totalQuestions: s.questionsTotal,
      })),
      subjects
    ), [studySessions, topics, subjects]);

  // ── Gerar ciclo ─────────────────────────────────────────────────────
  const cycleResult = useMemo(() => {
    if (subjects.length === 0) return null;
    // Elevar prioridade de disciplinas com aula cadastrada
    const subjectsWithHint = subjects.map(s => {
      const hasClass = classes.some(c => c.subjectId === s.id);
      return { ...s, priority: hasClass ? Math.min(s.priority + 1, 5) : s.priority };
    });
    return generateStudentCycle(
      user?.id || 'anon',
      userProfile?.full_name || 'Estudante',
      onboarding,
      subjectsWithHint,
      topicsBySubject,
      difficultyTopics
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, onboarding, topicsBySubject, difficultyTopics, classes, refreshKey]);

  // ── Formatar por semana ─────────────────────────────────────────────
  const weekByDay = useMemo(() => {
    if (!cycleResult) return {} as Record<number, PlanBlock[]>;
    let byDay: Record<number, CycleSlot[]>;
    try {
      byDay = formatCycleForWeek(cycleResult);
    } catch {
      return {} as Record<number, PlanBlock[]>;
    }
    const classDaySubjects: Record<number, Set<string>> = {};
    classes.forEach(c => {
      const d = DAY_MAP[c.dayId];
      if (!classDaySubjects[d]) classDaySubjects[d] = new Set();
      classDaySubjects[d].add(c.subjectId);
    });
    const result: Record<number, PlanBlock[]> = {};
    Object.entries(byDay).forEach(([dayStr, slots]) => {
      const day = parseInt(dayStr);
      result[day] = (slots as CycleSlot[]).map((slot, i) => ({
        ...slot,
        uid: `${day}-${i}-${slot.subjectId}-${slot.startTime}`,
        classHint: classDaySubjects[day]?.has(slot.subjectId) ?? false,
      }));
    });
    return result;
  }, [cycleResult, classes]);

  // ── Aplicar overrides ───────────────────────────────────────────────
  const planByDay = useMemo(() => {
    const result: Record<number, PlanBlock[]> = {};
    Object.entries(weekByDay).forEach(([dayStr, blocks]) => {
      const day = parseInt(dayStr);
      result[day] = blocks
        .filter(b => editOverrides[b.uid] !== null)
        .map(b => {
          const override = editOverrides[b.uid];
          if (!override) return b;
          const newSubject = subjects.find(s => s.id === override);
          if (!newSubject) return b;
          return { ...b, subjectId: newSubject.id, subjectName: newSubject.name, classHint: false };
        });
    });
    return result;
  }, [weekByDay, editOverrides, subjects]);

  const activeDays = useMemo(() =>
    onboarding.studyDays.map(d => DAY_MAP[d]).filter(d => d !== undefined).sort((a, b) => a - b),
    [onboarding.studyDays]);

  const stats = useMemo(() => {
    let totalMin = 0, sessions = 0;
    const subjectMin: Record<string, number> = {};
    Object.values(planByDay).forEach(blocks => {
      blocks.forEach(b => {
        totalMin += b.duration;
        sessions++;
        subjectMin[b.subjectName] = (subjectMin[b.subjectName] || 0) + b.duration;
      });
    });
    return { totalMin, sessions, subjectMin };
  }, [planByDay]);

  // ── Handlers ────────────────────────────────────────────────────────
  const handleRegenerateDay = useCallback((day: number) => {
    setEditOverrides(prev => {
      const next = { ...prev };
      (weekByDay[day] || []).forEach(b => delete next[b.uid]);
      return next;
    });
    setRefreshKey(k => k + 1);
    toast.success(`Plano de ${DAY_NAMES[day]} regenerado!`);
  }, [weekByDay]);

  const handleSwapSubject = useCallback((uid: string, newSubjectId: string) => {
    setEditOverrides(prev => ({ ...prev, [uid]: newSubjectId }));
    setEditingBlock(null);
    toast.success('Disciplina alterada!');
  }, []);

  const handleRemoveBlock = useCallback((uid: string) => {
    setEditOverrides(prev => ({ ...prev, [uid]: null }));
    toast.info('Bloco removido do plano.');
  }, []);

  const handleAddClass = () => {
    if (!newClass.subjectId) { toast.error('Selecione uma disciplina.'); return; }
    if (newClass.startTime >= newClass.endTime) {
      toast.error('O horário de início deve ser anterior ao horário de fim.');
      return;
    }
    // Verificar duplicata no mesmo dia/horário
    const isDuplicate = classes.some(
      c => c.dayId === newClass.dayId && c.startTime === newClass.startTime && c.subjectId === newClass.subjectId
    );
    if (isDuplicate) { toast.error('Aula já cadastrada neste horário.'); return; }
    setClasses(prev => [...prev, { ...newClass, id: `cls-${Date.now()}` }]);
    toast.success('Aula adicionada!');
  };

  const handleSaveConfig = async () => {
    if (user) {
      const od = (userProfile?.onboarding_data as Record<string, unknown>) || {};
      await supabase.from('profiles').update({
        onboarding_data: { ...od, studyStartTime: startTime, classes },
      } as any).eq('id', user.id);
    }
    setShowConfig(false);
    setRefreshKey(k => k + 1);
    toast.success('Configurações salvas! Plano atualizado.');
  };

  // ── Estado vazio ────────────────────────────────────────────────────
  if (!loading && subjects.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: primaryGradient }}>
          <CalendarDays className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white text-center">Nenhum edital importado</h2>
        <p className="text-sm text-center" style={{ color: muted }}>
          Acesse <strong>Plano de Estudos</strong> para importar um edital.
          O planejamento semanal será gerado automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto print:p-4">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 print:mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Planejamento Semanal</h1>
          <p className="mt-1 text-sm" style={{ color: muted }}>
            Gerado pelo algoritmo · {stats.sessions} sessões · {minutesToHM(stats.totalMin)} esta semana
          </p>
        </div>
        <div className="flex gap-2 print:hidden flex-wrap justify-end">
          <Button size="sm" variant="ghost"
            onClick={() => { setRefreshKey(k => k + 1); setEditOverrides({}); toast.success('Plano regenerado!'); }}
            style={{ color: muted, border: `1px solid ${border}` }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerar
          </Button>
          <Button size="sm" variant="ghost"
            onClick={() => setShowConfig(v => !v)}
            style={{ color: showConfig ? primaryBlue : muted, border: `1px solid ${showConfig ? primaryBlue : border}` }}
          >
            <Settings2 className="h-3.5 w-3.5 mr-1" /> Configurar
          </Button>
          <Button size="sm" variant="ghost"
            onClick={() => window.print()}
            style={{ color: muted, border: `1px solid ${border}` }}
          >
            <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
          </Button>
        </div>
      </div>

      {/* ── Painel de configuração ── */}
      {showConfig && (
        <Card className="mb-6 p-5 print:hidden" style={{ background: cardBg, border: `1px solid ${primaryBlue}40` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Settings2 className="h-4 w-4" style={{ color: primaryBlue }} />
              Configurações de Disponibilidade
            </h3>
            <button onClick={() => setShowConfig(false)}>
              <X className="h-4 w-4" style={{ color: muted }} />
            </button>
          </div>

          {/* Horário de início */}
          <div className="mb-5">
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: muted }}>
              Horário de início dos estudos
            </label>
            <input
              type="time" value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="px-3 py-2 rounded-lg text-white text-sm outline-none"
              style={{ background: 'hsl(222 47% 12%)', border: `1px solid ${border}` }}
            />
            <p className="text-xs mt-1" style={{ color: muted }}>
              Os blocos de estudo serão distribuídos a partir deste horário nos dias disponíveis.
            </p>
          </div>

          {/* Grade de aulas */}
          <div className="mb-5">
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: muted }}>
              Horários de Aula <span className="normal-case font-normal">(opcional)</span>
            </label>
            <p className="text-xs mb-3" style={{ color: muted }}>
              Se você assiste aulas, informe aqui. O algoritmo priorizará essas disciplinas no mesmo dia para aproveitar a memória fresca.
            </p>

            {classes.length > 0 && (
              <div className="space-y-2 mb-3">
                {classes.map(c => {
                  const sub = subjects.find(s => s.id === c.subjectId);
                  return (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: 'hsl(222 47% 12%)', border: `1px solid ${border}` }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: getSubjectColor(sub?.name || '', sub?.color) }} />
                      <span className="text-sm text-white flex-1">
                        {DAY_SHORT[DAY_MAP[c.dayId]]} · {c.startTime}–{c.endTime} · {sub?.name || '—'}
                      </span>
                      <button onClick={() => setClasses(prev => prev.filter(x => x.id !== c.id))}>
                        <Trash2 className="h-3.5 w-3.5" style={{ color: muted }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select value={newClass.dayId}
                onChange={e => setNewClass(p => ({ ...p, dayId: e.target.value }))}
                className="px-2 py-2 rounded-lg text-white text-sm outline-none"
                style={{ background: 'hsl(222 47% 12%)', border: `1px solid ${border}` }}>
                {DAY_IDS.map((d, i) => <option key={d} value={d}>{DAY_SHORT[i]}</option>)}
              </select>
              <input type="time" value={newClass.startTime}
                onChange={e => setNewClass(p => ({ ...p, startTime: e.target.value }))}
                className="px-2 py-2 rounded-lg text-white text-sm outline-none"
                style={{ background: 'hsl(222 47% 12%)', border: `1px solid ${border}` }} />
              <input type="time" value={newClass.endTime}
                onChange={e => setNewClass(p => ({ ...p, endTime: e.target.value }))}
                className="px-2 py-2 rounded-lg text-white text-sm outline-none"
                style={{ background: 'hsl(222 47% 12%)', border: `1px solid ${border}` }} />
              <select value={newClass.subjectId}
                onChange={e => setNewClass(p => ({ ...p, subjectId: e.target.value }))}
                className="px-2 py-2 rounded-lg text-white text-sm outline-none"
                style={{ background: 'hsl(222 47% 12%)', border: `1px solid ${border}` }}>
                <option value="">Disciplina...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <Button size="sm" className="mt-2" onClick={handleAddClass}
              style={{ background: primaryGradient, color: 'white', border: 'none' }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Aula
            </Button>
          </div>

          <Button onClick={handleSaveConfig} style={{ background: primaryGradient, color: 'white', border: 'none' }}>
            Salvar e Atualizar Plano
          </Button>
        </Card>
      )}

      {/* ── Aviso sem onboarding ── */}
      {!userProfile?.onboarding_data && (
        <Card className="mb-5 p-4 flex items-center gap-3 print:hidden"
          style={{ background: 'hsl(35 90% 55% / 0.1)', border: '1px solid hsl(35 90% 55% / 0.3)' }}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: 'hsl(35 90% 65%)' }} />
          <p className="text-sm" style={{ color: 'hsl(35 90% 65%)' }}>
            Usando configuração padrão (1–2h/dia, Seg–Sex). Configure sua disponibilidade clicando em <strong>Configurar</strong>.
          </p>
        </Card>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 print:grid-cols-4">
        {[
          { icon: CalendarDays, label: 'Dias ativos', value: activeDays.length },
          { icon: Clock, label: 'Horas/semana', value: minutesToHM(stats.totalMin) },
          { icon: BookOpen, label: 'Sessões', value: stats.sessions },
          { icon: Brain, label: 'Disciplinas', value: Object.keys(stats.subjectMin).length },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="p-4" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-3.5 w-3.5" style={{ color: primaryBlue }} />
              <span className="text-xs" style={{ color: muted }}>{label}</span>
            </div>
            <p className="text-xl font-bold text-white">{value}</p>
          </Card>
        ))}
      </div>

      {/* ── Distribuição por disciplina ── */}
      {Object.keys(stats.subjectMin).length > 0 && (
        <Card className="mb-6 p-4" style={{ background: cardBg, border: `1px solid ${border}` }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: muted }}>
            Distribuição semanal por disciplina
          </p>
          <div className="space-y-2">
            {Object.entries(stats.subjectMin)
              .sort((a, b) => b[1] - a[1])
              .map(([name, min]) => {
                const sub = subjects.find(s => s.name === name);
                const color = getSubjectColor(name, sub?.color);
                const pct = Math.round((min / stats.totalMin) * 100);
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <span className="text-xs text-white">{name}</span>
                      </div>
                      <span className="text-xs font-medium" style={{ color }}>
                        {minutesToHM(min)} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(222 47% 14%)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* ── Grade semanal ── */}
      <div className="space-y-4">
        {activeDays.map(day => {
          const blocks = planByDay[day] || [];
          const dayTotalMin = blocks.reduce((s, b) => s + b.duration, 0);
          const hasClass = classes.some(c => DAY_MAP[c.dayId] === day);

          return (
            <Card key={day} style={{ background: cardBg, border: `1px solid ${border}` }}>
              {/* Cabeçalho do dia */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: `1px solid ${border}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: primaryGradient }}>
                    {DAY_SHORT[day]}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{DAY_NAMES[day]}</p>
                    <p className="text-xs" style={{ color: muted }}>
                      {blocks.length} sessões · {minutesToHM(dayTotalMin)}
                      {hasClass && (
                        <span className="ml-2" style={{ color: 'hsl(45 90% 60%)' }}>· Dia de aula</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRegenerateDay(day)}
                  className="print:hidden flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                  style={{ color: muted, border: `1px solid ${border}` }}
                  title="Regenerar este dia"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>

              {/* Blocos */}
              {blocks.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm" style={{ color: muted }}>
                  Nenhuma sessão gerada para este dia.
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'hsl(222 47% 12%)' }}>
                  {blocks.map(block => {
                    const subjectColor = getSubjectColor(block.subjectName,
                      subjects.find(s => s.id === block.subjectId)?.color);
                    const typeColor = SESSION_TYPE_COLORS[block.type] || primaryBlue;
                    const isEditing = editingBlock === block.uid;

                    return (
                      <div key={block.uid}
                        className="px-4 py-3 flex items-start gap-3 group relative">
                        {/* Barra lateral de cor */}
                        <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5"
                          style={{ background: subjectColor }} />

                        {/* Horário */}
                        <div className="text-center flex-shrink-0 w-12">
                          <p className="text-xs font-bold text-white">{block.startTime}</p>
                          <p className="text-[10px]" style={{ color: muted }}>{block.endTime}</p>
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-white">{block.subjectName}</span>
                            {block.classHint && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: 'hsl(45 90% 55% / 0.15)', color: 'hsl(45 90% 65%)' }}>
                                ★ Pós-aula
                              </span>
                            )}
                            <Badge className="text-[10px] px-1.5 py-0 h-4"
                              style={{ background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}40` }}>
                              {SESSION_TYPE_LABELS[block.type] || block.type}
                            </Badge>
                            <span className="text-xs" style={{ color: muted }}>{block.duration}min</span>
                          </div>
                          {block.topics && block.topics.length > 0 && (
                            <p className="text-xs mt-1 truncate" style={{ color: muted }}>
                              {block.topics.slice(0, 2).join(' · ')}
                              {block.topics.length > 2 && ` +${block.topics.length - 2}`}
                            </p>
                          )}

                          {/* Seletor de troca */}
                          {isEditing && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {subjects.map(s => (
                                <button key={s.id}
                                  onClick={() => handleSwapSubject(block.uid, s.id)}
                                  className="text-xs px-2 py-1 rounded-lg transition-all"
                                  style={{
                                    background: s.id === block.subjectId
                                      ? `${getSubjectColor(s.name, s.color)}30` : 'hsl(222 47% 14%)',
                                    border: `1px solid ${s.id === block.subjectId
                                      ? getSubjectColor(s.name, s.color) : border}`,
                                    color: s.id === block.subjectId
                                      ? getSubjectColor(s.name, s.color) : muted,
                                  }}>
                                  {s.name}
                                </button>
                              ))}
                              <button onClick={() => setEditingBlock(null)}
                                className="text-xs px-2 py-1 rounded-lg"
                                style={{ border: `1px solid ${border}`, color: muted }}>
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Ações hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden flex-shrink-0">
                          <button onClick={() => setEditingBlock(isEditing ? null : block.uid)}
                            className="p-1 rounded" style={{ color: muted }} title="Trocar disciplina">
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleRemoveBlock(block.uid)}
                            className="p-1 rounded" style={{ color: muted }} title="Remover bloco">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── Recomendações ── */}
      {cycleResult?.recommendations && cycleResult.recommendations.length > 0 && (
        <Card className="mt-6 p-4 print:mt-4" style={{ background: cardBg, border: `1px solid ${border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4" style={{ color: primaryBlue }} />
            <p className="text-sm font-semibold text-white">Recomendações do Algoritmo</p>
          </div>
          <ul className="space-y-1.5">
            {cycleResult.recommendations.slice(0, 4).map((r, i) => (
              <li key={i} className="text-xs flex items-start gap-2" style={{ color: muted }}>
                <span style={{ color: primaryBlue }}>›</span> {r}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Legenda ── */}
      <div className="mt-6 flex flex-wrap gap-3 print:mt-4">
        {Object.entries(SESSION_TYPE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs" style={{ color: muted }}>
            <div className="w-2 h-2 rounded-full" style={{ background: SESSION_TYPE_COLORS[type] }} />
            {label}
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default Planning;
