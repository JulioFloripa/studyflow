import { useState } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PenLine, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const RegisterStudy = () => {
  const { subjects, topics, addStudySession } = useStudy();
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
      subjectId,
      topicId,
      date: new Date().toISOString().split('T')[0],
      minutesStudied: parseInt(minutes) || 0,
      questionsTotal: parseInt(questionsTotal) || 0,
      questionsCorrect: parseInt(questionsCorrect) || 0,
      pagesRead: parseInt(pagesRead) || 0,
      videosWatched: parseInt(videosWatched) || 0,
      notes,
    });

    setSaved(true);
    toast.success('Estudo registrado! Revisões agendadas automaticamente.');

    setTimeout(() => {
      setSubjectId('');
      setTopicId('');
      setMinutes('');
      setQuestionsTotal('');
      setQuestionsCorrect('');
      setPagesRead('');
      setVideosWatched('');
      setNotes('');
      setSaved(false);
    }, 2000);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <PenLine className="h-7 w-7 text-primary" /> Registrar Estudo
        </h1>
        <p className="text-muted-foreground mt-1">Registre sua sessão de estudo do dia</p>
      </div>

      {saved ? (
        <Card className="p-12 text-center animate-fade-in">
          <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">Estudo Registrado!</h2>
          <p className="text-muted-foreground mt-2">Revisões automáticas foram agendadas.</p>
        </Card>
      ) : (
        <Card className="p-5 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Disciplina *</Label>
                <Select value={subjectId} onValueChange={v => { setSubjectId(v); setTopicId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assunto *</Label>
                <Select value={topicId} onValueChange={setTopicId} disabled={!subjectId}>
                  <SelectTrigger><SelectValue placeholder={subjectId ? 'Selecione' : 'Escolha a disciplina'} /></SelectTrigger>
                  <SelectContent>
                    {filteredTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tempo (minutos) *</Label>
                <Input type="number" min="1" placeholder="60" value={minutes} onChange={e => setMinutes(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Questões feitas</Label>
                <Input type="number" min="0" placeholder="0" value={questionsTotal} onChange={e => setQuestionsTotal(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Acertos</Label>
                <Input type="number" min="0" placeholder="0" value={questionsCorrect} onChange={e => setQuestionsCorrect(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Páginas lidas</Label>
                <Input type="number" min="0" placeholder="0" value={pagesRead} onChange={e => setPagesRead(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Videoaulas assistidas</Label>
                <Input type="number" min="0" placeholder="0" value={videosWatched} onChange={e => setVideosWatched(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea placeholder="Anotações sobre a sessão..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>

            <Button type="submit" className="w-full" size="lg">
              Registrar Estudo
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};

export default RegisterStudy;
