import { useStudy } from '@/contexts/StudyContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Flame, TrendingUp, Lock } from 'lucide-react';
import { getUserStats, checkUnlockedBadges, AVAILABLE_BADGES, getLevelTitle } from '@/lib/gamification';

const Gamification = () => {
  const { studySessions, reviews, userProfile } = useStudy();

  const userStats = getUserStats(studySessions, reviews);
  const { badges: unlockedBadges } = checkUnlockedBadges(studySessions, reviews, userProfile.unlockedBadges || []);
  const unlockedIds = unlockedBadges.map(b => b.id);

  const levelProgress = ((userStats.xp - (userStats.level * userStats.level * 100)) / ((userStats.level + 1) * (userStats.level + 1) * 100 - userStats.level * userStats.level * 100)) * 100;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-7 w-7 text-primary" /> Conquistas e Progresso
        </h1>
        <p className="text-muted-foreground mt-1">Acompanhe seu nível, conquistas e estatísticas</p>
      </div>

      {/* Level Card */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
              <Star className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">Level {userStats.level}</p>
              <p className="text-sm text-muted-foreground">{getLevelTitle(userStats.level)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{userStats.xp} XP</p>
            <p className="text-xs text-muted-foreground">{userStats.xpToNextLevel} XP para o próximo nível</p>
          </div>
        </div>
        <Progress value={levelProgress} className="h-3" />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Level {userStats.level}</span>
          <span>Level {userStats.level + 1}</span>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-5 text-center">
          <Flame className="h-6 w-6 text-orange-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-foreground">{userStats.currentStreak}</p>
          <p className="text-xs text-muted-foreground mt-1">Streak Atual</p>
        </Card>

        <Card className="p-5 text-center">
          <TrendingUp className="h-6 w-6 text-success mx-auto mb-2" />
          <p className="text-3xl font-bold text-foreground">{userStats.longestStreak}</p>
          <p className="text-xs text-muted-foreground mt-1">Recorde de Streak</p>
        </Card>

        <Card className="p-5 text-center">
          <Trophy className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-3xl font-bold text-foreground">{userStats.totalHours}h</p>
          <p className="text-xs text-muted-foreground mt-1">Total de Horas</p>
        </Card>

        <Card className="p-5 text-center">
          <Star className="h-6 w-6 text-accent mx-auto mb-2" />
          <p className="text-3xl font-bold text-foreground">{userStats.totalQuestions}</p>
          <p className="text-xs text-muted-foreground mt-1">Questões Resolvidas</p>
        </Card>
      </div>

      {/* Badges */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Conquistas ({unlockedBadges.length}/{AVAILABLE_BADGES.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {AVAILABLE_BADGES.map(badge => {
            const isUnlocked = unlockedIds.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-lg border transition-all ${
                  isUnlocked
                    ? 'bg-card border-primary/30 hover:border-primary/50'
                    : 'bg-muted/30 border-border opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`text-3xl ${!isUnlocked && 'grayscale opacity-50'}`}>
                    {isUnlocked ? badge.icon : <Lock className="h-8 w-8 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">{badge.name}</p>
                      {isUnlocked && (
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          Desbloqueado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Motivational Message */}
      {userStats.currentStreak === 0 && (
        <Card className="p-6 mt-6 bg-accent/5 border-accent/30">
          <p className="text-center text-sm text-muted-foreground">
            💪 Comece um novo streak hoje! Estude por pelo menos alguns minutos para manter a consistência.
          </p>
        </Card>
      )}

      {userStats.currentStreak >= 7 && (
        <Card className="p-6 mt-6 bg-success/5 border-success/30">
          <p className="text-center text-sm text-foreground">
            🔥 Incrível! Você está em um streak de {userStats.currentStreak} dias. Continue assim!
          </p>
        </Card>
      )}
    </div>
  );
};

export default Gamification;
