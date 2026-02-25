import { Outlet, useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Calendar, PenLine, RotateCcw, ListChecks, AlertTriangle, Trophy, Menu, GraduationCap, Users, School, CalendarCheck, Target, FileText, ArrowLeftRight } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const studentNavItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/plano', label: 'Plano', icon: BookOpen },
  { path: '/planejamento', label: 'Planejamento', icon: Calendar },
  { path: '/registrar', label: 'Registrar', icon: PenLine },
  { path: '/revisoes', label: 'Revisões', icon: RotateCcw },
  { path: '/editais', label: 'Editais', icon: FileText },
  { path: '/edital', label: 'Edital Vertical', icon: ListChecks },
  { path: '/dificuldades', label: 'Dificuldades', icon: AlertTriangle },
  { path: '/conquistas', label: 'Conquistas', icon: Trophy },
];

const coordinatorNavItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/turmas', label: 'Turmas', icon: School },
  { path: '/alunos', label: 'Alunos', icon: Users },
  { path: '/editais', label: 'Editais', icon: FileText },
  { path: '/ciclo-aluno', label: 'Ciclo do Aluno', icon: CalendarCheck },
  { path: '/dashboard-aluno', label: 'Dashboard Aluno', icon: Target },
  { path: '/registrar', label: 'Registrar Estudo', icon: PenLine },
];

const Layout = () => {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { role, loading: roleLoading, setRoleOverride, isOverridden, dbRole } = useUserRole();

  const handleToggleRole = () => {
    if (isOverridden) {
      setRoleOverride(null);
    } else {
      setRoleOverride(role === 'coordinator' ? 'student' : 'coordinator');
    }
  };

  const navItems = role === 'student' ? studentNavItems : coordinatorNavItems;
  const mobileMainItems = navItems.slice(0, 4);
  const mobileMoreItems = navItems.slice(4);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">StudyFlow</h1>
            <p className="text-[11px] text-muted-foreground leading-none">
              {role === 'student' ? 'Área do Aluno' : 'Área do Coordenador'}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Role switcher */}
        <div className="px-3 py-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-xs"
            onClick={handleToggleRole}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {isOverridden ? 'Voltar ao perfil real' : `Ver como ${role === 'coordinator' ? 'Aluno' : 'Coordenador'}`}
          </Button>
          {isOverridden && (
            <Badge variant="destructive" className="w-full justify-center mt-2 text-xs">
              Modo de visualização: {role === 'student' ? 'Aluno' : 'Coordenador'}
            </Badge>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t border-border z-50">
        <div className="flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]">
          {mobileMainItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 px-3 min-w-0 text-[10px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {mobileMoreItems.length > 0 && (
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  className={cn(
                    'flex flex-col items-center gap-0.5 py-2 px-3 min-w-0 text-[10px] font-medium transition-colors',
                    mobileMoreItems.some(i => isActive(i.path)) ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Menu className="h-5 w-5" />
                  <span>Mais</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <div className="grid grid-cols-2 gap-2 py-2">
                  {mobileMoreItems.map(item => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground hover:bg-secondary'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
