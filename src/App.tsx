import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/lib/context";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import CalendarPage from "./pages/CalendarPage";
import AthletesPage from "./pages/AthletesPage";
import CreateTrainingPage from "./pages/CreateTrainingPage";
import TrainingDetailPage from "./pages/TrainingDetailPage";
import TodayTrainingPage from "./pages/TodayTrainingPage";
import NextTrainingPage from "./pages/NextTrainingPage";
import PeriodizationPage from "./pages/PeriodizationPage";
import HistoryPage from "./pages/HistoryPage";
import BackupPage from "./pages/BackupPage";
import CreateCyclePage from "./pages/CreateCyclePage";
import TeamProfilePage from "./pages/TeamProfilePage";
import EvaluationsPage from "./pages/EvaluationsPage";
import AthleteProfilePage from "./pages/AthleteProfilePage";
import TacticalSystemPage from "./pages/TacticalSystemPage";
import AICoachPage from "./pages/AICoachPage";
import SuggestionsPage from "./pages/SuggestionsPage";
import AuxiliaryPage from "./pages/AuxiliaryPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AppProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Auxiliary coach route — standalone, outside AppLayout */}
            <Route path="/auxiliar/:teamId" element={<AuxiliaryPage />} />

            {/* Main coach routes wrapped in AppLayout */}
            <Route path="/*" element={
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/calendario" element={<CalendarPage />} />
                  <Route path="/atletas" element={<AthletesPage />} />
                  <Route path="/criar-treino" element={<CreateTrainingPage />} />
                  <Route path="/treino/:id" element={<TrainingDetailPage />} />
                  <Route path="/treino-hoje" element={<TodayTrainingPage />} />
                  <Route path="/proximo-treino" element={<NextTrainingPage />} />
                  <Route path="/periodizacao" element={<PeriodizationPage />} />
                  <Route path="/historico" element={<HistoryPage />} />
                  <Route path="/backup" element={<BackupPage />} />
                  <Route path="/criar-ciclo" element={<CreateCyclePage />} />
                  <Route path="/time/:id" element={<TeamProfilePage />} />
                  <Route path="/avaliacoes" element={<EvaluationsPage />} />
                  <Route path="/atleta/:id" element={<AthleteProfilePage />} />
                  <Route path="/sistema-tatico" element={<TacticalSystemPage />} />
                  <Route path="/ia-treinador" element={<AICoachPage />} />
                  <Route path="/sugestoes" element={<SuggestionsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            } />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
