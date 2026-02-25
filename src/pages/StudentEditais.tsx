import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText, CheckCircle, AlertTriangle, Download, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStudy } from '@/contexts/StudyContext';

interface EditalTopic {
  id: string;
  name: string;
  sort_order: number;
}

interface EditalSubject {
  id: string;
  name: string;
  color: string;
  topics: EditalTopic[];
}

interface AvailableEdital {
  id: string;
  name: string;
  description: string | null;
  version: number;
  subjects: EditalSubject[];
  selected: boolean;
  synced_version: number | null;
  needsSync: boolean;
}

const StudentEditais = () => {
  const { user } = useAuth();
  const { subjects: existingSubjects, topics: existingTopics, addSubject, addTopic } = useStudy();
  const [editais, setEditais] = useState<AvailableEdital[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);

  const loadEditais = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch available editais (from student's class)
    const { data: editaisData } = await (supabase as any)
      .from('editais')
      .select('*')
      .order('name');

    if (!editaisData || editaisData.length === 0) {
      setEditais([]);
      setLoading(false);
      return;
    }

    // Fetch selections
    const { data: selectionsData } = await (supabase as any)
      .from('student_edital_selections')
      .select('*')
      .eq('user_id', user.id);

    const selectionsMap = new Map(
      (selectionsData || []).map((s: any) => [s.edital_id, s])
    );

    const result: AvailableEdital[] = [];
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
            name: sub.name,
            color: sub.color || '#4338CA',
            topics: (topicsData || []).map((t: any) => ({ id: t.id, name: t.name, sort_order: t.sort_order })),
          });
        }
      }

      const selection: any = selectionsMap.get(ed.id);
      result.push({
        id: ed.id,
        name: ed.name,
        description: ed.description,
        version: ed.version,
        subjects,
        selected: !!selection,
        synced_version: selection?.synced_version || null,
        needsSync: selection ? selection.synced_version < ed.version : false,
      });
    }

    setEditais(result);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadEditais(); }, [loadEditais]);

  // Check which topic names already exist to avoid duplication
  const getExistingTopicNames = useCallback(() => {
    return new Set(existingTopics.map(t => t.name.toLowerCase().trim()));
  }, [existingTopics]);

  const getExistingSubjectNames = useCallback(() => {
    return new Map(existingSubjects.map(s => [s.name.toLowerCase().trim(), s]));
  }, [existingSubjects]);

  const handleImport = async (edital: AvailableEdital) => {
    if (!user) return;
    setImporting(edital.id);

    try {
      const existingSubjectMap = getExistingSubjectNames();
      const existingTopicSet = getExistingTopicNames();
      let imported = 0;
      let skipped = 0;

      for (const edSub of edital.subjects) {
        // Check if subject already exists (case-insensitive)
        let targetSubject = existingSubjectMap.get(edSub.name.toLowerCase().trim());

        if (!targetSubject) {
          // Create new subject
          await addSubject(edSub.name, 3, edSub.color);
          // Refetch to get the new subject
          const { data: newSubs } = await (supabase as any)
            .from('subjects')
            .select('*')
            .eq('user_id', user.id)
            .eq('name', edSub.name)
            .single();

          if (newSubs) {
            targetSubject = { id: newSubs.id, name: newSubs.name, color: newSubs.color, priority: newSubs.priority };
          }
        }

        if (targetSubject) {
          for (const topic of edSub.topics) {
            const topicKey = topic.name.toLowerCase().trim();
            if (existingTopicSet.has(topicKey)) {
              skipped++;
              continue;
            }
            await addTopic(targetSubject.id, topic.name);
            existingTopicSet.add(topicKey);
            imported++;
          }
        }
      }

      // Save selection
      await (supabase as any).from('student_edital_selections').upsert({
        user_id: user.id,
        edital_id: edital.id,
        synced_version: edital.version,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,edital_id' });

      const msg = skipped > 0
        ? `Importados ${imported} tópicos (${skipped} já existiam)`
        : `Importados ${imported} tópicos com sucesso!`;
      toast.success(msg);
      loadEditais();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao importar edital');
    } finally {
      setImporting(null);
    }
  };

  const handleSync = async (edital: AvailableEdital) => {
    // Re-import only new content (deduplication handled automatically)
    await handleImport(edital);
  };

  const handleRemoveSelection = async (editalId: string) => {
    if (!user) return;
    await (supabase as any)
      .from('student_edital_selections')
      .delete()
      .eq('user_id', user.id)
      .eq('edital_id', editalId);
    toast.success('Edital removido da seleção (conteúdos já importados foram mantidos)');
    loadEditais();
  };

  const totalTopics = (edital: AvailableEdital) => edital.subjects.reduce((sum, s) => sum + s.topics.length, 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-7 w-7" />
          Editais Disponíveis
        </h1>
        <p className="text-muted-foreground mt-1">
          Selecione os editais para incluir na sua rotina de estudo
        </p>
      </div>

      {loading ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Carregando editais...</p>
        </Card>
      ) : editais.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum edital disponível para sua turma</p>
          <p className="text-sm text-muted-foreground mt-1">Peça ao seu coordenador para criar editais</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {editais.map(edital => (
            <Card key={edital.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    {edital.name}
                    <Badge variant="outline" className="text-xs">v{edital.version}</Badge>
                    {edital.selected && (
                      <Badge className="text-xs bg-primary text-primary-foreground">
                        <CheckCircle className="h-3 w-3 mr-1" /> Importado
                      </Badge>
                    )}
                    {edital.needsSync && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Atualização disponível
                      </Badge>
                    )}
                  </h3>
                  {edital.description && (
                    <p className="text-sm text-muted-foreground mt-1">{edital.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {edital.subjects.length} disciplinas · {totalTopics(edital)} tópicos
                  </p>
                </div>

                <div className="flex gap-2">
                  {edital.needsSync && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSync(edital)}
                      disabled={importing === edital.id}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${importing === edital.id ? 'animate-spin' : ''}`} />
                      Atualizar
                    </Button>
                  )}
                  {!edital.selected ? (
                    <Button
                      size="sm"
                      onClick={() => handleImport(edital)}
                      disabled={importing === edital.id}
                    >
                      <Download className={`h-3.5 w-3.5 mr-1 ${importing === edital.id ? 'animate-spin' : ''}`} />
                      {importing === edital.id ? 'Importando...' : 'Importar'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveSelection(edital.id)}
                    >
                      Remover seleção
                    </Button>
                  )}
                </div>
              </div>

              <Accordion type="single" collapsible>
                {edital.subjects.map(sub => (
                  <AccordionItem key={sub.id} value={sub.id}>
                    <AccordionTrigger className="text-sm py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sub.color }} />
                        {sub.name}
                        <Badge variant="secondary" className="text-xs ml-1">{sub.topics.length}</Badge>
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
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentEditais;
