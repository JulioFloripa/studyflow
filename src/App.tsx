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
import Agenda from "@/pages/Agenda";
import Gamification from "@/pages/Gamification";
import Classes from "@/pages/Classes";
import Students from "@/pages/Students";
import StudentCycle from "@/pages/StudentCycle";
import StudentDashboard from "@/pages/StudentDashboard";
import Timer from "@/pages/Timer";
import MyPlan from "@/pages/MyPlan";
import ResetPassword from "@/pages/ResetPassword";
import Auth from "@/pages/Auth";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Sonner />
        <BrowserRouter>
          <StudyProvider>
            <EducationalProvider>
            <Routes>
              <Route path="/login" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/" element={<DashboardRouter />} />

                {/* Student-only routes */}
                <Route path="/plano" element={<RoleRoute allowedRoles={['student']}><StudyPlan /></RoleRoute>} />
                <Route path="/planejamento" element={<RoleRoute allowedRoles={['student']}><Planning /></RoleRoute>} />
                <Route path="/revisoes" element={<RoleRoute allowedRoles={['student']}><Reviews /></RoleRoute>} />
                <Route path="/edital" element={<RoleRoute allowedRoles={['student']}><VerticalSyllabus /></RoleRoute>} />
                <Route path="/dificuldades" element={<RoleRoute allowedRoles={['student']}><Difficulties /></RoleRoute>} />
                <Route path="/agenda" element={<RoleRoute allowedRoles={['student']}><Agenda /></RoleRoute>} />
                <Route path="/conquistas" element={<RoleRoute allowedRoles={['student']}><Gamification /></RoleRoute>} />

                {/* Coordinator-only routes */}
                <Route path="/turmas" element={<RoleRoute allowedRoles={['coordinator']}><Classes /></RoleRoute>} />
                <Route path="/alunos" element={<RoleRoute allowedRoles={['coordinator']}><Students /></RoleRoute>} />
                <Route path="/ciclo-aluno" element={<RoleRoute allowedRoles={['coordinator']}><StudentCycle /></RoleRoute>} />
                <Route path="/dashboard-aluno" element={<RoleRoute allowedRoles={['coordinator']}><StudentDashboard /></RoleRoute>} />

                {/* Shared routes */}
                <Route path="/registrar" element={<RegisterStudy />} />
                <Route path="/cronometro" element={<RoleRoute allowedRoles={['student']}><Timer /></RoleRoute>} />
                <Route path="/meu-plano" element={<RoleRoute allowedRoles={['student']}><MyPlan /></RoleRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </EducationalProvider>
          </StudyProvider>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
