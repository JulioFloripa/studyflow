import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, ArrowRight, Zap, Star, Crown } from 'lucide-react';

const PLANS = [
  {
    id: 'monthly',
    icon: Zap,
    name: 'Mensal',
    price: 'R$ 19',
    period: '/mês',
    description: 'Ideal para experimentar',
    features: ['Cronograma automático', 'Revisões espaçadas', 'Gamificação', 'Suporte por e-mail'],
    highlight: false,
    badge: null,
  },
  {
    id: 'semestral',
    icon: Star,
    name: 'Semestral',
    price: 'R$ 14',
    period: '/mês',
    fullPrice: 'R$ 84 cobrado semestralmente',
    description: 'Mais popular entre os alunos',
    features: ['Tudo do Mensal', 'Economia de 26%', 'Análise de desempenho', 'Suporte prioritário'],
    highlight: true,
    badge: 'MAIS POPULAR',
  },
  {
    id: 'annual',
    icon: Crown,
    name: 'Anual',
    price: 'R$ 9',
    period: '/mês',
    fullPrice: 'R$ 108 cobrado anualmente',
    description: 'Melhor custo-benefício',
    features: ['Tudo do Semestral', 'Economia de 53%', 'IA para revisões', 'Acesso vitalício ao histórico'],
    highlight: false,
    badge: 'MELHOR VALOR',
  },
];

const Plans = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('semestral');

  const handleContinue = () => {
    navigate('/onboarding');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-bg">
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.06) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-6 animate-fade-in-up">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--gradient-primary)', boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' }}
          >
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">Escolha seu plano</h1>
            <p className="text-sm text-muted-foreground">Comece sua jornada de estudos hoje</p>
          </div>
        </div>

        {/* Plans */}
        <div className="space-y-3 animate-fade-in-up delay-100">
          {PLANS.map(plan => {
            const Icon = plan.icon;
            const isSelected = selected === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelected(plan.id)}
                className="w-full text-left rounded-2xl p-4 transition-all duration-200 relative overflow-hidden"
                style={{
                  background: isSelected ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--card))',
                  border: isSelected ? '1px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                  boxShadow: isSelected ? '0 0 20px hsl(var(--primary) / 0.15)' : 'none',
                }}
              >
                {plan.badge && (
                  <div
                    className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      background: plan.highlight ? 'var(--gradient-primary)' : 'hsl(142 71% 45% / 0.2)',
                      color: plan.highlight ? 'white' : 'hsl(142 71% 45%)',
                    }}
                  >
                    {plan.badge}
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: isSelected ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--muted))' }}
                  >
                    <Icon className="h-4 w-4" style={{ color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground">{plan.name}</p>
                    {plan.fullPrice && (
                      <p className="text-xs mt-0.5 text-muted-foreground">{plan.fullPrice}</p>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 animate-check-bounce text-primary" />
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1">
                  {plan.features.map(feature => (
                    <div key={feature} className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
                      <span className="text-xs text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-4 space-y-3 animate-fade-in-up delay-200">
          <Button
            onClick={handleContinue}
            className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-white"
            style={{ background: 'var(--gradient-primary)', boxShadow: '0 0 20px hsl(var(--primary) / 0.3)', border: 'none' }}
          >
            Começar agora <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Cancele quando quiser. Sem taxas ocultas.
          </p>
        </div>

        {/* Trust badges */}
        <div className="mt-4 flex items-center justify-center gap-4 animate-fade-in-up delay-300">
          {['🔒 Pagamento seguro', '✅ Sem compromisso', '💬 Suporte ativo'].map(badge => (
            <span key={badge} className="text-[10px] text-muted-foreground">{badge}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Plans;
