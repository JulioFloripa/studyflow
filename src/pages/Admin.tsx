import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, ChevronDown, ChevronRight, Save, X, Lock, LogOut, BookOpen, GripVertical, Edit2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

const ADMIN_KEY = 'sf_admin_v1';
const ADMIN_PWD = import.meta.env.VITE_ADMIN_PASSWORD || '';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface AdminTopic    { id: string; name: string; sort_order: number; }
interface AdminSubject  { id: string; name: string; priority: number; color: string; sort_order: number; topics: AdminTopic[]; }
interface AdminPreset   { id: string; name: string; description: string; sort_order: number; subjects: AdminSubject[]; }

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16'];

// ─── Password Gate ────────────────────────────────────────────────────────────
const PasswordGate: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ADMIN_PWD) { setError(true); return; }
    if (value === ADMIN_PWD) {
      sessionStorage.setItem(ADMIN_KEY, '1');
      onUnlock();
    } else {
      setError(true);
      setValue('');
    }
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
          <input
            type="password"
            value={value}
            onChange={e => { setValue(e.target.value); setError(false); }}
            placeholder="Senha"
            autoFocus
            className={`w-full rounded-lg px-4 py-3 text-sm bg-input border text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${error ? 'border-destructive' : 'border-border'}`}
          />
          {error && <p className="text-xs text-destructive">{!ADMIN_PWD ? 'VITE_ADMIN_PASSWORD não configurada.' : 'Senha incorreta.'}</p>}
          <button type="submit" className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            Entrar
          </button>
        </form>
      </Card>
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
const Admin: React.FC = () => {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(ADMIN_KEY) === '1');
  const [presets, setPresets] = useState<AdminPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  // Modal edital
  const [presetModal, setPresetModal] = useState<{ open: boolean; id?: string; name: string; description: string }>({ open: false, name: '', description: '' });

  // Inline new subject
  const [newSubject, setNewSubject] = useState<{ name: string; priority: number; color: string } | null>(null);

  // Inline new topic per subject
  const [newTopic, setNewTopic] = useState<Record<string, string>>({});

  // Inline editing
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [editSubjectForm, setEditSubjectForm] = useState({ name: '', priority: 3, color: '' });
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [editTopicName, setEditTopicName] = useState('');

  const loadPresets = useCallback(async () => {
    setLoading(true);
    const { data: presetRows } = await supabase.from('admin_presets').select('*').order('sort_order');
    if (!presetRows) { setLoading(false); return; }

    const full: AdminPreset[] = await Promise.all(presetRows.map(async p => {
      const { data: subRows } = await supabase.from('admin_preset_subjects')
        .select('*').eq('preset_id', p.id).order('sort_order');
      const subjects: AdminSubject[] = await Promise.all((subRows || []).map(async s => {
        const { data: topRows } = await supabase.from('admin_preset_topics')
          .select('*').eq('subject_id', s.id).order('sort_order');
        return { ...s, topics: topRows || [] };
      }));
      return { id: p.id, name: p.name, description: p.description, sort_order: p.sort_order, subjects };
    }));

    setPresets(full);
    setLoading(false);
  }, []);

  useEffect(() => { if (unlocked) loadPresets(); }, [unlocked, loadPresets]);

  const selected = presets.find(p => p.id === selectedId) || null;

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
    await loadPresets();
  }

  async function deletePreset(id: string) {
    if (!confirm('Excluir este edital e todas as disciplinas e assuntos? Esta ação não pode ser desfeita.')) return;
    await supabase.from('admin_presets').delete().eq('id', id);
    if (selectedId === id) setSelectedId(null);
    await loadPresets();
  }

  // ── Subject CRUD ─────────────────────────────────────────────────────────────
  async function addSubject() {
    if (!newSubject || !newSubject.name.trim() || !selectedId) return;
    await supabase.from('admin_preset_subjects').insert({
      preset_id: selectedId, name: newSubject.name.trim(),
      priority: newSubject.priority, color: newSubject.color,
      sort_order: selected?.subjects.length || 0,
    });
    setNewSubject(null);
    await loadPresets();
  }

  async function saveSubject(id: string) {
    await supabase.from('admin_preset_subjects').update({
      name: editSubjectForm.name.trim(), priority: editSubjectForm.priority, color: editSubjectForm.color,
    }).eq('id', id);
    setEditingSubject(null);
    await loadPresets();
  }

  async function deleteSubject(id: string) {
    await supabase.from('admin_preset_subjects').delete().eq('id', id);
    await loadPresets();
  }

  // ── Topic CRUD ───────────────────────────────────────────────────────────────
  async function addTopic(subjectId: string) {
    const name = (newTopic[subjectId] || '').trim();
    if (!name) return;
    const subject = selected?.subjects.find(s => s.id === subjectId);
    await supabase.from('admin_preset_topics').insert({
      subject_id: subjectId, name, sort_order: subject?.topics.length || 0,
    });
    setNewTopic(prev => ({ ...prev, [subjectId]: '' }));
    await loadPresets();
  }

  async function saveTopic(id: string) {
    await supabase.from('admin_preset_topics').update({ name: editTopicName.trim() }).eq('id', id);
    setEditingTopic(null);
    await loadPresets();
  }

  async function deleteTopic(id: string) {
    await supabase.from('admin_preset_topics').delete().eq('id', id);
    await loadPresets();
  }

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-bold text-foreground">Admin — StudyFlow</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Editais</span>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(ADMIN_KEY); setUnlocked(false); }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut size={15} /> Sair
        </button>
      </div>

      <div className="flex h-[calc(100vh-57px)]">
        {/* ── Painel esquerdo: lista de editais ─────────────────────────────── */}
        <div className="w-72 border-r border-border bg-card flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Editais ({presets.length})
            </span>
            <button
              onClick={() => setPresetModal({ open: true, name: '', description: '' })}
              className="p-1 rounded-lg hover:bg-accent text-primary transition-colors"
              title="Novo edital"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-8">Carregando…</p>
            ) : presets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhum edital ainda.</p>
            ) : (
              presets.map(p => (
                <div
                  key={p.id}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${selectedId === p.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-foreground'}`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.subjects.length} disciplinas</div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); setPresetModal({ open: true, id: p.id, name: p.name, description: p.description }); }}
                      className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary">
                      <Edit2 size={12} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); deletePreset(p.id); }}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Painel direito: editor do edital ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <BookOpen size={40} className="opacity-20" />
              <p className="text-sm">Selecione um edital para editar</p>
              <button
                onClick={() => setPresetModal({ open: true, name: '', description: '' })}
                className="text-sm text-primary hover:underline"
              >
                ou crie um novo
              </button>
            </div>
          ) : (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">{selected.name}</h2>
                {selected.description && <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {selected.subjects.length} disciplinas · {selected.subjects.reduce((s, sub) => s + sub.topics.length, 0)} assuntos
                </p>
              </div>

              {/* Disciplinas */}
              <div className="space-y-3">
                {selected.subjects.map((sub, si) => (
                  <Card key={sub.id} className="overflow-hidden">
                    {/* Header da disciplina */}
                    <div className="flex items-center gap-3 p-3 bg-muted/30">
                      <GripVertical size={14} className="text-muted-foreground/40 flex-shrink-0" />
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color }} />

                      {editingSubject === sub.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            value={editSubjectForm.name}
                            onChange={e => setEditSubjectForm(f => ({ ...f, name: e.target.value }))}
                            className="flex-1 rounded px-2 py-1 text-sm bg-input border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            autoFocus
                          />
                          <select
                            value={editSubjectForm.priority}
                            onChange={e => setEditSubjectForm(f => ({ ...f, priority: Number(e.target.value) }))}
                            className="rounded px-2 py-1 text-xs bg-input border border-border text-foreground"
                          >
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>P{n}</option>)}
                          </select>
                          <div className="flex gap-1">
                            {COLORS.map(c => (
                              <button key={c} onClick={() => setEditSubjectForm(f => ({ ...f, color: c }))}
                                className={`w-4 h-4 rounded-full transition-transform ${editSubjectForm.color === c ? 'scale-125 ring-2 ring-offset-1 ring-ring' : ''}`}
                                style={{ backgroundColor: c }} />
                            ))}
                          </div>
                          <button onClick={() => saveSubject(sub.id)} className="p-1 text-primary hover:bg-primary/10 rounded"><Save size={14} /></button>
                          <button onClick={() => setEditingSubject(null)} className="p-1 text-muted-foreground hover:bg-accent rounded"><X size={14} /></button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-foreground">{sub.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">P{sub.priority} · {sub.topics.length} assuntos</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditingSubject(sub.id); setEditSubjectForm({ name: sub.name, priority: sub.priority, color: sub.color }); }}
                              className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => deleteSubject(sub.id)}
                              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                              <Trash2 size={13} />
                            </button>
                            <button onClick={() => setExpandedSubjects(prev => { const n = new Set(prev); n.has(sub.id) ? n.delete(sub.id) : n.add(sub.id); return n; })}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                              {expandedSubjects.has(sub.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Tópicos (expandido) */}
                    {(expandedSubjects.has(sub.id) || sub.topics.length === 0) && (
                      <div className="p-3 space-y-1.5 border-t border-border">
                        {sub.topics.map(t => (
                          <div key={t.id} className="group flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 transition-colors">
                            {editingTopic === t.id ? (
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  value={editTopicName}
                                  onChange={e => setEditTopicName(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveTopic(t.id); if (e.key === 'Escape') setEditingTopic(null); }}
                                  className="flex-1 rounded px-2 py-0.5 text-sm bg-input border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                  autoFocus
                                />
                                <button onClick={() => saveTopic(t.id)} className="p-1 text-primary"><Save size={12} /></button>
                                <button onClick={() => setEditingTopic(null)} className="p-1 text-muted-foreground"><X size={12} /></button>
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

                        {/* Novo tópico */}
                        <div className="flex items-center gap-2 px-2 pt-1">
                          <input
                            value={newTopic[sub.id] || ''}
                            onChange={e => setNewTopic(prev => ({ ...prev, [sub.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') addTopic(sub.id); }}
                            placeholder="+ Novo assunto (Enter para salvar)"
                            className="flex-1 rounded px-2 py-1 text-sm bg-transparent border border-dashed border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                          />
                          {(newTopic[sub.id] || '').trim() && (
                            <button onClick={() => addTopic(sub.id)} className="p-1 text-primary hover:bg-primary/10 rounded"><Save size={13} /></button>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}

                {/* Nova disciplina */}
                {newSubject ? (
                  <Card className="p-4 space-y-3 border-primary/30">
                    <div className="flex items-center gap-2">
                      <input
                        value={newSubject.name}
                        onChange={e => setNewSubject(s => s ? { ...s, name: e.target.value } : s)}
                        placeholder="Nome da disciplina"
                        autoFocus
                        className="flex-1 rounded-lg px-3 py-2 text-sm bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <select
                        value={newSubject.priority}
                        onChange={e => setNewSubject(s => s ? { ...s, priority: Number(e.target.value) } : s)}
                        className="rounded-lg px-3 py-2 text-sm bg-input border border-border text-foreground"
                      >
                        {[1,2,3,4,5].map(n => <option key={n} value={n}>Prioridade {n}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Cor:</span>
                      {COLORS.map(c => (
                        <button key={c} onClick={() => setNewSubject(s => s ? { ...s, color: c } : s)}
                          className={`w-5 h-5 rounded-full transition-transform ${newSubject.color === c ? 'scale-125 ring-2 ring-offset-1 ring-ring' : ''}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addSubject} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                        <Save size={14} /> Salvar
                      </button>
                      <button onClick={() => setNewSubject(null)} className="px-3 py-2 rounded-lg border border-border text-muted-foreground text-sm hover:bg-accent">
                        Cancelar
                      </button>
                    </div>
                  </Card>
                ) : (
                  <button
                    onClick={() => setNewSubject({ name: '', priority: 3, color: COLORS[selected.subjects.length % COLORS.length] })}
                    className="w-full py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={15} /> Adicionar disciplina
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de edital ─────────────────────────────────────────────────── */}
      {presetModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setPresetModal({ open: false, name: '', description: '' }); }}>
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{presetModal.id ? 'Editar Edital' : 'Novo Edital'}</h2>
              <button onClick={() => setPresetModal({ open: false, name: '', description: '' })} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input
                value={presetModal.name}
                onChange={e => setPresetModal(m => ({ ...m, name: e.target.value }))}
                placeholder="Nome do edital (ex: ENEM 2025)"
                autoFocus
                className="w-full rounded-lg px-3 py-2.5 text-sm bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <textarea
                value={presetModal.description}
                onChange={e => setPresetModal(m => ({ ...m, description: e.target.value }))}
                placeholder="Descrição (opcional)"
                rows={3}
                className="w-full rounded-lg px-3 py-2.5 text-sm bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPresetModal({ open: false, name: '', description: '' })} className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground text-sm hover:bg-accent">Cancelar</button>
              <button onClick={savePreset} disabled={!presetModal.name.trim()} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {presetModal.id ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Admin;
