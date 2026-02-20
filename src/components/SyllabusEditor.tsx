import React, { useState, useEffect } from 'react';
import { useEducational } from '@/contexts/EducationalContext';
import { ScheduleSubject, SyllabusItem } from '@/types/educational';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Circle,
  PlayCircle,
  BookOpen,
  SkipForward,
} from 'lucide-react';
import { toast } from 'sonner';

interface SyllabusEditorProps {
  scheduleSubjects: ScheduleSubject[];
}

export const SyllabusEditor: React.FC<SyllabusEditorProps> = ({ scheduleSubjects }) => {
  const {
    syllabusItems,
    loadSyllabusItems,
    addSyllabusItem,
    updateSyllabusItem,
    removeSyllabusItem,
    reorderSyllabusItems,
    advanceSyllabus,
  } = useEducational();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemWeek, setNewItemWeek] = useState<string>('');

  useEffect(() => {
    if (selectedSubjectId) {
      loadSyllabusItems(selectedSubjectId);
    }
  }, [selectedSubjectId, loadSyllabusItems]);

  const filteredItems = syllabusItems
    .filter(i => i.scheduleSubjectId === selectedSubjectId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleAdd = async () => {
    if (!newItemName.trim() || !selectedSubjectId) return;

    const maxOrder = filteredItems.length > 0
      ? Math.max(...filteredItems.map(i => i.sortOrder))
      : -1;

    await addSyllabusItem({
      scheduleSubjectId: selectedSubjectId,
      name: newItemName.trim(),
      sortOrder: maxOrder + 1,
      status: filteredItems.length === 0 ? 'current' : 'pending',
      plannedWeek: newItemWeek ? parseInt(newItemWeek) : undefined,
    });

    setNewItemName('');
    setNewItemWeek('');
    toast.success('Conteúdo adicionado à ementa');
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === filteredItems.length - 1)
    ) return;

    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    const items = [...filteredItems];
    const orderA = items[index].sortOrder;
    const orderB = items[swapIdx].sortOrder;

    await reorderSyllabusItems([
      { id: items[index].id, sortOrder: orderB },
      { id: items[swapIdx].id, sortOrder: orderA },
    ]);
  };

  const handleRemove = async (id: string) => {
    await removeSyllabusItem(id);
    toast.success('Conteúdo removido');
  };

  const handleAdvance = async () => {
    if (!selectedSubjectId) return;
    await advanceSyllabus(selectedSubjectId);
    await loadSyllabusItems(selectedSubjectId);
    toast.success('Ementa avançada!');
  };

  const handleSetCurrent = async (item: SyllabusItem) => {
    // Primeiro, tirar o status "current" de qualquer outro
    const currentItem = filteredItems.find(i => i.status === 'current');
    if (currentItem) {
      await updateSyllabusItem(currentItem.id, { status: 'pending' });
    }
    await updateSyllabusItem(item.id, { status: 'current' });
    await loadSyllabusItems(selectedSubjectId);
    toast.success(`"${item.name}" definido como conteúdo atual`);
  };

  const handleToggleComplete = async (item: SyllabusItem) => {
    if (item.status === 'completed') {
      await updateSyllabusItem(item.id, { status: 'pending', completedAt: undefined });
    } else {
      await updateSyllabusItem(item.id, { status: 'completed', completedAt: new Date().toISOString() });
    }
    await loadSyllabusItems(selectedSubjectId);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'current': return <PlayCircle className="h-4 w-4 text-primary" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'current': return 'Atual';
      default: return 'Pendente';
    }
  };

  const selectedSubject = scheduleSubjects.find(s => s.id === selectedSubjectId);
  const completedCount = filteredItems.filter(i => i.status === 'completed').length;
  const progress = filteredItems.length > 0 ? Math.round((completedCount / filteredItems.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Seletor de disciplina */}
      <div>
        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma disciplina do horário" />
          </SelectTrigger>
          <SelectContent>
            {scheduleSubjects.map(s => (
              <SelectItem key={s.id} value={s.id}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSubjectId && (
        <>
          {/* Progresso */}
          {filteredItems.length > 0 && (
            <Card className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  Progresso da Ementa
                </span>
                <span className="text-sm text-muted-foreground">
                  {completedCount}/{filteredItems.length} ({progress}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </Card>
          )}

          {/* Adicionar conteúdo */}
          <div className="flex gap-2">
            <Input
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              placeholder="Nome do conteúdo (ex: Classificação dos seres vivos)"
              className="flex-1"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <Input
              type="number"
              value={newItemWeek}
              onChange={e => setNewItemWeek(e.target.value)}
              placeholder="Sem."
              className="w-20"
              min={1}
            />
            <Button onClick={handleAdd} size="icon" disabled={!newItemName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Botão avançar */}
          {filteredItems.some(i => i.status === 'current') && (
            <Button variant="outline" size="sm" onClick={handleAdvance} className="w-full">
              <SkipForward className="h-4 w-4 mr-2" />
              Avançar para próximo conteúdo
            </Button>
          )}

          {/* Lista de conteúdos */}
          {filteredItems.length === 0 ? (
            <Card className="p-8 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Nenhum conteúdo na ementa desta disciplina.
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Adicione os conteúdos na ordem em que serão estudados.
              </p>
            </Card>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                    item.status === 'current'
                      ? 'border-primary/50 bg-primary/5'
                      : item.status === 'completed'
                      ? 'border-green-500/20 bg-green-500/5'
                      : 'border-border bg-card'
                  }`}
                >
                  {/* Reorder */}
                  <div className="flex flex-col">
                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === filteredItems.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Status icon */}
                  <button onClick={() => handleToggleComplete(item)} title="Alternar conclusão">
                    {statusIcon(item.status)}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${item.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {item.name}
                    </span>
                  </div>

                  {/* Week badge */}
                  {item.plannedWeek && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      Sem. {item.plannedWeek}
                    </Badge>
                  )}

                  {/* Status badge */}
                  {item.status === 'current' && (
                    <Badge className="text-xs shrink-0">Atual</Badge>
                  )}

                  {/* Actions */}
                  {item.status !== 'current' && item.status !== 'completed' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSetCurrent(item)}
                      title="Definir como atual"
                      className="h-7 px-2"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(item.id)}
                    className="h-7 px-2"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
