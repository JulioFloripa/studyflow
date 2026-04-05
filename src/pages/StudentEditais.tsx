import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pin, ChevronDown, ChevronUp, CheckCircle2, Circle, ChevronsUpDown, BookOpen, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { presetExams } from '@/data/presetExams';
import { useStudy } from '@/contexts/StudyContext';

// Progress for the 3 review checkboxes is still stored locally (rev7/15/30)
// because the reviews table already handles this via the spaced repetition engine.
// The "Estudado" column is derived from the real topic status in the database.
type ReviewType = 'rev7' | 'rev15' | 'rev30';
type ReviewProgress = Record<string, { rev7: boolean; rev15: boolean; rev30: boolean }>;

const cardBg = 'hsl(222 47% 9%)';
const border = 'hsl(222 47% 16%)';
const muted = 'hsl(215 20% 50%)';
const primaryBlue = 'hsl(217 91% 60%)';
const primaryGradient = 'linear-gradient(135deg, hsl(217 91% 60%), hsl(240 80% 65%))';
const REVIEW_KEY = 'studyflow_review_checks_v1';
const ACTIVE_KEY = 'studyflow_active_edital';

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

function loadReviews(): ReviewProgress {
  try { return JSON.parse(localStorage.getItem(REVIEW_KEY) || '{}'); } catch { return {}; }
}

const StudentEditais: React.FC = () => {
  // Real data from the database via StudyContext
  const { subjects, topics, studySessions, loading } = useStudy();

  const [activeExamId, setActiveExamId] = useState<string>(() =>
    localStorage.getItem(ACTIVE_KEY) || presetExams[0]?.id || '');
  const [reviewProgress, setReviewProgress] = useState<ReviewProgress>(loadReviews);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const activeExam = useMemo(() =>
    presetExams.find(e => e.id === activeExamId) || presetExams[0], [activeExamId]);

  useEffect(() => { localStorage.setItem(REVIEW_KEY, JSON.stringify(reviewProgress)); }, [reviewProgress]);
  useEffect(() => { localStorage.setItem(ACTIVE_KEY, activeExamId); setExpanded(new Set()); }, [activeExamId]);

  // Build a lookup: topicName -> isStudied (from real DB topics)
  const studiedTopicNames = useMemo(() => {
    const studied = new Set<string>();
    for (const topic of topics) {
      if (topic.status === 'in_progress' || topic.status === 'completed') {
        studied.add(topic.name.toLowerCase().trim());
      }
    }
    // Also mark topics that have at least one study session
    for (const session of studySessions) {
      const t = topics.find(tp => tp.id === session.topicId);
      if (t) studied.add(t.name.toLowerCase().trim());
    }
    return studied;
  }, [topics, studySessions]);

  // Build a lookup: subjectName -> Subject (from DB)
  const dbSubjectMap = useMemo(() => {
    const map = new Map<string, typeof subjects[0]>();
    for (const s of subjects) map.set(s.name.toLowerCase().trim(), s);
    return map;
  }, [subjects]);

  function isTopicStudied(topicName: string): boolean {
    return studiedTopicNames.has(topicName.toLowerCase().trim());
  }

  function toggleReview(subjectName: string, topic: string, type: ReviewType) {
    const key = `${activeExamId}|${subjectName}|${topic}`;
    setReviewProgress(prev => {
      const cur = prev[key] || { rev7: false, rev15: false, rev30: false };
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

  const globalStats = useMemo(() => {
    if (!activeExam) return { studied: 0, rev7: 0, rev15: 0, rev30: 0, total: 0 };
    let total = 0, studied = 0, rev7 = 0, rev15 = 0, rev30 = 0;
    for (const sub of activeExam.subjects) {
      for (const topic of sub.topics) {
        total++;
        if (isTopicStudied(topic)) studied++;
        const rp = reviewProgress[`${activeExamId}|${sub.name}|${topic}`];
        if (rp?.rev7) rev7++;
        if (rp?.rev15) rev15++;
        if (rp?.rev30) rev30++;
      }
    }
    return { total, studied, rev7, rev15, rev30 };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExam, activeExamId, studiedTopicNames, reviewProgress]);

  function getSubjectStats(subjectName: string) {
    const sub = activeExam?.subjects.find(s => s.name === subjectName);
    if (!sub) return { total: 0, studied: 0 };
    const studied = sub.topics.filter(t => isTopicStudied(t)).length;
    return { total: sub.topics.length, studied };
  }

  if (!activeExam) return null;
  const pct = (n: number) => globalStats.total > 0 ? Math.round((n / globalStats.total) * 100) : 0;

  const progressItems = [
    { label: 'Estudado', value: globalStats.studied, color: primaryBlue, icon: '📖' },
    { label: 'Revisão 7 dias', value: globalStats.rev7, color: 'hsl(142 71% 45%)', icon: '🔄' },
    { label: 'Revisão 15 dias', value: globalStats.rev15, color: 'hsl(280 80% 65%)', icon: '🔁' },
    { label: 'Revisão 30 dias', value: globalStats.rev30, color: 'hsl(35 90% 55%)', icon: '✅' },
  ];

  const reviewColumns: { type: ReviewType; color: string; cls: string; label: string }[] = [
    { type: 'rev7', color: 'hsl(142 71% 45%)', cls: 'w-14 justify-center hidden sm:flex', label: 'Rev. 7D' },
    { type: 'rev15', color: 'hsl(280 80% 65%)', cls: 'w-14 justify-center hidden sm:flex', label: 'Rev. 15D' },
    { type: 'rev30', color: 'hsl(35 90% 55%)', cls: 'w-14 justify-center hidden md:flex', label: 'Rev. 30D' },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Edital Verticalizado</h1>
          <p className="mt-1 text-sm" style={{ color: muted }}>
            Progresso sincronizado com seus estudos registrados
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs" style={{ color: muted }}>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sincronizando...
          </div>
        )}
      </div>

      {/* Aviso de sincronização */}
      {subjects.length === 0 && !loading && (
        <Card className="mb-6 p-4 flex items-center gap-3" style={{ background: 'hsl(35 90% 55% / 0.1)', border: '1px solid hsl(35 90% 55% / 0.3)' }}>
          <span className="text-lg">⚠️</span>
          <p className="text-sm" style={{ color: 'hsl(35 90% 65%)' }}>
            Nenhum edital importado ainda. Acesse <strong>Plano de Estudos</strong> para importar um edital e seus tópicos aparecerão aqui automaticamente.
          </p>
        </Card>
      )}

      {/* Seleção de edital */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: muted }}>
          Selecionar Edital
        </p>
        <div className="flex flex-wrap gap-2">
          {presetExams.map(exam => {
            const hasImported = exam.subjects.some(s => dbSubjectMap.has(s.name.toLowerCase().trim()));
            return (
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
                {hasImported && (
                  <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Importado no seu plano" />
                )}
              </button>
            );
          })}
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

              {isOpen && (
                <div style={{ background: 'hsl(222 47% 7%)' }}>
                  <div
                    className="flex items-center px-4 py-2 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: muted, borderBottom: `1px solid ${border}` }}
                  >
                    <span className="flex-1">Tópico</span>
                    <div className="flex gap-3 flex-shrink-0">
                      <span className="w-16 text-center">Estudado</span>
                      {reviewColumns.map(col => (
                        <span key={col.type} className={`text-center ${col.cls.replace('flex', 'block').replace('justify-center', '')}`}>
                          {col.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {subject.topics.map((topic, idx) => {
                    const studied = isTopicStudied(topic);
                    const rp = reviewProgress[`${activeExamId}|${subject.name}|${topic}`] || { rev7: false, rev15: false, rev30: false };

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
                          style={{ color: studied ? 'hsl(215 20% 55%)' : 'hsl(215 20% 80%)' }}
                        >
                          {idx + 1}. {topic}
                        </span>
                        <div className="flex gap-3 flex-shrink-0">
                          {/* Coluna Estudado — leitura do banco (somente leitura) */}
                          <div className="w-16 flex justify-center">
                            {studied
                              ? <CheckCircle2 className="h-5 w-5" style={{ color: primaryBlue }} title="Estudado (registrado no app)" />
                              : <Circle className="h-5 w-5" style={{ color: 'hsl(222 47% 28%)' }} title="Não estudado ainda" />
                            }
                          </div>
                          {/* Colunas de revisão — marcação manual */}
                          {reviewColumns.map(col => (
                            <div key={col.type} className={col.cls}>
                              <button
                                onClick={() => toggleReview(subject.name, topic, col.type)}
                                className="transition-transform hover:scale-110"
                                disabled={!studied}
                                title={studied ? `Marcar ${col.label}` : 'Estude o tópico primeiro'}
                              >
                                {rp[col.type]
                                  ? <CheckCircle2 className="h-5 w-5" style={{ color: col.color }} />
                                  : <Circle className="h-5 w-5" style={{ color: studied ? 'hsl(222 47% 28%)' : 'hsl(222 47% 18%)' }} />
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
        "Estudado" reflete seus registros reais. Revisões são marcadas manualmente.
      </p>
    </div>
  );
};

export default StudentEditais;
