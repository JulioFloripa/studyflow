import { Outlet, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Calendar, PenLine, RotateCcw,
  ListChecks, AlertTriangle, Trophy, Menu, FileText, LogOut,
  Timer, Settings2, CalendarDays, Sun, Moon,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/cronometro', label: 'Cronômetro', icon: Timer },
  { path: '/plano', label: 'Plano de Estudos', icon: BookOpen },
  { path: '/planejamento', label: 'Planejamento', icon: Calendar },
  { path: '/agenda', label: 'Agenda Semanal', icon: CalendarDays },
  { path: '/registrar', label: 'Registrar', icon: PenLine },
  { path: '/revisoes', label: 'Revisões', icon: RotateCcw },
  { path: '/edital', label: 'Editais', icon: FileText },
  { path: '/conteudo', label: 'Conteúdo', icon: ListChecks },
  { path: '/dificuldades', label: 'Dificuldades', icon: AlertTriangle },
  { path: '/conquistas', label: 'Conquistas', icon: Trophy },
  { path: '/meu-plano', label: 'Meu Plano', icon: Settings2 },
];

const Layout = () => {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { signOut } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  const mobileMainItems = navItems.slice(0, 4);
  const mobileMoreItems = navItems.slice(4);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-60 flex-col bg-card border-r border-border">
        {/* Logo + Toggle de Tema */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
            <BookOpen className="text-white" style={{ width: '18px', height: '18px' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground leading-tight">StudyFlow</h1>
            <p className="text-[10px] leading-none text-muted-foreground">Minha Área</p>
          </div>
          {/* Toggle Tema */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-accent transition-colors flex-shrink-0"
          >
            {isDark
              ? <Sun className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
              : <Moon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
            }
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-primary/15 text-primary border-l-2 border-primary'
                    : 'text-muted-foreground border-l-2 border-transparent hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-[17px] w-[17px] flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs h-8 text-muted-foreground hover:text-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </Button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 scrollbar-thin bg-background">
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50 bg-card border-t border-border">
        <div className="flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]">
          {mobileMainItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-0 text-[10px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
                <span className="truncate">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}

          {/* Toggle de tema no mobile */}
          <button
            onClick={toggleTheme}
            className="flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-0 text-[10px] font-medium text-muted-foreground transition-colors"
          >
            {isDark
              ? <Sun className="h-5 w-5" />
              : <Moon className="h-5 w-5" />
            }
            <span>{isDark ? 'Claro' : 'Escuro'}</span>
          </button>

          {mobileMoreItems.length > 0 && (
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  className={cn(
                    'flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-0 text-[10px] font-medium transition-colors',
                    mobileMoreItems.some(i => isActive(i.path)) ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Menu className="h-5 w-5" />
                  <span>Mais</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl bg-card border-border">
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
                          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border',
                          active
                            ? 'bg-primary/15 text-primary border-primary/30'
                            : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-foreground'
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
