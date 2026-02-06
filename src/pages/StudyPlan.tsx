import { useState } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { presetExams } from '@/data/presetExams';
import { Plus, Trash2, ChevronDown, ChevronRight, Download, BookOpen } from 'lucide-react';
import { TopicStatus } from '@/types/study';
import { toast } from 'sonner';

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
  const { subjects, topics, addSubject, removeSubject, addTopic, removeTopic, updateTopicStatus, importPreset } = useStudy();
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [addTopicSubject, setAddTopicSubject] = useState<string | null>(null);
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    addSubject(newSubjectName.trim());
    setNewSubjectName('');
    setAddSubjectOpen(false);
    toast.success('Disciplina adicionada!');
  };

  const handleAddTopic = (subjectId: string) => {
    if (!newTopicName.trim()) return;
    addTopic(subjectId, newTopicName.trim());
    setNewTopicName('');
    setAddTopicSubject(null);
    toast.success('Assunto adicionado!');
  };

  const handleImport = (presetId: string) => {
    importPreset(presetId);
    toast.success('Edital importado com sucesso!');
  };

  const cycleStatus = (topicId: string, current: TopicStatus) => {
    const order: TopicStatus[] = ['not_started', 'in_progress', 'completed'];
    const next = order[(order.indexOf(current) + 1) % order.length];
    updateTopicStatus(topicId, next);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Plano de Estudos</h1>
        <p className="text-muted-foreground mt-1">Organize suas disciplinas e assuntos</p>
      </div>

      <Tabs defaultValue="custom" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="custom">Personalizado</TabsTrigger>
          <TabsTrigger value="preset">Importar Edital</TabsTrigger>
        </TabsList>

        <TabsContent value="preset" className="space-y-4">
          {presetExams.map(preset => (
            <Card key={preset.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{preset.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{preset.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {preset.subjects.length} disciplinas · {preset.subjects.reduce((s, sub) => s + sub.topics.length, 0)} assuntos
                  </p>
                </div>
                <Button onClick={() => handleImport(preset.id)} size="sm" className="flex-shrink-0">
                  <Download className="h-4 w-4 mr-1" /> Importar
                </Button>
              </div>
            </Card>
          ))}
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

              return (
                <Card key={subject.id} className="overflow-hidden">
                  <button
                    onClick={() => setExpandedSubject(expanded ? null : subject.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subject.color }} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{subject.name}</h3>
                      <p className="text-xs text-muted-foreground">{completed}/{subTopics.length} assuntos concluídos</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Peso {subject.priority}</Badge>
                    {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>

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
