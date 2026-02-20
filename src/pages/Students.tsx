import React, { useState } from 'react';
import { useEducational } from '@/contexts/EducationalContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Edit2, Trash2, Calendar, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { Student, LEARNING_PACE_LABELS, STUDY_METHOD_LABELS } from '@/types/educational';
import TimeGridEditor from '@/components/TimeGridEditor';

const Students = () => {
  const {
    students,
    classes,
    timeSlots,
    selectedStudent,
    addStudent,
    updateStudent,
    removeStudent,
    selectStudent,
    updateTimeSlot,
    bulkUpdateTimeSlots,
    copyClassTemplatesToStudent,
  } = useEducational();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<Partial<Student>>({
    fullName: '',
    email: '',
    phone: '',
    birthDate: '',
    classId: '',
    targetCareer: '',
    targetUniversity: '',
    currentGrade: '',
    learningPace: 'moderate',
    studyMethods: [],
    specialNeeds: '',
    notes: '',
  });

  const handleOpenDialog = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setForm(student);
    } else {
      setEditingStudent(null);
      setForm({
        fullName: '',
        email: '',
        phone: '',
        birthDate: '',
        classId: '',
        targetCareer: '',
        targetUniversity: '',
        currentGrade: '',
        learningPace: 'moderate',
        studyMethods: [],
        specialNeeds: '',
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.fullName?.trim()) {
      toast.error('Nome completo é obrigatório');
      return;
    }

    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, form);
        toast.success('Aluno atualizado!');
      } else {
        // Criar aluno
        await addStudent(form as any);
        
        // Se tiver turma, copiar horários automáticamente
        if (form.classId) {
          // Buscar o aluno recém criado
          const { data: newStudent } = await supabase
            .from('students')
            .select('id')
            .eq('full_name', form.fullName)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (newStudent) {
            await copyClassTemplatesToStudent(newStudent.id, form.classId);
            toast.success('Aluno cadastrado e horários herdados da turma!');
          } else {
            toast.success('Aluno cadastrado!');
          }
        } else {
          toast.success('Aluno cadastrado!');
        }
      }
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar aluno');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Esta ação é irreversível e removerá todos os dados do aluno.')) {
      return;
    }

    try {
      await removeStudent(id);
      toast.success('Aluno removido');
    } catch (error) {
      toast.error('Erro ao remover aluno');
    }
  };

  const toggleStudyMethod = (method: string) => {
    setForm(prev => ({
      ...prev,
      studyMethods: prev.studyMethods?.includes(method as any)
        ? prev.studyMethods.filter(m => m !== method)
        : [...(prev.studyMethods || []), method as any],
    }));
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-7 w-7" />
            Alunos
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie seus alunos e seus perfis pedagógicos</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Aluno
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Alunos */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Lista de Alunos ({students.length})</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {students.map(student => (
                <div
                  key={student.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedStudent?.id === student.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => selectStudent(student)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{student.fullName}</p>
                      {student.classId && (
                        <p className="text-xs text-muted-foreground">
                          {classes.find(c => c.id === student.classId)?.name}
                        </p>
                      )}
                      {student.targetCareer && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {student.targetCareer}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenDialog(student);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={e => {
                          e.stopPropagation();
                          handleDelete(student.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {students.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum aluno cadastrado
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Detalhes do Aluno */}
        <div className="lg:col-span-2">
          {selectedStudent ? (
            <Card className="p-5">
              <Tabs defaultValue="info">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="schedule">Grade Horária</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{selectedStudent.fullName}</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <p>{selectedStudent.email || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Telefone:</span>
                        <p>{selectedStudent.phone || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Carreira:</span>
                        <p>{selectedStudent.targetCareer || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Universidade:</span>
                        <p>{selectedStudent.targetUniversity || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Série:</span>
                        <p>{selectedStudent.currentGrade || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ritmo:</span>
                        <p>
                          {selectedStudent.learningPace
                            ? LEARNING_PACE_LABELS[selectedStudent.learningPace]
                            : '-'}
                        </p>
                      </div>
                    </div>

                    {selectedStudent.studyMethods && selectedStudent.studyMethods.length > 0 && (
                      <div className="mt-4">
                        <span className="text-sm text-muted-foreground">Métodos de Estudo:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedStudent.studyMethods.map(method => (
                            <Badge key={method} variant="secondary">
                              {STUDY_METHOD_LABELS[method]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedStudent.notes && (
                      <div className="mt-4">
                        <span className="text-sm text-muted-foreground">Observações:</span>
                        <p className="text-sm mt-1">{selectedStudent.notes}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="schedule" className="mt-4">
                  <TimeGridEditor
                    timeSlots={timeSlots}
                    onUpdateSlot={updateTimeSlot}
                    onBulkUpdate={bulkUpdateTimeSlots}
                  />
                </TabsContent>
              </Tabs>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Selecione um aluno para ver detalhes</p>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Tabs defaultValue="personal">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Pessoal</TabsTrigger>
                <TabsTrigger value="academic">Acadêmico</TabsTrigger>
                <TabsTrigger value="pedagogical">Pedagógico</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    value={form.fullName}
                    onChange={e => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={form.phone}
                      onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={form.birthDate}
                    onChange={e => setForm(prev => ({ ...prev, birthDate: e.target.value }))}
                  />
                </div>
              </TabsContent>

              <TabsContent value="academic" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <Select
                    value={form.classId}
                    onValueChange={v => setForm(prev => ({ ...prev, classId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Série/Ano Atual</Label>
                  <Input
                    value={form.currentGrade}
                    onChange={e => setForm(prev => ({ ...prev, currentGrade: e.target.value }))}
                    placeholder="Ex: 3º Ano, 9º Ano"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carreira Pretendida</Label>
                  <Input
                    value={form.targetCareer}
                    onChange={e => setForm(prev => ({ ...prev, targetCareer: e.target.value }))}
                    placeholder="Ex: Medicina, Engenharia"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Universidade Alvo</Label>
                  <Input
                    value={form.targetUniversity}
                    onChange={e =>
                      setForm(prev => ({ ...prev, targetUniversity: e.target.value }))
                    }
                    placeholder="Ex: UFSC, USP"
                  />
                </div>
              </TabsContent>

              <TabsContent value="pedagogical" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Ritmo de Aprendizagem</Label>
                  <Select
                    value={form.learningPace}
                    onValueChange={v => setForm(prev => ({ ...prev, learningPace: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEARNING_PACE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Métodos de Estudo Preferidos</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(STUDY_METHOD_LABELS).map(([key, label]) => (
                      <Badge
                        key={key}
                        variant={
                          form.studyMethods?.includes(key as any) ? 'default' : 'outline'
                        }
                        className="cursor-pointer"
                        onClick={() => toggleStudyMethod(key)}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Necessidades Especiais</Label>
                  <Textarea
                    value={form.specialNeeds}
                    onChange={e => setForm(prev => ({ ...prev, specialNeeds: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={form.notes}
                    onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1">
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;
