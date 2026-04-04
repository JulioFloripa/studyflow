import { useStudy } from '@/contexts/StudyContext';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Clock, Target, Flame, TrendingUp, AlertTriangle, RotateCcw } from 'lucide-react';
import { startOfWeek, addDays, format } from 'date-fns';
import { NextActionCard } from '@/components/NextActionCard';
import { GamificationCard } from '@/components/GamificationCard';
import { DailyPlan } from '@/components/DailyPlan';
import { getTopSuggestion } from '@/lib/suggestions';
import { getUserStats, checkUnlockedBadges } from '@/lib/gamification';

const Dashboard = () => {
  const { subjects, topics, studySessions, reviews, userProfile, loading, studyCycle } = useStudy();

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  // Weekly hours
  const weekDayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const chartData = weekDayLabels.map((day, i) => {
    const dateStr = format(addDays(weekStart, i), 'yyyy-MM-dd');
    const hours = studySessions
      .filter(s => s.date === dateStr)
      .reduce((sum, s) => sum + s.minutesStudied / 60, 0);
    return { day, hours: Math.round(hours * 10) / 10 };
  });

  const weeklyHours = chartData.reduce((sum, d) => sum + d.hours, 0);
  const goalProgress = Math.min((weeklyHours / userProfile.weeklyGoalHours) * 100, 100);

  // Consistency
  const weekDates = weekDayLabels.map((_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'));
  const daysStudied = new Set(studySessions.filter(s => weekDates.includes(s.date)).map(s => s.date)).size;

  // Overall accuracy
  const totalQ = studySessions.reduce((s, ss) => s + ss.questionsTotal, 0);
  const totalC = studySessions.reduce((s, ss) => s + ss.questionsCorrect, 0);
  const overallAccuracy = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

  // Subject accuracy
  const subjectStats = subjects.map(sub => {
    const sessions = studySessions.filter(s => s.subjectId === sub.id);
    const q = sessions.reduce((s, ss) => s + ss.questionsTotal, 0);
    const c = sessions.reduce((s, ss) => s + ss.questionsCorrect, 0);
    return { name: sub.name, accuracy: q > 0 ? Math.round((c / q) * 100) : 0, color: sub.color };
  }).sort((a, b) => b.accuracy - a.accuracy);

  // Today's reviews
  const todayReviews = reviews.filter(r => !r.completed && r.scheduledDate <= today);
  const overdueCount = reviews.filter(r => !r.completed && r.scheduledDate < today).length;

  // Critical topics (low accuracy)
  const criticalTopics = topics
    .map(topic => {
      const sessions = studySessions.filter(s => s.topicId === topic.id);
      const q = sessions.reduce((s, ss) => s + ss.questionsTotal, 0);
      const c = sessions.reduce((s, ss) => s + ss.questionsCorrect, 0);
      const acc = q > 0 ? Math.round((c / q) * 100) : -1;
      const subject = subjects.find(s => s.id === topic.subjectId);
      return { topic, subject, accuracy: acc, sessions: sessions.length };
    })
    .filter(t => t.accuracy >= 0 && t.accuracy < 70 && t.sessions > 0)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Sugestão inteligente
  const topSuggestion = getTopSuggestion({
    subjects,
    topics,
    studySessions,
    reviews,
    studyCycle,
  });

  // Gamificação
  const userStats = getUserStats(studySessions, reviews);
  const { badges } = checkUnlockedBadges(studySessions, reviews, userProfile.unlockedBadges || []);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {getGreeting()}, {userProfile.name}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">Acompanhe seu progresso de estudos</p>
      </div>

      {/* Daily Plan + Next Action + Gamification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 space-y-4">
          <DailyPlan
            subjects={subjects}
            topics={topics}
            studySessions={studySessions}
            dailyHours={((userProfile as any).onboardingData?.dailyHours) || '1to2'}
            studyDays={((userProfile as any).onboardingData?.studyDays) || ['seg', 'ter', 'qua', 'qui', 'sex']}
          />
          <NextActionCard suggestion={topSuggestion} loading={loading} />
        </div>
        <div>
          <GamificationCard stats={userStats} badges={badges} compact />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div>
            <span className="text-sm text-muted-foreground">Meta Semanal</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{weeklyHours.toFixed(1)}h</p>
          <Progress value={goalProgress} className="mt-2 h-2" />
          <p className="text-xs text-muted-foreground mt-1">de {userProfile.weeklyGoalHours}h planejadas</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-accent/10"><Flame className="h-5 w-5 text-accent" /></div>
            <span className="text-sm text-muted-foreground">Constância</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{daysStudied}/7</p>
          <div className="flex gap-1 mt-2">
            {weekDayLabels.map((d, i) => {
              const dateStr = format(addDays(weekStart, i), 'yyyy-MM-dd');
              const studied = studySessions.some(s => s.date === dateStr);
              return (
                <div key={d} className={`flex-1 h-2 rounded-full ${studied ? 'bg-accent' : 'bg-muted'}`} />
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">dias estudados esta semana</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-success/10"><Target className="h-5 w-5 text-success" /></div>
            <span className="text-sm text-muted-foreground">Acerto Geral</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{overallAccuracy}%</p>
          <Progress value={overallAccuracy} className="mt-2 h-2" />
          <p className="text-xs text-muted-foreground mt-1">{totalC} de {totalQ} questões corretas</p>
        </Card>
      </div>

      {/* Charts + Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Horas por Dia (esta semana)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                formatter={(value: number) => [`${value}h`, 'Horas']}
              />
              <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-accent" /> Revisões Pendentes
          </h3>
          {todayReviews.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">Sem revisões pendentes! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin">
              {todayReviews.slice(0, 6).map(r => {
                const topic = topics.find(t => t.id === r.topicId);
                const subject = subjects.find(s => s.id === r.subjectId);
                return (
                  <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: subject?.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{topic?.name}</p>
                      <p className="text-xs text-muted-foreground">{subject?.name} · {r.type}</p>
                    </div>
                    {r.scheduledDate < today && (
                      <Badge variant="destructive" className="text-[10px] px-1.5">Atrasada</Badge>
                    )}
                  </div>
                );
              })}
              {todayReviews.length > 6 && (
                <p className="text-xs text-muted-foreground text-center">+{todayReviews.length - 6} mais</p>
              )}
            </div>
          )}
          {overdueCount > 0 && (
            <p className="text-xs text-destructive mt-2">{overdueCount} revisão(ões) atrasada(s)</p>
          )}
        </Card>
      </div>

      {/* Subject accuracy + Critical Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4">Acerto por Disciplina</h3>
          <div className="space-y-3">
            {subjectStats.map(s => (
              <div key={s.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground font-medium">{s.name}</span>
                  <span className="text-muted-foreground">{s.accuracy}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.accuracy}%`, backgroundColor: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Assuntos Críticos
          </h3>
          {criticalTopics.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">Nenhum assunto crítico. Continue assim! 💪</p>
            </div>
          ) : (
            <div className="space-y-2">
              {criticalTopics.map(({ topic, subject, accuracy }) => (
                <div key={topic.id} className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: subject?.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{topic.name}</p>
                    <p className="text-xs text-muted-foreground">{subject?.name}</p>
                  </div>
                  <Badge variant="destructive" className="text-xs">{accuracy}%</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
