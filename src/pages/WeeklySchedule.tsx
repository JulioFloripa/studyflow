import React, { useState, useMemo, useEffect } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Plus, Trash2, Clock, BookOpen, ChevronLeft, ChevronRight, Repeat, AlertCircle, X, CalendarDays } from 'lucide-react';
import { Card } from '@/components/ui/card';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_FULL  = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const HOUR_START = 6;
const HOUR_END   = 23;
const CELL_H     = 64; // px por hora

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

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ClassEntry {
  id: string;
  dayOfWeek: number;   // 0=Dom … 6=Sáb
  startTime: string;
  endTime: string;
  subjectId: string;
  repeats: boolean;
}

const STORAGE_KEY = 'ws_classes_v2';

function loadClasses(): ClassEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

// Paleta de cores para disciplinas sem cor definida
const FALLBACK_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#84cc16',
];

// ─── Componente Principal ─────────────────────────────────────────────────────
const WeeklySchedule: React.FC = () => {
  const { subjects } = useStudy();

  // ── Semana ──────────────────────────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0);
  const monday = useMemo(() => addDays(getMonday(new Date()), weekOffset * 7), [weekOffset]);
  // Segunda a Domingo (índices 1..6 + 0 reordenado)
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);
  const todayDow = new Date().getDay();
  const isCurrentWeek = weekOffset === 0;

  // ── Aulas ───────────────────────────────────────────────────────────────────
  const [classes, setClasses] = useState<ClassEntry[]>(loadClasses);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(classes)); }, [classes]);

  // Aulas visíveis nesta semana
  const visibleClasses = useMemo(() =>
    classes.filter(c => c.repeats || weekOffset === 0),
    [classes, weekOffset]
  );

  // ── Modal ───────────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    dayOfWeek: 1,
    startTime: '07:00',
    endTime: '08:30',
    subjectId: '',
    repeats: true,
  });
  const [formError, setFormError] = useState('');

  function openAdd(dayOfWeek?: number) {
    setEditingId(null);
    setForm({ dayOfWeek: dayOfWeek ?? 1, startTime: '07:00', endTime: '08:30', subjectId: subjects[0]?.id || '', repeats: true });
    setFormError('');
    setShowModal(true);
  }
  function openEdit(c: ClassEntry) {
    setEditingId(c.id);
    setForm({ dayOfWeek: c.dayOfWeek, startTime: c.startTime, endTime: c.endTime, subjectId: c.subjectId, repeats: c.repeats });
    setFormError('');
    setShowModal(true);
  }
  function saveClass() {
    if (!form.subjectId) { setFormError('Selecione uma disciplina.'); return; }
    if (timeToMin(form.endTime) <= timeToMin(form.startTime)) {
      setFormError('O horário de término deve ser após o início.'); return;
    }
    if (editingId) {
      setClasses(prev => prev.map(c => c.id === editingId ? { ...c, ...form } : c));
    } else {
      setClasses(prev => [...prev, { id: crypto.randomUUID(), ...form }]);
    }
    setShowModal(false);
  }
  function deleteClass(id: string) {
    setClasses(prev => prev.filter(c => c.id !== id));
  }

  // ── Contadores ───────────────────────────────────────────────────────────────
  const { presentialMin, reviewMin } = useMemo(() => {
    let presential = 0;
    visibleClasses.forEach(c => { presential += timeToMin(c.endTime) - timeToMin(c.startTime); });
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

  function getSubjectColor(subjectId: string): string {
    const subject = subjectMap.get(subjectId);
    if (subject?.color) return subject.color;
    const idx = subjects.findIndex(s => s.id === subjectId);
    return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  }

  // ── Linha do tempo atual ─────────────────────────────────────────────────────
  const [nowPx, setNowPx] = useState<number | null>(null);
  useEffect(() => {
    function update() {
      const now = new Date();
      const min = now.getHours() * 60 + now.getMinutes();
      setNowPx(min >= HOUR_START * 60 && min <= HOUR_END * 60
        ? (min - HOUR_START * 60) * (CELL_H / 60)
        : null);
    }
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
  const totalGridHeight = (HOUR_END - HOUR_START + 1) * CELL_H;

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
            Cadastre suas aulas. O algoritmo usará isso para gerar seu planejamento.
          </p>
        </div>
        <button
          onClick={() => openAdd()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
        >
          <Plus size={16} /> Adicionar Aula
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
            {visibleClasses.length} aula{visibleClasses.length !== 1 ? 's' : ''} esta semana
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
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="font-semibold text-foreground">
            {fmtDate(weekDates[0])} – {fmtDate(weekDates[6])}
          </div>
          {isCurrentWeek && (
            <div className="text-xs font-medium text-primary">Semana atual</div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isCurrentWeek && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs text-primary hover:underline px-2 py-1"
            >
              Hoje
            </button>
          )}
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* ── Grade do calendário ───────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        {/* Header com dias */}
        <div
          className="grid border-b border-border bg-muted/30"
          style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}
        >
          {/* Célula vazia no canto */}
          <div className="border-r border-border" />
          {weekDates.map((date, i) => {
            const isToday = isCurrentWeek && date.getDay() === todayDow;
            return (
              <div
                key={i}
                className={`text-center py-3 border-r border-border last:border-r-0 cursor-pointer transition-colors select-none
                  ${isToday ? 'bg-primary/5' : 'hover:bg-accent/50'}`}
                onClick={() => openAdd(date.getDay())}
                title="Clique para adicionar aula neste dia"
              >
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {DAY_NAMES[(i + 1) % 7]}
                </div>
                <div
                  className={`text-base font-bold mt-0.5 w-8 h-8 flex items-center justify-center rounded-full mx-auto
                    ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}
                >
                  {date.getDate()}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {fmtDateLong(date).split(' ')[1]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Corpo da grade com scroll */}
        <div className="overflow-y-auto" style={{ maxHeight: '560px' }}>
          <div
            className="relative"
            style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)' }}
          >
            {/* Coluna de horas */}
            <div className="border-r border-border bg-muted/10 relative z-10">
              {hours.map(h => (
                <div
                  key={h}
                  className="border-b border-border/50 text-right pr-2 text-[11px] text-muted-foreground flex items-start justify-end pt-1 select-none"
                  style={{ height: `${CELL_H}px` }}
                >
                  {h}:00
                </div>
              ))}
            </div>

            {/* Colunas dos dias */}
            {weekDates.map((date, colIdx) => {
              const dow = date.getDay();
              const isToday = isCurrentWeek && dow === todayDow;
              const dayClasses = visibleClasses.filter(c => c.dayOfWeek === dow);

              return (
                <div
                  key={colIdx}
                  className={`relative border-r border-border last:border-r-0 cursor-pointer
                    ${isToday ? 'bg-primary/[0.02]' : 'bg-card'}`}
                  style={{ height: `${totalGridHeight}px` }}
                  onClick={() => openAdd(dow)}
                >
                  {/* Linhas de hora (fundo) */}
                  {hours.map(h => (
                    <div
                      key={h}
                      className="absolute w-full border-b border-border/30"
                      style={{ top: `${(h - HOUR_START) * CELL_H}px`, height: `${CELL_H}px` }}
                    />
                  ))}

                  {/* Meia hora (linha pontilhada) */}
                  {hours.map(h => (
                    <div
                      key={`h-${h}`}
                      className="absolute w-full border-b border-border/15"
                      style={{ top: `${(h - HOUR_START) * CELL_H + CELL_H / 2}px` }}
                    />
                  ))}

                  {/* Linha do tempo atual */}
                  {isToday && nowPx !== null && (
                    <div
                      className="absolute w-full z-20 pointer-events-none"
                      style={{ top: `${nowPx}px` }}
                    >
                      <div className="relative flex items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 flex-shrink-0" />
                        <div className="flex-1 border-t-2 border-red-500" />
                      </div>
                    </div>
                  )}

                  {/* Blocos de aula */}
                  {dayClasses.map(c => {
                    const color = getSubjectColor(c.subjectId);
                    const subject = subjectMap.get(c.subjectId);
                    const top = topPx(c.startTime);
                    const height = heightPx(c.startTime, c.endTime);
                    const durationMin = timeToMin(c.endTime) - timeToMin(c.startTime);

                    return (
                      <div
                        key={c.id}
                        className="absolute rounded-lg cursor-pointer group z-10 overflow-hidden shadow-sm transition-all hover:shadow-md hover:scale-[1.01]"
                        style={{
                          top: `${top + 1}px`,
                          height: `${height - 2}px`,
                          left: '3px',
                          right: '3px',
                          backgroundColor: color + '22',
                          borderLeft: `3px solid ${color}`,
                          borderTop: `1px solid ${color}40`,
                          borderRight: `1px solid ${color}40`,
                          borderBottom: `1px solid ${color}40`,
                        }}
                        onClick={e => { e.stopPropagation(); openEdit(c); }}
                        title={`${subject?.name || 'Disciplina'} · ${c.startTime}–${c.endTime} · Clique para editar`}
                      >
                        <div className="p-1.5 h-full flex flex-col justify-between">
                          <div>
                            <div
                              className="text-[11px] font-semibold leading-tight truncate"
                              style={{ color }}
                            >
                              {subject?.name || 'Disciplina'}
                            </div>
                            {height > 38 && (
                              <div className="text-[10px] leading-tight mt-0.5" style={{ color: color + 'bb' }}>
                                {c.startTime}–{c.endTime}
                              </div>
                            )}
                          </div>
                          {height > 52 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px]" style={{ color: color + '99' }}>{durationMin}min</span>
                              {c.repeats && <Repeat size={9} style={{ color: color + '88' }} />}
                            </div>
                          )}
                        </div>
                        {/* Botão de remover no hover */}
                        <button
                          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 bg-black/20 hover:bg-black/40"
                          onClick={e => { e.stopPropagation(); deleteClass(c.id); }}
                          title="Remover aula"
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

      {/* ── Lista de aulas cadastradas ────────────────────────────────────────── */}
      {classes.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Aulas Cadastradas ({classes.length})
          </h2>
          <div className="space-y-2">
            {[...classes]
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek || timeToMin(a.startTime) - timeToMin(b.startTime))
              .map(c => {
                const color = getSubjectColor(c.subjectId);
                const subject = subjectMap.get(c.subjectId);
                const durationMin = timeToMin(c.endTime) - timeToMin(c.startTime);
                return (
                  <Card
                    key={c.id}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition-colors"
                    onClick={() => openEdit(c)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-1 h-10 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div>
                        <div className="font-medium text-sm text-foreground">
                          {subject?.name || 'Disciplina'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {DAY_FULL[c.dayOfWeek]} · {c.startTime}–{c.endTime} · {durationMin}min
                          {c.repeats && (
                            <span className="ml-2 text-primary">↻ toda semana</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteClass(c.id); }}
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
          <p className="font-medium text-muted-foreground">Nenhuma aula cadastrada ainda</p>
          <p className="text-sm mt-1 mb-5 text-muted-foreground/70">
            Adicione suas aulas para que o algoritmo gere um planejamento personalizado
          </p>
          <button
            onClick={() => openAdd()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> Adicionar primeira aula
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
            {/* Header do modal */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {editingId ? 'Editar Aula' : 'Adicionar Aula'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Disciplina */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Disciplina
                </label>
                <select
                  value={form.subjectId}
                  onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2.5 text-sm bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione uma disciplina</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Dia da semana */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Dia da Semana
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {DAY_NAMES.map((name, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, dayOfWeek: i }))}
                      className={`py-2 rounded-lg text-xs font-medium transition-colors
                        ${form.dayOfWeek === i
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horários */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Início
                  </label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2.5 text-sm bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Término
                  </label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2.5 text-sm bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Duração calculada */}
              {form.startTime && form.endTime && timeToMin(form.endTime) > timeToMin(form.startTime) && (
                <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 rounded-lg px-3 py-2">
                  <Clock size={12} />
                  Duração: {timeToMin(form.endTime) - timeToMin(form.startTime)} minutos
                </div>
              )}

              {/* Repetir toda semana */}
              <div
                className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30 cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => setForm(f => ({ ...f, repeats: !f.repeats }))}
              >
                <div className="flex items-center gap-2.5">
                  <Repeat size={16} className="text-primary" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Repetir toda semana</div>
                    <div className="text-xs text-muted-foreground">
                      {form.repeats ? 'Aparece em todas as semanas' : 'Aparece apenas na semana atual'}
                    </div>
                  </div>
                </div>
                {/* Toggle */}
                <div
                  className="w-10 h-5 rounded-full relative transition-colors flex-shrink-0"
                  style={{ background: form.repeats ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                    style={{ transform: form.repeats ? 'translateX(20px)' : 'translateX(2px)' }}
                  />
                </div>
              </div>

              {/* Erro */}
              {formError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  <AlertCircle size={14} />
                  {formError}
                </div>
              )}
            </div>

            {/* Footer do modal */}
            <div className="flex gap-3 p-5 border-t border-border">
              {editingId && (
                <button
                  type="button"
                  onClick={() => { deleteClass(editingId); setShowModal(false); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveClass}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
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
