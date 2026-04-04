import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { StudyProvider } from "@/contexts/StudyContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import StudyPlan from "@/pages/StudyPlan";
import Planning from "@/pages/Planning";
import RegisterStudy from "@/pages/RegisterStudy";
import Reviews from "@/pages/Reviews";
import VerticalSyllabus from "@/pages/VerticalSyllabus";
import Difficulties from "@/pages/Difficulties";
import Gamification from "@/pages/Gamification";
import Auth from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import Plans from "@/pages/Plans";
import StudentEditais from "@/pages/StudentEditais";
import NotFound from "./pages/NotFound";
import { BookOpen } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "hsl(222 47% 6%)" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(217 91% 60%), hsl(240 80% 65%))" }}>
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <StudyProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Rotas públicas */}
              <Route path="/login" element={<Auth />} />
              <Route path="/planos" element={<Plans />} />

              {/* Onboarding — protegido mas fora do Layout */}
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

              {/* Rotas protegidas do estudante */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/plano" element={<StudyPlan />} />
                <Route path="/planejamento" element={<Planning />} />
                <Route path="/registrar" element={<RegisterStudy />} />
                <Route path="/revisoes" element={<Reviews />} />
                <Route path="/edital" element={<StudentEditais />} />
                <Route path="/dificuldades" element={<Difficulties />} />
                <Route path="/conquistas" element={<Gamification />} />
                <Route path="/conteudo" element={<VerticalSyllabus />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </StudyProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
