import { useState } from 'react';
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

const cardBg = 'hsl(222 47% 9%)';
const border = 'hsl(222 47% 16%)';
const muted = 'hsl(215 20% 50%)';
const primaryBlue = 'hsl(217 91% 60%)';
const primaryGradient = 'linear-gradient(135deg, hsl(217 91% 60%), hsl(240 80% 65%))';

const RegisterStudy = () => {
  const { subjects, topics, addStudySession } = useStudy();
  const [sessionType, setSessionType] = useState<SessionType>('study');
  const [classMode, setClassMode] = useState<ClassMode>('presencial');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
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
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
          <PenLine className="h-7 w-7" style={{ color: primaryBlue }} /> Registrar Sessão
        </h1>
        <p className="mt-1 text-sm" style={{ color: muted }}>
          Registre um estudo autônomo ou uma aula — ambos geram revisões automáticas
        </p>
      </div>

      {saved ? (
        <Card className="p-12 text-center" style={{ background: cardBg, border: `1px solid ${border}` }}>
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: 'hsl(142 71% 45%)' }} />
          <h2 className="text-xl font-bold text-white">{sessionType === 'class' ? 'Aula Registrada!' : 'Estudo Registrado!'}</h2>
          <p className="mt-2 text-sm" style={{ color: muted }}>Revisoes automaticas foram agendadas.</p>
        </Card>
      ) : (
        <Card className="p-5 md:p-6" style={{ background: cardBg, border: `1px solid ${border}` }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>Tipo de Sessão</Label>
              <div className="grid grid-cols-2 gap-3">
                {sessionTypes.map(({ value, label, Icon, desc }) => {
                  const active = sessionType === value;
                  return (
                    <button key={value} type="button" onClick={() => setSessionType(value)}
                      className="flex flex-col items-start p-3.5 rounded-xl transition-all text-left"
                      style={{ background: active ? 'hsl(217 91% 60% / 0.12)' : 'hsl(222 47% 12%)', border: `2px solid ${active ? primaryBlue : border}` }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-4 w-4" style={{ color: active ? primaryBlue : muted }} />
                        <span className="font-semibold text-sm" style={{ color: active ? 'white' : muted }}>{label}</span>
                      </div>
                      <p className="text-[11px] leading-snug" style={{ color: muted }}>{desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {sessionType === 'class' && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>Modalidade da Aula</Label>
                <div className="flex gap-2 flex-wrap">
                  {classModes.map(({ value, label, Icon }) => {
                    const active = classMode === value;
                    return (
                      <button key={value} type="button" onClick={() => setClassMode(value)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{ background: active ? primaryGradient : 'hsl(222 47% 14%)', border: `1px solid ${active ? 'transparent' : border}`, color: active ? 'white' : muted }}>
                        <Icon className="h-3.5 w-3.5" />{label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>Disciplina *</Label>
              <Select value={subjectId} onValueChange={v => { setSubjectId(v); setTopicId(''); }}>
                <SelectTrigger style={{ background: 'hsl(222 47% 12%)', border: `1px solid ${border}`, color: 'white' }}>
                  <SelectValue placeholder="Selecione a disciplina..." />
                </SelectTrigger>
                <SelectContent style={{ background: 'hsl(222 47% 12%)', border: `1px solid ${border}` }}>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id} style={{ color: 'white' }}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>Assunto / Topico *</Label>
              <Select value={topicId} onValueChange={setTopicId} disabled={!subjectId}>
                <SelectTrigger style={{ background: 'hsl(222 47% 12%)', border: `1px solid ${border}`, color: 'white' }}>
                  <SelectValue placeholder={subjectId ? 'Selecione o topico...' : 'Selecione a disciplina primeiro'} />
                </SelectTrigger>
                <SelectContent style={{ background: 'hsl(222 47% 12%)', border: `1px solid ${border}` }}>
                  {filteredTopics.map(t => <SelectItem key={t.id} value={t.id} style={{ color: 'white' }}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>Duracao (minutos) *</Label>
              <Input type="number" min="1" max="600"
                value={minutes} onChange={e => setMinutes(e.target.value)}
                placeholder={sessionType === 'class' ? 'Ex: 50 (duracao da aula)' : 'Ex: 90'}
                className="text-white"
                style={{ background: 'hsl(222 47% 12%)', border: `1px solid ${border}` }} />
            </div>

            {sessionType === 'study' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>Questoes Feitas</Label>
                  <Input type="number" min="0" value={questionsTotal} onChange={e => setQuestionsTotal(e.target.value)} placeholder="0"
                    className="text-white" style={{ background: 'hsl(222 47% 12%)', border: `1px solid ${border}` }} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>Questoes Corretas</Label>
                  <Input type="number" min="0" value={questionsCorrect} onChange={e => setQuestionsCorrect(e.target.value)} placeholder="0"
                    className="text-white" style={{ background: 'hsl(222 47% 12%)', border: `1px solid ${border}` }} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>Paginas Lidas</Label>
                  <Input type="number" min="0" value={pagesRead} onChange={e => setPagesRead(e.target.value)} placeholder="0"
                    className="text-white" style={{ background: 'hsl(222 47% 12%)', border: `1px solid ${border}` }} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>Videos Assistidos</Label>
                  <Input type="number" min="0" value={videosWatched} onChange={e => setVideosWatched(e.target.value)} placeholder="0"
                    className="text-white" style={{ background: 'hsl(222 47% 12%)', border: `1px solid ${border}` }} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>
                Anotacoes {sessionType === 'class' ? '(duvidas, pontos importantes)' : '(opcional)'}
              </Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder={sessionType === 'class' ? 'Ex: Professor explicou o metodo de integracao por partes...' : 'Ex: Revisar o conceito de...'}
                className="text-white resize-none"
                style={{ background: 'hsl(222 47% 12%)', border: `1px solid ${border}` }} />
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{ background: 'hsl(217 91% 60% / 0.08)', border: '1px solid hsl(217 91% 60% / 0.2)' }}>
              <span className="text-base">📅</span>
              <p style={{ color: 'hsl(217 91% 75%)' }}>
                {sessionType === 'class'
                  ? 'Ao registrar esta aula, revisões serão agendadas automaticamente em 1, 7 e 30 dias.'
                  : 'Ao registrar este estudo, revisões serão agendadas automaticamente em 1, 7 e 30 dias.'}
              </p>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold"
              style={{ background: primaryGradient, color: 'white', border: 'none' }}>
              {sessionType === 'class' ? 'Registrar Aula' : 'Registrar Estudo'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};

export default RegisterStudy;
