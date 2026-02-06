import { useStudy } from '@/contexts/StudyContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, BookOpen, Target, TrendingDown } from 'lucide-react';

const Difficulties = () => {
  const { subjects, topics, studySessions } = useStudy();

  const ranking = topics
    .map(topic => {
      const sessions = studySessions.filter(s => s.topicId === topic.id);
      if (sessions.length === 0) return null;
      const q = sessions.reduce((s, ss) => s + ss.questionsTotal, 0);
      const c = sessions.reduce((s, ss) => s + ss.questionsCorrect, 0);
      const accuracy = q > 0 ? Math.round((c / q) * 100) : 0;
      const subject = subjects.find(s => s.id === topic.subjectId);
      const totalMin = sessions.reduce((s, ss) => s + ss.minutesStudied, 0);
      return { topic, subject, accuracy, sessions: sessions.length, totalMin, questionsTotal: q };
    })
    .filter(Boolean)
    .sort((a, b) => a!.accuracy - b!.accuracy) as {
      topic: typeof topics[0]; subject: typeof subjects[0] | undefined;
      accuracy: number; sessions: number; totalMin: number; questionsTotal: number;
    }[];

  const getSuggestion = (accuracy: number) => {
    if (accuracy < 70) return { text: 'Revisar teoria + questões guiadas', level: 'destructive' as const };
    if (accuracy < 85) return { text: 'Manter prática + revisar pontualmente', level: 'secondary' as const };
    return { text: 'Consolidado — revisão espaçada', level: 'outline' as const };
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-7 w-7 text-warning" /> Dificuldades
        </h1>
        <p className="text-muted-foreground mt-1">Diagnóstico inteligente de desempenho por assunto</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4 text-center">
          <TrendingDown className="h-5 w-5 text-destructive mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{ranking.filter(r => r.accuracy < 70).length}</p>
          <p className="text-xs text-muted-foreground">Críticos (&lt;70%)</p>
        </Card>
        <Card className="p-4 text-center">
          <Target className="h-5 w-5 text-warning mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{ranking.filter(r => r.accuracy >= 70 && r.accuracy < 85).length}</p>
          <p className="text-xs text-muted-foreground">Atenção (70-85%)</p>
        </Card>
        <Card className="p-4 text-center">
          <BookOpen className="h-5 w-5 text-success mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{ranking.filter(r => r.accuracy >= 85).length}</p>
          <p className="text-xs text-muted-foreground">Consolidados (≥85%)</p>
        </Card>
      </div>

      {ranking.length === 0 ? (
        <Card className="p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Registre sessões de estudo com questões para ver o diagnóstico.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {ranking.map(({ topic, subject, accuracy, sessions, totalMin, questionsTotal }, idx) => {
            const suggestion = getSuggestion(accuracy);
            return (
              <Card key={topic.id} className={`p-4 ${accuracy < 70 ? 'border-destructive/20 bg-destructive/[0.02]' : ''}`}>
                <div className="flex items-start gap-3">
                  <span className="text-sm font-mono text-muted-foreground w-6 pt-0.5">{idx + 1}</span>
                  <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: subject?.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-foreground">{topic.name}</h3>
                      <span className="text-xs text-muted-foreground">({subject?.name})</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{sessions} sessões</span>
                      <span>{totalMin}min</span>
                      <span>{questionsTotal} questões</span>
                    </div>
                    <div className="mt-2">
                      <Badge variant={suggestion.level} className="text-xs">{suggestion.text}</Badge>
                    </div>
                  </div>
                  <div className={`text-lg font-bold flex-shrink-0 ${accuracy < 70 ? 'text-destructive' : accuracy < 85 ? 'text-warning' : 'text-success'}`}>
                    {accuracy}%
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Difficulties;
