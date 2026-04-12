import React, { useState, useMemo, useEffect } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Plus, Trash2, Clock, BookOpen, ChevronLeft, ChevronRight, Repeat, AlertCircle, X } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_FULL  = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const HOUR_START = 6;
const HOUR_END   = 23;
const CELL_H     = 60; // px por hora

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

// ─── Componente Principal ─────────────────────────────────────────────────────
const WeeklySchedule: React.FC = () => {
  const { subjects } = useStudy();

  // ── Semana ──────────────────────────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0);
  const monday = useMemo(() => addDays(getMonday(new Date()), weekOffset * 7), [weekOffset]);
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
    return Math.max((timeToMin(endTime) - timeToMin(startTime)) * (CELL_H / 60), 24);
  }

  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);

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

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* ── Cabeçalho ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen size={24} style={{ color: '#3b82f6' }} />
            Agenda Semanal
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Cadastre suas aulas. O algoritmo usará isso para gerar seu planejamento.
          </p>
        </div>
        <button
          onClick={() => openAdd()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
          style={{ background: '#3b82f6', color: '#fff' }}
        >
          <Plus size={18} /> Adicionar Aula
        </button>
      </div>

      {/* ── Contadores ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
            <Clock size={14} style={{ color: '#3b82f6' }} />
            Carga Horária Presencial
          </div>
          <div className="text-3xl font-bold" style={{ color: '#3b82f6' }}>{fmtHours(presentialMin)}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {visibleClasses.length} aula{visibleClasses.length !== 1 ? 's' : ''} esta semana
          </div>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
            <BookOpen size={14} style={{ color: '#a855f7' }} />
            Revisão Ativa Recomendada
          </div>
          <div className="text-3xl font-bold" style={{ color: '#a855f7' }}>{fmtHours(reviewMin)}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Reforço pós-aula + revisão espaçada
          </div>
        </div>
      </div>

      {/* ── Navegação de semana ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
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
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs hover:underline px-2"
              style={{ color: '#3b82f6' }}
            >
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

      {/* ── Grade do calendário ───────────────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        {/* Header com dias */}
        <div className="grid border-b" style={{ gridTemplateColumns: '56px repeat(7, 1fr)', borderColor: 'var(--border-color)' }}>
          <div className="border-r" style={{ borderColor: 'var(--border-color)' }} />
          {weekDates.map((date, i) => {
            const isToday = isCurrentWeek && date.getDay() === todayDow;
            return (
              <div
                key={i}
                className="text-center py-3 border-r last:border-r-0 cursor-pointer transition-colors"
                style={{ borderColor: 'var(--border-color)', background: isToday ? 'rgba(59,130,246,0.08)' : 'transparent' }}
                onClick={() => openAdd(date.getDay())}
                title="Clique para adicionar aula neste dia"
              >
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: isToday ? '#3b82f6' : 'var(--text-secondary)' }}>
                  {DAY_NAMES[date.getDay()]}
                </div>
                <div
                  className="text-lg font-bold mt-0.5 w-8 h-8 flex items-center justify-center rounded-full mx-auto"
                  style={isToday
                    ? { background: '#3b82f6', color: '#fff' }
                    : { color: 'var(--text-primary)' }
                  }
                >
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Corpo da grade */}
        <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
          <div className="relative" style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)' }}>
            {/* Coluna de horas */}
            <div className="border-r" style={{ borderColor: 'var(--border-color)' }}>
              {hours.map(h => (
                <div
                  key={h}
                  className="border-b text-right pr-2 text-xs flex items-start justify-end pt-1"
                  style={{ height: `${CELL_H}px`, borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
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
                  className="relative border-r last:border-r-0"
                  style={{
                    height: `${(HOUR_END - HOUR_START + 1) * CELL_H}px`,
                    borderColor: 'var(--border-color)',
                    background: isToday ? 'rgba(59,130,246,0.03)' : 'transparent',
                  }}
                >
                  {/* Linhas de hora */}
                  {hours.map(h => (
                    <div
                      key={h}
                      className="absolute w-full border-b"
                      style={{ top: `${(h - HOUR_START) * CELL_H}px`, height: `${CELL_H}px`, borderColor: 'var(--border-color)' }}
                    />
                  ))}

                  {/* Linha do tempo atual */}
                  {isToday && nowPx !== null && (
                    <div className="absolute w-full z-20 pointer-events-none" style={{ top: `${nowPx}px` }}>
                      <div className="relative">
                        <div className="absolute -left-1 w-2 h-2 rounded-full bg-red-500" style={{ transform: 'translateY(-50%)' }} />
                        <div className="border-t-2 border-red-500 w-full" />
                      </div>
                    </div>
                  )}

                  {/* Blocos de aula */}
                  {dayClasses.map(c => {
                    const subject = subjectMap.get(c.subjectId);
                    const color = subject?.color || '#6366f1';
                    const top = topPx(c.startTime);
                    const height = heightPx(c.startTime, c.endTime);
                    const durationMin = timeToMin(c.endTime) - timeToMin(c.startTime);

                    return (
                      <div
                        key={c.id}
                        className="absolute rounded-md cursor-pointer group z-10 overflow-hidden"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: '2px',
                          right: '2px',
                          backgroundColor: color + 'dd',
                          borderLeft: `3px solid ${color}`,
                        }}
                        onClick={() => openEdit(c)}
                        title={`${subject?.name || 'Disciplina'} · ${c.startTime}–${c.endTime} · Clique para editar`}
                      >
                        <div className="p-1 h-full flex flex-col justify-between">
                          <div>
                            <div className="text-white text-xs font-semibold leading-tight truncate">
                              {subject?.name || 'Disciplina'}
                            </div>
                            {height > 36 && (
                              <div className="text-white/80 text-xs leading-tight">
                                {c.startTime}–{c.endTime}
                              </div>
                            )}
                          </div>
                          {height > 50 && (
                            <div className="flex items-center justify-between">
                              <span className="text-white/70 text-xs">{durationMin}min</span>
                              {c.repeats && <Repeat size={10} className="text-white/60" />}
                            </div>
                          )}
                        </div>
                        <button
                          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5"
                          style={{ background: 'rgba(0,0,0,0.3)' }}
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
      </div>

      {/* ── Lista de aulas ────────────────────────────────────────────────────── */}
      {classes.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
            Aulas Cadastradas ({classes.length})
          </h2>
          <div className="space-y-2">
            {[...classes]
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek || timeToMin(a.startTime) - timeToMin(b.startTime))
              .map(c => {
                const subject = subjectMap.get(c.subjectId);
                const color = subject?.color || '#6366f1';
                const durationMin = timeToMin(c.endTime) - timeToMin(c.startTime);
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                    onClick={() => openEdit(c)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <div>
                        <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {subject?.name || 'Disciplina'}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {DAY_FULL[c.dayOfWeek]} · {c.startTime}–{c.endTime} · {durationMin}min
                          {c.repeats && <span className="ml-2" style={{ color: '#3b82f6' }}>↻ repete toda semana</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteClass(c.id); }}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {classes.length === 0 && (
        <div className="mt-8 text-center py-12 rounded-xl border border-dashed" style={{ borderColor: 'var(--border-color)' }}>
          <BookOpen size={40} className="mx-auto mb-3 opacity-40" style={{ color: 'var(--text-secondary)' }} />
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhuma aula cadastrada ainda</p>
          <p className="text-sm mt-1 mb-4 opacity-70" style={{ color: 'var(--text-secondary)' }}>
            Adicione suas aulas para que o algoritmo gere um planejamento personalizado
          </p>
          <button
            onClick={() => openAdd()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ background: '#3b82f6', color: '#fff' }}
          >
            <Plus size={16} /> Adicionar primeira aula
          </button>
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-md border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editingId ? 'Editar Aula' : 'Adicionar Aula'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg transition-colors">
                <X size={18} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Disciplina */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Disciplina
                </label>
                <select
                  value={form.subjectId}
                  onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="">Selecione uma disciplina</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Dia da semana */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Dia da Semana
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {DAY_NAMES.map((name, i) => (
                    <button
                      key={i}
                      onClick={() => setForm(f => ({ ...f, dayOfWeek: i }))}
                      className="py-2 rounded-lg text-xs font-medium transition-colors"
                      style={form.dayOfWeek === i
                        ? { background: '#3b82f6', color: '#fff' }
                        : { background: 'var(--bg-primary)', color: 'var(--text-secondary)' }
                      }
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horários */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Início
                  </label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Término
                  </label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Duração calculada */}
              {form.startTime && form.endTime && timeToMin(form.endTime) > timeToMin(form.startTime) && (
                <div className="text-xs flex items-center gap-1" style={{ color: '#3b82f6' }}>
                  <Clock size={12} />
                  Duração: {timeToMin(form.endTime) - timeToMin(form.startTime)} minutos
                </div>
              )}

              {/* Repetir toda semana */}
              <div
                className="flex items-center justify-between p-3 rounded-lg border cursor-pointer"
                style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
                onClick={() => setForm(f => ({ ...f, repeats: !f.repeats }))}
              >
                <div className="flex items-center gap-2">
                  <Repeat size={16} style={{ color: '#3b82f6' }} />
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Repetir toda semana</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {form.repeats ? 'Aparece em todas as semanas' : 'Aparece apenas na semana atual'}
                    </div>
                  </div>
                </div>
                <div className="w-10 h-5 rounded-full relative transition-colors" style={{ background: form.repeats ? '#3b82f6' : 'var(--border-color)' }}>
                  <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform" style={{ transform: form.repeats ? 'translateX(20px)' : 'translateX(2px)' }} />
                </div>
              </div>

              {/* Erro */}
              {formError && (
                <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)' }}>
                  <AlertCircle size={14} />
                  {formError}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t" style={{ borderColor: 'var(--border-color)' }}>
              {editingId && (
                <button
                  onClick={() => { deleteClass(editingId); setShowModal(false); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors"
                  style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }}
                >
                  <Trash2 size={14} /> Excluir
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                Cancelar
              </button>
              <button
                onClick={saveClass}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ background: '#3b82f6' }}
              >
                {editingId ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklySchedule;
