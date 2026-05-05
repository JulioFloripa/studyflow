import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarDays, BookOpen, Moon, Zap, Utensils, Bus, Pin, Plus, Repeat2, Clock } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = 'Aula' | 'Sono' | 'Exercício' | 'Refeição' | 'Deslocamento' | 'Outro';

interface AgendaEvent {
  id: string;
  tipo: EventType;
  descricao: string;
  dias: number[]; // 0=Dom..6=Sáb
  inicio: string; // "HH:MM"
  termino: string; // "HH:MM"
  repetirSemanalmente: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'studyflow_agenda_v2';

const HOUR_HEIGHT = 64; // px per hour
const GRID_START = 6;   // 06:00
const GRID_END = 24;    // 00:00 next day (exclusive)
const GRID_HOURS = GRID_END - GRID_START;

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_LABELS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const EVENT_TYPE_CONFIG: Record<EventType, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  Aula:         { icon: <BookOpen className="w-3 h-3" />, bg: 'bg-blue-600/80',   border: 'border-blue-400',   text: 'text-white' },
  Sono:         { icon: <Moon className="w-3 h-3" />,     bg: 'bg-indigo-800/90', border: 'border-indigo-500', text: 'text-indigo-100' },
  Exercício:    { icon: <Zap className="w-3 h-3" />,      bg: 'bg-emerald-600/80',border: 'border-emerald-400',text: 'text-white' },
  Refeição:     { icon: <Utensils className="w-3 h-3" />, bg: 'bg-amber-600/80',  border: 'border-amber-400',  text: 'text-white' },
  Deslocamento: { icon: <Bus className="w-3 h-3" />,      bg: 'bg-gray-600/80',   border: 'border-gray-400',   text: 'text-white' },
  Outro:        { icon: <Pin className="w-3 h-3" />,      bg: 'bg-purple-600/80', border: 'border-purple-400', text: 'text-white' },
};

const EVENT_TYPES: EventType[] = ['Aula', 'Sono', 'Exercício', 'Refeição', 'Deslocamento', 'Outro'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function eventDurationMinutes(inicio: string, termino: string): number {
  const s = timeToMinutes(inicio);
  const e = timeToMinutes(termino);
  return e > s ? e - s : (24 * 60 - s) + e; // overnight
}

function isOvernight(inicio: string, termino: string): boolean {
  return timeToMinutes(termino) <= timeToMinutes(inicio);
}

/** Top offset in px relative to grid start */
function topPx(time: string): number {
  const mins = timeToMinutes(time) - GRID_START * 60;
  return (mins / 60) * HOUR_HEIGHT;
}

/** Height in px, clamped to grid */
function heightPx(inicio: string, termino: string): number {
  const startMins = timeToMinutes(inicio);
  const gridStartMins = GRID_START * 60;
  const gridEndMins = GRID_END * 60;

  if (isOvernight(inicio, termino)) {
    // Show from start to end of grid
    const visibleMins = gridEndMins - Math.max(startMins, gridStartMins);
    return (visibleMins / 60) * HOUR_HEIGHT;
  }
  const endMins = timeToMinutes(termino);
  const clampedStart = Math.max(startMins, gridStartMins);
  const clampedEnd = Math.min(endMins, gridEndMins);
  return Math.max(((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT, 20);
}

function loadEvents(): AgendaEvent[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveEvents(events: AgendaEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Edit Dialog ─────────────────────────────────────────────────────────────

interface EditDialogProps {
  event: Partial<AgendaEvent> | null;
  onClose: () => void;
  onSave: (ev: AgendaEvent) => void;
  onDelete?: (id: string) => void;
  defaultDay?: number;
}

function EditDialog({ event, onClose, onSave, onDelete, defaultDay }: EditDialogProps) {
  const isNew = !event?.id;
  const [tipo, setTipo] = useState<EventType>(event?.tipo ?? 'Aula');
  const [descricao, setDescricao] = useState(event?.descricao ?? '');
  const [dias, setDias] = useState<number[]>(event?.dias ?? (defaultDay !== undefined ? [defaultDay] : [1]));
  const [inicio, setInicio] = useState(event?.inicio ?? '08:00');
  const [termino, setTermino] = useState(event?.termino ?? '09:00');
  const [repetir, setRepetir] = useState(event?.repetirSemanalmente ?? true);

  const duracao = eventDurationMinutes(inicio, termino);
  const overnight = isOvernight(inicio, termino);

  function toggleDia(d: number) {
    setDias(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  function handleSave() {
    if (dias.length === 0) { toast.error('Selecione pelo menos um dia.'); return; }
    onSave({
      id: event?.id ?? newId(),
      tipo, descricao, dias, inicio, termino,
      repetirSemanalmente: repetir,
    });
  }

  const cfg = EVENT_TYPE_CONFIG[tipo];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl bg-[#0f1629] border-[#1e2d4a] text-white">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-[#1e2d4a]">
          <DialogTitle className="text-white text-lg font-bold">
            {isNew ? 'Novo Evento' : `Editar ${tipo}`}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-5">
          {/* Tipo */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tipo</p>
            <div className="flex gap-2 flex-wrap">
              {EVENT_TYPES.map(t => {
                const c = EVENT_TYPE_CONFIG[t];
                const sel = tipo === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTipo(t)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${
                      sel ? `${c.bg} ${c.border} ${c.text}` : 'bg-[#1a2540] border-[#2a3a5c] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {c.icon} {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Descrição (opcional)
            </p>
            <input
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder={`Ex: ${tipo}`}
              className="w-full bg-[#1a2540] border border-[#2a3a5c] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Dias */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Dia da semana
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {DAY_LABELS.map((label, d) => (
                <button
                  key={d}
                  onClick={() => toggleDia(d)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all border ${
                    dias.includes(d)
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-[#1a2540] border-[#2a3a5c] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Início</p>
              <div className="relative">
                <input
                  type="time"
                  value={inicio}
                  onChange={e => setInicio(e.target.value)}
                  className="w-full bg-[#1a2540] border border-[#2a3a5c] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Término</p>
              <input
                type="time"
                value={termino}
                onChange={e => setTermino(e.target.value)}
                className="w-full bg-[#1a2540] border border-[#2a3a5c] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Duration info */}
          <div className="flex items-center gap-2 bg-[#1a2540] rounded-xl px-4 py-2.5 border border-[#2a3a5c]">
            <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="text-sm text-blue-300 font-medium">
              Duração: {Math.floor(duracao / 60)}h{duracao % 60 > 0 ? `${duracao % 60}min` : ''}
            </span>
            {overnight && (
              <span className="text-xs text-slate-400 ml-1">(cruza meia-noite)</span>
            )}
          </div>

          {/* Repetir */}
          <button
            onClick={() => setRepetir(r => !r)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
              repetir ? 'bg-[#1a2540] border-blue-500/50' : 'bg-[#1a2540] border-[#2a3a5c]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Repeat2 className={`w-5 h-5 ${repetir ? 'text-blue-400' : 'text-slate-500'}`} />
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Repetir toda semana</p>
                <p className="text-xs text-slate-400">Aparece em todas as semanas</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors relative ${repetir ? 'bg-blue-600' : 'bg-[#2a3a5c]'}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${repetir ? 'left-5' : 'left-0.5'}`} />
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          {!isNew && onDelete && (
            <Button
              variant="outline"
              onClick={() => { onDelete(event!.id!); onClose(); }}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 bg-transparent"
            >
              🗑 Excluir
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white flex-1 font-semibold">
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Event Block ──────────────────────────────────────────────────────────────

interface EventBlockProps {
  event: AgendaEvent;
  day: number;
  onClick: () => void;
}

function EventBlock({ event, day, onClick }: EventBlockProps) {
  const cfg = EVENT_TYPE_CONFIG[event.tipo];
  const top = topPx(event.inicio);
  const height = heightPx(event.inicio, event.termino);
  const overnight = isOvernight(event.inicio, event.termino);
  const label = event.descricao || event.tipo;
  const durMin = eventDurationMinutes(event.inicio, event.termino);

  // Don't render if event starts before or at grid end and has no visible portion
  if (top >= GRID_HOURS * HOUR_HEIGHT) return null;
  if (top < 0 && top + height <= 0) return null;

  const visibleTop = Math.max(top, 0);
  const visibleHeight = height - Math.max(0, -top);

  return (
    <div
      onClick={onClick}
      className={`absolute left-0.5 right-0.5 rounded-lg border cursor-pointer select-none overflow-hidden transition-opacity hover:opacity-90 ${cfg.bg} ${cfg.border} ${cfg.text}`}
      style={{ top: visibleTop, height: Math.max(visibleHeight, 22) }}
    >
      <div className="flex items-start gap-1 px-1.5 pt-1 leading-tight">
        <span className="flex-shrink-0 mt-0.5">{cfg.icon}</span>
        <span className="text-[11px] font-semibold truncate">{label}</span>
      </div>
      {visibleHeight >= 36 && (
        <p className="px-1.5 text-[10px] opacity-70 truncate">
          {event.inicio}–{overnight ? '00:00' : event.termino}
          {overnight && <span className="ml-1">↩</span>}
        </p>
      )}
      {visibleHeight >= 52 && (
        <p className="px-1.5 text-[10px] opacity-60">
          {Math.floor(durMin / 60)}h{durMin % 60 > 0 ? `${durMin % 60}m` : ''}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const Agenda = () => {
  const [events, setEvents] = useState<AgendaEvent[]>(loadEvents);
  const [editTarget, setEditTarget] = useState<Partial<AgendaEvent> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultDay, setDefaultDay] = useState<number | undefined>(undefined);
  const gridRef = useRef<HTMLDivElement>(null);

  function persist(next: AgendaEvent[]) {
    setEvents(next);
    saveEvents(next);
  }

  function openNew(day?: number) {
    setDefaultDay(day);
    setEditTarget({});
    setDialogOpen(true);
  }

  function openEdit(ev: AgendaEvent) {
    setDefaultDay(undefined);
    setEditTarget(ev);
    setDialogOpen(true);
  }

  function handleSave(ev: AgendaEvent) {
    persist(events.some(e => e.id === ev.id)
      ? events.map(e => e.id === ev.id ? ev : e)
      : [...events, ev]
    );
    setDialogOpen(false);
    toast.success(editTarget?.id ? 'Evento atualizado!' : 'Evento adicionado!');
  }

  function handleDelete(id: string) {
    persist(events.filter(e => e.id !== id));
    toast.success('Evento removido.');
  }

  const hours = Array.from({ length: GRID_HOURS + 1 }, (_, i) => GRID_START + i);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Agenda Semanal</h1>
        </div>
        <Button size="sm" onClick={() => openNew()}>
          <Plus className="h-4 w-4 mr-1" /> Novo evento
        </Button>
      </div>

      {/* Calendar */}
      <div className="flex flex-1 overflow-auto min-h-0">
        {/* Time axis */}
        <div className="flex-shrink-0 w-14 border-r border-border bg-card" style={{ paddingTop: 36 }}>
          {hours.map(h => (
            <div
              key={h}
              className="text-[10px] text-muted-foreground text-right pr-2 select-none"
              style={{ height: HOUR_HEIGHT, lineHeight: '1', marginTop: -8 }}
            >
              {h < 24 ? `${String(h).padStart(2, '0')}:00` : ''}
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex flex-1 min-w-0">
          {DAY_LABELS.map((label, day) => {
            const dayEvents = events.filter(e => e.dias.includes(day));
            return (
              <div key={day} className="flex-1 min-w-[80px] flex flex-col border-r border-border last:border-r-0">
                {/* Day header */}
                <div
                  className="h-9 flex items-center justify-center text-xs font-semibold text-muted-foreground border-b border-border flex-shrink-0 sticky top-0 bg-card z-10 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => openNew(day)}
                  title={`Adicionar evento em ${DAY_LABELS_FULL[day]}`}
                >
                  {label}
                </div>

                {/* Grid */}
                <div
                  className="relative flex-1"
                  style={{ height: GRID_HOURS * HOUR_HEIGHT }}
                  ref={day === 0 ? gridRef : undefined}
                >
                  {/* Hour lines */}
                  {Array.from({ length: GRID_HOURS }, (_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-border/40"
                      style={{ top: i * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Events */}
                  {dayEvents.map(ev => (
                    <EventBlock
                      key={ev.id}
                      event={ev}
                      day={day}
                      onClick={() => openEdit(ev)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit/Create dialog */}
      {dialogOpen && (
        <EditDialog
          event={editTarget}
          defaultDay={defaultDay}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
          onDelete={editTarget?.id ? handleDelete : undefined}
        />
      )}
    </div>
  );
};

export default Agenda;
