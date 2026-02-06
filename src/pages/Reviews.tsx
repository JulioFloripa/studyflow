import { useState } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RotateCcw, Check, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const Reviews = () => {
  const { reviews, topics, subjects, markReviewDone } = useStudy();
  const today = new Date().toISOString().split('T')[0];

  const todayReviews = reviews.filter(r => !r.completed && r.scheduledDate === today);
  const overdueReviews = reviews.filter(r => !r.completed && r.scheduledDate < today);
  const upcomingReviews = reviews.filter(r => !r.completed && r.scheduledDate > today);
  const completedReviews = reviews.filter(r => r.completed).sort((a, b) => (b.completedDate || '').localeCompare(a.completedDate || ''));

  const handleDone = (id: string) => {
    markReviewDone(id);
    toast.success('Revisão concluída!');
  };

  const ReviewCard = ({ review, showDate = false }: { review: typeof reviews[0]; showDate?: boolean }) => {
    const topic = topics.find(t => t.id === review.topicId);
    const subject = subjects.find(s => s.id === review.subjectId);
    const isOverdue = review.scheduledDate < today && !review.completed;

    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isOverdue ? 'bg-destructive/5 border-destructive/20' : review.completed ? 'bg-muted/30 border-border' : 'bg-card border-border hover:border-primary/30'}`}>
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subject?.color }} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${review.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{topic?.name || 'Assunto removido'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{subject?.name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{review.type}</Badge>
            {showDate && <span className="text-xs text-muted-foreground">{review.scheduledDate}</span>}
          </div>
        </div>
        {isOverdue && <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
        {!review.completed && (
          <Button size="sm" variant="outline" onClick={() => handleDone(review.id)} className="flex-shrink-0">
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

      <Tabs defaultValue="today">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="today">Hoje ({todayReviews.length})</TabsTrigger>
          <TabsTrigger value="overdue">Atrasadas ({overdueReviews.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Próximas</TabsTrigger>
          <TabsTrigger value="done">Feitas</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-2 mt-4">
          {todayReviews.length === 0 ? <EmptyState message="Sem revisões para hoje! 🎉" /> : todayReviews.map(r => <ReviewCard key={r.id} review={r} />)}
        </TabsContent>
        <TabsContent value="overdue" className="space-y-2 mt-4">
          {overdueReviews.length === 0 ? <EmptyState message="Nenhuma revisão atrasada. Ótimo!" /> : overdueReviews.map(r => <ReviewCard key={r.id} review={r} showDate />)}
        </TabsContent>
        <TabsContent value="upcoming" className="space-y-2 mt-4">
          {upcomingReviews.length === 0 ? <EmptyState message="Nenhuma revisão futura agendada." /> : upcomingReviews.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)).slice(0, 20).map(r => <ReviewCard key={r.id} review={r} showDate />)}
        </TabsContent>
        <TabsContent value="done" className="space-y-2 mt-4">
          {completedReviews.length === 0 ? <EmptyState message="Nenhuma revisão concluída ainda." /> : completedReviews.slice(0, 20).map(r => <ReviewCard key={r.id} review={r} showDate />)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reviews;
