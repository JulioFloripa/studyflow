import { Outlet, useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Calendar, PenLine, RotateCcw, ListChecks, AlertTriangle, Trophy, Menu, FileText, LogOut, Timer } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/cronometro', label: 'Cronômetro', icon: Timer },
  { path: '/plano', label: 'Plano de Estudos', icon: BookOpen },
  { path: '/planejamento', label: 'Planejamento', icon: Calendar },
  { path: '/registrar', label: 'Registrar', icon: PenLine },
  { path: '/revisoes', label: 'Revisões', icon: RotateCcw },
  { path: '/edital', label: 'Editais', icon: FileText },
  { path: '/conteudo', label: 'Conteúdo', icon: ListChecks },
  { path: '/dificuldades', label: 'Dificuldades', icon: AlertTriangle },
  { path: '/conquistas', label: 'Conquistas', icon: Trophy },
];

const Layout = () => {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { signOut } = useAuth();

  const mobileMainItems = navItems.slice(0, 4);
  const mobileMoreItems = navItems.slice(4);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'hsl(222 47% 6%)' }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex w-60 flex-col"
        style={{ background: 'hsl(222 47% 7%)', borderRight: '1px solid hsl(222 47% 14%)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: '1px solid hsl(222 47% 14%)' }}>
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(240 80% 65%))', boxShadow: '0 0 12px hsl(217 91% 60% / 0.3)' }}
          >
            <BookOpen className="h-4.5 w-4.5 text-white" style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">StudyFlow</h1>
            <p className="text-[10px] leading-none" style={{ color: 'hsl(215 20% 45%)' }}>
              Minha Área
            </p>
          </div>
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
                )}
                style={{
                  background: active ? 'hsl(217 91% 60% / 0.15)' : 'transparent',
                  color: active ? 'hsl(217 91% 70%)' : 'hsl(215 20% 55%)',
                  borderLeft: active ? '2px solid hsl(217 91% 60%)' : '2px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'hsl(222 47% 12%)';
                    (e.currentTarget as HTMLElement).style.color = 'hsl(210 40% 85%)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'hsl(215 20% 55%)';
                  }
                }}
              >
                <Icon className="h-[17px] w-[17px] flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3" style={{ borderTop: '1px solid hsl(222 47% 14%)' }}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs h-8"
            onClick={() => signOut()}
            style={{ color: 'hsl(215 20% 40%)', background: 'transparent' }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 scrollbar-thin">
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden z-50"
        style={{ background: 'hsl(222 47% 8%)', borderTop: '1px solid hsl(222 47% 14%)' }}
      >
        <div className="flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]">
          {mobileMainItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-0 text-[10px] font-medium transition-colors"
                style={{ color: active ? 'hsl(217 91% 60%)' : 'hsl(215 20% 45%)' }}
              >
                <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
                <span className="truncate">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
          {mobileMoreItems.length > 0 && (
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  className="flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-0 text-[10px] font-medium transition-colors"
                  style={{ color: mobileMoreItems.some(i => isActive(i.path)) ? 'hsl(217 91% 60%)' : 'hsl(215 20% 45%)' }}
                >
                  <Menu className="h-5 w-5" />
                  <span>Mais</span>
                </button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="rounded-t-2xl"
                style={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }}
              >
                <div className="grid grid-cols-2 gap-2 py-2">
                  {mobileMoreItems.map(item => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                        style={{
                          background: active ? 'hsl(217 91% 60% / 0.15)' : 'hsl(222 47% 12%)',
                          color: active ? 'hsl(217 91% 70%)' : 'hsl(215 20% 65%)',
                          border: active ? '1px solid hsl(217 91% 60% / 0.3)' : '1px solid hsl(222 47% 18%)',
                        }}
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
