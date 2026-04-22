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
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { toast.error('Informe seu e-mail.'); return; }
    setForgotLoading(true);
    const { error } = await resetPassword(forgotEmail.trim());
    setForgotLoading(false);
    if (error) {
      toast.error('Erro ao enviar e-mail: ' + error);
    } else {
      setForgotSent(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
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
    <div className="min-h-screen flex items-center justify-center p-4 gradient-bg">
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />

      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center gap-3 mb-8 animate-fade-in-up">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--gradient-primary)', boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' }}
          >
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">StudyFlow</h1>
            <p className="text-sm text-muted-foreground">Organize seus estudos com inteligência</p>
          </div>
        </div>

        <div className="rounded-2xl p-6 animate-fade-in-up delay-100 bg-card border border-border shadow-2xl">
          <div className="flex rounded-xl p-1 mb-6 bg-background">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: isLogin ? 'hsl(var(--muted))' : 'transparent',
                color: isLogin ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: !isLogin ? 'hsl(var(--muted))' : 'transparent',
                color: !isLogin ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
              }}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium text-muted-foreground">Nome completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="h-11 rounded-xl"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">E-mail</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-11 rounded-xl pr-10"
                  style={{
                    borderColor: (!isLogin && email && isFlemingEmail) ? 'hsl(var(--success))' : undefined,
                  }}
                />
                {!isLogin && email && isFlemingEmail && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-check-bounce text-success" />
                )}
              </div>
              {!isLogin && email && isFlemingEmail && (
                <p className="text-xs flex items-center gap-1.5 animate-fade-in text-success">
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
              <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setForgotEmail(email); setShowForgot(true); setForgotSent(false); }}
                  className="text-xs transition-colors hover:underline text-primary"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            {/* Modal de recuperação de senha */}
            {showForgot && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: 'rgba(0,0,0,0.7)' }}
                onClick={() => setShowForgot(false)}
              >
                <div
                  className="w-full max-w-sm rounded-2xl p-6 bg-card border border-border"
                  onClick={e => e.stopPropagation()}
                >
                  {forgotSent ? (
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'hsl(var(--success) / 0.15)' }}>
                        <CheckCircle2 className="h-6 w-6 text-success" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">E-mail enviado!</h3>
                      <p className="text-sm mb-4 text-muted-foreground">
                        Verifique sua caixa de entrada em <strong className="text-foreground">{forgotEmail}</strong> e clique no link para redefinir sua senha.
                      </p>
                      <button
                        onClick={() => setShowForgot(false)}
                        className="w-full py-2.5 rounded-xl text-sm font-medium text-white"
                        style={{ background: 'var(--gradient-primary)' }}
                      >
                        Fechar
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-semibold text-foreground mb-1">Recuperar senha</h3>
                      <p className="text-sm mb-4 text-muted-foreground">
                        Informe seu e-mail e enviaremos um link para redefinir sua senha.
                      </p>
                      <Input
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="h-11 rounded-xl mb-3"
                        onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowForgot(false)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleForgotPassword}
                          disabled={forgotLoading}
                          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2"
                          style={{ background: 'var(--gradient-primary)' }}
                        >
                          {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar link'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-2 transition-all duration-200 text-white"
              disabled={submitting}
              style={{ background: 'var(--gradient-primary)', boxShadow: '0 0 20px hsl(var(--primary) / 0.3)', border: 'none' }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>{isLogin ? 'Entrar na conta' : 'Criar conta grátis'} <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          {!isLogin && (
            <p className="text-center text-xs mt-4 text-muted-foreground">
              Ao criar sua conta, você concorda com nossos{' '}
              <span className="underline cursor-pointer text-primary">Termos de Uso</span>
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
                className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-center bg-card border border-border"
              >
                <span className="text-lg">{item.emoji}</span>
                <span className="text-xs font-medium text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
