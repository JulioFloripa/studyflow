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
import SettingsPage from "@/pages/Settings";
import Gamification from "@/pages/Gamification";
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
        <StudyProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Auth />} />
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/plano" element={<StudyPlan />} />
                <Route path="/planejamento" element={<Planning />} />
                <Route path="/registrar" element={<RegisterStudy />} />
                <Route path="/revisoes" element={<Reviews />} />
                <Route path="/edital" element={<VerticalSyllabus />} />
                <Route path="/dificuldades" element={<Difficulties />} />
                <Route path="/conquistas" element={<Gamification />} />
                <Route path="/configuracoes" element={<SettingsPage />} />
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
