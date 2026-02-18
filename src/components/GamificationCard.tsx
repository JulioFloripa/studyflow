import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame, Trophy, Star, TrendingUp } from 'lucide-react';
import { UserStats, Badge as GamificationBadge, getLevelTitle } from '@/lib/gamification';

interface GamificationCardProps {
  stats: UserStats;
  badges: GamificationBadge[];
  compact?: boolean;
}

export const GamificationCard: React.FC<GamificationCardProps> = ({ stats, badges, compact = false }) => {
  const levelProgress = ((stats.xp - (stats.level * stats.level * 100)) / ((stats.level + 1) * (stats.level + 1) * 100 - stats.level * stats.level * 100)) * 100;

  if (compact) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
              <Star className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Level {stats.level}</p>
              <p className="text-xs text-muted-foreground">{getLevelTitle(stats.level)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-lg font-bold text-foreground">{stats.currentStreak}</span>
          </div>
        </div>
        <Progress value={levelProgress} className="h-1.5" />
        <p className="text-xs text-muted-foreground mt-1">{stats.xpToNextLevel} XP para o próximo nível</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Seu Progresso</h3>
      </div>

      {/* Level */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Level {stats.level}</p>
              <p className="text-xs text-muted-foreground">{getLevelTitle(stats.level)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{stats.xp} XP</p>
            <p className="text-xs text-muted-foreground">{stats.xpToNextLevel} para próximo</p>
          </div>
        </div>
        <Progress value={levelProgress} className="h-2" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Streak Atual</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.currentStreak}</p>
          <p className="text-xs text-muted-foreground">dias consecutivos</p>
        </div>

        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-xs text-muted-foreground">Recorde</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.longestStreak}</p>
          <p className="text-xs text-muted-foreground">dias seguidos</p>
        </div>

        <div className="p-3 rounded-lg bg-muted/30">
          <span className="text-xs text-muted-foreground">Total de Horas</span>
          <p className="text-xl font-bold text-foreground">{stats.totalHours}h</p>
        </div>

        <div className="p-3 rounded-lg bg-muted/30">
          <span className="text-xs text-muted-foreground">Questões</span>
          <p className="text-xl font-bold text-foreground">{stats.totalQuestions}</p>
        </div>
      </div>

      {/* Badges */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">Conquistas ({badges.length})</h4>
        {badges.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Continue estudando para desbloquear conquistas! 🏆
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {badges.slice(0, 8).map(badge => (
              <Tooltip key={badge.id}>
                <TooltipTrigger>
                  <Badge 
                    variant="secondary" 
                    className="text-lg px-2 py-1 cursor-help hover:scale-110 transition-transform"
                  >
                    {badge.icon}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            {badges.length > 8 && (
              <Badge variant="outline" className="text-xs">
                +{badges.length - 8}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
