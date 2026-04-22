import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStudy } from '@/contexts/StudyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PenLine, CheckCircle2, BookOpen, GraduationCap, Monitor, Users, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { SessionType, ClassMode } from '@/types/study';
import { localDateStr } from '@/lib/dateUtils';

const RegisterStudy = () => {
  const { subjects, topics, addStudySession } = useStudy();
  const location = useLocation();
  const [sessionType, setSessionType] = useState<SessionType>('study');
  const [classMode, setClassMode] = useState<ClassMode>('presencial');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');

  const prefillApplied = React.useRef(false);
  useEffect(() => {
    if (prefillApplied.current) return;
    const state = location.state as { suggestedTopicId?: string } | null;
    if (state?.suggestedTopicId && topics.length > 0) {
      const topic = topics.find(t => t.id === state.suggestedTopicId);
      if (topic) {
        setSubjectId(topic.subjectId);
        setTimeout(() => {
          setTopicId(topic.id);
          prefillApplied.current = true;
        }, 50);
      }
    }
  }, [location.state, topics]);
  const [minutes, setMinutes] = useState('');
  const [questionsTotal, setQuestionsTotal] = useState('');
  const [questionsCorrect, setQuestionsCorrect] = useState('');
  const [pagesRead, setPagesRead] = useState('');
  const [videosWatched, setVideosWatched] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  const filteredTopics = topics.filter(t => t.subjectId === subjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !topicId || !minutes) {
      toast.error('Preencha disciplina, assunto e tempo.');
      return;
    }
    await addStudySession({
      subjectId, topicId,
      date: localDateStr(),
      minutesStudied: parseInt(minutes) || 0,
      questionsTotal: parseInt(questionsTotal) || 0,
      questionsCorrect: parseInt(questionsCorrect) || 0,
      pagesRead: parseInt(pagesRead) || 0,
      videosWatched: parseInt(videosWatched) || 0,
      notes, sessionType,
      classMode: sessionType === 'class' ? classMode : undefined,
    });
    setSaved(true);
    toast.success(sessionType === 'class' ? 'Aula registrada! Revisoes agendadas.' : 'Estudo registrado! Revisoes agendadas.');
    setTimeout(() => {
      setSubjectId(''); setTopicId(''); setMinutes('');
      setQuestionsTotal(''); setQuestionsCorrect('');
      setPagesRead(''); setVideosWatched(''); setNotes('');
      setSaved(false);
    }, 2000);
  };

  const sessionTypes = [
    { value: 'study' as SessionType, label: 'Estudo', Icon: BookOpen, desc: 'Estudo autônomo, leitura, exercícios' },
    { value: 'class' as SessionType, label: 'Aula', Icon: GraduationCap, desc: 'Aula assistida — gera revisões automáticas' },
  ];
  const classModes = [
    { value: 'presencial' as ClassMode, label: 'Presencial', Icon: Users },
    { value: 'online' as ClassMode, label: 'Online (ao vivo)', Icon: Monitor },
    { value: 'gravada' as ClassMode, label: 'Gravada', Icon: PlayCircle },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <PenLine className="h-7 w-7 text-primary" /> Registrar Sessão
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre um estudo autônomo ou uma aula — ambos geram revisões automáticas
        </p>
      </div>

      {/* Banner quando vem pré-preenchido do Dashboard */}
      {(location.state as any)?.suggestedTopicId && !saved && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'hsl(var(--primary) / 0.1)', border: '1px solid hsl(var(--primary) / 0.3)' }}>
          <span className="text-base">⚡</span>
          <p className="text-primary">
            Formulário pré-preenchido com a sugestão do Dashboard. Ajuste se necessário.
          </p>
        </div>
      )}

      {saved ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-success" />
          <h2 className="text-xl font-bold text-foreground">{sessionType === 'class' ? 'Aula Registrada!' : 'Estudo Registrado!'}</h2>
          <p className="mt-2 text-sm text-muted-foreground">Revisoes automaticas foram agendadas.</p>
        </Card>
      ) : (
        <Card className="p-5 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de Sessão</Label>
              <div className="grid grid-cols-2 gap-3">
                {sessionTypes.map(({ value, label, Icon, desc }) => {
                  const active = sessionType === value;
                  return (
                    <button key={value} type="button" onClick={() => setSessionType(value)}
                      className="flex flex-col items-start p-3.5 rounded-xl transition-all text-left border-2"
                      style={{
                        background: active ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--muted))',
                        borderColor: active ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                      }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-4 w-4" style={{ color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
                        <span className="font-semibold text-sm" style={{ color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>{label}</span>
                      </div>
                      <p className="text-[11px] leading-snug text-muted-foreground">{desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {sessionType === 'class' && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modalidade da Aula</Label>
                <div className="flex gap-2 flex-wrap">
                  {classModes.map(({ value, label, Icon }) => {
                    const active = classMode === value;
                    return (
                      <button key={value} type="button" onClick={() => setClassMode(value)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border"
                        style={{
                          background: active ? 'var(--gradient-primary)' : 'hsl(var(--muted))',
                          borderColor: active ? 'transparent' : 'hsl(var(--border))',
                          color: active ? 'white' : 'hsl(var(--muted-foreground))',
                        }}>
                        <Icon className="h-3.5 w-3.5" />{label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Disciplina *</Label>
              <Select value={subjectId} onValueChange={v => { setSubjectId(v); setTopicId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a disciplina..." />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assunto / Topico *</Label>
              <Select value={topicId} onValueChange={setTopicId} disabled={!subjectId}>
                <SelectTrigger>
                  <SelectValue placeholder={subjectId ? 'Selecione o topico...' : 'Selecione a disciplina primeiro'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duracao (minutos) *</Label>
              <Input type="number" min="1" max="600"
                value={minutes} onChange={e => setMinutes(e.target.value)}
                placeholder={sessionType === 'class' ? 'Ex: 50 (duracao da aula)' : 'Ex: 90'} />
            </div>

            {sessionType === 'study' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Questoes Feitas</Label>
                  <Input type="number" min="0" value={questionsTotal} onChange={e => setQuestionsTotal(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Questoes Corretas</Label>
                  <Input type="number" min="0" value={questionsCorrect} onChange={e => setQuestionsCorrect(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paginas Lidas</Label>
                  <Input type="number" min="0" value={pagesRead} onChange={e => setPagesRead(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Videos Assistidos</Label>
                  <Input type="number" min="0" value={videosWatched} onChange={e => setVideosWatched(e.target.value)} placeholder="0" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Anotacoes {sessionType === 'class' ? '(duvidas, pontos importantes)' : '(opcional)'}
              </Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder={sessionType === 'class' ? 'Ex: Professor explicou o metodo de integracao por partes...' : 'Ex: Revisar o conceito de...'}
                className="resize-none" />
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{ background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.2)' }}>
              <span className="text-base">📅</span>
              <p className="text-primary">
                {sessionType === 'class'
                  ? 'Ao registrar esta aula, revisões serão agendadas automaticamente em 1, 7 e 30 dias.'
                  : 'Ao registrar este estudo, revisões serão agendadas automaticamente em 1, 7 e 30 dias.'}
              </p>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold text-white"
              style={{ background: 'var(--gradient-primary)', border: 'none' }}>
              {sessionType === 'class' ? 'Registrar Aula' : 'Registrar Estudo'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};

export default RegisterStudy;
