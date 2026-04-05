import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, BookOpen, Clock, Calendar, Target, Pin, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useStudy } from '@/contexts/StudyContext';
import { presetExams } from '@/data/presetExams';

const cardBg = 'hsl(222 47% 9%)';
const border = 'hsl(222 47% 16%)';
const muted = 'hsl(215 20% 50%)';
const primaryBlue = 'hsl(217 91% 60%)';
const primaryGradient = 'linear-gradient(135deg, hsl(217 91% 60%), hsl(240 80% 65%))';

const DAY_LABELS: Record<string, string> = {
  seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom',
};
const DAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

const OBJECTIVES = [
  { value: 'ENEM', label: 'ENEM' },
  { value: 'Vestibular UFSC', label: 'Vestibular UFSC' },
  { value: 'GAC Fleming', label: 'GAC Fleming' },
  { value: 'Concurso Público', label: 'Concurso Público' },
  { value: 'Residência Médica', label: 'Residência Médica' },
  { value: 'OAB', label: 'OAB' },
  { value: 'Outro', label: 'Outro' },
];

const MyPlan: React.FC = () => {
  const { userProfile, updateProfile, importPreset, importedPresets, subjects, loading } = useStudy();

  const [availability, setAvailability] = useState<Record<string, number>>(
    userProfile.availability || { seg: 2, ter: 2, qua: 2, qui: 2, sex: 2, sab: 4, dom: 4 }
  );
  const [examDate, setExamDate] = useState(userProfile.examDate || '');
  const [weeklyGoal, setWeeklyGoal] = useState(userProfile.weeklyGoalHours || 20);
  const [objective, setObjective] = useState(userProfile.objective || '');
  const [saving, setSaving] = useState(false);
  const [importingPreset, setImportingPreset] = useState<string | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState<string | null>(null);

  const totalWeeklyHours = Object.values(availability).reduce((a, b) => a + b, 0);

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({ availability, examDate, weeklyGoalHours: weeklyGoal, objective });
      toast.success('Plano de estudos atualizado!');
    } catch {
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleImportPreset(presetId: string) {
    setImportingPreset(presetId);
    try {
      await importPreset(presetId);
      const exam = presetExams.find(e => e.id === presetId);
      toast.success(`Edital "${exam?.name}" importado! Disciplinas e tópicos adicionados ao seu plano.`);
    } catch {
      toast.error('Erro ao importar edital.');
    } finally {
      setImportingPreset(null);
      setShowImportConfirm(null);
    }
  }

  function updateDay(day: string, hours: number) {
    setAvailability(prev => ({ ...prev, [day]: Math.max(0, Math.min(12, hours)) }));
  }

  // Days until exam
  const daysUntilExam = examDate
    ? Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Meu Plano</h1>
        <p className="mt-1 text-sm" style={{ color: muted }}>
          Atualize seu edital, disponibilidade e metas a qualquer momento
        </p>
      </div>

      {/* Resumo atual */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Clock, label: 'Horas/semana', value: `${totalWeeklyHours}h`, color: primaryBlue },
          { icon: BookOpen, label: 'Disciplinas', value: subjects.length.toString(), color: 'hsl(142 71% 45%)' },
          { icon: Target, label: 'Meta semanal', value: `${weeklyGoal}h`, color: 'hsl(280 80% 65%)' },
          { icon: Calendar, label: 'Dias p/ prova', value: daysUntilExam !== null ? `${daysUntilExam}d` : '—', color: 'hsl(35 90% 55%)' },
        ].map(item => (
          <Card key={item.label} className="p-3 text-center" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <item.icon className="h-4 w-4 mx-auto mb-1" style={{ color: item.color }} />
            <p className="text-lg font-bold text-white">{item.value}</p>
            <p className="text-[10px]" style={{ color: muted }}>{item.label}</p>
          </Card>
        ))}
      </div>

      {/* Seção: Edital */}
      <Card className="mb-4 p-5" style={{ background: cardBg, border: `1px solid ${border}` }}>
        <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
          <Pin className="h-4 w-4" style={{ color: primaryBlue }} />
          Edital / Prova
        </h2>
        <p className="text-xs mb-4" style={{ color: muted }}>
          Importe um edital para adicionar todas as disciplinas e tópicos ao seu plano automaticamente.
        </p>

        <div className="space-y-2">
          {presetExams.map(exam => {
            const imported = importedPresets.includes(exam.id);
            const isImporting = importingPreset === exam.id;
            const isConfirming = showImportConfirm === exam.id;

            return (
              <div
                key={exam.id}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  background: imported ? 'hsl(217 91% 60% / 0.08)' : 'hsl(222 47% 12%)',
                  border: `1px solid ${imported ? 'hsl(217 91% 60% / 0.3)' : border}`,
                }}
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-white">{exam.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: muted }}>
                    {exam.subjects.length} disciplinas · {exam.subjects.reduce((a, s) => a + s.topics.length, 0)} tópicos
                  </p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  {imported ? (
                    <Badge style={{ background: 'hsl(217 91% 60% / 0.15)', color: primaryBlue, border: `1px solid hsl(217 91% 60% / 0.3)` }}>
                      ✓ Importado
                    </Badge>
                  ) : isConfirming ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'hsl(35 90% 65%)' }}>Confirmar?</span>
                      <Button
                        size="sm"
                        className="h-7 text-xs px-2"
                        style={{ background: primaryGradient, color: 'white', border: 'none' }}
                        onClick={() => handleImportPreset(exam.id)}
                        disabled={isImporting}
                      >
                        {isImporting ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Sim'}
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 text-xs px-2"
                        style={{ color: muted }}
                        onClick={() => setShowImportConfirm(null)}
                      >
                        Não
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 text-xs"
                      style={{ color: primaryBlue, border: `1px solid hsl(217 91% 60% / 0.3)` }}
                      onClick={() => setShowImportConfirm(exam.id)}
                    >
                      Importar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {importedPresets.length > 0 && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-xl" style={{ background: 'hsl(35 90% 55% / 0.08)', border: '1px solid hsl(35 90% 55% / 0.2)' }}>
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'hsl(35 90% 65%)' }} />
            <p className="text-xs" style={{ color: 'hsl(35 90% 70%)' }}>
              Importar um segundo edital <strong>adiciona</strong> novas disciplinas ao seu plano sem remover as existentes. Para trocar completamente de edital, acesse <strong>Plano de Estudos</strong> e remova as disciplinas antigas.
            </p>
          </div>
        )}
      </Card>

      {/* Seção: Disponibilidade */}
      <Card className="mb-4 p-5" style={{ background: cardBg, border: `1px solid ${border}` }}>
        <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
          <Clock className="h-4 w-4" style={{ color: 'hsl(142 71% 45%)' }} />
          Disponibilidade Diária
        </h2>
        <p className="text-xs mb-4" style={{ color: muted }}>
          Horas disponíveis para estudo em cada dia da semana (0–12h)
        </p>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map(day => (
            <div key={day} className="text-center">
              <p className="text-xs font-medium mb-1.5" style={{ color: muted }}>{DAY_LABELS[day]}</p>
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => updateDay(day, (availability[day] || 0) + 0.5)}
                  className="w-full h-6 rounded text-xs font-bold transition-colors"
                  style={{ background: 'hsl(222 47% 16%)', color: muted }}
                >
                  +
                </button>
                <div
                  className="w-full py-1.5 rounded text-center text-sm font-bold text-white"
                  style={{ background: (availability[day] || 0) > 0 ? 'hsl(217 91% 60% / 0.2)' : 'hsl(222 47% 14%)', border: `1px solid ${(availability[day] || 0) > 0 ? 'hsl(217 91% 60% / 0.4)' : border}` }}
                >
                  {availability[day] || 0}h
                </div>
                <button
                  onClick={() => updateDay(day, (availability[day] || 0) - 0.5)}
                  className="w-full h-6 rounded text-xs font-bold transition-colors"
                  style={{ background: 'hsl(222 47% 16%)', color: muted }}
                >
                  −
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3 text-right font-medium" style={{ color: primaryBlue }}>
          Total: {totalWeeklyHours}h/semana
        </p>
      </Card>

      {/* Seção: Metas */}
      <Card className="mb-6 p-5" style={{ background: cardBg, border: `1px solid ${border}` }}>
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Target className="h-4 w-4" style={{ color: 'hsl(280 80% 65%)' }} />
          Metas e Objetivo
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs" style={{ color: muted }}>Objetivo Principal</Label>
            <div className="flex flex-wrap gap-2">
              {OBJECTIVES.map(obj => (
                <button
                  key={obj.value}
                  onClick={() => setObjective(obj.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: objective === obj.value ? primaryGradient : 'hsl(222 47% 14%)',
                    border: `1px solid ${objective === obj.value ? 'transparent' : border}`,
                    color: objective === obj.value ? 'white' : muted,
                  }}
                >
                  {obj.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs" style={{ color: muted }}>Meta Semanal (horas)</Label>
              <Input
                type="number" min="1" max="80"
                value={weeklyGoal}
                onChange={e => setWeeklyGoal(parseInt(e.target.value) || 0)}
                className="text-white"
                style={{ background: 'hsl(222 47% 14%)', border: `1px solid ${border}` }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs" style={{ color: muted }}>Data da Prova</Label>
              <Input
                type="date"
                value={examDate}
                onChange={e => setExamDate(e.target.value)}
                className="text-white"
                style={{ background: 'hsl(222 47% 14%)', border: `1px solid ${border}` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Botão salvar */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 text-base font-semibold"
        style={{ background: primaryGradient, color: 'white', border: 'none' }}
      >
        {saving
          ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
          : <><Save className="h-4 w-4 mr-2" /> Salvar Plano</>
        }
      </Button>
    </div>
  );
};

export default MyPlan;
