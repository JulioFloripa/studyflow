import { useState } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Save, LogOut } from 'lucide-react';
import { toast } from 'sonner';

const dayLabels: Record<string, string> = {
  seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo',
};

const SettingsPage = () => {
  const { userProfile, updateProfile } = useStudy();
  const { signOut } = useAuth();
  const [form, setForm] = useState({ ...userProfile });

  const handleSave = () => {
    updateProfile(form);
    toast.success('Configurações salvas!');
  };

  const handleLogout = async () => {
    await signOut();
  };

  const updateAvailability = (day: string, hours: number) => {
    setForm(prev => ({ ...prev, availability: { ...prev.availability, [day]: Math.max(0, Math.min(12, hours)) } }));
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="h-7 w-7 text-muted-foreground" /> Configurações
        </h1>
        <p className="text-muted-foreground mt-1">Personalize seu perfil e preferências</p>
      </div>

      <div className="space-y-4">
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Perfil</h3>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Tipo de objetivo</Label>
            <Select value={form.objective} onValueChange={v => setForm(prev => ({ ...prev, objective: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ENEM">ENEM</SelectItem>
                <SelectItem value="Vestibular">Vestibular</SelectItem>
                <SelectItem value="Concurso">Concurso Público</SelectItem>
                <SelectItem value="Residência">Residência Médica</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Meta semanal (horas)</Label>
              <Input type="number" min="1" max="80" value={form.weeklyGoalHours} onChange={e => setForm(prev => ({ ...prev, weeklyGoalHours: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Data da próxima prova</Label>
              <Input type="date" value={form.examDate} onChange={e => setForm(prev => ({ ...prev, examDate: e.target.value }))} />
            </div>
          </div>
          <div className="rounded-lg p-3 text-sm" style={{ background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.2)', color: 'hsl(var(--primary))' }}>
            💡 <strong>Múltiplas provas?</strong> Gerencie seus editais diretamente na tela <strong>Editais</strong> — você pode importar quantos quiser e remover os que não precisar mais.
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Disponibilidade (horas/dia)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(dayLabels).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number" min="0" max="12" step="0.5"
                  value={form.availability[key] || 0}
                  onChange={e => updateAvailability(key, parseFloat(e.target.value) || 0)}
                  className="h-9"
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Intervalos de Revisão</h3>
          <p className="text-sm text-muted-foreground">Dias após o estudo para agendar revisões</p>
          <div className="grid grid-cols-3 gap-3">
            {form.reviewIntervals.map((interval, idx) => (
              <div key={idx} className="space-y-1">
                <Label className="text-xs">Revisão {idx + 1}</Label>
                <Input
                  type="number" min="1"
                  value={interval}
                  onChange={e => {
                    const newIntervals = [...form.reviewIntervals];
                    newIntervals[idx] = parseInt(e.target.value) || 1;
                    setForm(prev => ({ ...prev, reviewIntervals: newIntervals }));
                  }}
                  className="h-9"
                />
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSave} className="flex-1">
            <Save className="h-4 w-4 mr-2" /> Salvar Configurações
          </Button>
          <Button variant="outline" onClick={handleLogout} className="text-destructive">
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
