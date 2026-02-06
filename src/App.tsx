import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <StudyProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/plano" element={<StudyPlan />} />
              <Route path="/planejamento" element={<Planning />} />
              <Route path="/registrar" element={<RegisterStudy />} />
              <Route path="/revisoes" element={<Reviews />} />
              <Route path="/edital" element={<VerticalSyllabus />} />
              <Route path="/dificuldades" element={<Difficulties />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </StudyProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
