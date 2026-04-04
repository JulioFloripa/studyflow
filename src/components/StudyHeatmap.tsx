import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { subDays, format, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Flame } from 'lucide-react';

interface StudySession {
  date: string;
  minutesStudied: number;
}

interface StudyHeatmapProps {
  studySessions: StudySession[];
}

const WEEKS = 15; // ~3.5 meses
const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getIntensity(minutes: number): number {
  if (minutes === 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

function getColor(intensity: number): string {
  switch (intensity) {
    case 0: return 'hsl(222 47% 12%)';
    case 1: return 'hsl(217 91% 25%)';
    case 2: return 'hsl(217 91% 40%)';
    case 3: return 'hsl(217 91% 55%)';
    case 4: return 'hsl(217 91% 70%)';
    default: return 'hsl(222 47% 12%)';
  }
}

export const StudyHeatmap: React.FC<StudyHeatmapProps> = ({ studySessions }) => {
  const today = new Date();

  // Mapa de data → minutos
  const sessionMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of studySessions) {
      map[s.date] = (map[s.date] || 0) + s.minutesStudied;
    }
    return map;
  }, [studySessions]);

  // Calcular streak atual
  const streak = useMemo(() => {
    let count = 0;
    let d = new Date(today);
    while (true) {
      const key = format(d, 'yyyy-MM-dd');
      if (sessionMap[key] && sessionMap[key] > 0) {
        count++;
        d = subDays(d, 1);
      } else {
        break;
      }
    }
    return count;
  }, [sessionMap, today]);

  // Gerar grid: WEEKS colunas × 7 linhas
  const grid = useMemo(() => {
    // Encontrar o domingo mais recente como início da última semana
    const endDate = today;
    const startDate = subDays(endDate, WEEKS * 7 - 1);

    // Ajustar para começar no domingo
    const gridStart = startOfWeek(startDate, { weekStartsOn: 0 });

    const cells: { date: string; minutes: number; intensity: number; dayOfWeek: number }[] = [];
    let current = new Date(gridStart);

    while (current <= endDate || cells.length < WEEKS * 7) {
      const key = format(current, 'yyyy-MM-dd');
      const minutes = sessionMap[key] || 0;
      cells.push({
        date: key,
        minutes,
        intensity: current > endDate ? -1 : getIntensity(minutes),
        dayOfWeek: getDay(current),
      });
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
      if (cells.length >= WEEKS * 7) break;
    }

    // Organizar em colunas (semanas)
    const weeks: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  }, [sessionMap, today]);

  // Meses para o header
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = '';
    grid.forEach((week, col) => {
      const firstDay = week[0];
      if (firstDay) {
        const month = format(new Date(firstDay.date + 'T12:00:00'), 'MMM', { locale: ptBR });
        if (month !== lastMonth) {
          labels.push({ label: month.charAt(0).toUpperCase() + month.slice(1), col });
          lastMonth = month;
        }
      }
    });
    return labels;
  }, [grid]);

  const totalDays = Object.values(sessionMap).filter(m => m > 0).length;
  const totalHours = Math.round(Object.values(sessionMap).reduce((s, m) => s + m, 0) / 60);

  return (
    <Card style={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4" style={{ color: 'hsl(217 91% 60%)' }} />
          <h3 className="font-semibold text-white text-sm">Histórico de Estudos</h3>
        </div>
        <div className="flex items-center gap-4">
          {streak > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-lg">🔥</span>
              <span className="text-sm font-bold text-white">{streak} dias</span>
            </div>
          )}
          <span className="text-xs" style={{ color: 'hsl(215 20% 50%)' }}>
            {totalDays} dias · {totalHours}h total
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: WEEKS * 14 + 30 }}>
          {/* Labels de meses */}
          <div className="flex mb-1 ml-8">
            {grid.map((_, col) => {
              const label = monthLabels.find(m => m.col === col);
              return (
                <div key={col} style={{ width: 12, marginRight: 2 }} className="text-center">
                  {label && (
                    <span className="text-[10px]" style={{ color: 'hsl(215 20% 45%)' }}>
                      {label.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-0">
            {/* Labels de dias da semana */}
            <div className="flex flex-col gap-0.5 mr-2">
              {DAYS_OF_WEEK.map((day, i) => (
                <div
                  key={day}
                  style={{ height: 12, fontSize: 9, color: 'hsl(215 20% 40%)', lineHeight: '12px' }}
                  className={i % 2 === 0 ? 'opacity-0' : ''}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Células */}
            {grid.map((week, col) => (
              <div key={col} className="flex flex-col gap-0.5 mr-0.5">
                {week.map((cell, row) => (
                  <div
                    key={`${col}-${row}`}
                    title={cell.intensity >= 0 ? `${cell.date}: ${cell.minutes}min` : ''}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      background: cell.intensity < 0 ? 'transparent' : getColor(cell.intensity),
                      cursor: cell.minutes > 0 ? 'pointer' : 'default',
                      transition: 'opacity 0.15s',
                    }}
                    className={cell.minutes > 0 ? 'hover:opacity-80' : ''}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-1 mt-3 justify-end">
            <span className="text-[10px] mr-1" style={{ color: 'hsl(215 20% 40%)' }}>Menos</span>
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                style={{ width: 12, height: 12, borderRadius: 2, background: getColor(i) }}
              />
            ))}
            <span className="text-[10px] ml-1" style={{ color: 'hsl(215 20% 40%)' }}>Mais</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
