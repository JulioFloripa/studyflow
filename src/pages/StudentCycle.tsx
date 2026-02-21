import React, { useState, useEffect } from 'react';
import { useEducational } from '@/contexts/EducationalContext';
import { useStudy } from '@/contexts/StudyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Download, RefreshCw, Clock, BookOpen, Target, Users, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { generateSmartCycleV2, formatCycleForWeek } from '@/lib/cycleGeneratorV2';
import { DAY_LABELS } from '@/types/educational';
import { downloadReportPDF } from '@/lib/pdfGenerator';
import type { StudyCycleResult } from '@/lib/cycleGeneratorV2';

const StudentCycle = () => {
  const { students, selectedStudent, selectStudent, timeSlots, scheduleSubjects } = useEducational();
  const { subjects, topics } = useStudy();
  const [cycle, setCycle] = useState<StudyCycleResult | null>(null);
  const [generating, setGenerating] = useState(false);

  // Auto-selecionar se há apenas um aluno
  useEffect(() => {
    if (!selectedStudent && students.length === 1) {
      selectStudent(students[0]);
    }
  }, [students, selectedStudent, selectStudent]);

  const handleGenerateCycle = async () => {
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
      // Organizar tópicos por disciplina
      const topicsBySubject: Record<string, string[]> = {};
      subjects.forEach(subject => {
        topicsBySubject[subject.id] = topics
          .filter(t => t.subjectId === subject.id)
          .map(t => t.name);
      });

      const generatedCycle = generateSmartCycleV2(
        selectedStudent,
        timeSlots,
        subjects,
        topicsBySubject,
        scheduleSubjects
      );

      setCycle(generatedCycle);
      toast.success('Ciclo de estudos gerado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar ciclo de estudos');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!cycle || !selectedStudent) return;
    
    try {
      await downloadReportPDF(selectedStudent, cycle, subjects);
      toast.success('Relatório baixado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar relatório');
    }
  };

  const weeklySchedule = cycle ? formatCycleForWeek(cycle) : {};

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-7 w-7" />
            Ciclo de Estudos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gere ciclos personalizados baseados na grade horária
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerateCycle} disabled={generating || !selectedStudent}>
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Gerando...' : 'Gerar Ciclo'}
          </Button>
          {cycle && (
            <Button onClick={handleDownloadPDF} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
          )}
        </div>
      </div>

      {/* Seletor de aluno */}
      {students.length > 0 && (
        <div className="mb-6">
          <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Aluno
          </label>
          <Select
            value={selectedStudent?.id || ''}
            onValueChange={(value) => {
              const student = students.find(s => s.id === value);
              if (student) {
                selectStudent(student);
                setCycle(null);
              }
            }}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Selecione um aluno..." />
            </SelectTrigger>
            <SelectContent>
              {students.map(student => (
                <SelectItem key={student.id} value={student.id}>
                  {student.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!selectedStudent ? (
        <Card className="p-12 text-center">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {students.length === 0 
              ? 'Cadastre alunos na página de Alunos primeiro'
              : 'Selecione um aluno acima para gerar o ciclo'}
          </p>
        </Card>
      ) : !cycle ? (
        <Card className="p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">Nenhum ciclo gerado ainda</p>
          <p className="text-sm text-muted-foreground mb-4">
            Clique em "Gerar Ciclo" para criar um cronograma personalizado
          </p>
          <Button onClick={handleGenerateCycle} disabled={generating}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Gerar Ciclo
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Horas Semanais</p>
                  <p className="text-2xl font-bold">{cycle.weeklyHours.toFixed(1)}h</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sessões</p>
                  <p className="text-2xl font-bold">{cycle.slots.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Disciplinas</p>
                  <p className="text-2xl font-bold">{subjects.length}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Distribuição por Disciplina */}
          <Card className="p-5">
            <h3 className="font-semibold mb-4">Distribuição por Disciplina</h3>
            <div className="space-y-3">
              {subjects.map(subject => {
                const minutes = cycle.distribution[subject.id] || 0;
                const hours = (minutes / 60).toFixed(1);
                const percentage = cycle.totalMinutes > 0
                  ? Math.round((minutes / cycle.totalMinutes) * 100)
                  : 0;

                return (
                  <div key={subject.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: subject.color }}
                        />
                        <span className="font-medium">{subject.name}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {hours}h ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: subject.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Cronograma Semanal */}
          <Card className="p-5">
            <h3 className="font-semibold mb-4">Cronograma Semanal</h3>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 0].map(day => {
                const daySlots = weeklySchedule[day] || [];
                if (daySlots.length === 0) return null;

                return (
                  <div key={day} className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {DAY_LABELS[day]}
                    </h4>
                    <div className="space-y-2">
                      {daySlots.map((slot, idx) => {
                        const subject = subjects.find(s => s.id === slot.subjectId);
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                          >
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-mono">
                                {slot.startTime} - {slot.endTime}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: subject?.color }}
                                />
                                <span className="font-medium text-sm">{slot.subjectName}</span>
                              </div>
                              {slot.topics.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {slot.topics.join(', ')}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {slot.duration}min
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Diagnóstico de Equilíbrio */}
          {cycle.diagnostic && (
            <Card className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Diagnóstico de Equilíbrio
                {cycle.diagnostic.isBalanced ? (
                  <Badge variant="default" className="ml-2 bg-green-600 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" /> Equilibrado
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="ml-2">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Desequilibrado
                  </Badge>
                )}
              </h3>

              {/* Métricas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Desvio Padrão</p>
                  <p className={`text-lg font-bold ${cycle.diagnostic.standardDeviation <= 1.5 ? 'text-green-600' : 'text-destructive'}`}>
                    {cycle.diagnostic.standardDeviation}h
                  </p>
                  <p className="text-xs text-muted-foreground">ideal ≤ 1.5h</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Amplitude</p>
                  <p className={`text-lg font-bold ${cycle.diagnostic.range <= 3 ? 'text-green-600' : 'text-destructive'}`}>
                    {cycle.diagnostic.range}h
                  </p>
                  <p className="text-xs text-muted-foreground">ideal ≤ 3h</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Máx/dia</p>
                  <p className={`text-lg font-bold ${cycle.diagnostic.maxDailyHours <= 10 ? 'text-green-600' : 'text-destructive'}`}>
                    {cycle.diagnostic.maxDailyHours}h
                  </p>
                  <p className="text-xs text-muted-foreground">limite: 10h</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Mín/dia</p>
                  <p className="text-lg font-bold text-foreground">
                    {cycle.diagnostic.minDailyHours}h
                  </p>
                </div>
              </div>

              {/* Horas por dia */}
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Distribuição Diária</p>
                <div className="grid grid-cols-7 gap-1">
                  {[1, 2, 3, 4, 5, 6, 0].map(day => {
                    const hours = cycle.diagnostic.dailyHours[day] || 0;
                    const maxH = cycle.diagnostic.maxDailyHours || 1;
                    const pct = maxH > 0 ? (hours / Math.max(maxH, 10)) * 100 : 0;
                    return (
                      <div key={day} className="text-center">
                        <p className="text-xs text-muted-foreground">{DAY_LABELS[day]?.slice(0, 3)}</p>
                        <div className="h-16 bg-muted/30 rounded relative mt-1">
                          <div
                            className={`absolute bottom-0 w-full rounded ${hours > 10 ? 'bg-destructive' : 'bg-primary'}`}
                            style={{ height: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs font-medium mt-1">{hours}h</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Alertas */}
              {cycle.diagnostic.alerts.length > 0 && (
                <div className="space-y-1 mb-3">
                  {cycle.diagnostic.alerts.map((alert, idx) => (
                    <p key={idx} className="text-sm text-destructive">{alert}</p>
                  ))}
                </div>
              )}

              {/* Sugestões */}
              {cycle.diagnostic.suggestions.length > 0 && (
                <div className="space-y-1">
                  {cycle.diagnostic.suggestions.map((sug, idx) => (
                    <p key={idx} className="text-sm text-muted-foreground">{sug}</p>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Recomendações */}
          <Card className="p-5">
            <h3 className="font-semibold mb-4">Recomendações Personalizadas</h3>
            <div className="space-y-2">
              {cycle.recommendations.map((rec, idx) => (
                <div key={idx} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground">{rec}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StudentCycle;
