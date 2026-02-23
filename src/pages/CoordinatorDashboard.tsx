import { useEducational } from '@/contexts/EducationalContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, School, CalendarCheck, GraduationCap, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const CoordinatorDashboard = () => {
  const { user } = useAuth();
  const { classes, students, scheduleSubjects, loading } = useEducational();

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Students per class
  const classStats = classes.map(c => ({
    ...c,
    studentCount: students.filter(s => s.classId === c.id).length,
  }));

  const studentsWithoutClass = students.filter(s => !s.classId).length;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {getGreeting()}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">Painel do Coordenador</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <School className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Turmas</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{classes.length}</p>
          <Link to="/turmas" className="text-xs text-primary hover:underline mt-1 inline-block">
            Gerenciar turmas →
          </Link>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <span className="text-sm text-muted-foreground">Alunos</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{students.length}</p>
          <Link to="/alunos" className="text-xs text-primary hover:underline mt-1 inline-block">
            Gerenciar alunos →
          </Link>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-success/10">
              <BookOpen className="h-5 w-5 text-success" />
            </div>
            <span className="text-sm text-muted-foreground">Disciplinas</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{scheduleSubjects.length}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <CalendarCheck className="h-5 w-5 text-warning" />
            </div>
            <span className="text-sm text-muted-foreground">Sem turma</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{studentsWithoutClass}</p>
        </Card>
      </div>

      {/* Classes overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <School className="h-4 w-4 text-primary" /> Turmas
          </h3>
          {classStats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">Nenhuma turma criada ainda.</p>
              <Link to="/turmas" className="text-sm text-primary hover:underline mt-2 inline-block">
                Criar primeira turma →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {classStats.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.year} · {c.semester ? `${c.semester}º semestre` : ''}</p>
                  </div>
                  <Badge variant="secondary">{c.studentCount} alunos</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-accent" /> Últimos Alunos
          </h3>
          {students.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">Nenhum aluno cadastrado.</p>
              <Link to="/alunos" className="text-sm text-primary hover:underline mt-2 inline-block">
                Cadastrar aluno →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {students.slice(0, 8).map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.targetCareer || s.objective || 'Sem objetivo definido'}
                    </p>
                  </div>
                  {s.classId && (
                    <Badge variant="outline" className="text-xs">
                      {classes.find(c => c.id === s.classId)?.name}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CoordinatorDashboard;
