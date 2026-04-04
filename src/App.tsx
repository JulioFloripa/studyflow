import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { StudyProvider } from "@/contexts/StudyContext";
import { EducationalProvider } from "@/contexts/EducationalContext";
import Layout from "@/components/Layout";
import RoleRoute from "@/components/RoleRoute";
import DashboardRouter from "@/pages/DashboardRouter";
import StudyPlan from "@/pages/StudyPlan";
import Planning from "@/pages/Planning";
import RegisterStudy from "@/pages/RegisterStudy";
import Reviews from "@/pages/Reviews";
import VerticalSyllabus from "@/pages/VerticalSyllabus";
import Difficulties from "@/pages/Difficulties";
import Gamification from "@/pages/Gamification";
import Classes from "@/pages/Classes";
import Students from "@/pages/Students";
import StudentCycle from "@/pages/StudentCycle";
import StudentDashboard from "@/pages/StudentDashboard";
import Auth from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import Plans from "@/pages/Plans";
import EditaisRouter from "@/pages/EditaisRouter";
import NotFound from "./pages/NotFound";
import { BookOpen } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'hsl(222 47% 6%)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(240 80% 65%))' }}>
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
          <EducationalProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Auth />} />
                <Route path="/planos" element={<Plans />} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

                {/* Protected app routes */}
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route path="/" element={<DashboardRouter />} />

                  {/* Student-only routes */}
                  <Route path="/plano" element={<RoleRoute allowedRoles={['student']}><StudyPlan /></RoleRoute>} />
                  <Route path="/planejamento" element={<RoleRoute allowedRoles={['student']}><Planning /></RoleRoute>} />
                  <Route path="/revisoes" element={<RoleRoute allowedRoles={['student']}><Reviews /></RoleRoute>} />
                  <Route path="/edital" element={<RoleRoute allowedRoles={['student']}><VerticalSyllabus /></RoleRoute>} />
                  <Route path="/dificuldades" element={<RoleRoute allowedRoles={['student']}><Difficulties /></RoleRoute>} />
                  <Route path="/conquistas" element={<RoleRoute allowedRoles={['student']}><Gamification /></RoleRoute>} />

                  {/* Coordinator-only routes */}
                  <Route path="/turmas" element={<RoleRoute allowedRoles={['coordinator']}><Classes /></RoleRoute>} />
                  <Route path="/alunos" element={<RoleRoute allowedRoles={['coordinator']}><Students /></RoleRoute>} />
                  <Route path="/ciclo-aluno" element={<RoleRoute allowedRoles={['coordinator']}><StudentCycle /></RoleRoute>} />
                  <Route path="/dashboard-aluno" element={<RoleRoute allowedRoles={['coordinator']}><StudentDashboard /></RoleRoute>} />

                  {/* Shared routes */}
                  <Route path="/registrar" element={<RegisterStudy />} />
                  <Route path="/editais" element={<EditaisRouter />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </EducationalProvider>
        </StudyProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
