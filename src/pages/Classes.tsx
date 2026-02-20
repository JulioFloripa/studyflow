import React, { useState } from 'react';
import { useEducational } from '@/contexts/EducationalContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Edit2, Trash2, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { Class } from '@/types/educational';

const Classes = () => {
  const { classes, students, addClass, updateClass, removeClass } = useEducational();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    year: new Date().getFullYear(),
    semester: 1,
  });

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

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-7 w-7" />
            Turmas
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie suas turmas e organize seus alunos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Turma
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClass ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome da Turma *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: 3º Ano A, Turma Medicina 2025"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Informações adicionais sobre a turma..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Input
                    type="number"
                    value={form.year}
                    onChange={e => setForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Semestre</Label>
                  <Input
                    type="number"
                    min="1"
                    max="2"
                    value={form.semester}
                    onChange={e =>
                      setForm(prev => ({ ...prev, semester: parseInt(e.target.value) }))
                    }
                  />
                </div>
              </div>
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

      {classes.length === 0 ? (
        <Card className="p-12 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma turma criada ainda.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie sua primeira turma para começar a organizar seus alunos.
          </p>
          <Button onClick={() => handleOpenDialog()} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeira Turma
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(classItem => (
            <Card key={classItem.id} className="p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground">{classItem.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {classItem.year}
                      {classItem.semester ? `.${classItem.semester}` : ''}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {getStudentCount(classItem.id)} alunos
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(classItem)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(classItem.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {classItem.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {classItem.description}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Classes;
