import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, BookOpen, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const FLEMING_DOMAIN = '@flemingeducacao.com.br';

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'hsl(222 47% 6%)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(240 80% 65%))' }}>
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const isFlemingEmail = email.toLowerCase().endsWith(FLEMING_DOMAIN);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (!isLogin && !name.trim()) return;

    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : error);
        }
      } else {
        if (password.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres');
          return;
        }
        const { error } = await signUp(email, password, name);
        if (error) {
          toast.error(error);
        } else {
          if (isFlemingEmail) {
            toast.success('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
          } else {
            toast.success('Conta criada! Verifique seu e-mail e depois escolha seu plano.');
            navigate('/planos');
          }
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at top, hsl(222 47% 10%) 0%, hsl(222 47% 5%) 70%)' }}
    >
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(217 91% 60% / 0.08) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />

      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center gap-3 mb-8 animate-fade-in-up">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(240 80% 65%))', boxShadow: '0 0 20px hsl(217 91% 60% / 0.3)' }}
          >
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">StudyFlow</h1>
            <p className="text-sm" style={{ color: 'hsl(215 20% 55%)' }}>Organize seus estudos com inteligência</p>
          </div>
        </div>

        <div
          className="rounded-2xl p-6 animate-fade-in-up delay-100"
          style={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', boxShadow: '0 25px 50px -12px hsl(0 0% 0% / 0.5)' }}
        >
          <div className="flex rounded-xl p-1 mb-6" style={{ background: 'hsl(222 47% 6%)' }}>
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{ background: isLogin ? 'hsl(222 47% 14%)' : 'transparent', color: isLogin ? 'hsl(210 40% 98%)' : 'hsl(215 20% 55%)' }}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{ background: !isLogin ? 'hsl(222 47% 14%)' : 'transparent', color: !isLogin ? 'hsl(210 40% 98%)' : 'hsl(215 20% 55%)' }}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium" style={{ color: 'hsl(215 20% 70%)' }}>Nome completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="h-11 rounded-xl"
                  style={{ background: 'hsl(222 47% 12%)', border: '1px solid hsl(222 47% 20%)', color: 'hsl(210 40% 98%)' }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: 'hsl(215 20% 70%)' }}>E-mail</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-11 rounded-xl pr-10"
                  style={{
                    background: 'hsl(222 47% 12%)',
                    border: (!isLogin && email && isFlemingEmail) ? '1px solid hsl(142 71% 45%)' : '1px solid hsl(222 47% 20%)',
                    color: 'hsl(210 40% 98%)',
                  }}
                />
                {!isLogin && email && isFlemingEmail && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-check-bounce" style={{ color: 'hsl(142 71% 45%)' }} />
                )}
              </div>
              {!isLogin && email && isFlemingEmail && (
                <p className="text-xs flex items-center gap-1.5 animate-fade-in" style={{ color: 'hsl(142 71% 45%)' }}>
                  <CheckCircle2 className="h-3 w-3" /> Aluno Fleming — acesso gratuito!
                </p>
              )}
              {!isLogin && email && !isFlemingEmail && email.includes('@') && (
                <p className="text-xs animate-fade-in" style={{ color: 'hsl(38 92% 60%)' }}>
                  Acesso externo — você escolherá um plano após o cadastro.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium" style={{ color: 'hsl(215 20% 70%)' }}>Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 rounded-xl pr-10"
                  style={{ background: 'hsl(222 47% 12%)', border: '1px solid hsl(222 47% 20%)', color: 'hsl(210 40% 98%)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'hsl(215 20% 55%)' }}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="text-right">
                <button type="button" className="text-xs transition-colors hover:underline" style={{ color: 'hsl(217 91% 60%)' }}>
                  Esqueci minha senha
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-2 transition-all duration-200"
              disabled={submitting}
              style={{ background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(240 80% 65%))', color: 'white', boxShadow: '0 0 20px hsl(217 91% 60% / 0.3)', border: 'none' }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>{isLogin ? 'Entrar na conta' : 'Criar conta grátis'} <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          {!isLogin && (
            <p className="text-center text-xs mt-4" style={{ color: 'hsl(215 20% 45%)' }}>
              Ao criar sua conta, você concorda com nossos{' '}
              <span className="underline cursor-pointer" style={{ color: 'hsl(217 91% 60%)' }}>Termos de Uso</span>
            </p>
          )}
        </div>

        {!isLogin && (
          <div className="mt-4 grid grid-cols-3 gap-2 animate-fade-in-up delay-200">
            {[
              { emoji: '🧠', text: 'Revisões com IA' },
              { emoji: '📅', text: 'Cronograma automático' },
              { emoji: '🏆', text: 'Gamificação' },
            ].map((item) => (
              <div
                key={item.text}
                className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-center"
                style={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }}
              >
                <span className="text-lg">{item.emoji}</span>
                <span className="text-xs font-medium" style={{ color: 'hsl(215 20% 60%)' }}>{item.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
