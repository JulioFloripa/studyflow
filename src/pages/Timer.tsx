import { useState, useEffect, useRef, useCallback } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Pause, Square, RotateCcw, Maximize2, Minimize2, Coffee, BookOpen, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { localDateStr } from '@/lib/dateUtils';

type TimerMode = 'free' | 'pomodoro';
type TimerState = 'idle' | 'running' | 'paused' | 'break';

const POMODORO_WORK = 25 * 60;   // 25 minutos
const POMODORO_BREAK = 5 * 60;   // 5 minutos

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const Timer = () => {
  const { subjects, topics, addStudySession } = useStudy();
  const [mode, setMode] = useState<TimerMode>('free');
  const [state, setState] = useState<TimerState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(POMODORO_WORK);
  const [isBreak, setIsBreak] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredTopics = topics.filter(t => t.subjectId === subjectId);
  const selectedSubject = subjects.find(s => s.id === subjectId);
  const selectedTopic = topics.find(t => t.id === topicId);

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {}
  }, []);

  const stopTimer = useCallback(async (save = true) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState('idle');
    const elapsed = mode === 'free' ? Math.floor(seconds / 60) : sessionMinutes;
    if (save && elapsed >= 1 && subjectId && topicId) {
      await addStudySession({
        subjectId,
        topicId,
        date: localDateStr(),
        minutesStudied: elapsed,
        questionsTotal: 0,
        questionsCorrect: 0,
        pagesRead: 0,
        videosWatched: 0,
        notes: '',
      });
      toast.success(`Sessão de ${elapsed} min registrada automaticamente!`);
    }
    setSeconds(0);
    setPomodoroSeconds(POMODORO_WORK);
    setIsBreak(false);
    setSessionMinutes(0);
    setFocusMode(false);
  }, [seconds, mode, sessionMinutes, subjectId, topicId, addStudySession]);

  useEffect(() => {
    if (state === 'running') {
      intervalRef.current = setInterval(() => {
        if (mode === 'free') {
          setSeconds(s => s + 1);
        } else {
          setPomodoroSeconds(s => {
            if (s <= 1) {
              playBeep();
              if (!isBreak) {
                setIsBreak(true);
                setPomodoroCount(c => c + 1);
                setSessionMinutes(m => m + 25);
                toast.success('Pomodoro concluído! Hora de descansar 5 minutos.');
                return POMODORO_BREAK;
              } else {
                setIsBreak(false);
                toast.info('Pausa encerrada! Vamos estudar!');
                return POMODORO_WORK;
              }
            }
            return s - 1;
          });
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state, mode, isBreak, playBeep]);

  const handleStart = () => {
    if (!subjectId || !topicId) {
      toast.error('Selecione a disciplina e o assunto antes de iniciar.');
      return;
    }
    setState('running');
    if (focusMode) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  const handlePause = () => setState(s => s === 'running' ? 'paused' : 'running');
  const handleStop = () => stopTimer(true);
  const handleReset = () => stopTimer(false);

  const progress = mode === 'pomodoro'
    ? ((isBreak ? POMODORO_BREAK : POMODORO_WORK) - pomodoroSeconds) / (isBreak ? POMODORO_BREAK : POMODORO_WORK) * 100
    : 0;

  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = mode === 'pomodoro' ? circumference - (progress / 100) * circumference : 0;

  if (focusMode && state === 'running') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-background">
        {/* Disciplina */}
        <div className="mb-8 text-center">
          <div className="flex items-center gap-2 justify-center mb-1">
            <div className="w-3 h-3 rounded-full" style={{ background: selectedSubject?.color || 'hsl(var(--primary))' }} />
            <span className="text-foreground font-semibold text-lg">{selectedSubject?.name}</span>
          </div>
          <p className="text-muted-foreground text-sm">{selectedTopic?.name}</p>
        </div>

        {/* Timer grande */}
        <div className="relative flex items-center justify-center mb-8">
          <svg width="220" height="220" className="-rotate-90">
            <circle cx="110" cy="110" r="90" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            {mode === 'pomodoro' && (
              <circle
                cx="110" cy="110" r="90"
                fill="none"
                stroke={isBreak ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            )}
          </svg>
          <div className="absolute text-center">
            <p className="text-6xl font-bold text-foreground font-mono tracking-tight">
              {mode === 'free' ? formatTime(seconds) : formatTime(pomodoroSeconds)}
            </p>
            {mode === 'pomodoro' && (
              <p className="text-sm mt-1" style={{ color: isBreak ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))' }}>
                {isBreak ? '☕ Pausa' : `🍅 Pomodoro #${pomodoroCount + 1}`}
              </p>
            )}
          </div>
        </div>

        {/* Controles */}
        <div className="flex gap-4">
          <Button
            size="lg"
            onClick={handlePause}
            className="h-14 px-8 rounded-2xl font-semibold bg-muted text-foreground border border-border"
          >
            {state === 'running' ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button
            size="lg"
            onClick={handleStop}
            className="h-14 px-8 rounded-2xl font-semibold text-white"
            style={{ background: 'var(--gradient-primary)', border: 'none', boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' }}
          >
            <Square className="h-5 w-5 mr-2" /> Finalizar
          </Button>
        </div>

        <button
          onClick={() => setFocusMode(false)}
          className="mt-8 flex items-center gap-1 text-sm text-muted-foreground"
        >
          <Minimize2 className="h-4 w-4" /> Sair do Modo Foco
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Cronômetro de Estudos</h1>
        <p className="text-muted-foreground mt-1 text-sm">Registre seu tempo de estudo automaticamente</p>
      </div>

      <Card className="p-6">
        {/* Seleção de disciplina e assunto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div>
            <Label className="text-xs mb-1.5 block text-muted-foreground">Disciplina</Label>
            <Select value={subjectId} onValueChange={v => { setSubjectId(v); setTopicId(''); }} disabled={state !== 'idle'}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block text-muted-foreground">Assunto</Label>
            <Select value={topicId} onValueChange={setTopicId} disabled={!subjectId || state !== 'idle'}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {filteredTopics.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Modo: Livre ou Pomodoro */}
        <div className="flex items-center gap-4 mb-6 p-3 rounded-xl bg-muted border border-border">
          <button
            onClick={() => { if (state === 'idle') { setMode('free'); setSeconds(0); } }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'free' ? 'text-white' : 'text-muted-foreground'}`}
            style={mode === 'free' ? { background: 'var(--gradient-primary)' } : {}}
          >
            <Zap className="h-4 w-4 inline mr-1" /> Livre
          </button>
          <button
            onClick={() => { if (state === 'idle') { setMode('pomodoro'); setPomodoroSeconds(POMODORO_WORK); } }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'pomodoro' ? 'text-white' : 'text-muted-foreground'}`}
            style={mode === 'pomodoro' ? { background: 'var(--gradient-primary)' } : {}}
          >
            <Coffee className="h-4 w-4 inline mr-1" /> Pomodoro
          </button>
        </div>

        {/* Timer Display */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative flex items-center justify-center mb-4">
            <svg width="180" height="180" className="-rotate-90">
              <circle cx="90" cy="90" r="75" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
              {mode === 'pomodoro' && (
                <circle
                  cx="90" cy="90" r="75"
                  fill="none"
                  stroke={isBreak ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference * 75 / 90}
                  strokeDashoffset={(circumference * 75 / 90) - (progress / 100) * (circumference * 75 / 90)}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              )}
            </svg>
            <div className="absolute text-center">
              <p className="text-5xl font-bold text-foreground font-mono tracking-tight">
                {mode === 'free' ? formatTime(seconds) : formatTime(pomodoroSeconds)}
              </p>
              {mode === 'pomodoro' && (
                <p className="text-xs mt-1" style={{ color: isBreak ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))' }}>
                  {isBreak ? '☕ Pausa' : `🍅 #${pomodoroCount + 1}`}
                </p>
              )}
            </div>
          </div>

          {mode === 'pomodoro' && pomodoroCount > 0 && (
            <div className="flex gap-1 mb-2">
              {Array.from({ length: pomodoroCount }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-primary" />
              ))}
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="flex gap-3 mb-4">
          {state === 'idle' ? (
            <Button
              className="flex-1 h-12 rounded-xl font-semibold text-white"
              style={{ background: 'var(--gradient-primary)', border: 'none', boxShadow: '0 0 16px hsl(var(--primary) / 0.25)' }}
              onClick={handleStart}
            >
              <Play className="h-5 w-5 mr-2" /> Iniciar
            </Button>
          ) : (
            <>
              <Button
                className="flex-1 h-12 rounded-xl font-semibold text-foreground bg-muted border border-border"
                onClick={handlePause}
              >
                {state === 'running' ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {state === 'running' ? 'Pausar' : 'Retomar'}
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl font-semibold text-white"
                style={{ background: 'var(--gradient-primary)', border: 'none' }}
                onClick={handleStop}
              >
                <Square className="h-4 w-4 mr-2" /> Finalizar
              </Button>
              <Button
                className="h-12 w-12 rounded-xl bg-muted border border-border text-muted-foreground"
                onClick={handleReset}
                title="Resetar sem salvar"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Modo Foco */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
          <div className="flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Modo Foco</p>
              <p className="text-xs text-muted-foreground">Tela minimalista sem distrações</p>
            </div>
          </div>
          <Switch
            checked={focusMode}
            onCheckedChange={setFocusMode}
            disabled={state === 'running'}
          />
        </div>

        {/* Dica */}
        {state === 'idle' && (
          <p className="text-xs text-center mt-4 text-muted-foreground">
            Ao finalizar, a sessão é registrada automaticamente no seu histórico.
          </p>
        )}
      </Card>

      {/* Estatísticas do dia */}
      {subjects.length > 0 && (
        <Card className="mt-4 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Como usar o cronômetro
          </h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>1. Selecione a disciplina e o assunto que vai estudar.</p>
            <p>2. Escolha o modo <strong className="text-foreground">Livre</strong> (tempo livre) ou <strong className="text-foreground">Pomodoro</strong> (25min estudo + 5min pausa).</p>
            <p>3. Ative o <strong className="text-foreground">Modo Foco</strong> para uma tela sem distrações.</p>
            <p>4. Ao clicar em <strong className="text-foreground">Finalizar</strong>, o tempo é salvo automaticamente no seu histórico.</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Timer;
