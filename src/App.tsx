import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CreditsProvider } from "@/contexts/CreditsContext";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "./components/ScrollToTop";
import Index from "./pages/Index";
import PublicProfile from "./pages/PublicProfile";
import SavedJobs from "./pages/SavedJobs";
import CandidateProfile from "./pages/CandidateProfile";
import CVBuilderPage from "./pages/CVBuilder";
import FuelUp from "./pages/FuelUp";
import Credits from "./pages/Credits";
import InterviewPrep from "./pages/InterviewPrep";
import Reports from "./pages/Reports";
import CareerSitePage from "./pages/CareerSitePage";
import NotFound from "./pages/NotFound";
import SignDocument from "./pages/SignDocument";
import Referrals from "./pages/Referrals";
import Assignments from "./pages/Assignments";
import Analytics from "./pages/Analytics";
import CandidateSearchPage from "./pages/CandidateSearchPage";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <CreditsProvider>
                <ScrollToTop />
                {/* Skip to content – accessibility */}
                <a
                  href="#main-content"
                  className="skip-to-content"
                >
                  דלג לתוכן הראשי
                </a>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/profile" element={<Navigate to="/?section=profile-settings" replace />} />
                  <Route path="/p/:userId" element={<PublicProfile />} />
                  <Route path="/saved-jobs" element={<SavedJobs />} />
                  <Route path="/candidate/:candidateId" element={<CandidateProfile />} />
                  <Route path="/cv-builder" element={<CVBuilderPage />} />
                  <Route path="/fuel-up" element={<FuelUp />} />
                  <Route path="/credits" element={<Credits />} />
                  <Route path="/interview-prep" element={<InterviewPrep />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/careers/:slug" element={<CareerSitePage />} />
                  <Route path="/sign/:token" element={<SignDocument />} />
                  <Route path="/referrals" element={<Referrals />} />
                  <Route path="/assignments" element={<Assignments />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/candidate-search" element={<CandidateSearchPage />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </CreditsProvider>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;

