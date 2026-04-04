import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, BookOpen, CheckCircle2, Circle, ArrowRight, Flame, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Subject {
  id: string;
  name: string;
  priority: number;
  color: string;
}

interface Topic {
  id: string;
  subjectId: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface StudySession {
  subjectId: string;
  topicId: string;
  date: string;
  minutesStudied: number;
}

interface DailyPlanProps {
  subjects: Subject[];
  topics: Topic[];
  studySessions: StudySession[];
  dailyHours: string; // from onboarding: 'less1' | '1to2' | '2to4' | 'more4'
  studyDays: string[]; // from onboarding: ['seg', 'ter', ...]
}

const HOURS_MAP: Record<string, number> = {
  less1: 45,
  '1to2': 90,
  '2to4': 180,
  more4: 270,
};

const DAY_MAP: Record<string, number> = {
  dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6,
};

interface DailyItem {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  topicId: string;
  topicName: string;
  minutes: number;
  priority: number;
  isReview: boolean;
  done: boolean;
}

function generateDailyPlan(
  subjects: Subject[],
  topics: Topic[],
  studySessions: StudySession[],
  availableMinutes: number
): DailyItem[] {
  const today = new Date().toISOString().split('T')[0];
  const plan: DailyItem[] = [];
  let remaining = availableMinutes;

  // Ordenar disciplinas por prioridade (maior primeiro)
  const sortedSubjects = [...subjects].sort((a, b) => b.priority - a.priority);

  for (const subject of sortedSubjects) {
    if (remaining <= 0) break;

    const subjectTopics = topics.filter(t => t.subjectId === subject.id);

    // Priorizar: em andamento > não iniciado
    const inProgress = subjectTopics.filter(t => t.status === 'in_progress');
    const notStarted = subjectTopics.filter(t => t.status === 'not_started');
    const candidates = [...inProgress, ...notStarted];

    // Verificar se já estudou esta disciplina hoje
    const studiedToday = studySessions.some(s => s.subjectId === subject.id && s.date === today);

    // Calcular tempo proporcional à prioridade
    const baseMinutes = Math.min(
      Math.round((subject.priority / 5) * 45),
      remaining
    );
    const sessionMinutes = Math.max(baseMinutes, 20);

    if (candidates.length > 0 && !studiedToday) {
      const topic = candidates[0];
      plan.push({
        subjectId: subject.id,
        subjectName: subject.name,
        subjectColor: subject.color,
        topicId: topic.id,
        topicName: topic.name,
        minutes: Math.min(sessionMinutes, remaining),
        priority: subject.priority,
        isReview: false,
        done: false,
      });
      remaining -= sessionMinutes;
    }
  }

  return plan;
}

export const DailyPlan: React.FC<DailyPlanProps> = ({
  subjects,
  topics,
  studySessions,
  dailyHours,
  studyDays,
}) => {
  const navigate = useNavigate();
  const today = new Date();
  const todayDayIndex = today.getDay(); // 0=dom, 1=seg...
  const todayKey = Object.keys(DAY_MAP).find(k => DAY_MAP[k] === todayDayIndex) || '';
  const isStudyDay = studyDays.includes(todayKey);
  const availableMinutes = HOURS_MAP[dailyHours] || 90;

  const plan = useMemo(() => {
    if (!isStudyDay || subjects.length === 0) return [];
    return generateDailyPlan(subjects, topics, studySessions, availableMinutes);
  }, [subjects, topics, studySessions, availableMinutes, isStudyDay]);

  const totalMinutes = plan.reduce((sum, item) => sum + item.minutes, 0);
  const todayLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });

  const primaryGradient = 'linear-gradient(135deg, hsl(217 91% 60%), hsl(240 80% 65%))';

  if (!isStudyDay) {
    return (
      <Card className="p-6 text-center" style={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'hsl(222 47% 14%)' }}>
          <CheckCircle2 className="h-6 w-6" style={{ color: 'hsl(217 91% 60%)' }} />
        </div>
        <h3 className="font-semibold text-white mb-1">Dia de descanso!</h3>
        <p className="text-sm" style={{ color: 'hsl(215 20% 55%)' }}>
          Hoje não está no seu cronograma de estudos. Aproveite para descansar.
        </p>
      </Card>
    );
  }

  if (plan.length === 0) {
    return (
      <Card className="p-6 text-center" style={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }}>
        <BookOpen className="h-10 w-10 mx-auto mb-3" style={{ color: 'hsl(215 20% 45%)' }} />
        <h3 className="font-semibold text-white mb-1">Adicione disciplinas ao seu plano</h3>
        <p className="text-sm mb-4" style={{ color: 'hsl(215 20% 55%)' }}>
          Importe um edital ou adicione disciplinas para gerar seu plano diário.
        </p>
        <Button
          size="sm"
          onClick={() => navigate('/plano')}
          style={{ background: primaryGradient, border: 'none', color: 'white' }}
        >
          Configurar Plano <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </Card>
    );
  }

  return (
    <Card style={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }}>
      {/* Header */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid hsl(222 47% 14%)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Flame className="h-4 w-4" style={{ color: 'hsl(217 91% 60%)' }} />
              <h3 className="font-bold text-white text-sm">Plano de Hoje</h3>
            </div>
            <p className="text-xs capitalize" style={{ color: 'hsl(215 20% 50%)' }}>{todayLabel}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <Clock className="h-3.5 w-3.5" style={{ color: 'hsl(217 91% 60%)' }} />
              <span className="text-sm font-bold text-white">{Math.round(totalMinutes / 60 * 10) / 10}h</span>
            </div>
            <p className="text-xs" style={{ color: 'hsl(215 20% 50%)' }}>{plan.length} sessões</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="p-3 space-y-2">
        {plan.map((item, idx) => (
          <div
            key={`${item.subjectId}-${item.topicId}-${idx}`}
            className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer group"
            style={{ background: 'hsl(222 47% 12%)', border: '1px solid hsl(222 47% 18%)' }}
            onClick={() => navigate('/registrar', { state: { suggestedSubjectId: item.subjectId, suggestedTopicId: item.topicId } })}
          >
            {/* Color dot */}
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: item.subjectColor || primaryGradient }}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{item.topicName}</p>
              <p className="text-xs truncate" style={{ color: 'hsl(215 20% 50%)' }}>{item.subjectName}</p>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.priority >= 4 && (
                <Target className="h-3 w-3" style={{ color: 'hsl(217 91% 60%)' }} />
              )}
              <Badge
                className="text-xs px-2 py-0.5"
                style={{ background: 'hsl(222 47% 18%)', color: 'hsl(215 20% 65%)', border: 'none' }}
              >
                {item.minutes}min
              </Badge>
              <ArrowRight
                className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'hsl(217 91% 60%)' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3" style={{ borderTop: '1px solid hsl(222 47% 14%)' }}>
        <Button
          className="w-full h-9 text-sm font-medium rounded-xl"
          style={{ background: primaryGradient, border: 'none', color: 'white', boxShadow: '0 0 16px hsl(217 91% 60% / 0.25)' }}
          onClick={() => navigate('/registrar')}
        >
          Iniciar Sessão de Estudo
          <ArrowRight className="h-3.5 w-3.5 ml-2" />
        </Button>
      </div>
    </Card>
  );
};
