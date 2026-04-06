import { useMemo, useState } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { generateStudentCycle, extractDifficultyTopics, OnboardingData } from '@/lib/cycleAdapter';
import { formatCycleForWeek, CycleSlot } from '@/lib/cycleGeneratorV2';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Printer, RefreshCw, Clock, BookOpen, RotateCcw, Zap, Star, AlertTriangle } from 'lucide-react';

// ─── Cores e estilos ──────────────────────────────────────────────────
const bg = 'hsl(222 47% 8%)';
const cardBg = 'hsl(222 47% 11%)';
const border = 'hsl(222 47% 18%)';
const primaryBlue = 'hsl(217 91% 60%)';
const muted = 'hsl(215 20% 55%)';

const DAYS = [
  { num: 1, label: 'Segunda' },
  { num: 2, label: 'Terça' },
  { num: 3, label: 'Quarta' },
  { num: 4, label: 'Quinta' },
  { num: 5, label: 'Sexta' },
  { num: 6, label: 'Sábado' },
  { num: 0, label: 'Domingo' },
];

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  immediate_review: { label: 'Revisão Imediata', icon: <RotateCcw className="h-3 w-3" />, color: 'hsl(38 92% 50%)' },
  syllabus_week:    { label: 'Conteúdo Novo',    icon: <BookOpen className="h-3 w-3" />,   color: 'hsl(217 91% 60%)' },
  difficulty_review:{ label: 'Reforço',          icon: <AlertTriangle className="h-3 w-3" />, color: 'hsl(0 84% 60%)' },
  deep_study:       { label: 'Estudo Profundo',  icon: <Zap className="h-3 w-3" />,        color: 'hsl(270 70% 60%)' },
  spaced_review:    { label: 'Revisão Espaçada', icon: <RefreshCw className="h-3 w-3" />,  color: 'hsl(142 71% 45%)' },
  practice:         { label: 'Exercícios',       icon: <Star className="h-3 w-3" />,       color: 'hsl(330 80% 60%)' },
};

// ─── Componente de um slot de estudo ─────────────────────────────────
function SlotCard({ slot }: { slot: CycleSlot }) {
  const typeConf = TYPE_CONFIG[slot.type] ?? TYPE_CONFIG.syllabus_week;
  return (
    <div
      className="rounded-lg p-2 mb-2 text-xs"
      style={{
        background: `${slot.color ?? typeConf.color}18`,
        borderLeft: `3px solid ${slot.color ?? typeConf.color}`,
        border: `1px solid ${slot.color ?? typeConf.color}30`,
      }}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="font-bold truncate" style={{ color: slot.color ?? typeConf.color }}>
          {slot.subjectName}
        </span>
        <span className="flex-shrink-0 flex items-center gap-1" style={{ color: muted }}>
          <Clock className="h-3 w-3" />
          {slot.duration}min
        </span>
      </div>
      <div className="flex items-center gap-1 mb-1" style={{ color: muted }}>
        {typeConf.icon}
        <span>{typeConf.label}</span>
        <span className="ml-auto">{slot.startTime}</span>
      </div>
      {slot.topics && slot.topics.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {slot.topics.slice(0, 2).map((t, i) => (
            <div key={i} className="truncate" style={{ color: 'hsl(210 40% 80%)' }}>• {t}</div>
          ))}
          {slot.topics.length > 2 && (
            <div style={{ color: muted }}>+{slot.topics.length - 2} tópicos</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────
export default function WeeklySchedule() {
  const { subjects, topics, studySessions, userProfile } = useStudy();
  const [refreshKey, setRefreshKey] = useState(0);

  // Extrair dados do onboarding do perfil
  const onboarding = useMemo<OnboardingData>(() => {
    const profile = userProfile as any;
    const od = profile?.onboarding_data ?? {};
    return {
      dailyHours: od.dailyHours ?? '1to2',
      studyDays: od.studyDays ?? ['seg', 'ter', 'qua', 'qui', 'sex'],
      studyStartTime: od.studyStartTime ?? '08:00',
      examDate: od.examDate ?? profile?.examDate ?? '',
    };
  }, [userProfile]);

  // Montar topicsBySubject
  const topicsBySubject = useMemo(() => {
    const map: Record<string, string[]> = {};
    topics.forEach(t => {
      if (!map[t.subjectId]) map[t.subjectId] = [];
      if (t.status !== 'completed') map[t.subjectId].push(t.name);
    });
    return map;
  }, [topics]);

  // Extrair dificuldades
  const difficultyTopics = useMemo(
    () => extractDifficultyTopics(studySessions as any, subjects),
    [studySessions, subjects]
  );

  // Gerar ciclo
  const cycleResult = useMemo(() => {
    if (subjects.length === 0) return null;
    try {
      return generateStudentCycle(
        'student',
        (userProfile as any)?.name ?? 'Estudante',
        onboarding,
        subjects,
        topicsBySubject,
        difficultyTopics
      );
    } catch {
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, topicsBySubject, difficultyTopics, onboarding, refreshKey]);

  const byDay = useMemo(
    () => (cycleResult ? formatCycleForWeek(cycleResult) : {}),
    [cycleResult]
  );

  // Dias que têm conteúdo
  const activeDays = DAYS.filter(d => (byDay[d.num] ?? []).length > 0);

  const handlePrint = () => window.print();

  // ─── Sem dados ────────────────────────────────────────────────────
  if (subjects.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-20">
          <CalendarDays className="h-16 w-16 mx-auto mb-4" style={{ color: muted }} />
          <h2 className="text-xl font-bold text-white mb-2">Nenhuma disciplina cadastrada</h2>
          <p style={{ color: muted }}>
            Complete o onboarding selecionando um edital para gerar sua agenda semanal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Estilos de impressão ── */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-card { background: white !important; border: 1px solid #ddd !important; break-inside: avoid; }
          .print-slot { background: #f5f5f5 !important; border-left: 3px solid #333 !important; }
          .print-header { color: black !important; }
        }
      `}</style>

      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">

        {/* ── Cabeçalho ── */}
        <div className="flex items-center justify-between mb-6 no-print">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
              <CalendarDays className="h-7 w-7" style={{ color: primaryBlue }} />
              Agenda Semanal
            </h1>
            <p className="mt-1 text-sm" style={{ color: muted }}>
              Ciclo gerado automaticamente com base no seu edital e disponibilidade
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey(k => k + 1)}
              className="no-print"
              style={{ borderColor: border, color: muted }}
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Regenerar
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="no-print"
              style={{ background: primaryBlue }}
            >
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
          </div>
        </div>

        {/* ── Resumo semanal ── */}
        {cycleResult && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 no-print">
            {[
              { label: 'Horas semanais', value: `${cycleResult.weeklyHours.toFixed(1)}h` },
              { label: 'Sessões', value: cycleResult.slots.length },
              { label: 'Disciplinas', value: subjects.length },
              { label: 'Dias ativos', value: activeDays.length },
            ].map(item => (
              <Card key={item.label} className="p-3 text-center" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-2xl font-bold text-white">{item.value}</div>
                <div className="text-xs mt-1" style={{ color: muted }}>{item.label}</div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Recomendações ── */}
        {cycleResult && cycleResult.recommendations.length > 0 && (
          <Card className="p-4 mb-6 no-print" style={{ background: 'hsl(217 91% 60% / 0.08)', border: '1px solid hsl(217 91% 60% / 0.2)' }}>
            <h3 className="text-sm font-semibold text-white mb-2">💡 Recomendações do ciclo</h3>
            <ul className="space-y-1">
              {cycleResult.recommendations.map((rec, i) => (
                <li key={i} className="text-sm" style={{ color: 'hsl(217 91% 75%)' }}>• {rec}</li>
              ))}
            </ul>
          </Card>
        )}

        {/* ── Grade semanal ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DAYS.map(day => {
            const slots = byDay[day.num] ?? [];
            const totalMin = slots.reduce((s, sl) => s + sl.duration, 0);
            if (slots.length === 0) return null;

            return (
              <Card
                key={day.num}
                className="p-4 print-card"
                style={{ background: cardBg, border: `1px solid ${border}` }}
              >
                {/* Cabeçalho do dia */}
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-white print-header">{day.label}</h2>
                  <Badge
                    className="text-xs"
                    style={{ background: 'hsl(217 91% 60% / 0.15)', color: primaryBlue, border: 'none' }}
                  >
                    {(totalMin / 60).toFixed(1)}h
                  </Badge>
                </div>

                {/* Slots do dia */}
                <div>
                  {slots.map((slot, i) => (
                    <div key={i} className="print-slot">
                      <SlotCard slot={slot} />
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        {/* ── Distribuição por disciplina ── */}
        {cycleResult && (
          <Card className="p-4 mt-6" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <h3 className="text-sm font-semibold text-white mb-3">Distribuição semanal por disciplina</h3>
            <div className="space-y-2">
              {subjects
                .filter(s => (cycleResult.distribution[s.id] ?? 0) > 0)
                .sort((a, b) => (cycleResult.distribution[b.id] ?? 0) - (cycleResult.distribution[a.id] ?? 0))
                .map(subject => {
                  const minutes = cycleResult.distribution[subject.id] ?? 0;
                  const pct = cycleResult.totalMinutes > 0
                    ? Math.round((minutes / cycleResult.totalMinutes) * 100)
                    : 0;
                  return (
                    <div key={subject.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: subject.color ?? primaryBlue }}>{subject.name}</span>
                        <span style={{ color: muted }}>{(minutes / 60).toFixed(1)}h ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: border }}>
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%`, background: subject.color ?? primaryBlue }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        )}

        {/* ── Rodapé de impressão ── */}
        <div className="hidden print:block mt-6 text-center text-xs text-gray-500">
          Gerado pelo StudyFlow — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
    </>
  );
}
