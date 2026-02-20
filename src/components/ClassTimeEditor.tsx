import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ClassTimeTemplate, TIME_SLOTS, DAY_LABELS_SHORT, ScheduleType } from '@/types/educational';
import { Subject } from '@/types/study';
import { Plus, Trash2, Clock, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface ClassTimeEditorProps {
  classId: string;
  templates: ClassTimeTemplate[];
  subjects: Subject[]; // Lista de disciplinas disponíveis
  onAdd: (template: Omit<ClassTimeTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onBulkAdd: (templates: Omit<ClassTimeTemplate, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
}

export const ClassTimeEditor: React.FC<ClassTimeEditorProps> = ({
  classId,
  templates,
  subjects,
  onAdd,
  onRemove,
  onBulkAdd,
}) => {
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkDays, setBulkDays] = useState<number[]>([1, 2, 3, 4, 5]); // Seg-Sex
  const [bulkStartTime, setBulkStartTime] = useState('07:00');
  const [bulkEndTime, setBulkEndTime] = useState('12:00');
  const [bulkLabel, setBulkLabel] = useState('Aula');
  const [bulkColor, setBulkColor] = useState('#ef4444');
  const [bulkSubjectId, setBulkSubjectId] = useState<string>('');
  const [bulkScheduleType, setBulkScheduleType] = useState<ScheduleType>('class');

  const handleBulkAdd = async () => {
    try {
      if (bulkScheduleType === 'class' && !bulkSubjectId) {
        toast.error('Selecione uma disciplina para horários de aula');
        return;
      }

      const newTemplates: Omit<ClassTimeTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [];

      // Gerar todos os slots entre start e end
      const startIdx = TIME_SLOTS.indexOf(bulkStartTime);
      const endIdx = TIME_SLOTS.indexOf(bulkEndTime);

      if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
        toast.error('Horários inválidos');
        return;
      }

      for (const day of bulkDays) {
        for (let i = startIdx; i < endIdx; i++) {
          newTemplates.push({
            classId,
            dayOfWeek: day,
            startTime: TIME_SLOTS[i],
            label: bulkLabel,
            color: bulkColor,
            status: 'occupied',
            subjectId: bulkSubjectId || undefined,
            scheduleType: bulkScheduleType,
          });
        }
      }

      await onBulkAdd(newTemplates);
      toast.success(`${newTemplates.length} horários adicionados`);
      setBulkDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao adicionar horários');
    }
  };

  const toggleDay = (day: number) => {
    setBulkDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  // Agrupar templates por dia
  const templatesByDay: Record<number, ClassTimeTemplate[]> = {};
  templates.forEach(t => {
    if (!templatesByDay[t.dayOfWeek]) templatesByDay[t.dayOfWeek] = [];
    templatesByDay[t.dayOfWeek].push(t);
  });

  // Mapear subject IDs para nomes
  const subjectMap = new Map(subjects.map(s => [s.id, s.name]));

  const getScheduleTypeLabel = (type?: ScheduleType) => {
    const labels: Record<ScheduleType, string> = {
      class: '📚 Aula',
      study: '✏️ Estudo',
      free: '🆓 Livre',
      other: '📌 Outro',
    };
    return labels[type || 'other'];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Horários Padrão da Turma</h3>
        <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Preencher em Lote
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preencher Horários em Lote</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo de Horário *</Label>
                <Select value={bulkScheduleType} onValueChange={(v) => setBulkScheduleType(v as ScheduleType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class">📚 Aula Presencial</SelectItem>
                    <SelectItem value="study">✏️ Estudo Dirigido</SelectItem>
                    <SelectItem value="other">📌 Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {bulkScheduleType === 'class' && (
                <div>
                  <Label>Disciplina *</Label>
                  <Select value={bulkSubjectId} onValueChange={setBulkSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a disciplina" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Isso permite gerar revisões automáticas baseadas nas aulas
                  </p>
                </div>
              )}

              <div>
                <Label>Dias da Semana</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5, 6, 0].map(day => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        bulkDays.includes(day)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {DAY_LABELS_SHORT[day]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Horário Início</Label>
                  <Select value={bulkStartTime} onValueChange={setBulkStartTime}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map(time => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Horário Fim</Label>
                  <Select value={bulkEndTime} onValueChange={setBulkEndTime}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map(time => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Input
                  value={bulkLabel}
                  onChange={e => setBulkLabel(e.target.value)}
                  placeholder="Ex: Aula de Biologia"
                />
              </div>

              <div>
                <Label>Cor</Label>
                <div className="flex gap-2 mt-2">
                  {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'].map(color => (
                    <button
                      key={color}
                      onClick={() => setBulkColor(color)}
                      className={`w-8 h-8 rounded-md transition-all ${
                        bulkColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <Button onClick={handleBulkAdd} className="w-full">
                Adicionar Horários
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">Nenhum horário cadastrado</p>
          <p className="text-sm text-muted-foreground mb-4">
            Use "Preencher em Lote" para adicionar horários de aula
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 0].map(day => {
            const dayTemplates = templatesByDay[day] || [];
            if (dayTemplates.length === 0) return null;

            return (
              <div key={day} className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  {DAY_LABELS_SHORT[day]}
                </h4>
                <div className="space-y-2">
                  {dayTemplates
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map(template => (
                      <div
                        key={template.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: template.color }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{template.startTime}</span>
                            <span className="text-sm font-medium">{template.label}</span>
                            {template.scheduleType && (
                              <span className="text-xs text-muted-foreground">
                                {getScheduleTypeLabel(template.scheduleType)}
                              </span>
                            )}
                          </div>
                          {template.subjectId && (
                            <div className="flex items-center gap-1 mt-1">
                              <BookOpen className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {subjectMap.get(template.subjectId) || 'Disciplina'}
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRemove(template.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {templates.length > 0 && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium mb-1">ℹ️ Herança Automática + "Aula Dada é Aula Estudada"</p>
          <p>
            Estes horários serão automaticamente copiados para todos os alunos desta turma.
            Horários marcados como "Aula" com disciplina vinculada gerarão revisões automáticas
            no ciclo de estudos (método "aula dada é aula estudada").
          </p>
        </div>
      )}
    </div>
  );
};
