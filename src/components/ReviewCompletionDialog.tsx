import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EaseFactor, getEaseFactorLabel, getEaseFactorEmoji } from '@/lib/spacedRepetition';

interface ReviewCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    easeFactor: EaseFactor;
    minutes?: number;
    questionsTotal?: number;
    questionsCorrect?: number;
  }) => void;
  topicName: string;
}

export const ReviewCompletionDialog: React.FC<ReviewCompletionDialogProps> = ({
  open,
  onOpenChange,
  onComplete,
  topicName,
}) => {
  const [easeFactor, setEaseFactor] = useState<EaseFactor>(3);
  const [minutes, setMinutes] = useState<string>('');
  const [questionsTotal, setQuestionsTotal] = useState<string>('');
  const [questionsCorrect, setQuestionsCorrect] = useState<string>('');

  const handleComplete = () => {
    onComplete({
      easeFactor,
      minutes: minutes ? parseInt(minutes) : undefined,
      questionsTotal: questionsTotal ? parseInt(questionsTotal) : undefined,
      questionsCorrect: questionsCorrect ? parseInt(questionsCorrect) : undefined,
    });
    
    // Reset form
    setEaseFactor(3);
    setMinutes('');
    setQuestionsTotal('');
    setQuestionsCorrect('');
    onOpenChange(false);
  };

  const easeOptions: EaseFactor[] = [1, 2, 3, 4, 5];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Concluir Revisão</DialogTitle>
          <DialogDescription>
            Como foi revisar <strong>{topicName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ease Factor Selection */}
          <div className="space-y-2">
            <Label>Facilidade da Revisão *</Label>
            <div className="grid grid-cols-5 gap-2">
              {easeOptions.map(ease => (
                <button
                  key={ease}
                  type="button"
                  onClick={() => setEaseFactor(ease)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                    easeFactor === ease
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-2xl">{getEaseFactorEmoji(ease)}</span>
                  <span className="text-[10px] text-center leading-tight text-muted-foreground">
                    {getEaseFactorLabel(ease)}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Isso ajudará a ajustar o intervalo da próxima revisão
            </p>
          </div>

          {/* Optional: Time spent */}
          <div className="space-y-2">
            <Label htmlFor="minutes">Tempo gasto (minutos) - Opcional</Label>
            <Input
              id="minutes"
              type="number"
              min="0"
              placeholder="Ex: 25"
              value={minutes}
              onChange={e => setMinutes(e.target.value)}
            />
          </div>

          {/* Optional: Questions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="questionsTotal">Questões - Opcional</Label>
              <Input
                id="questionsTotal"
                type="number"
                min="0"
                placeholder="Total"
                value={questionsTotal}
                onChange={e => setQuestionsTotal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="questionsCorrect">Acertos</Label>
              <Input
                id="questionsCorrect"
                type="number"
                min="0"
                max={questionsTotal ? parseInt(questionsTotal) : undefined}
                placeholder="Corretas"
                value={questionsCorrect}
                onChange={e => setQuestionsCorrect(e.target.value)}
                disabled={!questionsTotal}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleComplete}>
            Concluir Revisão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
