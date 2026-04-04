import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, BookOpen, CheckCircle2, Target, Clock, Calendar, Brain, Zap, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface OnboardingData {
  age: number;
  dailyHours: string;
  goal: string;
  studyDays: string[];
  profile: string;
  reviewType: string;
}

const GOALS = [
  { id: 'concurso', icon: Target, label: 'Passar em um concurso público' },
  { id: 'residencia', icon: Brain, label: 'Passar na residência de Medicina' },
  { id: 'escola', icon: BookOpen, label: 'Ir bem em provas da escola/faculdade' },
  { id: 'enem', icon: Zap, label: 'Passar no ENEM ou Vestibular' },
  { id: 'oab', icon: BarChart3, label: 'Provas concorridas (OAB, Revalida...)' },
];

const DAILY_HOURS = [
  { id: 'less1', label: 'Menos de 1h' },
  { id: '1to2', label: 'Entre 1h e 2h' },
  { id: '2to4', label: 'Entre 2h a 4h' },
  { id: 'more4', label: 'Acima de 4h (modo hardcore 🔥)' },
];

const WEEK_DAYS = [
  { id: 'dom', label: 'D', full: 'DOM' },
  { id: 'seg', label: 'S', full: 'SEG' },
  { id: 'ter', label: 'T', full: 'TER' },
  { id: 'qua', label: 'Q', full: 'QUA' },
  { id: 'qui', label: 'Q', full: 'QUI' },
  { id: 'sex', label: 'S', full: 'SEX' },
  { id: 'sab', label: 'S', full: 'SÁB' },
];

const PROFILES = [
  { id: 'forgets', label: 'Eu estudo muito, mas esqueço tudo rápido.' },
  { id: 'distracted', label: 'Eu me distraio muito facilmente.' },
  { id: 'nostrategy', label: 'Estudo, mas não tenho uma estratégia sólida.' },
  { id: 'beginner', label: 'Estou começando agora e me sinto perdido.' },
];

const REVIEW_TYPES = [
  { id: 'classic', label: 'Revisão Clássica', sub: 'revisar nos dias: 7-30-90' },
  { id: 'bimonthly', label: 'Revisão Bimestral', sub: 'revisar nos dias: 1-15-30-60' },
  { id: 'short', label: 'Revisão Curta', sub: 'revisar nos dias: 7-14-21-30' },
  { id: 'semestral', label: 'Revisão Semestral', sub: 'revisar nos dias: 1-7-28-90-180' },
  { id: 'intensive', label: 'Revisão Intensiva', sub: 'revisar nos dias: 3-7-14-21-30-45-60' },
];

const TOTAL_STEPS = 6;

const bgStyle = { background: 'radial-gradient(ellipse at top, hsl(222 47% 10%) 0%, hsl(222 47% 5%) 70%)' };
const cardStyle = { background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' };
const mutedColor = 'hsl(215 20% 55%)';
const primaryGradient = 'linear-gradient(135deg, hsl(217 91% 60%), hsl(240 80% 65%))';
const primaryGlow = '0 0 20px hsl(217 91% 60% / 0.3)';

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    age: 20,
    dailyHours: '',
    goal: '',
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
    if (step === 3) return !!data.goal;
    if (step === 4) return data.studyDays.length > 0;
    if (step === 5) return !!data.profile;
    if (step === 6) return !!data.reviewType;
    return false;
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({
        onboarding_completed: true,
        onboarding_data: data as unknown as Record<string, unknown>,
      }).eq('id', user.id);
      navigate('/');
    } catch {
      toast.error('Erro ao salvar preferências. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Qual sua idade?</h2>
              <p style={{ color: mutedColor }} className="text-sm">Vamos personalizar a ferramenta para a sua fase de vida.</p>
            </div>
            <div className="text-center py-4">
              <span className="text-6xl font-bold text-white">{data.age}</span>
              <span className="text-2xl font-semibold ml-2" style={{ color: mutedColor }}>anos</span>
            </div>
            <div className="space-y-2">
              <input
                type="range"
                min={14}
                max={60}
                value={data.age}
                onChange={e => setData(prev => ({ ...prev, age: Number(e.target.value) }))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: 'hsl(217 91% 60%)' }}
              />
              <div className="flex justify-between text-xs" style={{ color: mutedColor }}>
                <span>14 anos</span>
                <span>60+ anos</span>
              </div>
            </div>
            <p className="text-center text-xs" style={{ color: mutedColor }}>Arraste para ajustar</p>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5 animate-fade-in-up">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Quanto tempo por dia você consegue estudar?</h2>
              <p style={{ color: mutedColor }} className="text-sm">Definiremos as estratégias com base nesses dados.</p>
            </div>
            <div className="space-y-2.5">
              {DAILY_HOURS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setData(prev => ({ ...prev, dailyHours: opt.id }))}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 text-left"
                  style={{
                    background: data.dailyHours === opt.id ? 'hsl(217 91% 60% / 0.15)' : 'hsl(222 47% 12%)',
                    border: data.dailyHours === opt.id ? '1px solid hsl(217 91% 60%)' : '1px solid hsl(222 47% 20%)',
                    color: data.dailyHours === opt.id ? 'hsl(210 40% 98%)' : 'hsl(215 20% 70%)',
                    boxShadow: data.dailyHours === opt.id ? '0 0 0 1px hsl(217 91% 60% / 0.3)' : 'none',
                  }}
                >
                  <span className="text-sm font-medium">{opt.label}</span>
                  {data.dailyHours === opt.id ? (
                    <CheckCircle2 className="h-4 w-4" style={{ color: 'hsl(217 91% 60%)' }} />
                  ) : (
                    <ArrowRight className="h-4 w-4 opacity-40" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5 animate-fade-in-up">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Qual é o seu maior objetivo atualmente?</h2>
              <p style={{ color: mutedColor }} className="text-sm">Montaremos a ferramenta de forma otimizada para seus objetivos mais importantes!</p>
            </div>
            <div className="space-y-2.5">
              {GOALS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setData(prev => ({ ...prev, goal: opt.id }))}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 text-left"
                    style={{
                      background: data.goal === opt.id ? 'hsl(217 91% 60% / 0.15)' : 'hsl(222 47% 12%)',
                      border: data.goal === opt.id ? '1px solid hsl(217 91% 60%)' : '1px solid hsl(222 47% 20%)',
                      color: data.goal === opt.id ? 'hsl(210 40% 98%)' : 'hsl(215 20% 70%)',
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: data.goal === opt.id ? 'hsl(217 91% 60% / 0.2)' : 'hsl(222 47% 16%)' }}>
                      <Icon className="h-4 w-4" style={{ color: data.goal === opt.id ? 'hsl(217 91% 60%)' : 'hsl(215 20% 55%)' }} />
                    </div>
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Quais dias você pode estudar?</h2>
              <p style={{ color: mutedColor }} className="text-sm">Montaremos sua rotina baseada nesses dias.</p>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {WEEK_DAYS.map(day => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all duration-200"
                  style={{
                    background: data.studyDays.includes(day.id) ? 'hsl(217 91% 60% / 0.15)' : 'hsl(222 47% 12%)',
                    border: data.studyDays.includes(day.id) ? '1px solid hsl(217 91% 60%)' : '1px solid hsl(222 47% 20%)',
                    boxShadow: data.studyDays.includes(day.id) ? '0 0 10px hsl(217 91% 60% / 0.2)' : 'none',
                  }}
                >
                  <span className="text-base font-bold" style={{ color: data.studyDays.includes(day.id) ? 'hsl(217 91% 60%)' : 'hsl(215 20% 70%)' }}>
                    {day.label}
                  </span>
                  <span className="text-[10px]" style={{ color: data.studyDays.includes(day.id) ? 'hsl(217 91% 60% / 0.7)' : mutedColor }}>
                    {day.full}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-5 animate-fade-in-up">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Qual frase mais parece com você?</h2>
              <p style={{ color: mutedColor }} className="text-sm">Definiremos perfis comportamentais para estruturar a ferramenta com base nisso.</p>
            </div>
            <div className="space-y-2.5">
              {PROFILES.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setData(prev => ({ ...prev, profile: opt.id }))}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 text-left"
                  style={{
                    background: data.profile === opt.id ? 'hsl(217 91% 60% / 0.15)' : 'hsl(222 47% 12%)',
                    border: data.profile === opt.id ? '1px solid hsl(217 91% 60%)' : '1px solid hsl(222 47% 20%)',
                    color: data.profile === opt.id ? 'hsl(210 40% 98%)' : 'hsl(215 20% 70%)',
                  }}
                >
                  <span className="text-sm font-medium">{opt.label}</span>
                  {data.profile === opt.id && <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: 'hsl(217 91% 60%)' }} />}
                </button>
              ))}
            </div>
            <p className="text-center text-xs" style={{ color: 'hsl(217 91% 60%)' }}>A ferramenta está sendo personalizada para você.</p>
          </div>
        );

      case 6:
        return (
          <div className="space-y-5 animate-fade-in-up">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Qual dessas cronologias de revisão você prefere?</h2>
              <p style={{ color: mutedColor }} className="text-sm">Analisaremos seu perfil de estudos para escolher a melhor estratégia para você.</p>
            </div>
            <div className="space-y-2.5">
              {REVIEW_TYPES.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setData(prev => ({ ...prev, reviewType: opt.id }))}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 text-left"
                  style={{
                    background: data.reviewType === opt.id ? 'hsl(217 91% 60% / 0.15)' : 'hsl(222 47% 12%)',
                    border: data.reviewType === opt.id ? '1px solid hsl(217 91% 60%)' : '1px solid hsl(222 47% 20%)',
                  }}
                >
                  <Calendar className="h-4 w-4 flex-shrink-0" style={{ color: data.reviewType === opt.id ? 'hsl(217 91% 60%)' : 'hsl(215 20% 55%)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: data.reviewType === opt.id ? 'hsl(217 91% 60%)' : 'hsl(210 40% 98%)' }}>
                      {opt.label}
                    </p>
                    <p className="text-xs" style={{ color: mutedColor }}>{opt.sub}</p>
                  </div>
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
              <>Ver meu planejamento <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
