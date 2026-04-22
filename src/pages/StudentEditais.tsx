import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pin, ChevronDown, ChevronUp, ChevronsUpDown, BookOpen, RefreshCw, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { presetExams } from '@/data/presetExams';
import { useStudy } from '@/contexts/StudyContext';
import { localDateStr } from '@/lib/dateUtils';

// ─── Tipos ────────────────────────────────────────────────────────────
type ColType = 'studied' | 'rev1' | 'rev7' | 'rev30';

interface TopicState {
  studied: boolean;
  rev1: boolean;
  rev7: boolean;
  rev30: boolean;
}

// ─── Estilos ──────────────────────────────────────────────────────────
const cardBg = 'hsl(var(--card))';
const border = 'hsl(var(--border))';
const muted = 'hsl(var(--muted-foreground))';
const primaryBlue = 'hsl(var(--primary))';
const primaryGradient = 'var(--gradient-primary)';
const ACTIVE_KEY = 'studyflow_active_edital';

const COL_CONFIG: { type: ColType; label: string; color: string }[] = [
  { type: 'studied', label: 'Estudado',  color: primaryBlue },
  { type: 'rev1',    label: 'Rev. 1D',   color: 'hsl(142 71% 45%)' },
  { type: 'rev7',    label: 'Rev. 7D',   color: 'hsl(280 80% 65%)' },
  { type: 'rev30',   label: 'Rev. 30D',  color: 'hsl(35 90% 55%)' },
];

function getSubjectColor(name: string): string {
  const map: [string, string][] = [
    ['Matem', 'hsl(var(--primary))'],
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

// ─── Bolinha de status clicável ───────────────────────────────────────
interface StatusDotProps {
  active: boolean;
  color: string;
  loading?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}

function StatusDot({ active, color, loading, disabled, title, onClick }: StatusDotProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1"
      style={{
        background: active ? color : 'transparent',
        border: `2px solid ${active ? color : 'hsl(var(--border))'}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        boxShadow: active ? `0 0 8px ${color}60` : 'none',
        focusRingColor: color,
      }}
    >
      {loading && <Loader2 className="h-3 w-3 animate-spin" style={{ color: active ? 'white' : muted }} />}
      {!loading && active && (
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────
const StudentEditais: React.FC = () => {
  const { subjects, topics, studySessions, reviews, addStudySession, updateTopicStatus, addTopic, removePreset, loading } = useStudy();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDeletePreset = async (presetId: string) => {
    await removePreset(presetId);
    setConfirmDelete(null);
    if (activeExamId === presetId) {
      const next = presetExams.find(e => e.id !== presetId);
      if (next) setActiveExamId(next.id);
    }
    toast.success('Edital removido do seu plano.');
  };

  const [activeExamId, setActiveExamId] = useState<string>(() =>
    localStorage.getItem(ACTIVE_KEY) || presetExams[0]?.id || '');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Controle de loading por bolinha: key = "subjectName|topicName|colType"
  const [saving, setSaving] = useState<Set<string>>(new Set());

  const activeExam = useMemo(() =>
    presetExams.find(e => e.id === activeExamId) || presetExams[0], [activeExamId]);

  useEffect(() => { localStorage.setItem(ACTIVE_KEY, activeExamId); setExpanded(new Set()); }, [activeExamId]);

  // ── Lookup: topicName (lowercase) → topic do banco ──────────────────
  const topicByName = useMemo(() => {
    const map = new Map<string, typeof topics[0]>();
    for (const t of topics) map.set(t.name.toLowerCase().trim(), t);
    return map;
  }, [topics]);

  // ── Lookup: subjectName (lowercase) → subject do banco ──────────────
  const subjectByName = useMemo(() => {
    const map = new Map<string, typeof subjects[0]>();
    for (const s of subjects) map.set(s.name.toLowerCase().trim(), s);
    return map;
  }, [subjects]);

  // ── Lookup: topicId → sessões de estudo ─────────────────────────────
  const sessionsByTopic = useMemo(() => {
    const map = new Map<string, typeof studySessions[0][]>();
    for (const s of studySessions) {
      if (!map.has(s.topicId)) map.set(s.topicId, []);
      map.get(s.topicId)!.push(s);
    }
    return map;
  }, [studySessions]);

  // ── Lookup: topicId → revisões concluídas por tipo ──────────────────
  const completedReviewsByTopic = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of reviews) {
      if (!r.completed) continue;
      if (!map.has(r.topicId)) map.set(r.topicId, new Set());
      map.get(r.topicId)!.add(r.type); // 'D1', 'D7', 'D30'
    }
    return map;
  }, [reviews]);

  // ── Estado derivado de cada tópico ──────────────────────────────────
  function getTopicState(topicName: string): TopicState {
    const dbTopic = topicByName.get(topicName.toLowerCase().trim());
    if (!dbTopic) return { studied: false, rev1: false, rev7: false, rev30: false };

    const hasSessions = (sessionsByTopic.get(dbTopic.id) ?? []).length > 0;
    const studied = hasSessions || dbTopic.status === 'in_progress' || dbTopic.status === 'completed';
    const doneReviews = completedReviewsByTopic.get(dbTopic.id) ?? new Set<string>();

    return {
      studied,
      rev1: doneReviews.has('D1'),
      rev7: doneReviews.has('D7'),
      rev30: doneReviews.has('D30'),
    };
  }

  // ── Ação ao clicar numa bolinha ──────────────────────────────────────
  const handleDotClick = useCallback(async (
    subjectName: string,
    topicName: string,
    colType: ColType,
    currentState: TopicState
  ) => {
    const dotKey = `${subjectName}|${topicName}|${colType}`;
    if (saving.has(dotKey)) return;

    // Encontrar ou criar o subject no banco
    let dbSubject = subjectByName.get(subjectName.toLowerCase().trim());
    if (!dbSubject) {
      toast.error('Importe o edital primeiro em "Plano de Estudos" para marcar tópicos.');
      return;
    }

    // Encontrar ou criar o tópico no banco
    let dbTopic = topicByName.get(topicName.toLowerCase().trim());
    if (!dbTopic) {
      // Criar o tópico automaticamente ao marcar
      try {
        await addTopic(dbSubject.id, topicName);
        // Aguardar um tick para o estado atualizar
        await new Promise(r => setTimeout(r, 300));
        dbTopic = topicByName.get(topicName.toLowerCase().trim());
      } catch {
        toast.error('Erro ao criar tópico.');
        return;
      }
      if (!dbTopic) {
        toast.error('Tópico não encontrado. Tente novamente.');
        return;
      }
    }

    setSaving(prev => new Set(prev).add(dotKey));

    try {
      if (colType === 'studied') {
        if (!currentState.studied) {
          // Marcar como estudado: criar sessão de estudo mínima
          await addStudySession({
            topicId: dbTopic.id,
            subjectId: dbSubject.id,
            date: localDateStr(),
            minutesStudied: 30,
            questionsTotal: 0,
            questionsCorrect: 0,
            pagesRead: 0,
            videosWatched: 0,
            notes: 'Marcado via edital verticalizado',
            sessionType: 'study',
          });
          toast.success(`✅ "${topicName}" marcado como estudado!`);
        } else {
          // Desmarcar: mudar status para not_started
          await updateTopicStatus(dbTopic.id, 'not_started');
          toast.info(`↩️ "${topicName}" desmarcado.`);
        }
      } else {
        // Revisões: apenas feedback visual (as revisões reais são agendadas automaticamente)
        // Se quiser marcar manualmente uma revisão como concluída, usa a tela de Revisões
        toast.info('Para marcar revisões, acesse a tela de Revisões e conclua as pendentes.');
      }
    } catch (err) {
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(dotKey); return n; });
    }
  }, [saving, subjectByName, topicByName, addStudySession, updateTopicStatus, addTopic]);

  // ── Estatísticas globais ─────────────────────────────────────────────
  const globalStats = useMemo(() => {
    if (!activeExam) return { studied: 0, rev1: 0, rev7: 0, rev30: 0, total: 0 };
    let total = 0, studied = 0, rev1 = 0, rev7 = 0, rev30 = 0;
    for (const sub of activeExam.subjects) {
      for (const topic of sub.topics) {
        total++;
        const state = getTopicState(topic);
        if (state.studied) studied++;
        if (state.rev1) rev1++;
        if (state.rev7) rev7++;
        if (state.rev30) rev30++;
      }
    }
    return { total, studied, rev1, rev7, rev30 };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExam, topicByName, sessionsByTopic, completedReviewsByTopic]);

  function getSubjectStats(subjectName: string) {
    const sub = activeExam?.subjects.find(s => s.name === subjectName);
    if (!sub) return { total: 0, studied: 0 };
    const studied = sub.topics.filter(t => getTopicState(t).studied).length;
    return { total: sub.topics.length, studied };
  }

  function handleSelectExam(id: string) {
    setActiveExamId(id);
    toast.success(`Edital "${presetExams.find(e => e.id === id)?.name}" selecionado!`);
  }

  if (!activeExam) return null;
  const pct = (n: number) => globalStats.total > 0 ? Math.round((n / globalStats.total) * 100) : 0;

  const progressItems = [
    { label: 'Estudado',    value: globalStats.studied, color: primaryBlue,            icon: '📖' },
    { label: 'Revisão 1D',  value: globalStats.rev1,    color: 'hsl(142 71% 45%)',     icon: '🔄' },
    { label: 'Revisão 7D',  value: globalStats.rev7,    color: 'hsl(280 80% 65%)',     icon: '🔁' },
    { label: 'Revisão 30D', value: globalStats.rev30,   color: 'hsl(35 90% 55%)',      icon: '✅' },
  ];

  const dbSubjectMap = subjectByName;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Edital Verticalizado</h1>
          <p className="mt-1 text-sm" style={{ color: muted }}>
            Clique nas bolinhas para marcar seu progresso por tópico
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs" style={{ color: muted }}>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sincronizando...
          </div>
        )}
      </div>

      {/* Aviso sem edital importado */}
      {subjects.length === 0 && !loading && (
        <Card className="mb-6 p-4 flex items-center gap-3" style={{ background: 'hsl(35 90% 55% / 0.1)', border: '1px solid hsl(35 90% 55% / 0.3)' }}>
          <span className="text-lg">⚠️</span>
          <p className="text-sm" style={{ color: 'hsl(35 90% 65%)' }}>
            Nenhum edital importado ainda. Acesse <strong>Plano de Estudos</strong> para importar um edital.
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
              <div key={exam.id} className="flex items-center gap-1">
                <button
                  onClick={() => handleSelectExam(exam.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: activeExamId === exam.id ? primaryGradient : cardBg,
                    border: `1px solid ${activeExamId === exam.id ? 'transparent' : border}`,
                    color: activeExamId === exam.id ? 'white' : muted,
                    boxShadow: activeExamId === exam.id ? '0 0 16px hsl(var(--primary) / 0.25)' : 'none',
                  }}
                >
                  {activeExamId === exam.id && <Pin className="h-3.5 w-3.5" />}
                  {exam.name}
                  {hasImported && (
                    <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Importado no seu plano" />
                  )}
                </button>
                {hasImported && (
                  confirmDelete === exam.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDeletePreset(exam.id)}
                        className="px-2 py-1 rounded-lg text-xs font-medium"
                        style={{ background: 'hsl(0 70% 50%)', color: 'white' }}
                      >Confirmar</button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1 rounded-lg text-xs"
                        style={{ color: muted, border: `1px solid ${border}` }}
                      >Cancelar</button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(exam.id); }}
                      title="Remover edital do plano"
                      className="p-1.5 rounded-lg transition-all hover:bg-red-500/20"
                      style={{ color: muted }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progresso global */}
      <Card className="mb-6 p-5" style={{ background: cardBg, border: `1px solid ${border}` }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4" style={{ color: primaryBlue }} />
            Seu Progresso — {activeExam.name}
          </h2>
          <Badge style={{ background: 'hsl(var(--primary) / 0.15)', color: primaryBlue, border: `1px solid hsl(var(--primary) / 0.3)` }}>
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
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
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
        <p className="text-sm font-medium text-foreground">{activeExam.subjects.length} disciplinas</p>
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
                onClick={() => {
                  setExpanded(prev => {
                    const n = new Set(prev);
                    n.has(subject.name) ? n.delete(subject.name) : n.add(subject.name);
                    return n;
                  });
                }}
                className="w-full flex items-center justify-between px-4 py-3.5 transition-all"
                style={{ background: isOpen ? 'hsl(var(--muted))' : cardBg }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="font-semibold text-foreground text-sm truncate">{subject.name}</span>
                  <Badge
                    className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0"
                    style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                  >
                    {subject.topics.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
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

              {/* Lista de tópicos */}
              {isOpen && (
                <div style={{ background: 'hsl(var(--background))' }}>
                  {/* Cabeçalho das colunas */}
                  <div
                    className="flex items-center px-4 py-2 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: muted, borderBottom: `1px solid ${border}` }}
                  >
                    <span className="flex-1">Tópico</span>
                    <div className="flex gap-2 flex-shrink-0">
                      {COL_CONFIG.map(col => (
                        <span
                          key={col.type}
                          className="w-9 text-center"
                          style={{ color: col.color }}
                        >
                          {col.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {subject.topics.map((topic, idx) => {
                    const state = getTopicState(topic);

                    return (
                      <div
                        key={topic}
                        className="flex items-center px-4 py-2.5"
                        style={{
                          background: idx % 2 === 0 ? 'hsl(var(--background))' : 'hsl(var(--card))',
                          borderBottom: idx < subject.topics.length - 1 ? `1px solid hsl(var(--border))` : 'none',
                        }}
                      >
                        {/* Nome do tópico */}
                        <span
                          className="flex-1 text-sm pr-4 leading-snug"
                          style={{ color: state.studied ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))' }}
                        >
                          {idx + 1}. {topic}
                        </span>

                        {/* Bolinhas de status */}
                        <div className="flex gap-2 flex-shrink-0">
                          {COL_CONFIG.map(col => {
                            const dotKey = `${subject.name}|${topic}|${col.type}`;
                            const isActive = state[col.type];
                            const isLoading = saving.has(dotKey);

                            // Revisões só ficam ativas se já estudou
                            // Mas são clicáveis para informar o usuário
                            const isDisabled = col.type !== 'studied' && !state.studied;

                            const title = col.type === 'studied'
                              ? (isActive ? 'Clique para desmarcar' : 'Clique para marcar como estudado')
                              : isDisabled
                                ? 'Estude o tópico primeiro'
                                : (isActive
                                    ? `${col.label} concluída`
                                    : `Marque na tela de Revisões`);

                            return (
                              <div key={col.type} className="w-9 flex justify-center">
                                <StatusDot
                                  active={isActive}
                                  color={col.color}
                                  loading={isLoading}
                                  disabled={isDisabled}
                                  title={title}
                                  onClick={() => handleDotClick(subject.name, topic, col.type, state)}
                                />
                              </div>
                            );
                          })}
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

      {/* Legenda */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        {COL_CONFIG.map(col => (
          <div key={col.type} className="flex items-center gap-2 text-xs" style={{ color: muted }}>
            <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: col.color, background: `${col.color}30` }} />
            {col.label}
          </div>
        ))}
      </div>
      <p className="text-xs text-center mt-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
        Revisões 1D, 7D e 30D são agendadas automaticamente ao marcar "Estudado" e concluídas na tela de Revisões.
      </p>
    </div>
  );
};

export default StudentEditais;
