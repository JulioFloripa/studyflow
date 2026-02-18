import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Sparkles, ArrowRight } from 'lucide-react';
import { StudySuggestion, getSuggestionLabel, getSuggestionIcon } from '@/lib/suggestions';
import { useNavigate } from 'react-router-dom';

interface NextActionCardProps {
  suggestion: StudySuggestion | null;
  loading?: boolean;
}

export const NextActionCard: React.FC<NextActionCardProps> = ({ suggestion, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4" />
        <div className="h-4 bg-muted rounded w-full mb-2" />
        <div className="h-4 bg-muted rounded w-3/4" />
      </Card>
    );
  }

  if (!suggestion) {
    return (
      <Card className="p-6 text-center">
        <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground mb-2">Tudo em dia!</h3>
        <p className="text-sm text-muted-foreground">
          Sem revisões pendentes ou ações urgentes no momento.
        </p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate('/registrar')}
        >
          Registrar Nova Sessão
        </Button>
      </Card>
    );
  }

  const handleAction = () => {
    if (suggestion.reviewId) {
      navigate('/revisoes');
    } else {
      navigate('/registrar', { state: { suggestedTopicId: suggestion.topicId } });
    }
  };

  const getPriorityColor = (reason: string) => {
    if (reason === 'review_overdue') return 'border-destructive/50 bg-destructive/5';
    if (reason === 'review_today') return 'border-accent/50 bg-accent/5';
    if (reason === 'low_performance') return 'border-warning/50 bg-warning/5';
    return 'border-primary/50 bg-primary/5';
  };

  return (
    <Card className={`p-6 ${getPriorityColor(suggestion.reason)} border-2 transition-all hover:shadow-lg`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getSuggestionIcon(suggestion.reason)}</span>
          <div>
            <h3 className="font-semibold text-foreground text-lg">Próxima Ação Recomendada</h3>
            <Badge variant="secondary" className="mt-1 text-xs">
              {getSuggestionLabel(suggestion.reason)}
            </Badge>
          </div>
        </div>
        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: suggestion.subjectColor }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{suggestion.topicName}</p>
            <p className="text-sm text-muted-foreground">{suggestion.subjectName}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{suggestion.estimatedMinutes} min</span>
          </div>
          <span className="text-xs bg-muted px-2 py-1 rounded">{suggestion.details}</span>
        </div>
      </div>

      <Button 
        onClick={handleAction} 
        className="w-full"
        size="lg"
      >
        {suggestion.reviewId ? 'Fazer Revisão' : 'Iniciar Estudo'}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  );
};
