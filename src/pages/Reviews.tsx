import { useState, useMemo } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RotateCcw, Check, AlertCircle, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { ReviewCompletionDialog } from '@/components/ReviewCompletionDialog';
import type { EaseFactor } from '@/lib/spacedRepetition';
import type { Review } from '@/types/study';

const Reviews = () => {
  const { reviews, topics, subjects, markReviewDone } = useStudy();
  const today = new Date().toISOString().split('T')[0];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [filterSubjectId, setFilterSubjectId] = useState<string | null>(null);

  const todayReviews     = reviews.filter(r => !r.completed && r.scheduledDate === today);
  const overdueReviews   = reviews.filter(r => !r.completed && r.scheduledDate < today);
  const upcomingReviews  = reviews.filter(r => !r.completed && r.scheduledDate > today);
  const completedReviews = reviews.filter(r => r.completed)
    .sort((a, b) => (b.completedDate || '').localeCompare(a.completedDate || ''));

  // Disciplinas com revisões pendentes (hoje + atrasadas), ordenadas por maior backlog
  const pendingSubjects = useMemo(() => {
    const counts: Record<string, number> = {};
    [...todayReviews, ...overdueReviews].forEach(r => {
      counts[r.subjectId] = (counts[r.subjectId] || 0) + 1;
    });
    return subjects
      .filter(s => counts[s.id] > 0)
      .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
  }, [todayReviews, overdueReviews, subjects]);

  const pendingCount = useMemo(() => {
    const counts: Record<string, number> = {};
    [...todayReviews, ...overdueReviews].forEach(r => {
      counts[r.subjectId] = (counts[r.subjectId] || 0) + 1;
    });
    return counts;
  }, [todayReviews, overdueReviews]);

  function applyFilter<T extends { subjectId: string }>(list: T[]): T[] {
    if (!filterSubjectId) return list;
    return list.filter(r => r.subjectId === filterSubjectId);
  }

  const filteredToday     = applyFilter(todayReviews);
  const filteredOverdue   = applyFilter(overdueReviews);
  const filteredUpcoming  = applyFilter([...upcomingReviews].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)));
  const filteredCompleted = applyFilter(completedReviews);

  const handleDone = (review: Review) => {
    setSelectedReview(review);
    setDialogOpen(true);
  };

  const handleComplete = async (data: {
    easeFactor: EaseFactor;
    minutes?: number;
    questionsTotal?: number;
    questionsCorrect?: number;
  }) => {
    if (!selectedReview) return;
    await markReviewDone(selectedReview.id, data);
    toast.success('Revisão concluída!');
    setSelectedReview(null);
  };

  const ReviewCard = ({ review, showDate = false }: { review: Review; showDate?: boolean }) => {
    const topic   = topics.find(t => t.id === review.topicId);
    const subject = subjects.find(s => s.id === review.subjectId);
    const isOverdue = review.scheduledDate < today && !review.completed;

    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isOverdue
          ? 'bg-destructive/5 border-destructive/20'
          : review.completed
            ? 'bg-muted/30 border-border'
            : 'bg-card border-border hover:border-primary/30'
      }`}>
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subject?.color }} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${review.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {topic?.name || 'Assunto removido'}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{subject?.name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {review.type === 'adaptive' ? `SM-2 · ${review.nextInterval ?? '?'}d` : review.type}
            </Badge>
            {showDate && <span className="text-xs text-muted-foreground">{review.scheduledDate}</span>}
          </div>
        </div>
        {isOverdue && <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
        {!review.completed && (
          <Button size="sm" variant="outline" onClick={() => handleDone(review)} className="flex-shrink-0">
            <Check className="h-4 w-4" />
          </Button>
        )}
        {review.completed && <Check className="h-4 w-4 text-success flex-shrink-0" />}
      </div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12">
      <RotateCcw className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <RotateCcw className="h-7 w-7 text-accent" /> Revisões
        </h1>
        <p className="text-muted-foreground mt-1">Revisões espaçadas para máxima retenção</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Hoje</p>
          <p className="text-xl font-bold text-foreground">{todayReviews.length}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-destructive">Atrasadas</p>
          <p className="text-xl font-bold text-destructive">{overdueReviews.length}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Próximas</p>
          <p className="text-xl font-bold text-foreground">{upcomingReviews.length}</p>
        </Card>
      </div>

      {/* Filtro por disciplina — só aparece quando há mais de uma disciplina com pendências */}
      {pendingSubjects.length > 1 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Filtrar por disciplina
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Pill "Todas" */}
            <button
              onClick={() => setFilterSubjectId(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                !filterSubjectId
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
              }`}
            >
              Todas
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                !filterSubjectId ? 'bg-white/20' : 'bg-muted-foreground/20'
              }`}>
                {todayReviews.length + overdueReviews.length}
              </span>
            </button>

            {/* Pill por disciplina, ordenado por maior backlog */}
            {pendingSubjects.map(subject => {
              const isActive = filterSubjectId === subject.id;
              const count = pendingCount[subject.id] || 0;
              return (
                <button
                  key={subject.id}
                  onClick={() => setFilterSubjectId(isActive ? null : subject.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    isActive
                      ? 'text-white border-transparent'
                      : 'bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                  }`}
                  style={isActive ? { backgroundColor: subject.color, borderColor: subject.color } : {}}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.7)' : subject.color }}
                  />
                  {subject.name}
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{
                      backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : subject.color + '25',
                      color: isActive ? 'white' : subject.color,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Tabs defaultValue="today">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="today">Hoje ({filteredToday.length})</TabsTrigger>
          <TabsTrigger value="overdue" className="relative">
            Atrasadas
            {filteredOverdue.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 font-bold leading-none">
                {filteredOverdue.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">Próximas</TabsTrigger>
          <TabsTrigger value="done">Feitas</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-2 mt-4">
          {filteredToday.length === 0
            ? <EmptyState message={filterSubjectId ? 'Sem revisões para hoje nessa disciplina.' : 'Sem revisões para hoje! 🎉'} />
            : filteredToday.map(r => <ReviewCard key={r.id} review={r} />)}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-2 mt-4">
          {filteredOverdue.length === 0
            ? <EmptyState message={filterSubjectId ? 'Nenhuma revisão atrasada nessa disciplina.' : 'Nenhuma revisão atrasada. Ótimo!'} />
            : filteredOverdue.map(r => <ReviewCard key={r.id} review={r} showDate />)}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-2 mt-4">
          {filteredUpcoming.length === 0
            ? <EmptyState message="Nenhuma revisão futura agendada." />
            : filteredUpcoming.slice(0, 30).map(r => <ReviewCard key={r.id} review={r} showDate />)}
        </TabsContent>

        <TabsContent value="done" className="space-y-2 mt-4">
          {filteredCompleted.length === 0
            ? <EmptyState message="Nenhuma revisão concluída ainda." />
            : filteredCompleted.slice(0, 30).map(r => <ReviewCard key={r.id} review={r} showDate />)}
        </TabsContent>
      </Tabs>

      <ReviewCompletionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onComplete={handleComplete}
        topicName={selectedReview ? (topics.find(t => t.id === selectedReview.topicId)?.name || 'Assunto') : ''}
      />
    </div>
  );
};

export default Reviews;
