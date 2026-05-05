import { useState, useMemo } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw, Clock, AlertTriangle, BookOpen, CalendarDays, Zap, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { generateSmartCycleV2, formatCycleForWeek, StudyCycleResult } from '@/lib/cycleGeneratorV2';
import { buildStudentTimeSlots, buildDifficultyTopics, profileToStudent } from '@/lib/studentCycleAdapter';
import { DAY_LABELS } from '@/types/educational';

const AGENDA_STORAGE_KEY = 'studyflow_agenda_v1';

const SLOT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  immediate_review: { label: 'Revisão imediata', color: 'bg-amber-500' },
  difficulty_review: { label: 'Revisão atrasada', color: 'bg-red-500' },
  syllabus_week:    { label: 'Conteúdo da semana', color: 'bg-blue-500' },
  deep_study:       { label: 'Estudo profundo', color: 'bg-primary' },
  spaced_review:    { label: 'Revisão espaçada', color: 'bg-purple-500' },
  practice:         { label: 'Prática', color: 'bg-green-500' },
};

const Planning = () => {
  const { subjects, topics, reviews, studySessions, userProfile } = useStudy();
  const [cycle, setCycle] = useState<StudyCycleResult | null>(null);
  const [generating, setGenerating] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const overdueReviews = useMemo(
    () => reviews.filter(r => !r.completed && r.scheduledDate < today),
    [reviews, today]
  );

  const agendaItems = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(AGENDA_STORAGE_KEY) || '[]'); }
    catch { return []; }
  }, []);

  const handleGenerate = () => {
    if (subjects.length === 0) {
      toast.error('Adicione disciplinas ao Plano de Estudos primeiro.');
      return;
    }

    setGenerating(true);
    try {
      const timeSlots = buildStudentTimeSlots(userProfile, agendaItems);
      const difficultyTopics = buildDifficultyTopics(studySessions, subjects, reviews, today);
      const student = profileToStudent(userProfile);

      const topicsBySubject: Record<string, string[]> = {};
      subjects.forEach(sub => {
        topicsBySubject[sub.id] = topics
          .filter(t => t.subjectId === sub.id && t.status !== 'completed')
          .map(t => t.name);
      });

      const result = generateSmartCycleV2(
        student, timeSlots, subjects, topicsBySubject,
        [], {}, difficultyTopics
      );
      setCycle(result);
      toast.success('Planejamento gerado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar planejamento.');
    } finally {
      setGenerating(false);
    }
  };

  const weeklySchedule = cycle ? formatCycleForWeek(cycle) : {};
  const activeDays = Object.keys(weeklySchedule).map(Number).sort((a, b) => {
    // Mon-Sat-Sun order: 1,2,3,4,5,6,0
    const order = [1,2,3,4,5,6,0];
    return order.indexOf(a) - order.indexOf(b);
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Planejamento</h1>
          <p className="text-muted-foreground mt-1">
            Ciclo semanal gerado a partir da sua disponibilidade real
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} className="self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Gerando...' : 'Gerar Planejamento'}
        </Button>
      </div>

      {/* Overdue reviews warning */}
      {overdueReviews.length > 0 && (
        <Card className="p-4 mb-4 border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive text-sm">
                {overdueReviews.length} revisão{overdueReviews.length > 1 ? 'ões' : ''} atrasada{overdueReviews.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                O planejamento irá priorizar essas revisões antes de novo conteúdo.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* No subjects empty state */}
      {subjects.length === 0 && (
        <Card className="p-12 text-center mb-4">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Nenhuma disciplina cadastrada.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione disciplinas no Plano de Estudos para gerar o planejamento.
          </p>
        </Card>
      )}

      {/* Pre-generate hint */}
      {!cycle && subjects.length > 0 && (
        <Card className="p-12 text-center">
          <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Nenhum planejamento gerado ainda.</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Clique em "Gerar Planejamento" para criar sua semana de estudos com base na agenda e disponibilidade.
          </p>
          <Button onClick={handleGenerate} disabled={generating}>
            <RefreshCw className="h-4 w-4 mr-2" /> Gerar Planejamento
          </Button>
        </Card>
      )}

      {/* Results */}
      {cycle && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Horas planejadas</p>
              <p className="text-2xl font-bold">{cycle.weeklyHours.toFixed(1)}h</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Sessões</p>
              <p className="text-2xl font-bold">{cycle.slots.length}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Disciplinas</p>
              <p className="text-2xl font-bold">{subjects.length}</p>
            </Card>
            <Card className={`p-4 text-center ${overdueReviews.length > 0 ? 'border-destructive/40' : ''}`}>
              <p className={`text-xs ${overdueReviews.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                Revisões atrasadas
              </p>
              <p className={`text-2xl font-bold ${overdueReviews.length > 0 ? 'text-destructive' : ''}`}>
                {overdueReviews.length}
              </p>
            </Card>
          </div>

          {/* Balance alert */}
          {!cycle.diagnostic.isBalanced && (
            <Card className="p-4 border-amber-500/40 bg-amber-500/5">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
                Distribuição desequilibrada
              </p>
              {cycle.diagnostic.alerts.map((a, i) => (
                <p key={i} className="text-xs text-muted-foreground">{a}</p>
              ))}
            </Card>
          )}

          {/* Weekly calendar */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Semana de Estudos</h2>
            {activeDays.map(day => {
              const daySlots = (weeklySchedule[day] || []).sort((a, b) =>
                a.startTime.localeCompare(b.startTime)
              );
              return (
                <Card key={day} className="overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-foreground">{DAY_LABELS[day]}</h3>
                    <span className="text-xs text-muted-foreground">
                      {(daySlots.reduce((s, sl) => s + sl.duration, 0) / 60).toFixed(1)}h
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {daySlots.map((slot, idx) => {
                      const subject = subjects.find(s => s.id === slot.subjectId);
                      const cfg = SLOT_TYPE_CONFIG[slot.type] || SLOT_TYPE_CONFIG.deep_study;
                      return (
                        <div key={idx} className="flex items-center gap-3 px-4 py-3">
                          <div
                            className="w-1 h-10 rounded-full flex-shrink-0"
                            style={{ backgroundColor: subject?.color || '#888' }}
                          />
                          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground min-w-[90px] flex-shrink-0">
                            <Clock className="h-3 w-3" />
                            {slot.startTime} – {slot.endTime}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {slot.subjectName}
                            </p>
                            {slot.topics.length > 0 && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {slot.topics.join(' · ')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`inline-block w-2 h-2 rounded-full ${cfg.color}`} />
                            <span className="text-[10px] text-muted-foreground hidden sm:inline">
                              {cfg.label}
                            </span>
                            <Badge variant="secondary" className="text-[10px]">
                              {slot.duration}min
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Subject distribution */}
          <Card className="p-5">
            <h2 className="text-base font-semibold text-foreground mb-4">
              Distribuição por Disciplina
            </h2>
            <div className="space-y-3">
              {subjects.map(sub => {
                const mins = cycle.distribution[sub.id] || 0;
                const pct = cycle.totalMinutes > 0
                  ? Math.round((mins / cycle.totalMinutes) * 100) : 0;
                return (
                  <div key={sub.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sub.color }} />
                        <span className="font-medium">{sub.name}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {(mins / 60).toFixed(1)}h ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" style={{ '--progress-color': sub.color } as any} />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recommendations */}
          {cycle.recommendations.length > 0 && (
            <Card className="p-5">
              <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Recomendações
              </h2>
              <div className="space-y-2">
                {cycle.recommendations.map((rec, i) => (
                  <p key={i} className="text-sm text-muted-foreground">{rec}</p>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Planning;
