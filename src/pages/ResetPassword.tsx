import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, BookOpen, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // O Supabase envia o token via hash na URL — ele é processado automaticamente
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // usuário está autenticado com token de reset — pronto para redefinir
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirm) { toast.error('As senhas não coincidem.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error('Erro ao redefinir senha: ' + error.message);
    } else {
      setDone(true);
      setTimeout(() => navigate('/'), 3000);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at top, hsl(222 47% 10%) 0%, hsl(222 47% 5%) 70%)' }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(240 80% 65%))', boxShadow: '0 0 20px hsl(217 91% 60% / 0.3)' }}
          >
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">StudyFlow</h1>
            <p className="text-sm" style={{ color: 'hsl(215 20% 55%)' }}>Redefinir senha</p>
          </div>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }}
        >
          {done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'hsl(142 71% 45% / 0.15)' }}>
                <CheckCircle2 className="h-6 w-6" style={{ color: 'hsl(142 71% 45%)' }} />
              </div>
              <h3 className="font-semibold text-white mb-2">Senha redefinida!</h3>
              <p className="text-sm" style={{ color: 'hsl(215 20% 55%)' }}>
                Você será redirecionado automaticamente...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium" style={{ color: 'hsl(215 20% 70%)' }}>Nova senha</Label>
                <div className="relative">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="h-11 rounded-xl pr-10"
                    style={{ background: 'hsl(222 47% 12%)', border: '1px solid hsl(222 47% 20%)', color: 'hsl(210 40% 98%)' }}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'hsl(215 20% 55%)' }}>
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium" style={{ color: 'hsl(215 20% 70%)' }}>Confirmar senha</Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="h-11 rounded-xl"
                  style={{ background: 'hsl(222 47% 12%)', border: '1px solid hsl(222 47% 20%)', color: 'hsl(210 40% 98%)' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 mt-2"
                style={{ background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(240 80% 65%))' }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Redefinir senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
