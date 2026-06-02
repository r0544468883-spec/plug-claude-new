import { useState, useEffect } from "react";
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

function WhatsAppButton() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('plug-sidebar-collapsed') === 'true');

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'plug-sidebar-collapsed') setCollapsed(e.newValue === 'true');
    };
    // Listen for changes from DashboardLayout
    const observer = new MutationObserver(() => {
      setCollapsed(localStorage.getItem('plug-sidebar-collapsed') === 'true');
    });
    observer.observe(document.body, { attributes: true, subtree: false });
    window.addEventListener('storage', onStorage);
    // Poll for same-tab localStorage changes (storage event only fires cross-tab)
    const interval = setInterval(() => {
      const val = localStorage.getItem('plug-sidebar-collapsed') === 'true';
      setCollapsed(prev => prev !== val ? val : prev);
    }, 300);
    return () => { window.removeEventListener('storage', onStorage); observer.disconnect(); clearInterval(interval); };
  }, []);

  return (
    <a
      href="https://wa.me/972544468883?text=%D7%94%D7%99%D7%99%2C%20%D7%A4%D7%A0%D7%99%D7%AA%D7%99%20%D7%93%D7%A8%D7%9A%20PLUG%20%F0%9F%91%8B"
      target="_blank"
      rel="noreferrer"
      className={`fixed bottom-6 z-40 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white pl-4 pr-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group right-6 ${collapsed ? '' : 'lg:right-[17.5rem]'}`}
      aria-label="WhatsApp support"
    >
      <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      <span className="text-sm font-bold hidden sm:inline">צריך עזרה?</span>
    </a>
  );
}
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
import SuccessStories from "./pages/SuccessStories";
import AIJobSearch from "./pages/seo/AIJobSearch";
import TechJobs from "./pages/seo/TechJobs";
import CareerChange from "./pages/seo/CareerChange";
import AfterLayoff from "./pages/seo/AfterLayoff";
import CVAnalysis from "./pages/seo/CVAnalysis";
import Assignments from "./pages/Assignments";
import Analytics from "./pages/Analytics";
import CandidateSearchPage from "./pages/CandidateSearchPage";
import Vouches from "./pages/Vouches";
import Network from "./pages/Network";
import JobSwipe from "./pages/JobSwipe";
import MyMatches from "./pages/MyMatches";
import MySecrets from "./pages/MySecrets";
import Ideas from "./pages/Ideas";
import CompanyProfile from "./pages/CompanyProfile";
import CompanyDashboard from "./pages/CompanyDashboard";
import Companies from "./pages/Companies";
import ResetPassword from "./pages/ResetPassword";
import Extension from "./pages/Extension";
import Admin from "./pages/Admin";
import RecordingStudio from "./pages/RecordingStudio";
import Invite from "./pages/Invite";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PaymentPage from "./pages/PaymentPage";
import CommunityLandingPage from "./pages/CommunityLandingPage";
import Discover from "./pages/Discover";

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
                {/* Floating WhatsApp button */}
                <WhatsAppButton />

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
                  <Route path="/success-stories" element={<SuccessStories />} />
                  <Route path="/ai-job-search" element={<AIJobSearch />} />
                  <Route path="/tech-jobs" element={<TechJobs />} />
                  <Route path="/career-change" element={<CareerChange />} />
                  <Route path="/after-layoff" element={<AfterLayoff />} />
                  <Route path="/cv-analysis" element={<CVAnalysis />} />
                  <Route path="/assignments" element={<Assignments />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/candidate-search" element={<CandidateSearchPage />} />
                  <Route path="/vouches" element={<Vouches />} />
                  <Route path="/network" element={<Network />} />
                  <Route path="/job-swipe" element={<JobSwipe />} />
                  <Route path="/my-matches" element={<MyMatches />} />
                  <Route path="/my-secrets" element={<MySecrets />} />
                  <Route path="/ideas" element={<Ideas />} />
                  <Route path="/companies" element={<Companies />} />
                  <Route path="/company/:companyId" element={<CompanyProfile />} />
                  <Route path="/company/:companyId/dashboard" element={<CompanyDashboard />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/extension" element={<Extension />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/recording-studio" element={<RecordingStudio />} />
                  <Route path="/invite/:code" element={<Invite />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/pay/:slug" element={<PaymentPage />} />
                  <Route path="/c/:slug" element={<CommunityLandingPage />} />
                  <Route path="/discover" element={<Discover />} />
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

