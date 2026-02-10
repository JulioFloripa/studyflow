import { useStudy } from '@/contexts/StudyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, ArrowRight, Zap } from 'lucide-react';
import { toast } from 'sonner';

const Planning = () => {
  const { studyCycle, subjects, generateCycle, userProfile } = useStudy();

  const handleGenerate = async () => {
    await generateCycle();
    toast.success('Ciclo de estudos gerado!');
  };

  const totalMinutes = studyCycle.reduce((s, c) => s + c.minutesSuggested, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Planejamento</h1>
          <p className="text-muted-foreground mt-1">Seu ciclo de estudos otimizado</p>
        </div>
        <Button onClick={handleGenerate}>
          <RefreshCw className="h-4 w-4 mr-2" /> Gerar Automaticamente
        </Button>
      </div>

      {studyCycle.length === 0 ? (
        <Card className="p-12 text-center">
          <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum ciclo gerado ainda.</p>
          <p className="text-sm text-muted-foreground mt-1">Clique em "Gerar Automaticamente" para criar seu ciclo baseado nas disciplinas e disponibilidade.</p>
          <Button onClick={handleGenerate} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" /> Gerar Ciclo
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <Card className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Sessões no ciclo</p>
              <p className="text-2xl font-bold text-foreground">{studyCycle.length}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Tempo total</p>
              <p className="text-2xl font-bold text-foreground">{totalHours}h</p>
            </Card>
            <Card className="p-4 text-center col-span-2 sm:col-span-1">
              <p className="text-sm text-muted-foreground">Meta semanal</p>
              <p className="text-2xl font-bold text-foreground">{userProfile.weeklyGoalHours}h</p>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="font-semibold text-foreground mb-4">Sequência do Ciclo</h3>
            <div className="space-y-2">
              {studyCycle.sort((a, b) => a.order - b.order).map((item, idx) => {
                const subject = subjects.find(s => s.id === item.subjectId);
                if (!subject) return null;
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <span className="text-sm font-mono text-muted-foreground w-6">{idx + 1}</span>
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subject.color }} />
                    <span className="font-medium text-foreground flex-1">{subject.name}</span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-sm">{item.minutesSuggested}min</span>
                    </div>
                    {idx < studyCycle.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 mt-4">
            <h3 className="font-semibold text-foreground mb-3">Distribuição por Disciplina</h3>
            <div className="flex flex-wrap gap-2">
              {subjects.map(sub => {
                const mins = studyCycle.filter(c => c.subjectId === sub.id).reduce((s, c) => s + c.minutesSuggested, 0);
                const pct = totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0;
                return (
                  <Badge key={sub.id} variant="secondary" className="text-sm py-1 px-3">
                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: sub.color }} />
                    {sub.name}: {mins}min ({pct}%)
                  </Badge>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default Planning;
