import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pin, ChevronDown, ChevronUp, CheckCircle2, Circle, ChevronsUpDown, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { presetExams } from '@/data/presetExams';

type CheckType = 'studied' | 'rev7' | 'rev15' | 'rev30';
interface TopicProgress { studied: boolean; rev7: boolean; rev15: boolean; rev30: boolean; }
type EditalProgress = Record<string, TopicProgress>;

function getSubjectColor(name: string): string {
  const map: [string, string][] = [
    ['Matem', 'hsl(217 91% 60%)'],
    ['Física', 'hsl(280 80% 65%)'],
    ['Quím', 'hsl(142 71% 45%)'],
    ['Biolog', 'hsl(160 60% 45%)'],
    ['Portugu', 'hsl(35 90% 55%)'],
    ['Histór', 'hsl(15 80% 55%)'],
    ['Geograf', 'hsl(195 80% 50%)'],
    ['Filosofia', 'hsl(260 60% 60%)'],
    ['Artes', 'hsl(330 70% 60%)'],
    ['Língua', 'hsl(50 80% 55%)'],
    ['Inglês', 'hsl(50 80% 55%)'],
    ['Espanhol', 'hsl(50 80% 55%)'],
    ['Redação', 'hsl(25 85% 55%)'],
    ['Direito', 'hsl(200 75% 55%)'],
    ['Informática', 'hsl(170 70% 45%)'],
    ['Raciocínio', 'hsl(240 75% 60%)'],
  ];
  for (const [k, v] of map) {
    if (name.includes(k)) return v;
  }
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return `hsl(${hash % 360} 70% 55%)`;
}

const cardBg = 'hsl(222 47% 9%)';
const border = 'hsl(222 47% 16%)';
const muted = 'hsl(215 20% 50%)';
const primaryBlue = 'hsl(217 91% 60%)';
const primaryGradient = 'linear-gradient(135deg, hsl(217 91% 60%), hsl(240 80% 65%))';
const STORAGE_KEY = 'studyflow_edital_progress_v2';
const ACTIVE_KEY = 'studyflow_active_edital';

function loadProgress(): EditalProgress {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

const StudentEditais: React.FC = () => {
  const [activeExamId, setActiveExamId] = useState<string>(() =>
    localStorage.getItem(ACTIVE_KEY) || presetExams[0]?.id || '');
  const [progress, setProgress] = useState<EditalProgress>(loadProgress);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const activeExam = useMemo(() =>
    presetExams.find(e => e.id === activeExamId) || presetExams[0], [activeExamId]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }, [progress]);
  useEffect(() => { localStorage.setItem(ACTIVE_KEY, activeExamId); setExpanded(new Set()); }, [activeExamId]);

  const globalStats = useMemo(() => {
    if (!activeExam) return { studied: 0, rev7: 0, rev15: 0, rev30: 0, total: 0 };
    let total = 0, studied = 0, rev7 = 0, rev15 = 0, rev30 = 0;
    for (const sub of activeExam.subjects) {
      for (const topic of sub.topics) {
        total++;
        const p = progress[`${activeExamId}|${sub.name}|${topic}`];
        if (p?.studied) studied++;
        if (p?.rev7) rev7++;
        if (p?.rev15) rev15++;
        if (p?.rev30) rev30++;
      }
    }
    return { total, studied, rev7, rev15, rev30 };
  }, [activeExam, activeExamId, progress]);

  function getSubjectStats(subjectName: string) {
    const sub = activeExam?.subjects.find(s => s.name === subjectName);
    if (!sub) return { total: 0, studied: 0 };
    const studied = sub.topics.filter(t =>
      progress[`${activeExamId}|${subjectName}|${t}`]?.studied).length;
    return { total: sub.topics.length, studied };
  }

  function toggleCheck(subjectName: string, topic: string, type: CheckType) {
    const key = `${activeExamId}|${subjectName}|${topic}`;
    setProgress(prev => {
      const cur = prev[key] || { studied: false, rev7: false, rev15: false, rev30: false };
      return { ...prev, [key]: { ...cur, [type]: !cur[type] } };
    });
  }

  function toggleSubject(name: string) {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  }

  function handleSelectExam(id: string) {
    setActiveExamId(id);
    toast.success(`Edital "${presetExams.find(e => e.id === id)?.name}" selecionado!`);
  }

  if (!activeExam) return null;
  const pct = (n: number) => globalStats.total > 0 ? Math.round((n / globalStats.total) * 100) : 0;

  const progressItems = [
    { label: 'Estudado', value: globalStats.studied, color: primaryBlue, icon: '📖' },
    { label: 'Revisão 7 dias', value: globalStats.rev7, color: 'hsl(142 71% 45%)', icon: '🔄' },
    { label: 'Revisão 15 dias', value: globalStats.rev15, color: 'hsl(280 80% 65%)', icon: '🔁' },
    { label: 'Revisão 30 dias', value: globalStats.rev30, color: 'hsl(35 90% 55%)', icon: '✅' },
  ];

  const checkColumns: { type: CheckType; color: string; cls: string }[] = [
    { type: 'studied', color: primaryBlue, cls: 'w-16 flex justify-center' },
    { type: 'rev7', color: 'hsl(142 71% 45%)', cls: 'w-14 justify-center hidden sm:flex' },
    { type: 'rev15', color: 'hsl(280 80% 65%)', cls: 'w-14 justify-center hidden sm:flex' },
    { type: 'rev30', color: 'hsl(35 90% 55%)', cls: 'w-14 justify-center hidden md:flex' },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Edital Verticalizado</h1>
        <p className="mt-1 text-sm" style={{ color: muted }}>
          Acompanhe seu progresso em cada tópico do edital
        </p>
      </div>

      {/* Seleção de edital */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: muted }}>
          Selecionar Edital
        </p>
        <div className="flex flex-wrap gap-2">
          {presetExams.map(exam => (
            <button
              key={exam.id}
              onClick={() => handleSelectExam(exam.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: activeExamId === exam.id ? primaryGradient : cardBg,
                border: `1px solid ${activeExamId === exam.id ? 'transparent' : border}`,
                color: activeExamId === exam.id ? 'white' : muted,
                boxShadow: activeExamId === exam.id ? '0 0 16px hsl(217 91% 60% / 0.25)' : 'none',
              }}
            >
              {activeExamId === exam.id && <Pin className="h-3.5 w-3.5" />}
              {exam.name}
            </button>
          ))}
        </div>
      </div>

      {/* Progresso global */}
      <Card className="mb-6 p-5" style={{ background: cardBg, border: `1px solid ${border}` }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <BookOpen className="h-4 w-4" style={{ color: primaryBlue }} />
            Seu Progresso — {activeExam.name}
          </h2>
          <Badge style={{
            background: 'hsl(217 91% 60% / 0.15)',
            color: primaryBlue,
            border: `1px solid hsl(217 91% 60% / 0.3)`
          }}>
            {globalStats.total} tópicos
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {progressItems.map(item => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: muted }}>
                  {item.icon} {item.label}
                </span>
                <span className="text-xs font-bold" style={{ color: item.color }}>
                  {pct(item.value)}% ({item.value}/{globalStats.total})
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(222 47% 14%)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct(item.value)}%`, background: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Controles */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-white">{activeExam.subjects.length} disciplinas</p>
        <div className="flex gap-2">
          <Button
            size="sm" variant="ghost"
            onClick={() => setExpanded(new Set(activeExam.subjects.map(s => s.name)))}
            className="text-xs h-8"
            style={{ color: muted, border: `1px solid ${border}` }}
          >
            <ChevronsUpDown className="h-3.5 w-3.5 mr-1" /> Expandir Todas
          </Button>
          <Button
            size="sm" variant="ghost"
            onClick={() => setExpanded(new Set())}
            className="text-xs h-8"
            style={{ color: muted, border: `1px solid ${border}` }}
          >
            <ChevronUp className="h-3.5 w-3.5 mr-1" /> Retrair Todas
          </Button>
        </div>
      </div>

      {/* Disciplinas */}
      <div className="space-y-2">
        {activeExam.subjects.map(subject => {
          const isOpen = expanded.has(subject.name);
          const color = getSubjectColor(subject.name);
          const stats = getSubjectStats(subject.name);
          const subPct = stats.total > 0 ? Math.round((stats.studied / stats.total) * 100) : 0;

          return (
            <div key={subject.name} style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
              {/* Cabeçalho da disciplina */}
              <button
                onClick={() => toggleSubject(subject.name)}
                className="w-full flex items-center justify-between px-4 py-3.5 transition-all"
                style={{ background: isOpen ? 'hsl(222 47% 12%)' : cardBg }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="font-semibold text-white text-sm truncate">{subject.name}</span>
                  <Badge
                    className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0"
                    style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                  >
                    {subject.topics.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(222 47% 18%)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${subPct}%`, background: color }} />
                    </div>
                    <span className="text-xs font-medium" style={{ color }}>{subPct}%</span>
                  </div>
                  {isOpen
                    ? <ChevronUp className="h-4 w-4" style={{ color: muted }} />
                    : <ChevronDown className="h-4 w-4" style={{ color: muted }} />
                  }
                </div>
              </button>

              {/* Tópicos */}
              {isOpen && (
                <div style={{ background: 'hsl(222 47% 7%)' }}>
                  {/* Header das colunas */}
                  <div
                    className="flex items-center px-4 py-2 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: muted, borderBottom: `1px solid ${border}` }}
                  >
                    <span className="flex-1">Tópico</span>
                    <div className="flex gap-3 flex-shrink-0">
                      <span className="w-16 text-center">Estudado</span>
                      <span className="w-14 text-center hidden sm:block">Rev. 7D</span>
                      <span className="w-14 text-center hidden sm:block">Rev. 15D</span>
                      <span className="w-14 text-center hidden md:block">Rev. 30D</span>
                    </div>
                  </div>

                  {/* Linhas */}
                  {subject.topics.map((topic, idx) => {
                    const key = `${activeExamId}|${subject.name}|${topic}`;
                    const p = progress[key] || { studied: false, rev7: false, rev15: false, rev30: false };

                    return (
                      <div
                        key={topic}
                        className="flex items-center px-4 py-2.5"
                        style={{
                          background: idx % 2 === 0 ? 'hsl(222 47% 7%)' : 'hsl(222 47% 8.5%)',
                          borderBottom: idx < subject.topics.length - 1 ? `1px solid hsl(222 47% 12%)` : 'none',
                        }}
                      >
                        <span
                          className="flex-1 text-sm pr-4 leading-snug"
                          style={{ color: p.studied ? 'hsl(215 20% 55%)' : 'hsl(215 20% 80%)' }}
                        >
                          {idx + 1}. {topic}
                        </span>
                        <div className="flex gap-3 flex-shrink-0">
                          {checkColumns.map(({ type, color: c, cls }) => (
                            <div key={type} className={cls}>
                              <button
                                onClick={() => toggleCheck(subject.name, topic, type)}
                                className="transition-transform hover:scale-110"
                                disabled={type !== 'studied' && !p.studied}
                              >
                                {p[type]
                                  ? <CheckCircle2 className="h-5 w-5" style={{ color: c }} />
                                  : <Circle className="h-5 w-5" style={{
                                    color: (type === 'studied' || p.studied)
                                      ? 'hsl(222 47% 28%)'
                                      : 'hsl(222 47% 18%)'
                                  }} />
                                }
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center mt-6" style={{ color: 'hsl(222 47% 30%)' }}>
        Seu progresso é salvo automaticamente no dispositivo.
      </p>
    </div>
  );
};

export default StudentEditais;
