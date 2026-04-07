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

// Mostrar ~6 meses (26 semanas)
const WEEKS = 26;

// Dias visíveis na lateral (apenas ímpares para não poluir)
const DAY_LABELS: { idx: number; label: string }[] = [
  { idx: 1, label: 'Seg' },
  { idx: 3, label: 'Qua' },
  { idx: 5, label: 'Sex' },
];

function getIntensity(minutes: number): number {
  if (minutes === 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

function getColor(intensity: number): string {
  switch (intensity) {
    case 0: return 'hsl(222 47% 13%)';
    case 1: return 'hsl(217 91% 25%)';
    case 2: return 'hsl(217 91% 40%)';
    case 3: return 'hsl(217 91% 55%)';
    case 4: return 'hsl(217 91% 70%)';
    default: return 'hsl(222 47% 13%)';
  }
}

export const StudyHeatmap: React.FC<StudyHeatmapProps> = ({ studySessions }) => {
  const today = useMemo(() => new Date(), []);

  // Mapa de data → minutos totais
  const sessionMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of studySessions) {
      if (s.date) map[s.date] = (map[s.date] || 0) + (s.minutesStudied || 0);
    }
    return map;
  }, [studySessions]);

  // Streak atual (dias consecutivos até hoje)
  const streak = useMemo(() => {
    let count = 0;
    let d = new Date(today);
    for (let i = 0; i < 365; i++) {
      const key = format(d, 'yyyy-MM-dd');
      if ((sessionMap[key] ?? 0) > 0) {
        count++;
        d = subDays(d, 1);
      } else {
        break;
      }
    }
    return count;
  }, [sessionMap, today]);

  // Grid: WEEKS colunas × 7 linhas, começando no domingo mais antigo
  const { grid, monthLabels } = useMemo(() => {
    // Última célula = hoje; primeira = WEEKS semanas atrás
    const endDate = today;
    const rawStart = subDays(endDate, WEEKS * 7 - 1);
    // Recuar até o domingo da semana de rawStart
    const gridStart = startOfWeek(rawStart, { weekStartsOn: 0 });

    const cells: {
      date: string;
      minutes: number;
      intensity: number; // -1 = fora do range (futuro ou antes do início)
      dayOfWeek: number;
    }[] = [];

    let cur = new Date(gridStart);
    while (cells.length < WEEKS * 7) {
      const key = format(cur, 'yyyy-MM-dd');
      const isFuture = cur > endDate;
      const minutes = sessionMap[key] || 0;
      cells.push({
        date: key,
        minutes,
        intensity: isFuture ? -1 : getIntensity(minutes),
        dayOfWeek: getDay(cur),
      });
      cur = new Date(cur.getTime() + 86400000);
    }

    // Agrupar em semanas (colunas)
    const weeks: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    // Labels de meses (primeira semana de cada mês)
    const labels: { label: string; col: number }[] = [];
    let lastMonth = '';
    weeks.forEach((week, col) => {
      const first = week[0];
      if (first && first.intensity >= 0) {
        const month = format(new Date(first.date + 'T12:00:00'), 'MMM', { locale: ptBR });
        const cap = month.charAt(0).toUpperCase() + month.slice(1);
        if (cap !== lastMonth) {
          labels.push({ label: cap, col });
          lastMonth = cap;
        }
      }
    });

    return { grid: weeks, monthLabels: labels };
  }, [sessionMap, today]);

  const totalDays = Object.values(sessionMap).filter(m => m > 0).length;
  const totalHours = Math.round(Object.values(sessionMap).reduce((s, m) => s + m, 0) / 60);

  // Tamanho de cada célula (px) — fixo para manter consistência
  const CELL = 13;
  const GAP = 2;
  const LABEL_W = 28; // largura da coluna de labels de dia

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
              <span className="text-base">🔥</span>
              <span className="text-sm font-bold text-white">{streak} dias seguidos</span>
            </div>
          )}
          <span className="text-xs" style={{ color: 'hsl(215 20% 50%)' }}>
            {totalDays} dias · {totalHours}h total
          </span>
        </div>
      </div>

      {/* Grid com scroll horizontal em telas pequenas */}
      <div className="overflow-x-auto pb-1">
        <div style={{ display: 'inline-block', minWidth: LABEL_W + WEEKS * (CELL + GAP) }}>

          {/* Labels de meses */}
          <div style={{ display: 'flex', marginLeft: LABEL_W, marginBottom: 4 }}>
            {grid.map((_, col) => {
              const label = monthLabels.find(m => m.col === col);
              return (
                <div
                  key={col}
                  style={{ width: CELL + GAP, flexShrink: 0, overflow: 'visible' }}
                >
                  {label && (
                    <span style={{ fontSize: 10, color: 'hsl(215 20% 48%)', whiteSpace: 'nowrap' }}>
                      {label.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Corpo: labels de dias + colunas de semanas */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
            {/* Coluna de labels de dias */}
            <div
              style={{
                width: LABEL_W,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: GAP,
              }}
            >
              {Array.from({ length: 7 }, (_, i) => {
                const found = DAY_LABELS.find(d => d.idx === i);
                return (
                  <div
                    key={i}
                    style={{
                      height: CELL,
                      lineHeight: `${CELL}px`,
                      fontSize: 9,
                      color: 'hsl(215 20% 42%)',
                      textAlign: 'right',
                      paddingRight: 4,
                    }}
                  >
                    {found ? found.label : ''}
                  </div>
                );
              })}
            </div>

            {/* Semanas */}
            {grid.map((week, col) => (
              <div
                key={col}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: GAP,
                  marginRight: GAP,
                }}
              >
                {week.map((cell, row) => (
                  <div
                    key={`${col}-${row}`}
                    title={
                      cell.intensity > 0
                        ? `${cell.date}: ${cell.minutes}min estudados`
                        : cell.intensity === 0
                        ? `${cell.date}: sem estudo`
                        : ''
                    }
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 3,
                      background:
                        cell.intensity < 0
                          ? 'transparent'
                          : getColor(cell.intensity),
                      cursor: cell.minutes > 0 ? 'pointer' : 'default',
                      transition: 'opacity 0.15s',
                      flexShrink: 0,
                    }}
                    className={cell.minutes > 0 ? 'hover:opacity-75' : ''}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legenda */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              marginTop: 8,
              justifyContent: 'flex-end',
            }}
          >
            <span style={{ fontSize: 10, color: 'hsl(215 20% 42%)', marginRight: 2 }}>Menos</span>
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 3,
                  background: getColor(i),
                }}
              />
            ))}
            <span style={{ fontSize: 10, color: 'hsl(215 20% 42%)', marginLeft: 2 }}>Mais</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
