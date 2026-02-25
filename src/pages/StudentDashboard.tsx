import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEducational } from '@/contexts/EducationalContext';
import { useStudy } from '@/contexts/StudyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, Clock, BookOpen, Target, Calendar, RefreshCw, Download,
  GraduationCap, TrendingUp, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { generateSmartCycleV2, formatCycleForWeek } from '@/lib/cycleGeneratorV2';
import { DAY_LABELS, DAY_LABELS_SHORT } from '@/types/educational';
import { downloadReportPDF } from '@/lib/pdfGenerator';
import type { StudyCycleResult, CycleSlot } from '@/lib/cycleGeneratorV2';
import { fetchSyllabusWeekTopics, fetchDifficultyTopics } from '@/lib/cycleDataFetchers';

// --- Sub-components ---

interface StudentSelectorProps {
  students: { id: string; fullName: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const StudentSelector: React.FC<StudentSelectorProps> = ({ students, selectedId, onSelect }) => (
  <div className="mb-6">
    <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
      <Users className="h-4 w-4" /> Aluno
    </label>
    <Select value={selectedId} onValueChange={onSelect}>
      <SelectTrigger className="w-full max-w-sm">
        <SelectValue placeholder="Selecione um aluno..." />
      </SelectTrigger>
      <SelectContent>
        {students.map(s => (
          <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

// Summary cards
interface SummaryCardsProps {
  weeklyHours: number;
  totalSessions: number;
  subjectCount: number;
  classCount: number;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ weeklyHours, totalSessions, subjectCount, classCount }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground">Horas/Semana</span>
      </div>
      <p className="text-2xl font-bold">{weeklyHours.toFixed(1)}h</p>
    </Card>
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground">Sessões</span>
      </div>
      <p className="text-2xl font-bold">{totalSessions}</p>
    </Card>
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Target className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground">Disciplinas</span>
      </div>
      <p className="text-2xl font-bold">{subjectCount}</p>
    </Card>
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <GraduationCap className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground">Aulas Presenciais</span>
      </div>
      <p className="text-2xl font-bold">{classCount}</p>
    </Card>
  </div>
);

// Weekly calendar component
interface WeeklyCalendarProps {
  weeklySchedule: Record<number, CycleSlot[]>;
  classSchedule: StudyCycleResult['classSchedule'];
  subjects: { id: string; name: string; color: string }[];
}

const SLOT_TYPE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  immediate_review: { label: '📝 Revisão Imediata', variant: 'default' },
  deep_study: { label: '📚 Estudo', variant: 'secondary' },
  spaced_review: { label: '🔄 Revisão Espaçada', variant: 'outline' },
  practice: { label: '✏️ Prática', variant: 'outline' },
};

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ weeklySchedule, classSchedule, subjects }) => {
  const days = [1, 2, 3, 4, 5, 6, 0]; // Seg a Dom

  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" /> Calendário Semanal
      </h3>
      <div className="space-y-4">
        {days.map(day => {
          const dayClasses = classSchedule.filter(c => c.dayOfWeek === day);
          const studySlots = weeklySchedule[day] || [];
          const hasContent = dayClasses.length > 0 || studySlots.length > 0;

          if (!hasContent) return null;

          return (
            <div key={day}>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">
                {DAY_LABELS[day]}
              </h4>
              <div className="space-y-1.5">
                {/* Aulas presenciais */}
                {dayClasses.map((cls, idx) => {
                  const subject = subjects.find(s => s.id === cls.subjectId);
                  return (
                    <div
                      key={`class-${idx}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg border-l-4 bg-muted/40"
                      style={{ borderLeftColor: subject?.color || 'hsl(var(--primary))' }}
                    >
                      <GraduationCap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-mono text-muted-foreground min-w-[50px]">
                        {cls.startTime}
                      </span>
                      <span className="text-sm font-medium flex-1">{cls.subjectName}</span>
                      <Badge variant="outline" className="text-[10px]">Aula</Badge>
                    </div>
                  );
                })}
                {/* Sessões de estudo */}
                {studySlots.map((slot, idx) => {
                  const subject = subjects.find(s => s.id === slot.subjectId);
                  const typeInfo = SLOT_TYPE_LABELS[slot.type] || SLOT_TYPE_LABELS.deep_study;
                  return (
                    <div
                      key={`study-${idx}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-1.5 min-w-[100px]">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-mono">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: subject?.color }}
                          />
                          <span className="text-sm font-medium truncate">{slot.subjectName}</span>
                        </div>
                        {slot.topics.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {slot.topics.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={typeInfo.variant} className="text-[10px] hidden sm:inline-flex">
                          {typeInfo.label}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {slot.duration}min
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// Distribution chart
interface DistributionProps {
  cycle: StudyCycleResult;
  subjects: { id: string; name: string; color: string }[];
}

const SubjectDistribution: React.FC<DistributionProps> = ({ cycle, subjects }) => (
  <Card className="p-5">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <TrendingUp className="h-4 w-4 text-primary" /> Distribuição por Disciplina
    </h3>
    <div className="space-y-3">
      {subjects.map(subject => {
        const minutes = cycle.distribution[subject.id] || 0;
        const hours = (minutes / 60).toFixed(1);
        const pct = cycle.totalMinutes > 0
          ? Math.round((minutes / cycle.totalMinutes) * 100)
          : 0;

        return (
          <div key={subject.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                <span className="font-medium">{subject.name}</span>
              </div>
              <span className="text-muted-foreground">{hours}h ({pct}%)</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: subject.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  </Card>
);

// Recommendations
interface RecommendationsProps {
  recommendations: string[];
}

const Recommendations: React.FC<RecommendationsProps> = ({ recommendations }) => (
  <Card className="p-5">
    <h3 className="font-semibold mb-3 flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-primary" /> Recomendações
    </h3>
    <div className="space-y-2">
      {recommendations.map((rec, idx) => (
        <p key={idx} className="text-sm text-muted-foreground">{rec}</p>
      ))}
    </div>
  </Card>
);

// --- Main Page ---

const StudentDashboard = () => {
  const { students, selectedStudent, selectStudent, timeSlots, scheduleSubjects, saveCycle, loadActiveCycle } = useEducational();
  const { subjects, topics } = useStudy();
  const { user } = useAuth();
  const [cycle, setCycle] = useState<StudyCycleResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loadingCycle, setLoadingCycle] = useState(false);

  // Auto-select single student
  useEffect(() => {
    if (!selectedStudent && students.length === 1) {
      selectStudent(students[0]);
    }
  }, [students, selectedStudent, selectStudent]);

  // Carregar ciclo ativo do banco
  useEffect(() => {
    if (!selectedStudent) return;
    setLoadingCycle(true);
    loadActiveCycle(selectedStudent.id).then(saved => {
      if (saved?.cycleData) {
        setCycle(saved.cycleData as StudyCycleResult);
      }
      setLoadingCycle(false);
    });
  }, [selectedStudent, loadActiveCycle]);

  const handleGenerate = async () => {
    if (!selectedStudent) {
      toast.error('Selecione um aluno primeiro');
      return;
    }
    if (timeSlots.length === 0) {
      toast.error('Configure a grade horária do aluno primeiro');
      return;
    }
    if (subjects.length === 0) {
      toast.error('Adicione disciplinas ao plano de estudos primeiro');
      return;
    }

    setGenerating(true);
    try {
      const topicsBySubject: Record<string, string[]> = {};
      const subjectNameMap: Record<string, string> = {};
      subjects.forEach(sub => {
        topicsBySubject[sub.id] = topics.filter(t => t.subjectId === sub.id).map(t => t.name);
        subjectNameMap[sub.id] = sub.name;
      });

      const schedSubjectIds = scheduleSubjects.map(s => s.id);
      const [syllabusWeekTopics, difficultyTopics] = await Promise.all([
        fetchSyllabusWeekTopics(schedSubjectIds),
        user ? fetchDifficultyTopics(user.id, subjectNameMap) : Promise.resolve([]),
      ]);

      const result = generateSmartCycleV2(
        selectedStudent, timeSlots, subjects, topicsBySubject, scheduleSubjects,
        syllabusWeekTopics, difficultyTopics
      );
      setCycle(result);
      
      // Salvar no banco
      await saveCycle(
        selectedStudent.id,
        result,
        result.weeklyHours,
        result.slots.length
      );
      
      toast.success('Ciclo gerado e salvo!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar ciclo');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!cycle || !selectedStudent) return;
    try {
      await downloadReportPDF(selectedStudent, cycle, subjects);
      toast.success('PDF baixado!');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  };

  const weeklySchedule = cycle ? formatCycleForWeek(cycle) : {};

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-7 w-7" />
            Dashboard do Aluno
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão individual com calendário, progresso e recomendações
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={generating || !selectedStudent}>
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Gerando...' : 'Gerar Ciclo'}
          </Button>
          {cycle && (
            <Button onClick={handleDownloadPDF} variant="outline">
              <Download className="h-4 w-4 mr-2" /> PDF
            </Button>
          )}
        </div>
      </div>

      {/* Student Selector */}
      {students.length > 0 && (
        <StudentSelector
          students={students}
          selectedId={selectedStudent?.id || ''}
          onSelect={(id) => {
            const student = students.find(s => s.id === id);
            if (student) { selectStudent(student); setCycle(null); }
          }}
        />
      )}

      {/* Empty states */}
      {!selectedStudent ? (
        <Card className="p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {students.length === 0
              ? 'Cadastre alunos na página de Alunos primeiro'
              : 'Selecione um aluno acima para visualizar o dashboard'}
          </p>
        </Card>
      ) : loadingCycle ? (
        <Card className="p-12 text-center">
          <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Carregando ciclo salvo...</p>
        </Card>
      ) : !cycle ? (
        <Card className="p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">Nenhum ciclo gerado para este aluno</p>
          <p className="text-sm text-muted-foreground mb-4">
            Clique em "Gerar Ciclo" para criar o plano personalizado
          </p>
          <Button onClick={handleGenerate} disabled={generating}>
            <RefreshCw className="h-4 w-4 mr-2" /> Gerar Ciclo
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Student Info */}
          {selectedStudent && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {selectedStudent.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{selectedStudent.fullName}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedStudent.targetCareer && `🎯 ${selectedStudent.targetCareer}`}
                    {selectedStudent.targetUniversity && ` · 🏫 ${selectedStudent.targetUniversity}`}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Summary */}
          <SummaryCards
            weeklyHours={cycle.weeklyHours}
            totalSessions={cycle.slots.length}
            subjectCount={subjects.length}
            classCount={cycle.classSchedule.length}
          />

          {/* Calendar + Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <WeeklyCalendar
                weeklySchedule={weeklySchedule}
                classSchedule={cycle.classSchedule}
                subjects={subjects}
              />
            </div>
            <div className="space-y-6">
              <SubjectDistribution cycle={cycle} subjects={subjects} />
              <Recommendations recommendations={cycle.recommendations} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
