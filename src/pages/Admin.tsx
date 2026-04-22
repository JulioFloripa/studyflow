import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Save, X, Lock, LogOut, BookOpen, Edit2, Link2, Unlink, Download, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { presetExams } from '@/data/presetExams';

const ADMIN_KEY = 'sf_admin_v1';
const ADMIN_PWD = import.meta.env.VITE_ADMIN_PASSWORD || '';
const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16'];

interface AdminTopic   { id: string; name: string; sort_order: number; }
interface AdminSubject { id: string; name: string; priority: number; color: string; sort_order: number; topics: AdminTopic[]; }
interface AdminPreset  { id: string; name: string; description: string; sort_order: number; subjects: AdminSubject[]; }

// ─── Password Gate ────────────────────────────────────────────────────────────
const PasswordGate: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ADMIN_PWD) { setError(true); return; }
    if (value === ADMIN_PWD) { sessionStorage.setItem(ADMIN_KEY, '1'); onUnlock(); }
    else { setError(true); setValue(''); }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Área Administrativa</h1>
          <p className="text-sm text-muted-foreground mt-1">Digite a senha para continuar</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input type="password" value={value} onChange={e => { setValue(e.target.value); setError(false); }} placeholder="Senha" autoFocus
            className={`w-full rounded-lg px-4 py-3 text-sm bg-input border text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${error ? 'border-destructive' : 'border-border'}`} />
          {error && <p className="text-xs text-destructive">{!ADMIN_PWD ? 'VITE_ADMIN_PASSWORD não configurada.' : 'Senha incorreta.'}</p>}
          <button type="submit" className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Entrar</button>
        </form>
      </Card>
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
const Admin: React.FC = () => {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(ADMIN_KEY) === '1');
  const [activeTab, setActiveTab] = useState<'editais' | 'disciplinas'>('editais');
  const [presets, setPresets] = useState<AdminPreset[]>([]);
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Modals
  const [presetModal, setPresetModal] = useState<{ open: boolean; id?: string; name: string; description: string }>({ open: false, name: '', description: '' });
  const [subjectModal, setSubjectModal] = useState<{ open: boolean; id?: string; name: string; priority: number; color: string }>({ open: false, name: '', priority: 3, color: COLORS[0] });

  // Inline topic editing
  const [newTopic, setNewTopic] = useState<Record<string, string>>({});
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [editTopicName, setEditTopicName] = useState('');

  // Subject picker (for linking to preset)
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  // ── Load ─────────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);

    const { data: subRows, error: subErr } = await supabase.from('admin_subjects').select('*').order('sort_order');
    if (subErr) {
      // Tabela não existe — migração pendente
      setMigrationNeeded(true);
      setLoading(false);
      return;
    }
    setMigrationNeeded(false);
    const allSubjects: AdminSubject[] = await Promise.all((subRows || []).map(async s => {
      const { data: topRows } = await supabase.from('admin_topics').select('*').eq('subject_id', s.id).order('sort_order');
      return { ...s, topics: topRows || [] };
    }));
    setSubjects(allSubjects);

    const { data: presetRows } = await supabase.from('admin_presets').select('*').order('sort_order');
    const allPresets: AdminPreset[] = await Promise.all((presetRows || []).map(async p => {
      const { data: linkRows } = await supabase.from('admin_preset_subjects')
        .select('subject_id, sort_order').eq('preset_id', p.id).order('sort_order');
      const linked = (linkRows || [])
        .map(l => allSubjects.find(s => s.id === l.subject_id))
        .filter(Boolean) as AdminSubject[];
      return { id: p.id, name: p.name, description: p.description, sort_order: p.sort_order, subjects: linked };
    }));
    setPresets(allPresets);
    setLoading(false);
  }, []);

  useEffect(() => { if (unlocked) loadAll(); }, [unlocked, loadAll]);

  const selectedPreset  = presets.find(p => p.id === selectedPresetId)  || null;
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId) || null;

  // ── Preset CRUD ──────────────────────────────────────────────────────────────
  async function savePreset() {
    const { name, description, id } = presetModal;
    if (!name.trim()) return;
    if (id) {
      await supabase.from('admin_presets').update({ name: name.trim(), description: description.trim(), updated_at: new Date().toISOString() }).eq('id', id);
    } else {
      await supabase.from('admin_presets').insert({ name: name.trim(), description: description.trim(), sort_order: presets.length });
    }
    setPresetModal({ open: false, name: '', description: '' });
    await loadAll();
  }

  async function deletePreset(id: string) {
    if (!confirm('Excluir este edital?')) return;
    await supabase.from('admin_presets').delete().eq('id', id);
    if (selectedPresetId === id) setSelectedPresetId(null);
    await loadAll();
  }

  // ── Subject CRUD (biblioteca global) ─────────────────────────────────────────
  async function saveSubject() {
    const { name, priority, color, id } = subjectModal;
    if (!name.trim()) return;
    if (id) {
      await supabase.from('admin_subjects').update({ name: name.trim(), priority, color, updated_at: new Date().toISOString() }).eq('id', id);
    } else {
      const newColor = color || COLORS[subjects.length % COLORS.length];
      await supabase.from('admin_subjects').insert({ name: name.trim(), priority, color: newColor, sort_order: subjects.length });
    }
    setSubjectModal({ open: false, name: '', priority: 3, color: COLORS[0] });
    await loadAll();
  }

  async function deleteSubject(id: string) {
    if (!confirm('Excluir esta disciplina e todos os seus assuntos? Ela será removida de todos os editais.')) return;
    await supabase.from('admin_subjects').delete().eq('id', id);
    if (selectedSubjectId === id) setSelectedSubjectId(null);
    await loadAll();
  }

  // ── Preset ↔ Subject link ────────────────────────────────────────────────────
  async function linkSubject(subjectId: string) {
    if (!selectedPresetId) return;
    await supabase.from('admin_preset_subjects').insert({
      preset_id: selectedPresetId, subject_id: subjectId,
      sort_order: selectedPreset?.subjects.length || 0,
    });
    setShowPicker(false); setPickerSearch('');
    await loadAll();
  }

  async function unlinkSubject(subjectId: string) {
    if (!selectedPresetId) return;
    await supabase.from('admin_preset_subjects').delete()
      .eq('preset_id', selectedPresetId).eq('subject_id', subjectId);
    await loadAll();
  }

  // ── Topic CRUD ───────────────────────────────────────────────────────────────
  async function addTopic(subjectId: string) {
    const name = (newTopic[subjectId] || '').trim();
    if (!name) return;
    const subject = subjects.find(s => s.id === subjectId);
    await supabase.from('admin_topics').insert({ subject_id: subjectId, name, sort_order: subject?.topics.length || 0 });
    setNewTopic(prev => ({ ...prev, [subjectId]: '' }));
    await loadAll();
  }

  async function saveTopic(id: string) {
    if (!editTopicName.trim()) return;
    await supabase.from('admin_topics').update({ name: editTopicName.trim() }).eq('id', id);
    setEditingTopic(null);
    await loadAll();
  }

  async function deleteTopic(id: string) {
    await supabase.from('admin_topics').delete().eq('id', id);
    await loadAll();
  }

  // ── Seed de editais padrão ────────────────────────────────────────────────────
  async function seedBuiltinPresets() {
    setSeedLoading(true);
    setSeedMessage(null);
    try {
      const COLORS = ['#4338CA', '#E11D48', '#059669', '#D97706', '#7C3AED', '#0891B2', '#DC2626', '#2563EB', '#CA8A04', '#9333EA'];

      // Mapa de disciplinas únicas (mesclagem por nome)
      const subjectMap = new Map<string, { priority: number; color: string; topics: string[] }>();
      let colorIdx = 0;
      for (const preset of presetExams) {
        for (const subj of preset.subjects) {
          if (!subjectMap.has(subj.name)) {
            subjectMap.set(subj.name, {
              priority: subj.priority,
              color: COLORS[colorIdx % COLORS.length],
              topics: [...subj.topics],
            });
            colorIdx++;
          } else {
            const existing = subjectMap.get(subj.name)!;
            existing.priority = Math.max(existing.priority, subj.priority);
            const existingSet = new Set(existing.topics);
            subj.topics.forEach(t => { if (!existingSet.has(t)) existing.topics.push(t); });
          }
        }
      }

      // Inserir disciplinas e assuntos
      const subjectIdByName = new Map<string, string>();
      let sortOrder = 0;
      for (const [name, { priority, color, topics }] of subjectMap) {
        const { data: sd, error } = await supabase
          .from('admin_subjects')
          .insert({ name, priority, color, sort_order: sortOrder++ })
          .select().single();
        if (error || !sd) continue;
        subjectIdByName.set(name, sd.id);
        if (topics.length > 0) {
          await supabase.from('admin_topics').insert(
            topics.map((t, i) => ({ subject_id: sd.id, name: t, sort_order: i })) as any
          );
        }
      }

      // Inserir editais e vincular disciplinas
      let presetOrder = 0;
      let created = 0;
      for (const preset of presetExams) {
        const { data: pd, error } = await supabase
          .from('admin_presets')
          .insert({ name: preset.name, description: preset.description || '', sort_order: presetOrder++ })
          .select().single();
        if (error || !pd) continue;
        created++;
        const links = preset.subjects
          .map((s, i) => {
            const sid = subjectIdByName.get(s.name);
            return sid ? { preset_id: pd.id, subject_id: sid, sort_order: i } : null;
          })
          .filter(Boolean);
        if (links.length > 0) {
          await supabase.from('admin_preset_subjects').insert(links as any);
        }
      }

      await loadAll();
      setSeedMessage({ type: 'ok', text: `${created} editais importados com ${subjectMap.size} disciplinas na biblioteca.` });
    } catch (err: any) {
      setSeedMessage({ type: 'err', text: err?.message || 'Erro ao importar. Verifique se a migração foi executada.' });
    } finally {
      setSeedLoading(false);
    }
  }

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  const unlinkedSubjects = subjects.filter(s => !selectedPreset?.subjects.some(ls => ls.id === s.id));
  const filteredUnlinked = pickerSearch
    ? unlinkedSubjects.filter(s => s.name.toLowerCase().includes(pickerSearch.toLowerCase()))
    : unlinkedSubjects;

  // Banner de migração pendente
  if (migrationNeeded) {
    const migrationSQL = `-- Execute no Supabase Dashboard → SQL Editor
drop table if exists public.admin_preset_topics;
drop table if exists public.admin_preset_subjects;

create table if not exists public.admin_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null, priority integer not null default 3,
  color text not null default '#6366f1', sort_order integer not null default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.admin_topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.admin_subjects(id) on delete cascade not null,
  name text not null, sort_order integer not null default 0, created_at timestamptz default now()
);
create table if not exists public.admin_preset_subjects (
  id uuid primary key default gen_random_uuid(),
  preset_id uuid references public.admin_presets(id) on delete cascade not null,
  subject_id uuid references public.admin_subjects(id) on delete cascade not null,
  sort_order integer not null default 0, created_at timestamptz default now(),
  unique(preset_id, subject_id)
);
alter table public.admin_subjects enable row level security;
alter table public.admin_topics enable row level security;
alter table public.admin_preset_subjects enable row level security;
create policy "Public read admin_subjects" on public.admin_subjects for select using (true);
create policy "Auth write admin_subjects" on public.admin_subjects for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Public read admin_topics" on public.admin_topics for select using (true);
create policy "Auth write admin_topics" on public.admin_topics for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Public read admin_preset_subjects" on public.admin_preset_subjects for select using (true);
create policy "Auth write admin_preset_subjects" on public.admin_preset_subjects for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');`;

    return (
      <div className="min-h-screen bg-background flex items-start justify-center pt-16 p-4">
        <Card className="w-full max-w-2xl p-8 space-y-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-foreground text-lg">Migração de banco necessária</h2>
              <p className="text-sm text-muted-foreground mt-1">
                As tabelas do painel admin ainda não foram criadas no Supabase. Execute o SQL abaixo no <strong>Supabase Dashboard → SQL Editor</strong> e depois clique em "Já executei".
              </p>
            </div>
          </div>
          <pre className="bg-muted rounded-lg p-4 text-xs text-muted-foreground overflow-auto max-h-64 whitespace-pre-wrap">{migrationSQL}</pre>
          <div className="flex gap-3">
            <button onClick={() => loadAll()}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Já executei — recarregar
            </button>
            <button onClick={() => { sessionStorage.removeItem(ADMIN_KEY); setUnlocked(false); }}
              className="px-4 py-3 rounded-xl border border-border text-muted-foreground text-sm hover:bg-accent">
              Sair
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-bold text-foreground">Admin — StudyFlow</span>
        </div>
        <button onClick={() => { sessionStorage.removeItem(ADMIN_KEY); setUnlocked(false); }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <LogOut size={15} /> Sair
        </button>
      </div>

      <div className="flex h-[calc(100vh-57px)]">
        {/* ── Painel esquerdo ──────────────────────────────────────────────── */}
        <div className="w-72 border-r border-border bg-card flex flex-col flex-shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(['editais', 'disciplinas'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'editais' ? (
            <>
              <div className="p-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editais ({presets.length})</span>
                <div className="flex items-center gap-1">
                  {presets.length > 0 && (
                    <button onClick={seedBuiltinPresets} disabled={seedLoading} title="Importar editais padrão"
                      className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition-colors disabled:opacity-50">
                      <Download size={14} />
                    </button>
                  )}
                  <button onClick={() => setPresetModal({ open: true, name: '', description: '' })}
                    className="p-1 rounded-lg hover:bg-accent text-primary"><Plus size={16} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? <p className="text-xs text-muted-foreground text-center py-8">Carregando…</p>
                  : presets.length === 0 ? (
                    <div className="px-3 py-6 space-y-3 text-center">
                      <p className="text-xs text-muted-foreground">Nenhum edital ainda.</p>
                      <button
                        onClick={seedBuiltinPresets}
                        disabled={seedLoading}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <Download size={12} />
                        {seedLoading ? 'Importando…' : 'Importar editais padrão'}
                      </button>
                      {seedMessage && (
                        <p className={`text-xs ${seedMessage.type === 'ok' ? 'text-green-600' : 'text-destructive'}`}>
                          {seedMessage.text}
                        </p>
                      )}
                    </div>
                  )
                  : presets.map(p => (
                    <div key={p.id} onClick={() => setSelectedPresetId(p.id)}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${selectedPresetId === p.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-foreground'}`}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.subjects.length} disciplinas</div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); setPresetModal({ open: true, id: p.id, name: p.name, description: p.description }); }}
                          className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"><Edit2 size={12} /></button>
                        <button onClick={e => { e.stopPropagation(); deletePreset(p.id); }}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <>
              <div className="p-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Disciplinas ({subjects.length})</span>
                <button onClick={() => setSubjectModal({ open: true, name: '', priority: 3, color: COLORS[subjects.length % COLORS.length] })}
                  className="p-1 rounded-lg hover:bg-accent text-primary"><Plus size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? <p className="text-xs text-muted-foreground text-center py-8">Carregando…</p>
                  : subjects.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">Nenhuma disciplina ainda.</p>
                  : subjects.map(s => (
                    <div key={s.id} onClick={() => setSelectedSubjectId(s.id)}
                      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${selectedSubjectId === s.id ? 'bg-primary/10' : 'hover:bg-accent'}`}>
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate text-foreground">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.topics.length} assuntos</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteSubject(s.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-shrink-0">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>

        {/* ── Painel direito ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'editais' ? (
            selectedPreset ? (
              <div className="max-w-2xl">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">{selectedPreset.name}</h2>
                  {selectedPreset.description && <p className="text-sm text-muted-foreground mt-1">{selectedPreset.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedPreset.subjects.length} disciplinas · {selectedPreset.subjects.reduce((s, sub) => s + sub.topics.length, 0)} assuntos
                  </p>
                </div>

                <div className="space-y-2">
                  {selectedPreset.subjects.map(sub => (
                    <Card key={sub.id} className="p-3 flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground">{sub.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">P{sub.priority} · {sub.topics.length} assuntos</span>
                      </div>
                      <button onClick={() => unlinkSubject(sub.id)} title="Remover do edital"
                        className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0">
                        <Unlink size={13} />
                      </button>
                    </Card>
                  ))}

                  {/* Subject picker */}
                  {showPicker ? (
                    <Card className="p-3 space-y-2 border-primary/40">
                      <input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder="Buscar disciplina…" autoFocus
                        className="w-full rounded px-3 py-2 text-sm bg-input border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                      <div className="max-h-52 overflow-y-auto space-y-0.5">
                        {filteredUnlinked.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            {unlinkedSubjects.length === 0 ? 'Todas as disciplinas já estão neste edital.' : 'Nenhuma disciplina encontrada.'}
                          </p>
                        ) : filteredUnlinked.map(s => (
                          <button key={s.id} onClick={() => linkSubject(s.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-accent text-sm text-left transition-colors">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="flex-1 text-foreground">{s.name}</span>
                            <span className="text-xs text-muted-foreground">{s.topics.length} assuntos</span>
                          </button>
                        ))}
                      </div>
                      <button onClick={() => { setShowPicker(false); setPickerSearch(''); }}
                        className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                    </Card>
                  ) : (
                    <button onClick={() => setShowPicker(true)}
                      className="w-full py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-2">
                      <Link2 size={14} /> Adicionar disciplina da biblioteca
                    </button>
                  )}

                  {subjects.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Crie disciplinas na aba <strong>Disciplinas</strong> para depois adicioná-las aqui.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <BookOpen size={40} className="opacity-20" />
                <p className="text-sm">Selecione um edital ou crie um novo</p>
              </div>
            )
          ) : (
            selectedSubject ? (
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: selectedSubject.color }} />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-foreground">{selectedSubject.name}</h2>
                    <p className="text-xs text-muted-foreground">Prioridade {selectedSubject.priority} · {selectedSubject.topics.length} assuntos</p>
                  </div>
                  <button onClick={() => setSubjectModal({ open: true, id: selectedSubject.id, name: selectedSubject.name, priority: selectedSubject.priority, color: selectedSubject.color })}
                    className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 size={15} />
                  </button>
                </div>

                <Card className="overflow-hidden">
                  <div className="p-4 space-y-1">
                    {selectedSubject.topics.map(t => (
                      <div key={t.id} className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors">
                        {editingTopic === t.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input value={editTopicName} onChange={e => setEditTopicName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveTopic(t.id); if (e.key === 'Escape') setEditingTopic(null); }}
                              className="flex-1 rounded px-2 py-0.5 text-sm bg-input border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring" autoFocus />
                            <button onClick={() => saveTopic(t.id)} className="p-1 text-primary hover:bg-primary/10 rounded"><Save size={12} /></button>
                            <button onClick={() => setEditingTopic(null)} className="p-1 text-muted-foreground hover:bg-accent rounded"><X size={12} /></button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 text-sm text-foreground">{t.name}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingTopic(t.id); setEditTopicName(t.name); }}
                                className="p-0.5 text-muted-foreground hover:text-primary"><Edit2 size={12} /></button>
                              <button onClick={() => deleteTopic(t.id)}
                                className="p-0.5 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-2 px-2 pt-2">
                      <input value={newTopic[selectedSubject.id] || ''}
                        onChange={e => setNewTopic(prev => ({ ...prev, [selectedSubject.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') addTopic(selectedSubject.id); }}
                        placeholder="+ Novo assunto (Enter para salvar)"
                        className="flex-1 rounded px-2 py-1 text-sm bg-transparent border border-dashed border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary" />
                      {(newTopic[selectedSubject.id] || '').trim() && (
                        <button onClick={() => addTopic(selectedSubject.id)} className="p-1 text-primary hover:bg-primary/10 rounded"><Save size={13} /></button>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <BookOpen size={40} className="opacity-20" />
                <p className="text-sm">Selecione uma disciplina ou crie uma nova</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Modal edital ────────────────────────────────────────────────────── */}
      {presetModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setPresetModal({ open: false, name: '', description: '' }); }}>
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{presetModal.id ? 'Editar Edital' : 'Novo Edital'}</h2>
              <button onClick={() => setPresetModal({ open: false, name: '', description: '' })} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent"><X size={18} /></button>
            </div>
            <input value={presetModal.name} onChange={e => setPresetModal(m => ({ ...m, name: e.target.value }))} placeholder="Nome do edital" autoFocus
              className="w-full rounded-lg px-3 py-2.5 text-sm bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <textarea value={presetModal.description} onChange={e => setPresetModal(m => ({ ...m, description: e.target.value }))} placeholder="Descrição (opcional)" rows={3}
              className="w-full rounded-lg px-3 py-2.5 text-sm bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setPresetModal({ open: false, name: '', description: '' })} className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground text-sm hover:bg-accent">Cancelar</button>
              <button onClick={savePreset} disabled={!presetModal.name.trim()} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {presetModal.id ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Modal disciplina ─────────────────────────────────────────────────── */}
      {subjectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSubjectModal({ open: false, name: '', priority: 3, color: COLORS[0] }); }}>
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{subjectModal.id ? 'Editar Disciplina' : 'Nova Disciplina'}</h2>
              <button onClick={() => setSubjectModal({ open: false, name: '', priority: 3, color: COLORS[0] })} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent"><X size={18} /></button>
            </div>
            <input value={subjectModal.name} onChange={e => setSubjectModal(m => ({ ...m, name: e.target.value }))} placeholder="Nome da disciplina" autoFocus
              className="w-full rounded-lg px-3 py-2.5 text-sm bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Prioridade:</span>
              <select value={subjectModal.priority} onChange={e => setSubjectModal(m => ({ ...m, priority: Number(e.target.value) }))}
                className="rounded-lg px-3 py-2 text-sm bg-input border border-border text-foreground">
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Cor:</span>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setSubjectModal(m => ({ ...m, color: c }))}
                    className={`w-6 h-6 rounded-full transition-transform ${subjectModal.color === c ? 'scale-125 ring-2 ring-offset-2 ring-ring' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSubjectModal({ open: false, name: '', priority: 3, color: COLORS[0] })} className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground text-sm hover:bg-accent">Cancelar</button>
              <button onClick={saveSubject} disabled={!subjectModal.name.trim()} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {subjectModal.id ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Admin;
