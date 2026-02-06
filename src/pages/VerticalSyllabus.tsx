import { useState } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListChecks, Search } from 'lucide-react';
import { TopicStatus } from '@/types/study';

const statusLabels: Record<TopicStatus, string> = { not_started: 'Não iniciado', in_progress: 'Em andamento', completed: 'Concluído' };
const statusColors: Record<TopicStatus, string> = { not_started: 'bg-muted text-muted-foreground', in_progress: 'bg-primary/10 text-primary', completed: 'bg-success/10 text-success' };

const VerticalSyllabus = () => {
  const { subjects, topics, studySessions, reviews } = useStudy();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const today = new Date().toISOString().split('T')[0];

  const totalTopics = topics.length;
  const completedTopics = topics.filter(t => t.status === 'completed').length;
  const overallProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const filteredSubjects = subjects.map(subject => {
    let subTopics = topics.filter(t => t.subjectId === subject.id);

    if (search) {
      subTopics = subTopics.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    }

    if (filter === 'pending') subTopics = subTopics.filter(t => t.status !== 'completed');
    else if (filter === 'completed') subTopics = subTopics.filter(t => t.status === 'completed');
    else if (filter === 'overdue_review') {
      const overdueTopicIds = new Set(reviews.filter(r => !r.completed && r.scheduledDate < today).map(r => r.topicId));
      subTopics = subTopics.filter(t => overdueTopicIds.has(t.id));
    } else if (filter === 'low_perf') {
      subTopics = subTopics.filter(t => {
        const sessions = studySessions.filter(s => s.topicId === t.id);
        const q = sessions.reduce((s, ss) => s + ss.questionsTotal, 0);
        const c = sessions.reduce((s, ss) => s + ss.questionsCorrect, 0);
        return q > 0 && (c / q) < 0.7;
      });
    }

    return { subject, topics: subTopics };
  }).filter(s => s.topics.length > 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <ListChecks className="h-7 w-7 text-primary" /> Edital Verticalizado
        </h1>
        <p className="text-muted-foreground mt-1">Progresso detalhado por disciplina e assunto</p>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-medium text-foreground">Progresso Geral</span>
          <span className="text-sm text-muted-foreground ml-auto">{completedTopics}/{totalTopics} assuntos ({overallProgress}%)</span>
        </div>
        <Progress value={overallProgress} className="h-3" />
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar assunto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="completed">Concluídos</SelectItem>
            <SelectItem value="overdue_review">Revisão atrasada</SelectItem>
            <SelectItem value="low_perf">Baixa performance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredSubjects.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Nenhum assunto encontrado com os filtros aplicados.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSubjects.map(({ subject, topics: subTopics }) => {
            const allTopicsForSubject = topics.filter(t => t.subjectId === subject.id);
            const completed = allTopicsForSubject.filter(t => t.status === 'completed').length;
            const progress = allTopicsForSubject.length > 0 ? Math.round((completed / allTopicsForSubject.length) * 100) : 0;

            return (
              <Card key={subject.id} className="overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                    <h3 className="font-semibold text-foreground flex-1">{subject.name}</h3>
                    <span className="text-xs text-muted-foreground">{completed}/{allTopicsForSubject.length}</span>
                  </div>
                  <Progress value={progress} className="h-1.5 mt-2" />
                </div>
                <div className="divide-y divide-border">
                  {subTopics.map(topic => {
                    const sessions = studySessions.filter(s => s.topicId === topic.id);
                    const totalMin = sessions.reduce((s, ss) => s + ss.minutesStudied, 0);
                    const q = sessions.reduce((s, ss) => s + ss.questionsTotal, 0);
                    const c = sessions.reduce((s, ss) => s + ss.questionsCorrect, 0);
                    const acc = q > 0 ? Math.round((c / q) * 100) : -1;

                    return (
                      <div key={topic.id} className="flex items-center gap-3 px-4 py-3">
                        <Badge className={`text-[10px] ${statusColors[topic.status]}`}>{statusLabels[topic.status]}</Badge>
                        <span className="text-sm text-foreground flex-1 min-w-0 truncate">{topic.name}</span>
                        {sessions.length > 0 && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                            <span>{totalMin}min</span>
                            {acc >= 0 && (
                              <span className={acc < 70 ? 'text-destructive font-medium' : acc >= 85 ? 'text-success font-medium' : ''}>
                                {acc}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VerticalSyllabus;
