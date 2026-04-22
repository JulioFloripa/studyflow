import { useState } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { presetExams } from '@/data/presetExams';
import { Plus, Trash2, ChevronDown, ChevronRight, Download, BookOpen, Check, Pencil, Upload } from 'lucide-react';
import { TopicStatus } from '@/types/study';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const statusLabels: Record<TopicStatus, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
};
const statusColors: Record<TopicStatus, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/10 text-primary',
  completed: 'bg-success/10 text-success',
};

const StudyPlan = () => {
  const { subjects, topics, addSubject, updateSubject, removeSubject, addTopic, removeTopic, updateTopicStatus, importPreset, importAdminPreset, importedPresets, adminPresets, refreshData } = useStudy();
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [addTopicSubject, setAddTopicSubject] = useState<string | null>(null);
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPriority, setEditPriority] = useState(3);

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    await addSubject(newSubjectName.trim());
    setNewSubjectName('');
    setAddSubjectOpen(false);
    toast.success('Disciplina adicionada!');
  };

  const handleAddTopic = async (subjectId: string) => {
    if (!newTopicName.trim()) return;
    await addTopic(subjectId, newTopicName.trim());
    setNewTopicName('');
    setAddTopicSubject(null);
    toast.success('Assunto adicionado!');
  };

  const handleImport = async (presetId: string) => {
    if (importedPresets.includes(presetId)) {
      toast.error('Este edital já foi importado!');
      return;
    }
    await importPreset(presetId);
    toast.success('Edital importado com sucesso!');
  };

  const startEditSubject = (subject: { id: string; name: string; priority: number }) => {
    setEditingSubject(subject.id);
    setEditName(subject.name);
    setEditPriority(subject.priority);
  };

  const saveEditSubject = async () => {
    if (!editingSubject || !editName.trim()) return;
    await updateSubject(editingSubject, { name: editName.trim(), priority: editPriority });
    setEditingSubject(null);
    toast.success('Disciplina atualizada!');
  };

  const cycleStatus = (topicId: string, current: TopicStatus) => {
    const order: TopicStatus[] = ['not_started', 'in_progress', 'completed'];
    const next = order[(order.indexOf(current) + 1) % order.length];
    updateTopicStatus(topicId, next);
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let grouped: Record<string, string[]> = {};

      if (file.name.endsWith('.csv') || file.name.endsWith('.tsv') || file.name.endsWith('.txt')) {
        const text = await file.text();
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) { toast.error('Arquivo deve ter cabeçalho + dados'); return; }
        for (const line of lines.slice(1)) {
          const [subject, topic] = line.split(/[,;\t]/).map(s => s.trim().replace(/^"|"$/g, ''));
          if (subject && topic) {
            if (!grouped[subject]) grouped[subject] = [];
            grouped[subject].push(topic);
          }
        }
      } else {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
        for (const row of rows) {
          const values = Object.values(row);
          const subject = values[0]?.toString().trim();
          const topic = values[1]?.toString().trim();
          if (subject && topic) {
            if (!grouped[subject]) grouped[subject] = [];
            grouped[subject].push(topic);
          }
        }
      }

      if (Object.keys(grouped).length === 0) {
        toast.error('Nenhum dado válido. Use 2 colunas: disciplina e assunto.');
        return;
      }

      for (const [subjectName, topicNames] of Object.entries(grouped)) {
        await addSubject(subjectName);
      }
      // Refresh to get new subject IDs, then add topics
      await refreshData();

      // Now add topics using the refreshed subjects
      // We need a small delay for state to update
      setTimeout(async () => {
        for (const [subjectName, topicNames] of Object.entries(grouped)) {
          const subject = subjects.find(s => s.name === subjectName);
          if (subject) {
            for (const topicName of topicNames) {
              await addTopic(subject.id, topicName);
            }
          }
        }
        await refreshData();
        toast.success(`Importado: ${Object.keys(grouped).length} disciplinas com ${Object.values(grouped).flat().length} assuntos!`);
      }, 500);
    } catch (err) {
      toast.error('Erro ao ler arquivo. Verifique o formato.');
    }

    e.target.value = '';
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Plano de Estudos</h1>
        <p className="text-muted-foreground mt-1">Organize suas disciplinas e assuntos</p>
      </div>

      <Tabs defaultValue="custom" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="custom">Personalizado</TabsTrigger>
          <TabsTrigger value="preset">Importar Edital</TabsTrigger>
          <TabsTrigger value="excel">Importar Excel</TabsTrigger>
        </TabsList>

        <TabsContent value="preset" className="space-y-4">
          {adminPresets.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Editais do sistema</p>
              {adminPresets.map(preset => {
                const alreadyImported = importedPresets.includes(preset.id);
                return (
                  <Card key={preset.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">{preset.name}</h3>
                        {preset.description && <p className="text-sm text-muted-foreground mt-1">{preset.description}</p>}
                        <p className="text-xs text-muted-foreground mt-2">
                          {preset.subjectCount} disciplinas · {preset.topicCount} assuntos
                        </p>
                      </div>
                      {alreadyImported ? (
                        <Badge variant="secondary" className="flex-shrink-0 gap-1">
                          <Check className="h-3 w-3" /> Importado
                        </Badge>
                      ) : (
                        <Button onClick={async () => { await importAdminPreset(preset.id); }} size="sm" className="flex-shrink-0">
                          <Download className="h-4 w-4 mr-1" /> Importar
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
              {presetExams.length > 0 && <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 pt-2">Editais padrão</p>}
            </>
          )}
          {presetExams.map(preset => {
            const alreadyImported = importedPresets.includes(preset.id);
            return (
              <Card key={preset.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{preset.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{preset.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {preset.subjects.length} disciplinas · {preset.subjects.reduce((s, sub) => s + sub.topics.length, 0)} assuntos
                    </p>
                  </div>
                  {alreadyImported ? (
                    <Badge variant="secondary" className="flex-shrink-0 gap-1">
                      <Check className="h-3 w-3" /> Importado
                    </Badge>
                  ) : (
                    <Button onClick={() => handleImport(preset.id)} size="sm" className="flex-shrink-0">
                      <Download className="h-4 w-4 mr-1" /> Importar
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="excel" className="space-y-4">
          <Card className="p-6">
            <div className="text-center space-y-4">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="font-semibold text-foreground">Importar de Excel ou CSV</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Envie um arquivo <code className="bg-muted px-1 rounded">.xlsx</code> ou <code className="bg-muted px-1 rounded">.csv</code> com duas colunas: <code className="bg-muted px-1 rounded">disciplina</code> e <code className="bg-muted px-1 rounded">assunto</code>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Para CSV: separadores aceitos são vírgula, ponto e vírgula ou tabulação
                </p>
              </div>
              <label className="inline-block">
                <Input type="file" accept=".csv,.txt,.tsv,.xlsx,.xls" onChange={handleExcelImport} className="hidden" />
                <Button asChild size="sm"><span><Upload className="h-4 w-4 mr-1" /> Escolher arquivo</span></Button>
              </label>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={addSubjectOpen} onOpenChange={setAddSubjectOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Disciplina</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Disciplina</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input placeholder="Nome da disciplina" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubject()} />
                  <Button onClick={handleAddSubject} className="w-full">Adicionar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {subjects.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma disciplina cadastrada.</p>
              <p className="text-sm text-muted-foreground mt-1">Adicione manualmente ou importe um edital.</p>
            </Card>
          ) : (
            subjects.map(subject => {
              const subTopics = topics.filter(t => t.subjectId === subject.id);
              const completed = subTopics.filter(t => t.status === 'completed').length;
              const expanded = expandedSubject === subject.id;
              const isEditing = editingSubject === subject.id;

              return (
                <Card key={subject.id} className="overflow-hidden">
                  <div className="flex items-center gap-3 p-4">
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subject.color }} />
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 flex-1" onKeyDown={e => e.key === 'Enter' && saveEditSubject()} />
                        <Input type="number" min={1} max={5} value={editPriority} onChange={e => setEditPriority(Number(e.target.value))} className="h-8 w-16" />
                        <Button size="sm" variant="ghost" onClick={saveEditSubject} className="h-8"><Check className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingSubject(null)} className="h-8">✕</Button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setExpandedSubject(expanded ? null : subject.id)}
                          className="flex items-center gap-3 flex-1 text-left hover:bg-muted/30 transition-colors rounded-lg -m-1 p-1"
                        >
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subject.color }} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground">{subject.name}</h3>
                            <p className="text-xs text-muted-foreground">{completed}/{subTopics.length} assuntos concluídos</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">Peso {subject.priority}</Badge>
                          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        <button onClick={() => startEditSubject(subject)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>

                  {expanded && (
                    <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/20">
                      {subTopics.map(topic => (
                        <div key={topic.id} className="flex items-center gap-2 py-1.5">
                          <button onClick={() => cycleStatus(topic.id, topic.status)}>
                            <Badge className={`text-[10px] cursor-pointer ${statusColors[topic.status]}`}>
                              {statusLabels[topic.status]}
                            </Badge>
                          </button>
                          <span className="text-sm text-foreground flex-1">{topic.name}</span>
                          <button onClick={() => removeTopic(topic.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}

                      {addTopicSubject === subject.id ? (
                        <div className="flex gap-2 pt-1">
                          <Input placeholder="Nome do assunto" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTopic(subject.id)} className="h-8 text-sm" />
                          <Button size="sm" onClick={() => handleAddTopic(subject.id)} className="h-8">OK</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setAddTopicSubject(null); setNewTopicName(''); }} className="h-8">✕</Button>
                        </div>
                      ) : (
                        <button onClick={() => setAddTopicSubject(subject.id)} className="flex items-center gap-1 text-sm text-primary hover:underline pt-1">
                          <Plus className="h-3.5 w-3.5" /> Adicionar assunto
                        </button>
                      )}

                      <div className="pt-2 border-t border-border">
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive text-xs" onClick={() => removeSubject(subject.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Remover disciplina
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudyPlan;
