import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, BookOpen, CheckCircle2, Target, Clock, Calendar, Brain, Zap, BarChart3, GraduationCap, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStudy } from '@/contexts/StudyContext';
import { toast } from 'sonner';
import { presetExams } from '@/data/presetExams';
import { presetGAC2025 } from '@/data/presetGAC2025';

const ALL_PRESETS = [presetGAC2025, ...presetExams];

interface OnboardingData {
  age: number;
  dailyHours: string;
  examId: string;
  studyDays: string[];
  profile: string;
  reviewType: string;
}

const DAILY_HOURS = [
  { id: 'less1', label: 'Menos de 1h por dia', sub: 'Ritmo leve, foco na consistência' },
  { id: '1to2', label: 'Entre 1h e 2h por dia', sub: 'Bom equilíbrio para a maioria' },
  { id: '2to4', label: 'Entre 2h e 4h por dia', sub: 'Ritmo intenso e eficiente' },
  { id: 'more4', label: 'Acima de 4h por dia', sub: 'Modo dedicação total' },
];

const WEEK_DAYS = [
  { id: 'dom', label: 'D', full: 'DOM' },
  { id: 'seg', label: 'S', full: 'SEG' },
  { id: 'ter', label: 'T', full: 'TER' },
  { id: 'qua', label: 'Q', full: 'QUA' },
  { id: 'qui', label: 'Q', full: 'QUI' },
  { id: 'sex', label: 'S', full: 'SEX' },
  { id: 'sab', label: 'S', full: 'SAB' },
];

const PROFILES = [
  { id: 'forgets', icon: Brain, label: 'Estudo muito, mas esqueço rápido', sub: 'Vamos focar em revisões espaçadas' },
  { id: 'distracted', icon: Zap, label: 'Me distraio com facilidade', sub: 'Sessões curtas e objetivas para você' },
  { id: 'nostrategy', icon: BarChart3, label: 'Estudo sem estratégia definida', sub: 'Vamos montar um plano estruturado' },
  { id: 'beginner', icon: Target, label: 'Estou começando agora', sub: 'Do zero ao avançado, no seu ritmo' },
];

const REVIEW_TYPES = [
  { id: 'classic', label: 'Revisão Clássica', sub: 'Dias: 7 - 30 - 90' },
  { id: 'short', label: 'Revisão Curta', sub: 'Dias: 7 - 14 - 21 - 30' },
  { id: 'intensive', label: 'Revisão Intensiva', sub: 'Dias: 3 - 7 - 14 - 21 - 30 - 45 - 60' },
  { id: 'semestral', label: 'Revisão Semestral', sub: 'Dias: 1 - 7 - 28 - 90 - 180' },
];

const TOTAL_STEPS = 6;
const bgStyle = { background: 'radial-gradient(ellipse at top, hsl(222 47% 10%) 0%, hsl(222 47% 5%) 70%)' };
const cardStyle = { background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' };
const mutedColor = 'hsl(215 20% 55%)';
const primaryGradient = 'linear-gradient(135deg, hsl(217 91% 60%), hsl(240 80% 65%))';
const primaryGlow = '0 0 20px hsl(217 91% 60% / 0.3)';

const Onboarding = () => {
  const { user } = useAuth();
  const { importPreset } = useStudy();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [searchExam, setSearchExam] = useState('');
  const [data, setData] = useState<OnboardingData>({
    age: 20,
    dailyHours: '',
    examId: '',
    studyDays: ['seg', 'ter', 'qua', 'qui', 'sex'],
    profile: '',
    reviewType: '',
  });

  const progress = (step / TOTAL_STEPS) * 100;

  const toggleDay = (dayId: string) => {
    setData(prev => ({
      ...prev,
      studyDays: prev.studyDays.includes(dayId)
        ? prev.studyDays.filter(d => d !== dayId)
        : [...prev.studyDays, dayId],
    }));
  };

  const canAdvance = () => {
    if (step === 1) return true;
    if (step === 2) return !!data.dailyHours;
    if (step === 3) return !!data.examId;
    if (step === 4) return data.studyDays.length > 0;
    if (step === 5) return !!data.profile;
    if (step === 6) return !!data.reviewType;
    return false;
  };

  const selectedExam = ALL_PRESETS.find(e => e.id === data.examId);
  const filteredExams = ALL_PRESETS.filter(e =>
    e.name.toLowerCase().includes(searchExam.toLowerCase()) ||
    e.description?.toLowerCase().includes(searchExam.toLowerCase())
  );

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Salvar preferências no perfil
      await supabase.from('profiles').update({
        onboarding_completed: true,
        onboarding_data: data as unknown as Record<string, unknown>,
      }).eq('id', user.id);

      // Importar automaticamente o edital escolhido
      if (data.examId) {
        await importPreset(data.examId);
      }

      toast.success('Plano de estudos criado com sucesso!');
      navigate('/');
    } catch {
      toast.error('Erro ao salvar preferencias. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5 animate-fade-in-up">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: primaryGradient, boxShadow: primaryGlow }}>
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Bem-vindo ao StudyFlow!</h2>
              <p style={{ color: mutedColor }} className="text-sm">Vamos criar seu plano de estudos personalizado em menos de 2 minutos.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Qual e a sua idade?</label>
              <div className="flex items-center gap-4">
                <input
                  type="range" min={14} max={60} value={data.age}
                  onChange={e => setData(prev => ({ ...prev, age: Number(e.target.value) }))}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-2xl font-bold text-white w-12 text-center">{data.age}</span>
              </div>
              <div className="flex justify-between text-xs" style={{ color: mutedColor }}>
                <span>14 anos</span><span>60 anos</span>
              </div>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: 'hsl(217 91% 60% / 0.08)', border: '1px solid hsl(217 91% 60% / 0.2)' }}>
              <p className="text-xs" style={{ color: 'hsl(217 91% 70%)' }}>
                Seu plano sera totalmente adaptado ao seu perfil e disponibilidade.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5 animate-fade-in-up">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Quanto tempo voce tem para estudar?</h2>
              <p style={{ color: mutedColor }} className="text-sm">Seja honesto — consistencia vale mais que quantidade.</p>
            </div>
            <div className="space-y-2.5">
              {DAILY_HOURS.map(opt => (
                <button
                  key={opt.id} type="button"
                  onClick={() => setData(prev => ({ ...prev, dailyHours: opt.id }))}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 text-left"
                  style={{
                    background: data.dailyHours === opt.id ? 'hsl(217 91% 60% / 0.15)' : 'hsl(222 47% 12%)',
                    border: data.dailyHours === opt.id ? '1px solid hsl(217 91% 60%)' : '1px solid hsl(222 47% 20%)',
                  }}
                >
                  <Clock className="h-4 w-4 flex-shrink-0" style={{ color: data.dailyHours === opt.id ? 'hsl(217 91% 60%)' : 'hsl(215 20% 55%)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: data.dailyHours === opt.id ? 'hsl(217 91% 60%)' : 'hsl(210 40% 98%)' }}>{opt.label}</p>
                    <p className="text-xs" style={{ color: mutedColor }}>{opt.sub}</p>
                  </div>
                  {data.dailyHours === opt.id && <CheckCircle2 className="h-4 w-4 ml-auto flex-shrink-0" style={{ color: 'hsl(217 91% 60%)' }} />}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 animate-fade-in-up">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Para qual prova voce esta estudando?</h2>
              <p style={{ color: mutedColor }} className="text-sm">Vamos importar automaticamente as disciplinas e conteudos do edital.</p>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: mutedColor }} />
              <input
                type="text"
                placeholder="Buscar prova ou concurso..."
                value={searchExam}
                onChange={e => setSearchExam(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: 'hsl(222 47% 12%)', border: '1px solid hsl(222 47% 20%)' }}
              />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {filteredExams.map(exam => (
                <button
                  key={exam.id} type="button"
                  onClick={() => setData(prev => ({ ...prev, examId: exam.id }))}
                  className="w-full flex items-start gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 text-left"
                  style={{
                    background: data.examId === exam.id ? 'hsl(217 91% 60% / 0.15)' : 'hsl(222 47% 12%)',
                    border: data.examId === exam.id ? '1px solid hsl(217 91% 60%)' : '1px solid hsl(222 47% 20%)',
                  }}
                >
                  <BookOpen className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: data.examId === exam.id ? 'hsl(217 91% 60%)' : 'hsl(215 20% 55%)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: data.examId === exam.id ? 'hsl(217 91% 60%)' : 'hsl(210 40% 98%)' }}>{exam.name}</p>
                    {exam.description && <p className="text-xs truncate" style={{ color: mutedColor }}>{exam.description}</p>}
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(217 91% 50%)' }}>{exam.subjects.length} disciplinas</p>
                  </div>
                  {data.examId === exam.id && <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'hsl(217 91% 60%)' }} />}
                </button>
              ))}
            </div>
            {selectedExam && (
              <div className="rounded-xl p-3" style={{ background: 'hsl(217 91% 60% / 0.08)', border: '1px solid hsl(217 91% 60% / 0.2)' }}>
                <p className="text-xs font-medium" style={{ color: 'hsl(217 91% 70%)' }}>
                  Disciplinas que serao importadas: {selectedExam.subjects.map(s => s.name).join(', ')}
                </p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-5 animate-fade-in-up">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Quais dias voce estuda?</h2>
              <p style={{ color: mutedColor }} className="text-sm">Selecione os dias que voce tem disponibilidade.</p>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEK_DAYS.map(day => {
                const active = data.studyDays.includes(day.id);
                return (
                  <button
                    key={day.id} type="button"
                    onClick={() => toggleDay(day.id)}
                    className="flex flex-col items-center py-3 rounded-xl transition-all duration-200"
                    style={{
                      background: active ? 'hsl(217 91% 60% / 0.2)' : 'hsl(222 47% 12%)',
                      border: active ? '1px solid hsl(217 91% 60%)' : '1px solid hsl(222 47% 20%)',
                    }}
                  >
                    <span className="text-[10px] font-bold" style={{ color: active ? 'hsl(217 91% 60%)' : mutedColor }}>{day.full}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-center text-xs" style={{ color: mutedColor }}>
              {data.studyDays.length} dia{data.studyDays.length !== 1 ? 's' : ''} selecionado{data.studyDays.length !== 1 ? 's' : ''}
            </p>
          </div>
        );

      case 5:
        return (
          <div className="space-y-5 animate-fade-in-up">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Qual e o seu maior desafio?</h2>
              <p style={{ color: mutedColor }} className="text-sm">Vamos adaptar sua estrategia de estudos para isso.</p>
            </div>
            <div className="space-y-2.5">
              {PROFILES.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id} type="button"
                    onClick={() => setData(prev => ({ ...prev, profile: opt.id }))}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 text-left"
                    style={{
                      background: data.profile === opt.id ? 'hsl(217 91% 60% / 0.15)' : 'hsl(222 47% 12%)',
                      border: data.profile === opt.id ? '1px solid hsl(217 91% 60%)' : '1px solid hsl(222 47% 20%)',
                    }}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" style={{ color: data.profile === opt.id ? 'hsl(217 91% 60%)' : 'hsl(215 20% 55%)' }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: data.profile === opt.id ? 'hsl(217 91% 60%)' : 'hsl(210 40% 98%)' }}>{opt.label}</p>
                      <p className="text-xs" style={{ color: mutedColor }}>{opt.sub}</p>
                    </div>
                    {data.profile === opt.id && <CheckCircle2 className="h-4 w-4 ml-auto flex-shrink-0" style={{ color: 'hsl(217 91% 60%)' }} />}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-5 animate-fade-in-up">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Como voce prefere revisar?</h2>
              <p style={{ color: mutedColor }} className="text-sm">As revisoes serao agendadas automaticamente apos cada sessao de estudo.</p>
            </div>
            <div className="space-y-2.5">
              {REVIEW_TYPES.map(opt => (
                <button
                  key={opt.id} type="button"
                  onClick={() => setData(prev => ({ ...prev, reviewType: opt.id }))}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 text-left"
                  style={{
                    background: data.reviewType === opt.id ? 'hsl(217 91% 60% / 0.15)' : 'hsl(222 47% 12%)',
                    border: data.reviewType === opt.id ? '1px solid hsl(217 91% 60%)' : '1px solid hsl(222 47% 20%)',
                  }}
                >
                  <Calendar className="h-4 w-4 flex-shrink-0" style={{ color: data.reviewType === opt.id ? 'hsl(217 91% 60%)' : 'hsl(215 20% 55%)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: data.reviewType === opt.id ? 'hsl(217 91% 60%)' : 'hsl(210 40% 98%)' }}>{opt.label}</p>
                    <p className="text-xs" style={{ color: mutedColor }}>{opt.sub}</p>
                  </div>
                  {data.reviewType === opt.id && <CheckCircle2 className="h-4 w-4 ml-auto flex-shrink-0" style={{ color: 'hsl(217 91% 60%)' }} />}
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={bgStyle}>
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(217 91% 60% / 0.06) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />
      <div className="w-full max-w-sm relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: primaryGradient }}>
              <BookOpen className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">StudyFlow</span>
          </div>
          <span className="text-xs" style={{ color: mutedColor }}>{step} de {TOTAL_STEPS}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full mb-6 overflow-hidden" style={{ background: 'hsl(222 47% 16%)' }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, background: primaryGradient }}
          />
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{ ...cardStyle, boxShadow: '0 25px 50px -12px hsl(0 0% 0% / 0.5)' }}>
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-4">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
              style={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', color: 'hsl(215 20% 60%)' }}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          )}
          <Button
            onClick={step < TOTAL_STEPS ? () => setStep(s => s + 1) : handleFinish}
            disabled={!canAdvance() || saving}
            className="flex-1 h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200"
            style={{
              background: canAdvance() ? primaryGradient : 'hsl(222 47% 14%)',
              color: canAdvance() ? 'white' : 'hsl(215 20% 45%)',
              boxShadow: canAdvance() ? primaryGlow : 'none',
              border: 'none',
            }}
          >
            {saving ? (
              <Clock className="h-4 w-4 animate-spin" />
            ) : step < TOTAL_STEPS ? (
              <>Continuar <ArrowRight className="h-4 w-4" /></>
            ) : (
              <>Criar meu plano <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
