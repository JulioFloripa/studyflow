import React, { useState, useEffect } from 'react';
import { useEducational } from '@/contexts/EducationalContext';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Edit2, Trash2, GraduationCap, Clock, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Class } from '@/types/educational';
import { ClassTimeEditor } from '@/components/ClassTimeEditor';
import { SyllabusEditor } from '@/components/SyllabusEditor';

const Classes = () => {
  const {
    classes,
    students,
    classTemplates,
    scheduleSubjects,
    addClass,
    updateClass,
    removeClass,
    loadClassTemplates,
    addClassTemplate,
    removeClassTemplate,
    bulkAddClassTemplates,
    addScheduleSubject,
  } = useEducational();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [selectedClassForTemplates, setSelectedClassForTemplates] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    year: new Date().getFullYear(),
    semester: 1,
  });

  // Carregar templates quando selecionar uma turma
  useEffect(() => {
    if (selectedClassForTemplates) {
      loadClassTemplates(selectedClassForTemplates);
    }
  }, [selectedClassForTemplates, loadClassTemplates]);

  const handleOpenDialog = (classItem?: Class) => {
    if (classItem) {
      setEditingClass(classItem);
      setForm({
        name: classItem.name,
        description: classItem.description || '',
        year: classItem.year,
        semester: classItem.semester || 1,
      });
    } else {
      setEditingClass(null);
      setForm({
        name: '',
        description: '',
        year: new Date().getFullYear(),
        semester: 1,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nome da turma é obrigatório');
      return;
    }

    try {
      if (editingClass) {
        await updateClass(editingClass.id, form);
        toast.success('Turma atualizada!');
      } else {
        await addClass(form);
        toast.success('Turma criada!');
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar turma');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta turma? Esta ação é irreversível.')) {
      return;
    }

    try {
      await removeClass(id);
      toast.success('Turma excluída');
    } catch (error) {
      toast.error('Erro ao excluir turma');
    }
  };

  const getStudentCount = (classId: string) => {
    return students.filter(s => s.classId === classId).length;
  };

  const getTemplateCount = (classId: string) => {
    return classTemplates.filter(t => t.classId === classId).length;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-7 w-7" />
            Turmas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie turmas e configure horários padrão
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Turma
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingClass ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da Turma *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: 3º Ano A - Medicina"
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Informações adicionais sobre a turma"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ano</Label>
                  <Input
                    type="number"
                    value={form.year}
                    onChange={e => setForm({ ...form, year: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Semestre</Label>
                  <Input
                    type="number"
                    min="1"
                    max="2"
                    value={form.semester}
                    onChange={e => setForm({ ...form, semester: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">
                {editingClass ? 'Atualizar' : 'Criar'} Turma
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {classes.length === 0 ? (
        <Card className="p-12 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">Nenhuma turma cadastrada</p>
          <p className="text-sm text-muted-foreground mb-4">
            Crie sua primeira turma para começar a gerenciar alunos
          </p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeira Turma
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(classItem => (
            <Card key={classItem.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{classItem.name}</h3>
                  {classItem.description && (
                    <p className="text-sm text-muted-foreground mt-1">{classItem.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenDialog(classItem)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(classItem.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <Badge variant="secondary">
                  {classItem.year}/{classItem.semester}º Sem
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {getStudentCount(classItem.id)} alunos
                </Badge>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedClassForTemplates(classItem.id)}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Horários ({getTemplateCount(classItem.id)})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Horários - {classItem.name}</DialogTitle>
                  </DialogHeader>
                  <ClassTimeEditor
                    classId={classItem.id}
                    templates={classTemplates.filter(t => t.classId === classItem.id)}
                    scheduleSubjects={scheduleSubjects}
                    onAdd={addClassTemplate}
                    onRemove={removeClassTemplate}
                    onBulkAdd={bulkAddClassTemplates}
                    onAddScheduleSubject={addScheduleSubject}
                  />
                </DialogContent>
              </Dialog>

              {/* Ementa / Syllabus */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Ementa / Conteúdos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Ementa - {classItem.name}</DialogTitle>
                  </DialogHeader>
                  <SyllabusEditor scheduleSubjects={scheduleSubjects} />
                </DialogContent>
              </Dialog>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Classes;
