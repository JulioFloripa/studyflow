import React, { useState, useMemo, useEffect } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Plus, Trash2, Clock, BookOpen, ChevronLeft, ChevronRight, Repeat, AlertCircle, X, CalendarDays, Moon, Activity, Heart } from 'lucide-react';
import { Card } from '@/components/ui/card';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_FULL  = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const HOUR_START = 6;
const HOUR_END   = 23;
const CELL_H     = 64;

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
function fmtDateLong(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number); return h * 60 + m;
}
function fmtHours(min: number): string {
  const h = Math.floor(min / 60); const m = min % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2,'0')}`;
}
function calcDuration(startTime: string, endTime: string, overnight = false): number {
  const s = timeToMin(startTime); const e = timeToMin(endTime);
  if (e > s) return e - s;
  if (overnight) return 24 * 60 - s + e;
  return 0;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
type EntryType = 'class' | 'sleep' | 'exercise';

interface ClassEntry {
  id: string;
  type?: EntryType;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  label?: string;
  repeats: boolean;
}

const STORAGE_KEY = 'ws_classes_v2';
const WELLNESS_KEY = 'ws_wellness_dismissed';
const WELLNESS_COOLDOWN = 7 * 24 * 60 * 60 * 1000;

function loadClasses(): ClassEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

const FALLBACK_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#84cc16',
];

const TYPE_CONFIG: Record<EntryType, { color: string; label: string; icon: React.ReactNode }> = {
  class:    { color: '',        label: 'Aula',             icon: <BookOpen size={14} /> },
  sleep:    { color: '#6366f1', label: 'Sono',             icon: <Moon size={14} /> },
  exercise: { color: '#f97316', label: 'Atividade Física', icon: <Activity size={14} /> },
};

// ─── Componente Principal ─────────────────────────────────────────────────────
const WeeklySchedule: React.FC = () => {
  const { subjects } = useStudy();

  const [weekOffset, setWeekOffset] = useState(0);
  const monday = useMemo(() => addDays(getMonday(new Date()), weekOffset * 7), [weekOffset]);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);
  const todayDow = new Date().getDay();
  const isCurrentWeek = weekOffset === 0;

  const [classes, setClasses] = useState<ClassEntry[]>(loadClasses);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(classes)); }, [classes]);

  const visibleClasses = useMemo(() =>
    classes.filter(c => c.repeats || weekOffset === 0),
    [classes, weekOffset]
  );

  // ── Wellness alert ───────────────────────────────────────────────────────────
  const [showWellness, setShowWellness] = useState(false);
  useEffect(() => {
    const hasSleep = classes.some(c => c.type === 'sleep');
    const hasExercise = classes.some(c => c.type === 'exercise');
    if (hasSleep && hasExercise) { setShowWellness(false); return; }
    const dismissed = localStorage.getItem(WELLNESS_KEY);
    if (dismissed && Date.now() - Number(dismissed) < WELLNESS_COOLDOWN) { setShowWellness(false); return; }
    setShowWellness(true);
  }, [classes]);

  function dismissWellness() {
    localStorage.setItem(WELLNESS_KEY, String(Date.now()));
    setShowWellness(false);
  }

  // ── Modal ───────────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: 'class' as EntryType,
    days: [1] as number[],
    startTime: '07:00',
    endTime: '08:30',
    subjectId: '',
    label: '',
    repeats: true,
  });
  const [formError, setFormError] = useState('');

  function toggleDay(i: number) {
    setForm(f => ({
      ...f,
      days: f.days.includes(i) ? f.days.filter(d => d !== i) : [...f.days, i],
    }));
  }

  function openAdd(dayOfWeek?: number) {
    setEditingId(null);
    setForm({ type: 'class', days: [dayOfWeek ?? 1], startTime: '07:00', endTime: '08:30', subjectId: subjects[0]?.id || '', label: '', repeats: true });
    setFormError('');
    setShowModal(true);
  }
  function openEdit(c: ClassEntry) {
    setEditingId(c.id);
    setForm({ type: c.type || 'class', days: [c.dayOfWeek], startTime: c.startTime, endTime: c.endTime, subjectId: c.subjectId, label: c.label || '', repeats: c.repeats });
    setFormError('');
    setShowModal(true);
  }
  function saveEntry() {
    if (form.type === 'class' && !form.subjectId) { setFormError('Selecione uma disciplina.'); return; }
    if (form.days.length === 0) { setFormError('Selecione ao menos um dia.'); return; }
    const overnight = form.type === 'sleep';
    const dur = calcDuration(form.startTime, form.endTime, overnight);
    if (dur <= 0) { setFormError('Horário de término inválido.'); return; }
    if (editingId) {
      setClasses(prev => prev.map(c => c.id === editingId ? { ...c, ...form, dayOfWeek: form.days[0] } : c));
    } else {
      setClasses(prev => [
        ...prev,
        ...form.days.map(day => ({ id: crypto.randomUUID(), type: form.type, dayOfWeek: day, startTime: form.startTime, endTime: form.endTime, subjectId: form.subjectId, label: form.label, repeats: form.repeats })),
      ]);
    }
    setShowModal(false);
  }
  function deleteEntry(id: string) {
    setClasses(prev => prev.filter(c => c.id !== id));
  }

  // ── Contadores ───────────────────────────────────────────────────────────────
  const { presentialMin, reviewMin } = useMemo(() => {
    let presential = 0;
    visibleClasses.filter(c => !c.type || c.type === 'class')
      .forEach(c => { presential += calcDuration(c.startTime, c.endTime); });
    return { presentialMin: presential, reviewMin: Math.round(presential * 1.5) };
  }, [visibleClasses]);

  // ── Grade ────────────────────────────────────────────────────────────────────
  function topPx(startTime: string): number {
    return (timeToMin(startTime) - HOUR_START * 60) * (CELL_H / 60);
  }
  function heightPx(startTime: string, endTime: string): number {
    return Math.max((timeToMin(endTime) - timeToMin(startTime)) * (CELL_H / 60), 28);
  }

  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);

  function getEntryColor(entry: ClassEntry): string {
    const t = entry.type || 'class';
    if (t !== 'class') return TYPE_CONFIG[t].color;
    const subject = subjectMap.get(entry.subjectId);
    if (subject?.color) return subject.color;
    const idx = subjects.findIndex(s => s.id === entry.subjectId);
    return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  }

  function getEntryLabel(entry: ClassEntry): string {
    const t = entry.type || 'class';
    if (t === 'class') return subjectMap.get(entry.subjectId)?.name || 'Disciplina';
    return entry.label || TYPE_CONFIG[t].label;
  }

  const [nowPx, setNowPx] = useState<number | null>(null);
  useEffect(() => {
    function update() {
      const now = new Date();
      const min = now.getHours() * 60 + now.getMinutes();
      setNowPx(min >= HOUR_START * 60 && min <= HOUR_END * 60
        ? (min - HOUR_START * 60) * (CELL_H / 60) : null);
    }
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
  const totalGridHeight = (HOUR_END - HOUR_START + 1) * CELL_H;

  const modalTitle = editingId
    ? `Editar ${form.type === 'class' ? 'Aula' : form.type === 'sleep' ? 'Sono' : 'Atividade'}`
    : 'Adicionar Horário';

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-primary" />
            Agenda Semanal
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Cadastre suas aulas, sono e atividades físicas.
          </p>
        </div>
        <button
          onClick={() => openAdd()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
        >
          <Plus size={16} /> Adicionar Horário
        </button>
      </div>

      {/* ── Contadores ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <Clock size={13} className="text-primary" />
            Carga Horária Presencial
          </div>
          <div className="text-3xl font-bold text-primary">{fmtHours(presentialMin)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {visibleClasses.filter(c => !c.type || c.type === 'class').length} aula{visibleClasses.filter(c => !c.type || c.type === 'class').length !== 1 ? 's' : ''} esta semana
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <BookOpen size={13} className="text-purple-500" />
            Revisão Ativa Recomendada
          </div>
          <div className="text-3xl font-bold text-purple-500">{fmtHours(reviewMin)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Reforço pós-aula + revisão espaçada
          </div>
        </Card>
      </div>

      {/* ── Navegação de semana ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="font-semibold text-foreground">{fmtDate(weekDates[0])} – {fmtDate(weekDates[6])}</div>
          {isCurrentWeek && <div className="text-xs font-medium text-primary">Semana atual</div>}
        </div>
        <div className="flex items-center gap-1">
          {!isCurrentWeek && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-primary hover:underline px-2 py-1">Hoje</button>
          )}
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* ── Grade do calendário ───────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="grid border-b border-border bg-muted/30" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
          <div className="border-r border-border" />
          {weekDates.map((date, i) => {
            const isToday = isCurrentWeek && date.getDay() === todayDow;
            return (
              <div
                key={i}
                className={`text-center py-3 border-r border-border last:border-r-0 cursor-pointer transition-colors select-none ${isToday ? 'bg-primary/5' : 'hover:bg-accent/50'}`}
                onClick={() => openAdd(date.getDay())}
                title="Clique para adicionar horário neste dia"
              >
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{DAY_NAMES[(i + 1) % 7]}</div>
                <div className={`text-base font-bold mt-0.5 w-8 h-8 flex items-center justify-center rounded-full mx-auto ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                  {date.getDate()}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{fmtDateLong(date).split(' ')[1]}</div>
              </div>
            );
          })}
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: '560px' }}>
          <div className="relative" style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)' }}>
            <div className="border-r border-border bg-muted/10 relative z-10">
              {hours.map(h => (
                <div key={h} className="border-b border-border/50 text-right pr-2 text-[11px] text-muted-foreground flex items-start justify-end pt-1 select-none" style={{ height: `${CELL_H}px` }}>
                  {h}:00
                </div>
              ))}
            </div>

            {weekDates.map((date, colIdx) => {
              const dow = date.getDay();
              const isToday = isCurrentWeek && dow === todayDow;
              const dayEntries = visibleClasses.filter(c => c.dayOfWeek === dow);

              return (
                <div
                  key={colIdx}
                  className={`relative border-r border-border last:border-r-0 cursor-pointer ${isToday ? 'bg-primary/[0.02]' : 'bg-card'}`}
                  style={{ height: `${totalGridHeight}px` }}
                  onClick={() => openAdd(dow)}
                >
                  {hours.map(h => (
                    <div key={h} className="absolute w-full border-b border-border/30" style={{ top: `${(h - HOUR_START) * CELL_H}px`, height: `${CELL_H}px` }} />
                  ))}
                  {hours.map(h => (
                    <div key={`h-${h}`} className="absolute w-full border-b border-border/15" style={{ top: `${(h - HOUR_START) * CELL_H + CELL_H / 2}px` }} />
                  ))}

                  {isToday && nowPx !== null && (
                    <div className="absolute w-full z-20 pointer-events-none" style={{ top: `${nowPx}px` }}>
                      <div className="relative flex items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 flex-shrink-0" />
                        <div className="flex-1 border-t-2 border-red-500" />
                      </div>
                    </div>
                  )}

                  {dayEntries.map(entry => {
                    const color = getEntryColor(entry);
                    const label = getEntryLabel(entry);
                    const top = topPx(entry.startTime);
                    const height = heightPx(entry.startTime, entry.endTime);
                    const entryType = entry.type || 'class';
                    const durationMin = calcDuration(entry.startTime, entry.endTime, entryType === 'sleep');

                    return (
                      <div
                        key={entry.id}
                        className="absolute rounded-lg cursor-pointer group z-10 overflow-hidden shadow-sm transition-all hover:shadow-md hover:scale-[1.01]"
                        style={{
                          top: `${top + 1}px`,
                          height: `${height - 2}px`,
                          left: '3px', right: '3px',
                          backgroundColor: color + '22',
                          borderLeft: `3px solid ${color}`,
                          borderTop: `1px solid ${color}40`,
                          borderRight: `1px solid ${color}40`,
                          borderBottom: `1px solid ${color}40`,
                        }}
                        onClick={e => { e.stopPropagation(); openEdit(entry); }}
                        title={`${label} · ${entry.startTime}–${entry.endTime} · Clique para editar`}
                      >
                        <div className="p-1.5 h-full flex flex-col justify-between">
                          <div>
                            <div className="text-[11px] font-semibold leading-tight truncate flex items-center gap-1" style={{ color }}>
                              {entryType === 'sleep' && <Moon size={9} />}
                              {entryType === 'exercise' && <Activity size={9} />}
                              {label}
                            </div>
                            {height > 38 && (
                              <div className="text-[10px] leading-tight mt-0.5" style={{ color: color + 'bb' }}>
                                {entry.startTime}–{entry.endTime}
                              </div>
                            )}
                          </div>
                          {height > 52 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px]" style={{ color: color + '99' }}>{durationMin}min</span>
                              {entry.repeats && <Repeat size={9} style={{ color: color + '88' }} />}
                            </div>
                          )}
                        </div>
                        <button
                          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 bg-black/20 hover:bg-black/40"
                          onClick={e => { e.stopPropagation(); deleteEntry(entry.id); }}
                          title="Remover"
                        >
                          <X size={10} className="text-white" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── Lista de entradas cadastradas ─────────────────────────────────────── */}
      {classes.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Horários Cadastrados ({classes.length})
          </h2>
          <div className="space-y-2">
            {[...classes]
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek || timeToMin(a.startTime) - timeToMin(b.startTime))
              .map(entry => {
                const color = getEntryColor(entry);
                const label = getEntryLabel(entry);
                const entryType = entry.type || 'class';
                const durationMin = calcDuration(entry.startTime, entry.endTime, entryType === 'sleep');
                return (
                  <Card
                    key={entry.id}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition-colors"
                    onClick={() => openEdit(entry)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex items-center gap-2">
                        <span style={{ color }} className="opacity-70">
                          {entryType === 'sleep' && <Moon size={14} />}
                          {entryType === 'exercise' && <Activity size={14} />}
                          {entryType === 'class' && <BookOpen size={14} />}
                        </span>
                        <div>
                          <div className="font-medium text-sm text-foreground">{label}</div>
                          <div className="text-xs text-muted-foreground">
                            {DAY_FULL[entry.dayOfWeek]} · {entry.startTime}–{entry.endTime} · {durationMin}min
                            {entry.repeats && <span className="ml-2 text-primary">↻ toda semana</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteEntry(entry.id); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Card>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="mt-8 text-center py-14 rounded-2xl border border-dashed border-border">
          <CalendarDays size={40} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">Nenhum horário cadastrado ainda</p>
          <p className="text-sm mt-1 mb-5 text-muted-foreground/70">
            Adicione suas aulas, sono e atividades físicas
          </p>
          <button
            onClick={() => openAdd()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> Adicionar primeiro horário
          </button>
        </div>
      )}

      {/* ── Alerta de bem-estar ───────────────────────────────────────────────── */}
      {showWellness && (
        <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground">
          <Heart size={15} className="text-pink-400 flex-shrink-0 mt-0.5" />
          <p className="flex-1">
            <span className="font-medium text-foreground">Dica de bem-estar: </span>
            Registrar seu horário de sono e atividade física na agenda ajuda o algoritmo a respeitar seu descanso e sua energia.
          </p>
          <button onClick={dismissWellness} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <Card className="w-full max-w-md shadow-2xl border-border/80">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">{modalTitle}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Tipo de entrada */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['class', 'sleep', 'exercise'] as EntryType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: t, subjectId: t === 'class' ? (f.subjectId || subjects[0]?.id || '') : '' }))}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors border
                        ${form.type === t
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                        }`}
                    >
                      {t === 'class' && <><BookOpen size={12} /> Aula</>}
                      {t === 'sleep' && <><Moon size={12} /> Sono</>}
                      {t === 'exercise' && <><Activity size={12} /> Exercício</>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Disciplina (somente para aulas) */}
              {form.type === 'class' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Disciplina</label>
                  <select
                    value={form.subjectId}
                    onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2.5 text-sm bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Selecione uma disciplina</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {/* Label (sono / exercício) */}
              {form.type !== 'class' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {form.type === 'sleep' ? 'Descrição (opcional)' : 'Atividade (opcional)'}
                  </label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder={form.type === 'sleep' ? 'Ex: Dormir' : 'Ex: Corrida, Academia…'}
                    className="w-full rounded-lg px-3 py-2.5 text-sm bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}

              {/* Dia da semana */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Dia da Semana {!editingId && <span className="normal-case font-normal">(pode selecionar vários)</span>}
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {DAY_NAMES.map((name, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => editingId ? setForm(f => ({ ...f, days: [i] })) : toggleDay(i)}
                      className={`py-2 rounded-lg text-xs font-medium transition-colors
                        ${form.days.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horários */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Início</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Término</label>
                  <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              {form.startTime && form.endTime && (() => {
                const overnight = form.type === 'sleep';
                const dur = calcDuration(form.startTime, form.endTime, overnight);
                if (dur <= 0) return null;
                return (
                  <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 rounded-lg px-3 py-2">
                    <Clock size={12} />
                    Duração: {fmtHours(dur)}
                    {overnight && timeToMin(form.endTime) < timeToMin(form.startTime) && (
                      <span className="ml-1 text-muted-foreground">(cruza meia-noite)</span>
                    )}
                  </div>
                );
              })()}

              {/* Repetir toda semana */}
              <div
                className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30 cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => setForm(f => ({ ...f, repeats: !f.repeats }))}
              >
                <div className="flex items-center gap-2.5">
                  <Repeat size={16} className="text-primary" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Repetir toda semana</div>
                    <div className="text-xs text-muted-foreground">{form.repeats ? 'Aparece em todas as semanas' : 'Aparece apenas na semana atual'}</div>
                  </div>
                </div>
                <div className="w-10 h-5 rounded-full relative transition-colors flex-shrink-0" style={{ background: form.repeats ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}>
                  <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform" style={{ transform: form.repeats ? 'translateX(20px)' : 'translateX(2px)' }} />
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  <AlertCircle size={14} /> {formError}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t border-border">
              {editingId && (
                <button type="button" onClick={() => { deleteEntry(editingId); setShowModal(false); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors">
                  <Trash2 size={14} /> Excluir
                </button>
              )}
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-accent transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={saveEntry} className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                {editingId ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WeeklySchedule;
