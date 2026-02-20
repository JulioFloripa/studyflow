import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Clock, Edit2, Trash2, Copy, Zap } from 'lucide-react';
import { TimeSlot, TimeSlotStatus, TIME_SLOTS, DAY_LABELS_SHORT } from '@/types/educational';
import { cn } from '@/lib/utils';

interface TimeGridEditorProps {
  timeSlots: TimeSlot[];
  onUpdateSlot: (slotId: string, updates: Partial<TimeSlot>) => void;
  onBulkUpdate: (slots: Partial<TimeSlot>[]) => void;
  readonly?: boolean;
}

const STATUS_COLORS: Record<TimeSlotStatus, string> = {
  free: 'bg-green-100 hover:bg-green-200 border-green-300 text-green-800',
  occupied: 'bg-red-100 hover:bg-red-200 border-red-300 text-red-800',
  custom: 'bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800',
};

const STATUS_LABELS: Record<TimeSlotStatus, string> = {
  free: 'Livre',
  occupied: 'Ocupado',
  custom: 'Personalizado',
};

export const TimeGridEditor: React.FC<TimeGridEditorProps> = ({
  timeSlots,
  onUpdateSlot,
  onBulkUpdate,
  readonly = false,
}) => {
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [customColor, setCustomColor] = useState('#3b82f6');
  const [bulkFillOpen, setBulkFillOpen] = useState(false);

  // Organizar slots por dia e horário
  const gridData = useMemo(() => {
    const grid: Record<number, Record<string, TimeSlot | undefined>> = {};
    for (let day = 0; day <= 6; day++) {
      grid[day] = {};
      TIME_SLOTS.forEach(time => {
        grid[day][time] = timeSlots.find(
          s => s.dayOfWeek === day && s.startTime === time
        );
      });
    }
    return grid;
  }, [timeSlots]);

  const handleSlotClick = (slot: TimeSlot | undefined, day: number, time: string) => {
    if (readonly || !slot) return;

    // Ciclo: free → occupied → custom → free
    const statusCycle: Record<TimeSlotStatus, TimeSlotStatus> = {
      free: 'occupied',
      occupied: 'custom',
      custom: 'free',
    };

    const newStatus = statusCycle[slot.status];

    if (newStatus === 'custom') {
      setEditingSlot(slot);
      setCustomLabel(slot.customLabel || '');
      setCustomColor(slot.color || '#3b82f6');
    } else {
      onUpdateSlot(slot.id, {
        status: newStatus,
        customLabel: undefined,
        color: undefined,
      });
    }
  };

  const handleSaveCustom = () => {
    if (!editingSlot) return;
    onUpdateSlot(editingSlot.id, {
      status: 'custom',
      customLabel,
      color: customColor,
    });
    setEditingSlot(null);
  };

  const handleBulkFill = (params: {
    days: number[];
    startTime: string;
    endTime: string;
    status: TimeSlotStatus;
    label?: string;
  }) => {
    const updates: Partial<TimeSlot>[] = [];
    const startIdx = TIME_SLOTS.indexOf(params.startTime);
    const endIdx = TIME_SLOTS.indexOf(params.endTime);

    params.days.forEach(day => {
      TIME_SLOTS.slice(startIdx, endIdx + 1).forEach(time => {
        const slot = gridData[day][time];
        if (slot) {
          updates.push({
            id: slot.id,
            status: params.status,
            customLabel: params.label,
            color: params.status === 'custom' ? '#3b82f6' : undefined,
          } as any);
        }
      });
    });

    onBulkUpdate(updates);
    setBulkFillOpen(false);
  };

  const getSlotDisplay = (slot: TimeSlot | undefined) => {
    if (!slot) return { label: '', color: 'bg-gray-50' };

    if (slot.status === 'custom' && slot.customLabel) {
      return {
        label: slot.customLabel,
        color: STATUS_COLORS.custom,
      };
    }

    return {
      label: STATUS_LABELS[slot.status],
      color: STATUS_COLORS[slot.status],
    };
  };

  const weekDays = [1, 2, 3, 4, 5, 6, 0]; // Seg-Sáb, Dom

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Grade Horária (30min)</span>
        </div>
        {!readonly && (
          <Dialog open={bulkFillOpen} onOpenChange={setBulkFillOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Zap className="h-4 w-4 mr-2" />
                Preencher em Lote
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Preencher Horários em Lote</DialogTitle>
              </DialogHeader>
              <BulkFillForm onSubmit={handleBulkFill} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
          Livre
        </Badge>
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
          Ocupado
        </Badge>
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
          Personalizado
        </Badge>
      </div>

      {/* Grade */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid grid-cols-[80px_repeat(7,minmax(100px,1fr))] gap-1">
            {/* Cabeçalho */}
            <div className="font-semibold text-xs text-center p-2">Horário</div>
            {weekDays.map(day => (
              <div key={day} className="font-semibold text-xs text-center p-2">
                {DAY_LABELS_SHORT[day]}
              </div>
            ))}

            {/* Linhas de horário */}
            {TIME_SLOTS.map(time => (
              <React.Fragment key={time}>
                <div className="text-xs text-muted-foreground text-right p-2 font-mono">
                  {time}
                </div>
                {weekDays.map(day => {
                  const slot = gridData[day][time];
                  const display = getSlotDisplay(slot);
                  return (
                    <button
                      key={`${day}-${time}`}
                      onClick={() => handleSlotClick(slot, day, time)}
                      disabled={readonly || !slot}
                      className={cn(
                        'p-1 text-[10px] border rounded transition-all min-h-[32px] flex items-center justify-center',
                        display.color,
                        readonly ? 'cursor-default' : 'cursor-pointer',
                        !slot && 'bg-gray-100 cursor-not-allowed'
                      )}
                      title={display.label}
                    >
                      <span className="truncate px-1">{display.label}</span>
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Dialog de edição customizada */}
      <Dialog open={!!editingSlot} onOpenChange={() => setEditingSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personalizar Horário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={customLabel}
                onChange={e => setCustomLabel(e.target.value)}
                placeholder="Ex: Aula de Piano, Academia, Almoço..."
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={e => setCustomColor(e.target.value)}
                  className="h-10 w-20"
                />
                <Input value={customColor} onChange={e => setCustomColor(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveCustom} className="flex-1">
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setEditingSlot(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Formulário de preenchimento em lote
const BulkFillForm: React.FC<{
  onSubmit: (params: {
    days: number[];
    startTime: string;
    endTime: string;
    status: TimeSlotStatus;
    label?: string;
  }) => void;
}> = ({ onSubmit }) => {
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('12:00');
  const [status, setStatus] = useState<TimeSlotStatus>('occupied');
  const [label, setLabel] = useState('Aula');

  const toggleDay = (day: number) => {
    setDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Dias da Semana</Label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 0].map(day => (
            <Button
              key={day}
              variant={days.includes(day) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleDay(day)}
            >
              {DAY_LABELS_SHORT[day]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Início</Label>
          <Select value={startTime} onValueChange={setStartTime}>
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

        <div className="space-y-2">
          <Label>Fim</Label>
          <Select value={endTime} onValueChange={setEndTime}>
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

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={v => setStatus(v as TimeSlotStatus)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Livre</SelectItem>
            <SelectItem value="occupied">Ocupado</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {status === 'custom' && (
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Ex: Aula, Almoço, Academia..."
          />
        </div>
      )}

      <Button
        onClick={() =>
          onSubmit({
            days,
            startTime,
            endTime,
            status,
            label: status === 'custom' ? label : undefined,
          })
        }
        className="w-full"
      >
        Aplicar
      </Button>
    </div>
  );
};

export default TimeGridEditor;
