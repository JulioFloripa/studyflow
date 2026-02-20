import React, { useState, useEffect } from 'react';
import { useEducational } from '@/contexts/EducationalContext';
import { useStudy } from '@/contexts/StudyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Download, RefreshCw, Clock, BookOpen, Target } from 'lucide-react';
import { toast } from 'sonner';
import { generateSmartCycle, formatCycleForWeek } from '@/lib/cycleGenerator';
import { DAY_LABELS } from '@/types/educational';
import { downloadReportPDF } from '@/lib/pdfGenerator';
import type { StudyCycleResult } from '@/lib/cycleGenerator';

const StudentCycle = () => {
  const { students, selectedStudent, timeSlots } = useEducational();
  const { subjects, topics } = useStudy();
  const [cycle, setCycle] = useState<StudyCycleResult | null>(null);
  const [generating, setGenerating] = useState(false);

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

      const generatedCycle = generateSmartCycle(
        selectedStudent,
        timeSlots,
        subjects,
        topicsBySubject
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

      {!selectedStudent ? (
        <Card className="p-12 text-center">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Selecione um aluno na página de Alunos</p>
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
