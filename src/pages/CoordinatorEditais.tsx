import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2, BookOpen, FileText, Pencil, ChevronRight, School } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEducational } from '@/contexts/EducationalContext';

interface EditalTopic {
  id: string;
  name: string;
  sort_order: number;
}

interface EditalSubject {
  id: string;
  edital_id: string;
  name: string;
  color: string;
  sort_order: number;
  topics: EditalTopic[];
}

interface Edital {
  id: string;
  coordinator_id: string;
  class_id: string | null;
  name: string;
  description: string | null;
  version: number;
  created_at: string;
  subjects: EditalSubject[];
}

const COLORS = ['#4338CA', '#DC2626', '#16A34A', '#CA8A04', '#9333EA', '#0891B2', '#E11D48', '#7C3AED'];

const CoordinatorEditais = () => {
  const { user } = useAuth();
  const { classes } = useEducational();
  const [editais, setEditais] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEdital, setEditingEdital] = useState<Edital | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formClassId, setFormClassId] = useState<string>('');
  const [formSubjects, setFormSubjects] = useState<Array<{ name: string; color: string; topics: string[] }>>([]);

  const loadEditais = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: editaisData } = await (supabase as any)
      .from('editais')
      .select('*')
      .eq('coordinator_id', user.id)
      .order('created_at', { ascending: false });

    if (!editaisData) { setLoading(false); return; }

    const fullEditais: Edital[] = [];
    for (const ed of editaisData) {
      const { data: subjectsData } = await (supabase as any)
        .from('edital_subjects')
        .select('*')
        .eq('edital_id', ed.id)
        .order('sort_order');

      const subjects: EditalSubject[] = [];
      if (subjectsData) {
        for (const sub of subjectsData) {
          const { data: topicsData } = await (supabase as any)
            .from('edital_topics')
            .select('*')
            .eq('edital_subject_id', sub.id)
            .order('sort_order');

          subjects.push({
            id: sub.id,
            edital_id: sub.edital_id,
            name: sub.name,
            color: sub.color || '#4338CA',
            sort_order: sub.sort_order,
            topics: (topicsData || []).map((t: any) => ({ id: t.id, name: t.name, sort_order: t.sort_order })),
          });
        }
      }

      fullEditais.push({
        id: ed.id,
        coordinator_id: ed.coordinator_id,
        class_id: ed.class_id,
        name: ed.name,
        description: ed.description,
        version: ed.version,
        created_at: ed.created_at,
        subjects,
      });
    }

    setEditais(fullEditais);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadEditais(); }, [loadEditais]);

  const openNewDialog = () => {
    setEditingEdital(null);
    setFormName('');
    setFormDescription('');
    setFormClassId('');
    setFormSubjects([{ name: '', color: COLORS[0], topics: [''] }]);
    setDialogOpen(true);
  };

  const openEditDialog = (edital: Edital) => {
    setEditingEdital(edital);
    setFormName(edital.name);
    setFormDescription(edital.description || '');
    setFormClassId(edital.class_id || '');
    setFormSubjects(edital.subjects.map(s => ({
      name: s.name,
      color: s.color,
      topics: s.topics.map(t => t.name),
    })));
    setDialogOpen(true);
  };

  const addSubject = () => {
    setFormSubjects(prev => [...prev, { name: '', color: COLORS[prev.length % COLORS.length], topics: [''] }]);
  };

  const removeSubject = (idx: number) => {
    setFormSubjects(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSubject = (idx: number, field: string, value: string) => {
    setFormSubjects(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addTopic = (subIdx: number) => {
    setFormSubjects(prev => prev.map((s, i) => i === subIdx ? { ...s, topics: [...s.topics, ''] } : s));
  };

  const removeTopic = (subIdx: number, topicIdx: number) => {
    setFormSubjects(prev => prev.map((s, i) => i === subIdx ? { ...s, topics: s.topics.filter((_, ti) => ti !== topicIdx) } : s));
  };

  const updateTopic = (subIdx: number, topicIdx: number, value: string) => {
    setFormSubjects(prev => prev.map((s, i) =>
      i === subIdx ? { ...s, topics: s.topics.map((t, ti) => ti === topicIdx ? value : t) } : s
    ));
  };

  const handleSave = async () => {
    if (!user || !formName.trim()) {
      toast.error('Nome do edital é obrigatório');
      return;
    }

    const validSubjects = formSubjects.filter(s => s.name.trim());
    if (validSubjects.length === 0) {
      toast.error('Adicione pelo menos uma disciplina');
      return;
    }

    try {
      if (editingEdital) {
        // Update edital
        await (supabase as any).from('editais').update({
          name: formName,
          description: formDescription || null,
          class_id: formClassId || null,
        }).eq('id', editingEdital.id);

        // Delete old subjects (cascade deletes topics)
        await (supabase as any).from('edital_subjects').delete().eq('edital_id', editingEdital.id);

        // Re-create subjects and topics
        for (let i = 0; i < validSubjects.length; i++) {
          const sub = validSubjects[i];
          const { data: subData } = await (supabase as any).from('edital_subjects').insert({
            edital_id: editingEdital.id,
            name: sub.name,
            color: sub.color,
            sort_order: i,
          }).select().single();

          if (subData) {
            const validTopics = sub.topics.filter(t => t.trim());
            for (let j = 0; j < validTopics.length; j++) {
              await (supabase as any).from('edital_topics').insert({
                edital_subject_id: subData.id,
                name: validTopics[j],
                sort_order: j,
              });
            }
          }
        }

        toast.success('Edital atualizado! Alunos serão notificados sobre mudanças.');
      } else {
        // Create edital
        const { data: editalData } = await (supabase as any).from('editais').insert({
          coordinator_id: user.id,
          name: formName,
          description: formDescription || null,
          class_id: formClassId || null,
        }).select().single();

        if (editalData) {
          for (let i = 0; i < validSubjects.length; i++) {
            const sub = validSubjects[i];
            const { data: subData } = await (supabase as any).from('edital_subjects').insert({
              edital_id: editalData.id,
              name: sub.name,
              color: sub.color,
              sort_order: i,
            }).select().single();

            if (subData) {
              const validTopics = sub.topics.filter(t => t.trim());
              for (let j = 0; j < validTopics.length; j++) {
                await (supabase as any).from('edital_topics').insert({
                  edital_subject_id: subData.id,
                  name: validTopics[j],
                  sort_order: j,
                });
              }
            }
          }
        }

        toast.success('Edital criado com sucesso!');
      }

      setDialogOpen(false);
      loadEditais();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar edital');
    }
  };

  const handleDelete = async (editalId: string) => {
    if (!confirm('Remover este edital? Alunos que o importaram manterão os conteúdos já copiados.')) return;
    
    await (supabase as any).from('editais').delete().eq('id', editalId);
    toast.success('Edital removido');
    loadEditais();
  };

  const totalTopics = (edital: Edital) => edital.subjects.reduce((sum, s) => sum + s.topics.length, 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-7 w-7" />
            Editais
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os editais disponíveis para suas turmas
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Edital
        </Button>
      </div>

      {loading ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Carregando editais...</p>
        </Card>
      ) : editais.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">Nenhum edital cadastrado</p>
          <p className="text-sm text-muted-foreground mb-4">Crie editais para organizar os conteúdos das suas turmas</p>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" /> Criar Primeiro Edital
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {editais.map(edital => {
            const cls = classes.find(c => c.id === edital.class_id);
            return (
              <Card key={edital.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {edital.name}
                      <Badge variant="outline" className="text-xs">v{edital.version}</Badge>
                    </h3>
                    {edital.description && (
                      <p className="text-sm text-muted-foreground mt-1">{edital.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {cls && (
                        <span className="flex items-center gap-1">
                          <School className="h-3 w-3" /> {cls.name}
                        </span>
                      )}
                      <span>{edital.subjects.length} disciplinas</span>
                      <span>{totalTopics(edital)} tópicos</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(edital)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(edital.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>

                <Accordion type="single" collapsible>
                  {edital.subjects.map((sub, idx) => (
                    <AccordionItem key={sub.id} value={sub.id}>
                      <AccordionTrigger className="text-sm py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sub.color }} />
                          {sub.name}
                          <Badge variant="secondary" className="text-xs ml-1">{sub.topics.length} tópicos</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-1 pl-5">
                          {sub.topics.map(topic => (
                            <li key={topic.id} className="text-sm text-muted-foreground flex items-center gap-2">
                              <ChevronRight className="h-3 w-3 flex-shrink-0" />
                              {topic.name}
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEdital ? 'Editar Edital' : 'Novo Edital'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do Edital *</label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: ENEM 2025" />
            </div>

            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Descrição opcional..." rows={2} />
            </div>

            <div>
              <label className="text-sm font-medium">Vincular à Turma</label>
              <Select value={formClassId} onValueChange={setFormClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma turma (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Disciplinas e Tópicos</label>
                <Button variant="outline" size="sm" onClick={addSubject}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Disciplina
                </Button>
              </div>

              <div className="space-y-4">
                {formSubjects.map((sub, subIdx) => (
                  <Card key={subIdx} className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="color"
                        value={sub.color}
                        onChange={e => updateSubject(subIdx, 'color', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={sub.name}
                        onChange={e => updateSubject(subIdx, 'name', e.target.value)}
                        placeholder="Nome da disciplina"
                        className="flex-1"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeSubject(subIdx)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>

                    <div className="space-y-2 pl-10">
                      {sub.topics.map((topic, topicIdx) => (
                        <div key={topicIdx} className="flex items-center gap-2">
                          <Input
                            value={topic}
                            onChange={e => updateTopic(subIdx, topicIdx, e.target.value)}
                            placeholder={`Tópico ${topicIdx + 1}`}
                            className="text-sm"
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeTopic(subIdx, topicIdx)}>
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => addTopic(subIdx)}>
                        <Plus className="h-3 w-3 mr-1" /> Tópico
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingEdital ? 'Salvar Alterações' : 'Criar Edital'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoordinatorEditais;
