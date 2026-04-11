/**
 * Planning.tsx — Calendário Semanal Inteligente (estilo Google Calendar)
 *
 * Layout: grade de horários (linhas = horas, colunas = Seg–Dom)
 * Navegação: avançar/recuar semanas com datas reais
 * Blocos: gerados pelo cycleGeneratorV2 + posicionados na grade por horário
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, ChevronRight, RefreshCw, Settings2, X,
  Printer, CalendarDays, AlertCircle, Plus, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStudy } from '@/contexts/StudyContext';
import { generateStudentCycle, extractDifficultyTopics } from '@/lib/cycleAdapter';
import { formatCycleForWeek, CycleSlot } from '@/lib/cycleGeneratorV2';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ─── Constantes ───────────────────────────────────────────────────────────────
const DAY_NAMES  = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const DAY_SHORT  = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
// Mapeamento: índice 0=Seg…6=Dom → dia da semana JS (1=Seg…0=Dom)
const DAY_JS     = [1, 2, 3, 4, 5, 6, 0];
const DAY_IDS    = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
const DAY_MAP: Record<string, number> = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, dom: 0 };

// Horas exibidas na grade (06:00 – 23:00)
const HOUR_START = 6;
const HOUR_END   = 23;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

const SESSION_TYPE_LABELS: Record<string, string> = {
  immediate_review: 'Revisão Imediata',
  spaced_review:    'Revisão Espaçada',
  difficulty_review:'Reforço',
  deep_study:       'Estudo Profundo',
  syllabus_week:    'Conteúdo',
  practice:         'Exercícios',
};

const SESSION_TYPE_COLORS: Record<string, string> = {
  immediate_review: '#10b981',
  spaced_review:    '#a855f7',
  difficulty_review:'#f97316',
  deep_study:       '#3b82f6',
  syllabus_week:    '#06b6d4',
  practice:         '#f59e0b',
};

// Converte hex para RGB e calcula luminância para decidir cor do texto
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r, g, b];
}

function getLuminance(hex: string): number {
  if (!hex.startsWith('#') || hex.length < 7) return 0.5;
  const [r, g, b] = hexToRgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Retorna cor de texto com contraste garantido sobre o fundo do bloco
function getTextColorForBg(bgHex: string): string {
  const lum = getLuminance(bgHex);
  return lum > 0.35 ? '#1e293b' : '#ffffff';
}

// ─── Utilitários ──────────────────────────────────────────────────────────────
function getSubjectColor(name: string, fallback?: string): string {
  if (fallback) return fallback;
  const map: [string, string][] = [
    ['Matem', '#3b82f6'], ['Física', '#a855f7'], ['Quím', '#10b981'],
    ['Biolog', '#059669'], ['Portugu', '#f59e0b'], ['Histór', '#f97316'],
    ['Geograf', '#06b6d4'], ['Filosofia', '#8b5cf6'], ['Inglês', '#eab308'],
    ['Espanhol', '#eab308'], ['Redação', '#ec4899'],
  ];
  for (const [k, v] of map) if (name.includes(k)) return v;
  const h = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return `hsl(${h % 360} 70% 55%)`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToHM(m: number): string {
  const h = Math.floor(m / 60), min = m % 60;
  return h > 0 ? `${h}h${min > 0 ? `${min}` : ''}` : `${min}min`;
}

/** Retorna a Segunda-feira da semana que contém `date` */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Dom
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ClassEntry {
  id: string; dayId: string; startTime: string; endTime: string; subjectId: string;
}

interface PlanBlock extends CycleSlot {
  uid: string; classHint?: boolean;
  // posição na grade em pixels
  topPx: number; heightPx: number;
}

const CELL_HEIGHT = 60; // px por hora

// ─── Componente Principal ─────────────────────────────────────────────────────
const Planning: React.FC = () => {
  const { user } = useAuth();
  const { subjects, topics, studySessions, userProfile, loading } = useStudy();

  // ── Semana atual ────────────────────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0); // 0 = semana atual
  const monday = useMemo(() => {
    const base = getMonday(new Date());
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const weekDates = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);

  const isCurrentWeek = weekOffset === 0;
  const todayJs = new Date().getDay(); // 0=Dom

  // ── Configuração ────────────────────────────────────────────────────────────
  const [showConfig, setShowConfig] = useState(false);
  const [startTime, setStartTime] = useState<string>(() =>
    localStorage.getItem('plan_startTime') || '08:00');
  const [classes, setClasses] = useState<ClassEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('plan_classes') || '[]'); } catch { return []; }
  });
  const [newClass, setNewClass] = useState<Omit<ClassEntry, 'id'>>({
    dayId: 'seg', startTime: '07:00', endTime: '08:30', subjectId: '',
  });

  // ── Plano editável ──────────────────────────────────────────────────────────
  const [editOverrides, setEditOverrides] = useState<Record<string, string | null>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('plan_startTime', startTime); }, [startTime]);
  useEffect(() => { localStorage.setItem('plan_classes', JSON.stringify(classes)); }, [classes]);

  // ── Dados derivados ─────────────────────────────────────────────────────────
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
        subjectId: s.subjectId, topicId: s.topicId,
        topicName: topics.find(t => t.id === s.topicId)?.name,
        correctAnswers: s.questionsCorrect, totalQuestions: s.questionsTotal,
      })), subjects
    ), [studySessions, topics, subjects]);

  // ── Gerar ciclo ─────────────────────────────────────────────────────────────
  const cycleResult = useMemo(() => {
    if (subjects.length === 0) return null;
    const subjectsWithHint = subjects.map(s => ({
      ...s, priority: classes.some(c => c.subjectId === s.id) ? Math.min(s.priority + 1, 5) : s.priority,
    }));
    return generateStudentCycle(
      user?.id || 'anon',
      userProfile?.full_name || 'Estudante',
      onboarding, subjectsWithHint, topicsBySubject, difficultyTopics
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, onboarding, topicsBySubject, difficultyTopics, classes, refreshKey]);

  // ── Formatar por dia da semana (0=Dom…6=Sáb) ───────────────────────────────
  const weekByDay = useMemo(() => {
    if (!cycleResult) return {} as Record<number, PlanBlock[]>;
    let byDay: Record<number, CycleSlot[]>;
    try { byDay = formatCycleForWeek(cycleResult); } catch { return {}; }

    const classDaySubjects: Record<number, Set<string>> = {};
    classes.forEach(c => {
      const d = DAY_MAP[c.dayId];
      if (!classDaySubjects[d]) classDaySubjects[d] = new Set();
      classDaySubjects[d].add(c.subjectId);
    });

    const result: Record<number, PlanBlock[]> = {};
    Object.entries(byDay).forEach(([dayStr, slots]) => {
      const day = parseInt(dayStr);
      result[day] = (slots as CycleSlot[]).map((slot, i) => {
        const startMin = timeToMinutes(slot.startTime);
        const topPx = (startMin - HOUR_START * 60) * (CELL_HEIGHT / 60);
        const heightPx = Math.max(slot.duration * (CELL_HEIGHT / 60), 28);
        return {
          ...slot,
          uid: `${day}-${i}-${slot.subjectId}-${slot.startTime}`,
          classHint: classDaySubjects[day]?.has(slot.subjectId) ?? false,
          topPx, heightPx,
        };
      });
    });
    return result;
  }, [cycleResult, classes]);

  // Aplicar overrides
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

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAddClass = () => {
    if (!newClass.subjectId) { toast.error('Selecione uma disciplina.'); return; }
    if (newClass.startTime >= newClass.endTime) {
      toast.error('O horário de início deve ser anterior ao horário de fim.'); return;
    }
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

  const handleRemoveBlock = useCallback((uid: string) => {
    setEditOverrides(prev => ({ ...prev, [uid]: null }));
    setSelectedBlock(null);
    toast.info('Bloco removido.');
  }, []);

  const handleSwapSubject = useCallback((uid: string, newSubjectId: string) => {
    setEditOverrides(prev => ({ ...prev, [uid]: newSubjectId }));
    setSelectedBlock(null);
    toast.success('Disciplina alterada!');
  }, []);

  // ── Estado vazio ─────────────────────────────────────────────────────────────
  if (!loading && subjects.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
          <CalendarDays className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Nenhum edital importado</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Acesse <strong>Plano de Estudos</strong> para importar um edital.
          O planejamento semanal será gerado automaticamente.
        </p>
      </div>
    );
  }

  // ── Total de horas da semana ─────────────────────────────────────────────────
  const totalMin = Object.values(planByDay).flat().reduce((s, b) => s + b.duration, 0);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border print:hidden">
        <div className="flex items-center gap-3">
          {/* Navegação de semana */}
          <button
            onClick={() => setWeekOffset(0)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-accent transition-colors"
          >
            Hoje
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <h2 className="text-base font-semibold text-foreground capitalize">
            {formatMonthYear(monday)}
          </h2>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {formatDate(monday)} – {formatDate(weekDates[6])}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden md:inline">
            {minutesToHM(totalMin)} esta semana
          </span>
          <Button size="sm" variant="outline"
            onClick={() => { setRefreshKey(k => k + 1); setEditOverrides({}); toast.success('Plano regenerado!'); }}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Regenerar
          </Button>
          <Button size="sm" variant="outline"
            onClick={() => setShowConfig(v => !v)}
            className="gap-1.5 text-xs"
          >
            <Settings2 className="h-3.5 w-3.5" /> Configurar
          </Button>
          <Button size="sm" variant="outline"
            onClick={() => window.print()}
            className="gap-1.5 text-xs hidden sm:flex"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir
          </Button>
        </div>
      </div>

      {/* ── Painel de configuração ───────────────────────────────────────────── */}
      {showConfig && (
        <div className="border-b border-border bg-card px-4 py-4 print:hidden">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                Configurações de Disponibilidade
              </h3>
              <button onClick={() => setShowConfig(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Horário de início */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Horário de início dos estudos
                </label>
                <input
                  type="time" value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm outline-none bg-input border border-border text-foreground w-full"
                />
                <p className="text-xs mt-1 text-muted-foreground">
                  Os blocos serão distribuídos a partir deste horário.
                </p>
              </div>

              {/* Adicionar aula */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Horários de Aula <span className="normal-case font-normal">(opcional)</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select value={newClass.dayId}
                    onChange={e => setNewClass(p => ({ ...p, dayId: e.target.value }))}
                    className="px-2 py-2 rounded-lg text-sm outline-none bg-input border border-border text-foreground col-span-2 sm:col-span-1">
                    {DAY_IDS.map((d, i) => <option key={d} value={d}>{DAY_NAMES[i]}</option>)}
                  </select>
                  <select value={newClass.subjectId}
                    onChange={e => setNewClass(p => ({ ...p, subjectId: e.target.value }))}
                    className="px-2 py-2 rounded-lg text-sm outline-none bg-input border border-border text-foreground col-span-2 sm:col-span-1">
                    <option value="">Disciplina...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input type="time" value={newClass.startTime}
                    onChange={e => setNewClass(p => ({ ...p, startTime: e.target.value }))}
                    className="px-2 py-2 rounded-lg text-sm outline-none bg-input border border-border text-foreground" />
                  <input type="time" value={newClass.endTime}
                    onChange={e => setNewClass(p => ({ ...p, endTime: e.target.value }))}
                    className="px-2 py-2 rounded-lg text-sm outline-none bg-input border border-border text-foreground" />
                </div>
                <Button size="sm" onClick={handleAddClass} className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Adicionar Aula
                </Button>
              </div>
            </div>

            {/* Lista de aulas */}
            {classes.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {classes.map(c => {
                  const sub = subjects.find(s => s.id === c.subjectId);
                  return (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: getSubjectColor(sub?.name || '', sub?.color) }} />
                      <span className="text-sm text-foreground flex-1">
                        {DAY_NAMES[DAY_IDS.indexOf(c.dayId)]} · {c.startTime}–{c.endTime} · {sub?.name || '—'}
                      </span>
                      <button onClick={() => setClasses(prev => prev.filter(x => x.id !== c.id))}
                        className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <Button onClick={handleSaveConfig} className="mt-4">
              Salvar e Atualizar Plano
            </Button>
          </div>
        </div>
      )}

      {/* ── Aviso sem onboarding ─────────────────────────────────────────────── */}
      {!userProfile?.onboarding_data && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 print:hidden">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Usando configuração padrão (1–2h/dia, Seg–Sex). Clique em <strong>Configurar</strong> para personalizar.
          </p>
        </div>
      )}

      {/* ── Grade do Calendário ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[640px]">
          {/* Cabeçalho com dias */}
          <div className="flex border-b border-border bg-card sticky top-0 z-10">
            {/* Coluna de horas */}
            <div className="w-14 flex-shrink-0" />
            {/* Colunas dos dias */}
            {weekDates.map((date, colIdx) => {
              const jsDay = date.getDay();
              const isToday = isCurrentWeek && jsDay === todayJs;
              const dayHasBlocks = Object.entries(planByDay).some(([d]) => {
                // planByDay usa jsDay como chave
                return parseInt(d) === jsDay && planByDay[parseInt(d)]?.length > 0;
              });
              return (
                <div key={colIdx}
                  className={`flex-1 text-center py-3 border-l border-border ${isToday ? 'bg-primary/5' : ''}`}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {DAY_SHORT[colIdx]}
                  </p>
                  <div className={`mx-auto mt-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    isToday
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground'
                  }`}>
                    {date.getDate()}
                  </div>
                  {dayHasBlocks && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Grade de horas */}
          <div className="flex">
            {/* Coluna de horas */}
            <div className="w-14 flex-shrink-0 relative">
              {HOURS.map(h => (
                <div key={h} style={{ height: CELL_HEIGHT }}
                  className="border-b border-border/40 flex items-start justify-end pr-2 pt-1">
                  <span className="text-[10px] text-muted-foreground/60 font-medium">
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Colunas dos dias */}
            {weekDates.map((date, colIdx) => {
              const jsDay = date.getDay();
              const isToday = isCurrentWeek && jsDay === todayJs;
              const blocks = planByDay[jsDay] || [];
              const totalHours = HOURS.length;

              return (
                <div key={colIdx}
                  className={`flex-1 border-l border-border relative ${isToday ? 'bg-primary/[0.02]' : ''}`}
                  style={{ height: totalHours * CELL_HEIGHT }}
                >
                  {/* Linhas de hora */}
                  {HOURS.map(h => (
                    <div key={h}
                      className="absolute w-full border-b border-border/30"
                      style={{ top: (h - HOUR_START) * CELL_HEIGHT, height: CELL_HEIGHT }}
                    />
                  ))}

                  {/* Linha do horário atual (só hoje) */}
                  {isToday && (() => {
                    const now = new Date();
                    const nowMin = now.getHours() * 60 + now.getMinutes();
                    const topPx = (nowMin - HOUR_START * 60) * (CELL_HEIGHT / 60);
                    if (topPx < 0 || topPx > totalHours * CELL_HEIGHT) return null;
                    return (
                      <div className="absolute w-full z-20 pointer-events-none"
                        style={{ top: topPx }}>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 -ml-1" />
                          <div className="flex-1 h-px bg-primary" />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Blocos de estudo */}
                  {blocks.map(block => {
                    const color = getSubjectColor(block.subjectName,
                      subjects.find(s => s.id === block.subjectId)?.color);
                    const typeColor = SESSION_TYPE_COLORS[block.type] || color;
                    const isSelected = selectedBlock === block.uid;

                    return (
                      <div
                        key={block.uid}
                        onClick={() => setSelectedBlock(isSelected ? null : block.uid)}
                        className="absolute left-0.5 right-0.5 rounded-md cursor-pointer overflow-hidden transition-all duration-150 hover:z-30 hover:shadow-lg"
                        style={{
                          top: block.topPx,
                          height: block.heightPx,
                          background: color,
                          borderLeft: `3px solid ${color}`,
                          filter: 'brightness(0.85) saturate(1.1)',
                          zIndex: isSelected ? 30 : 10,
                          outline: isSelected ? `2px solid ${color}` : 'none',
                          outlineOffset: '1px',
                        }}
                      >
                        {(() => {
                          const textColor = getTextColorForBg(color);
                          return (
                        <div className="px-1.5 py-1 h-full flex flex-col justify-between overflow-hidden">
                          <div>
                            <p className="text-[11px] font-semibold leading-tight truncate"
                              style={{ color: textColor }}>
                              {block.subjectName}
                            </p>
                            {block.heightPx > 40 && (
                              <p className="text-[10px] leading-tight truncate mt-0.5"
                                style={{ color: textColor, opacity: 0.85 }}>
                                {SESSION_TYPE_LABELS[block.type] || block.type}
                              </p>
                            )}
                            {block.heightPx > 55 && block.topics && block.topics.length > 0 && (
                              <p className="text-[9px] leading-tight truncate mt-0.5"
                                style={{ color: textColor, opacity: 0.75 }}>
                                {block.topics[0]}
                              </p>
                            )}
                          </div>
                          {block.heightPx > 32 && (
                            <p className="text-[9px]" style={{ color: textColor, opacity: 0.8 }}>
                              {block.startTime}–{block.endTime}
                            </p>
                          )}
                        </div>
                          );
                        })()}

                        {/* Popup de edição ao selecionar — FECHAMENTO do bloco acima */}
                        {isSelected && (
                          <div
                            className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-xl border border-border bg-popover p-3 min-w-[200px]"
                            onClick={e => e.stopPropagation()}
                          >
                            <p className="text-xs font-semibold text-foreground mb-1">{block.subjectName}</p>
                            <p className="text-[10px] text-muted-foreground mb-2">
                              {block.startTime}–{block.endTime} · {block.duration}min
                            </p>
                            {block.topics && block.topics.length > 0 && (
                              <p className="text-[10px] text-muted-foreground mb-2 italic">
                                {block.topics.slice(0, 2).join(', ')}
                              </p>
                            )}
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                              Trocar disciplina
                            </p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {subjects.map(s => (
                                <button key={s.id}
                                  onClick={() => handleSwapSubject(block.uid, s.id)}
                                  className="w-full text-left text-xs px-2 py-1 rounded-lg hover:bg-accent transition-colors flex items-center gap-2"
                                >
                                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ background: getSubjectColor(s.name, s.color) }} />
                                  {s.name}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => handleRemoveBlock(block.uid)}
                              className="mt-2 w-full text-xs text-destructive hover:bg-destructive/10 px-2 py-1 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <Trash2 className="h-3 w-3" /> Remover bloco
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Print styles ─────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
};

export default Planning;
