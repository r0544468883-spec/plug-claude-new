import { useMemo, useRef, useEffect, useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ScheduleCalendar } from '@/components/dashboard/ScheduleCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout, DashboardSection } from '@/components/dashboard/DashboardLayout';
import { TodaysFocus } from '@/components/dashboard/TodaysFocus';
import { ExtensionAgentPanel } from '@/components/extension/ExtensionAgentPanel';
import { OverviewHome } from '@/components/dashboard/OverviewHome';
import { MyStatsPage } from '@/components/dashboard/MyStatsPage';
import { PlugChat } from '@/components/chat/PlugChat';
import { ApplicationsPage } from '@/components/applications/ApplicationsPage';
import { JobSearchPage } from '@/components/jobs/JobSearchPage';
import { ResumeUpload } from '@/components/documents/ResumeUpload';
import { VouchWidget } from '@/components/vouch/VouchWidget';
import { GiveVouchDialog } from '@/components/vouch/GiveVouchDialog';
import { UnifiedProfileSettings } from '@/components/profile/UnifiedProfileSettings';
import { MessageInbox } from '@/components/messaging/MessageInbox';
import { CandidatesPage } from '@/components/candidates/CandidatesPage';
import { PostJobForm } from '@/components/jobs/PostJobForm';
import { JobSeekerTour } from '@/components/onboarding/JobSeekerTour';
import { RecruiterTour } from '@/components/onboarding/RecruiterTour';
import { DailyWelcome } from '@/components/onboarding/DailyWelcome';
import { TourGuideFAB } from '@/components/onboarding/TourGuideFAB';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
// SmartTriggers removed - notifications now handled by NotificationBell
import { MobileBottomBar } from '@/components/navigation/MobileBottomBar';
import { AchievementsPanel } from '@/components/gamification/AchievementsPanel';
import { WeeklyQuests } from '@/components/gamification/WeeklyQuests';
import { LevelBadge } from '@/components/gamification/LevelBadge';
import { CVBuilder } from '@/components/cv-builder/CVBuilder';
import { CompanyRecommendations } from '@/components/jobs/CompanyRecommendations';
import { FavoriteCompanies } from '@/components/jobs/FavoriteCompanies';
import { MobileWelcomeStats } from '@/components/dashboard/MobileWelcomeStats';
import { InterviewPrepContent } from '@/components/interview/InterviewPrepContent';
import { FeedPage } from '@/components/feed/FeedPage';
import { CreateFeedPost } from '@/components/feed/CreateFeedPost';
import { CreateWebinar } from '@/components/feed/CreateWebinar';
import { PlugSocial } from '@/components/social/PlugSocial';
import { CommunityHubsList } from '@/components/communities/CommunityHubsList';
import { CreateCommunityHub } from '@/components/communities/CreateCommunityHub';
import { CommunityHubView } from '@/components/communities/CommunityHubView';
import { ContentDashboard } from '@/components/feed/ContentDashboard';
import { PlacementRevenue } from '@/components/dashboard/PlacementRevenue';
import { SLAMonitor } from '@/components/dashboard/SLAMonitor';
import { VacancyCalculator } from '@/components/jobs/VacancyCalculator';
import { PersonalizedFeedWidget } from '@/components/feed/PersonalizedFeedWidget';
import { FeedCarouselWidget } from '@/components/feed/FeedCarouselWidget';
import { RecruiterProfileEditor } from '@/components/profile/RecruiterProfileEditor';
import { ClientsPage } from '@/components/clients/ClientsPage';
import { ClientProfilePage } from '@/components/clients/ClientProfilePage';
import { MissionBoard } from '@/components/missions/MissionBoard';
import { CreateMissionForm } from '@/components/missions/CreateMissionForm';
import { MyMissions } from '@/components/missions/MyMissions';
import { HRToolsHub } from '@/components/hr-tools/HRToolsHub';
import { ReferralPanel } from '@/components/referrals/ReferralPanel';
import { ProfileCompletionCard } from '@/components/dashboard/ProfileCompletionCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Briefcase, FileText, TrendingUp, Plus, Upload, Search, Zap, MessageSquare, Settings, FolderOpen, Heart, FileEdit, Building2, User, Mic, Newspaper, ArrowLeft, ArrowRight, BarChart3, Video, Globe, DollarSign, Sparkles, ArrowDown, ChevronDown, ChevronUp, Minimize2, Maximize2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STAT_COLORS = [
  { bg: 'bg-blue-500/10', icon: 'text-blue-500', border: 'border-blue-500/20' },
  { bg: 'bg-violet-500/10', icon: 'text-violet-500', border: 'border-violet-500/20' },
  { bg: 'bg-emerald-500/10', icon: 'text-emerald-500', border: 'border-emerald-500/20' },
];

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  onClick?: () => void;
  colorIndex?: number;
}

function StatCard({ title, value, icon: Icon, trend, onClick, colorIndex = 0 }: StatCardProps) {
  const c = STAT_COLORS[colorIndex % STAT_COLORS.length];
  return (
    <Card
      className={`bg-card border-border plug-card-hover transition-all${onClick ? ' cursor-pointer hover:shadow-md' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
            {onClick && (
              <p className="text-xs text-muted-foreground/60 mt-1">
                {trend || '→'}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${c.bg} border ${c.border} shrink-0`}>
            <Icon className={`w-6 h-6 ${c.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



export default function Dashboard() {
  const { profile, role, user } = useAuth();
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [currentSection, setCurrentSection] = useState<DashboardSection>(() => {
    const s = searchParams.get('section') as DashboardSection | null;
    return s || 'overview';
  });
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [pendingMessageKey, setPendingMessageKey] = useState(0);
  const [chatContextSection, setChatContextSection] = useState<DashboardSection>('overview');
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [viewingHubId, setViewingHubId] = useState<string | null>(null);
  const [viewingClientId, setViewingClientId] = useState<string | null>(null);
  const [appsStageFilter, setAppsStageFilter] = useState<string | undefined>();
  const [appsInitialTab, setAppsInitialTab] = useState<string | undefined>();
  const [messageTargetUserId, setMessageTargetUserId] = useState<string | undefined>();
  const chatRef = useRef<HTMLDivElement>(null);
  const [showProfileCard, setShowProfileCard] = useState(() =>
    localStorage.getItem('plug-profile-card-dismissed') !== 'true'
  );
  const [showTodaysFocus, setShowTodaysFocus] = useState(() =>
    localStorage.getItem('plug-focus-dismissed') !== 'true'
  );
  const [cvChatCollapsed, setCvChatCollapsed] = useState(false);

  // Onboarding wizard — show on first login for job seekers
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(() => {
    if (role !== 'job_seeker') return false;
    const done = localStorage.getItem('plug-onboarding-done') === 'true';
    const profileDone = (profile as any)?.onboarding_completed === true;
    return !done && !profileDone;
  });

  const isRTL = language === 'he';

  // Listen for navigate-to-messages events from QuickPingButton etc.
  useEffect(() => {
    const handler = (e: Event) => {
      const userId = (e as CustomEvent).detail?.userId;
      if (userId) setMessageTargetUserId(userId);
      setCurrentSection('messages');
    };
    window.addEventListener('plug:navigate-messages', handler);
    return () => window.removeEventListener('plug:navigate-messages', handler);
  }, []);

  const getTimeBasedGreeting = () => {
    const h = new Date().getHours();
    const name = profile?.full_name?.split(' ')[0] || '';
    if (isRTL) {
      if (h >= 5 && h < 12) return `בוקר טוב ${name}! 👋`;
      if (h >= 12 && h < 17) return `צהריים טובים ${name}! ☀️`;
      if (h >= 17 && h < 21) return `ערב טוב ${name}! 🌆`;
      return `לילה טוב ${name}! 🌙`;
    }
    if (h >= 5 && h < 12) return `Good morning ${name}! 👋`;
    if (h >= 12 && h < 17) return `Good afternoon ${name}! ☀️`;
    if (h >= 17 && h < 21) return `Good evening ${name}! 🌆`;
    return `Good night ${name}! 🌙`;
  };

  const mapSectionToPlugContext = (section: DashboardSection) => {
    if (section === 'cv-builder') return 'cv-builder' as const;
    if (section === 'applications') return 'applications' as const;
    if (section === 'job-search') return 'jobs' as const;
    return 'dashboard' as const;
  };

  // Map section to Plug context.
  // IMPORTANT: when viewing the dedicated Chat section, keep the *source* section
  // (chatContextSection) so Plug's greeting matches where the user came from.
  const plugContextPage = useMemo(() => {
    const sectionForContext = currentSection === 'chat' ? chatContextSection : currentSection;
    return mapSectionToPlugContext(sectionForContext);
  }, [currentSection, chatContextSection]);

  // Scroll to top on mount
  useEffect(() => {
    const scrollToTop = () => {
      const el = document.getElementById('main-content');
      if (el) {
        el.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      }
      window.scrollTo(0, 0);
    };
    
    scrollToTop();
    // Also after a short delay to ensure render is complete
    const timer = setTimeout(scrollToTop, 100);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to top on section change
  useEffect(() => {
    const el = document.getElementById('main-content');
    if (el) {
      el.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
    window.scrollTo(0, 0);
  }, [currentSection]);

  // Fetch real statistics from database
  const { data: dashboardData, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get applications count - explicit column selection for security
      const { data: applications } = await supabase
        .from('applications')
        .select('id, status, current_stage')
        .eq('candidate_id', user.id);

      return {
        totalApplications: applications?.length || 0,
        activeApplications: applications?.filter(a => a.status === 'active').length || 0,
        interviews: 0,
      };
    },
    enabled: !!user?.id && role === 'job_seeker',
  });

  // Real-time stats refresh when extension inserts a new application
  useEffect(() => {
    if (!user?.id || role !== 'job_seeker') return;
    const channel = supabase
      .channel(`dashboard-stats-rt-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'applications', filter: `candidate_id=eq.${user.id}` },
        () => { refetchStats(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, role, refetchStats]);

  // HR dashboard stats
  const { data: hrData } = useQuery({
    queryKey: ['hr-dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: myJobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('created_by', user.id);

      const jobIds = myJobs?.map(j => j.id) || [];

      const { data: candidates } = jobIds.length > 0
        ? await supabase.from('applications').select('id, current_stage').in('job_id', jobIds)
        : { data: [] };

      return {
        openPositions: myJobs?.length || 0,
        totalCandidates: candidates?.length || 0,
        interviews: candidates?.filter(a => a.current_stage === 'interview').length || 0,
      };
    },
    enabled: !!user?.id && (role === 'freelance_hr' || role === 'inhouse_hr'),
  });

  // Company employee dashboard stats
  const { data: employeeData } = useQuery({
    queryKey: ['employee-dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('active_company_id')
        .eq('user_id', user.id)
        .single();

      const { data: referrals } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', user.id);

      let openPositions = 0;
      if (profileData?.active_company_id) {
        const { data: companyJobs } = await supabase
          .from('jobs')
          .select('id')
          .eq('company_id', profileData.active_company_id)
          .eq('status', 'active');
        openPositions = companyJobs?.length || 0;
      }

      return {
        referrals: referrals?.length || 0,
        openPositions,
      };
    },
    enabled: !!user?.id && role === 'company_employee',
  });

  // Role-specific stats with real data
  const getStats = () => {
    switch (role) {
      case 'job_seeker':
        return [
          { title: t('dashboard.applications') || 'Applications', value: String(dashboardData?.totalApplications || 0), icon: FileText, onClick: () => { setAppsStageFilter(undefined); setCurrentSection('applications'); } },
          { title: t('dashboard.interviews') || 'Interviews', value: String(dashboardData?.interviews || 0), icon: Users, onClick: () => { setAppsStageFilter('interview'); setCurrentSection('applications'); } },
          { title: isRTL ? 'פעיל' : 'Active', value: String(dashboardData?.activeApplications || 0), icon: Zap, onClick: () => { setAppsStageFilter(undefined); setCurrentSection('applications'); } },
        ];
      case 'freelance_hr':
      case 'inhouse_hr':
        return [
          { title: t('dashboard.candidates') || 'Candidates', value: String(hrData?.totalCandidates ?? 0), icon: Users, onClick: () => setCurrentSection('candidates') },
          { title: t('dashboard.openPositions') || 'Open Positions', value: String(hrData?.openPositions ?? 0), icon: Briefcase, onClick: () => setCurrentSection('post-job') },
          { title: t('dashboard.interviews') || 'Interviews', value: String(hrData?.interviews ?? 0), icon: FileText, onClick: () => setCurrentSection('candidates') },
        ];
      case 'company_employee':
        return [
          { title: t('dashboard.referrals') || 'Referrals', value: String(employeeData?.referrals ?? 0), icon: Users, onClick: () => setCurrentSection('referrals') },
          { title: t('dashboard.openPositions') || 'Open Positions', value: String(employeeData?.openPositions ?? 0), icon: Briefcase },
          { title: t('dashboard.bonus') || 'Bonus', value: '₪0', icon: TrendingUp },
        ];
      default:
        return [];
    }
  };

  const stats = getStats();


  const handleMessageSent = () => {
    setPendingMessage(null);
  };

  // Section-specific content renderers
  const renderOverviewContent = () => {
    if (role === 'job_seeker') {
      return (
        <OverviewHome
          onNavigate={setCurrentSection}
          onShowResumeDialog={() => setShowResumeDialog(true)}
          onOpenChat={(msg) => {
            if (msg) {
              setPendingMessage(msg);
              setPendingMessageKey(k => k + 1);
            }
            setChatContextSection('overview');
            setCurrentSection('chat');
          }}
        />
      );
    }

    // HR & Employee overview — keep existing layout for now
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-xl font-semibold text-foreground">
          {getTimeBasedGreeting()}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-tour="stats-row">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} colorIndex={index} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2" ref={chatRef}>
            <PlugChat
              initialMessage={pendingMessage || undefined}
              initialMessageKey={pendingMessageKey}
              onMessageSent={handleMessageSent}
              contextPage={plugContextPage}
            />
          </div>
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-4 space-y-4">
              <VouchWidget onNavigate={() => setCurrentSection('profile-settings')} />
              <FeedCarouselWidget onNavigateToFeed={() => setCurrentSection('feed')} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProfileSettingsContent = () => (
    <UnifiedProfileSettings onNavigate={setCurrentSection} />
  );

  const renderChatContent = () => (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
        <MessageSquare className="w-6 h-6 text-primary" />
        {t('plug.title') || 'Chat with Plug'}
      </h2>
      <PlugChat
        initialMessage={pendingMessage || undefined}
        initialMessageKey={pendingMessageKey}
        onMessageSent={handleMessageSent}
        contextPage={plugContextPage}
      />
    </div>
  );

  // Backward compat: old 'settings' section redirects to unified profile-settings
  // renderSettingsContent removed — merged into UnifiedProfileSettings

  const renderPlaceholderContent = (title: string, icon: React.ComponentType<{ className?: string }>) => {
    const Icon = icon;
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Icon className="w-6 h-6 text-primary" />
          {title}
        </h2>
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Icon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('common.comingSoon') || 'Coming soon...'}</p>
          </CardContent>
        </Card>
      </div>
    );
  };


  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // Wrapper for non-overview sections with back button
  const withBackButton = (content: React.ReactNode, backTo: DashboardSection = 'overview') => (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" onClick={() => setCurrentSection(backTo)}>
        <BackIcon className="w-4 h-4" />
        {isRTL ? 'חזרה' : 'Back'}
      </Button>
      {content}
    </div>
  );

  // Content Hub for recruiters
  const renderContentHub = () => (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'} data-tour="content-hub">
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <Newspaper className="w-6 h-6 text-primary" />
        {isRTL ? 'תוכן וקהילה' : 'Content & Community'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { icon: BarChart3, label: isRTL ? 'דאשבורד תוכן' : 'Content Dashboard', desc: isRTL ? 'צפיות, לייקים ואנליטיקס' : 'Views, likes & analytics', section: 'content-dashboard' as DashboardSection },
          { icon: Newspaper, label: isRTL ? 'יצירת תוכן' : 'Create Content', desc: isRTL ? 'טיפים, סקרים, וידאו ועוד' : 'Tips, polls, video & more', section: 'create-feed-post' as DashboardSection },
          { icon: Video, label: isRTL ? 'וובינרים' : 'Webinars', desc: isRTL ? 'יצירה וניהול וובינרים' : 'Create & manage webinars', section: 'create-webinar' as DashboardSection },
          { icon: Globe, label: isRTL ? 'קהילות' : 'Communities', desc: isRTL ? 'קהילות מקצועיות' : 'Professional communities', section: 'communities' as DashboardSection },
        ].map((item) => (
          <Card key={item.section} className="bg-card border-border cursor-pointer plug-card-hover" onClick={() => setCurrentSection(item.section)}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10"><item.icon className="w-6 h-6 text-primary" /></div>
              <div><h3 className="font-semibold">{item.label}</h3><p className="text-sm text-muted-foreground">{item.desc}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  

  const renderSectionContent = () => {
    switch (currentSection) {
      case 'overview':
        return renderOverviewContent();
      case 'profile-settings':
      case 'profile-docs':
      case 'settings':
        return withBackButton(renderProfileSettingsContent());
      case 'chat':
        return withBackButton(renderChatContent());
      case 'applications':
        return withBackButton(
          <div className="space-y-6">
            <ApplicationsPage initialStageFilter={appsStageFilter} initialTab={appsInitialTab} onNavigate={(s) => setCurrentSection(s as any)} />
            <PlugChat contextPage="applications" />
          </div>
        );
      case 'favorite-companies' as DashboardSection:
        return withBackButton(<FavoriteCompanies />);
      case 'job-search':
        return withBackButton(
          <div className="space-y-6">
            <JobSearchPage />
            <PlugChat contextPage="jobs" />
          </div>
        );
      case 'messages':
        return withBackButton(<MessageInbox initialConversationUserId={messageTargetUserId} />);
      case 'candidates':
        return withBackButton(<CandidatesPage />);
      case 'post-job':
        return withBackButton(<PostJobForm onSuccess={() => setCurrentSection('overview')} />);
      case 'cv-builder':
        return withBackButton(
          <ResizablePanelGroup direction="vertical" className="min-h-[600px]">
            <ResizablePanel defaultSize={65} minSize={30}>
              <div className="h-full overflow-auto">
                <CVBuilder />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={35} minSize={10} collapsible collapsedSize={4}
              onCollapse={() => setCvChatCollapsed(true)}
              onExpand={() => setCvChatCollapsed(false)}
            >
              {cvChatCollapsed ? (
                <div className="h-full flex items-center justify-center bg-gradient-to-r from-accent/10 to-primary/10 cursor-pointer"
                  onClick={() => setCvChatCollapsed(false)}
                >
                  <Sparkles className="w-4 h-4 text-accent me-2" />
                  <span className="text-sm font-medium">{isRTL ? 'צ\'אט עם Plug' : 'Chat with Plug'}</span>
                  <ChevronUp className="w-4 h-4 ms-2 text-muted-foreground" />
                </div>
              ) : (
                <div className="h-full flex flex-col border-t overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-accent/10 to-primary/10 shrink-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <span className="text-sm font-medium">{isRTL ? 'צ\'אט עם Plug' : 'Chat with Plug'}</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <PlugChat contextPage="cv-builder" />
                  </div>
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        );
      case 'interview-prep':
        return withBackButton(<InterviewPrepContent />);
      case 'feed':
        return (
          <PlugSocial
            onCreatePost={() => setCurrentSection('create-feed-post')}
            onViewHub={(hubId) => { setViewingHubId(hubId); setCurrentSection('community-view'); }}
            onCreateHub={() => setCurrentSection('create-community')}
            onOpenMessages={() => setCurrentSection('messages')}
            initialTab="feed"
          />
        );
      case 'create-feed-post':
        return withBackButton(<CreateFeedPost />, 'feed');
      case 'create-webinar':
        return withBackButton(<CreateWebinar />, 'content-hub' as DashboardSection);
      case 'content-dashboard':
        return withBackButton(<ContentDashboard onNavigate={(s) => setCurrentSection(s as DashboardSection)} />, 'content-hub' as DashboardSection);
      case 'content-hub' as DashboardSection:
        return withBackButton(renderContentHub());
      
      case 'recruiter-profile' as DashboardSection:
        return withBackButton(<RecruiterProfileEditor />);
      case 'clients':
        return withBackButton(<ClientsPage onViewClient={(id) => { setViewingClientId(id); setCurrentSection('client-profile' as DashboardSection); }} />);
      case 'client-profile':
        return viewingClientId ? withBackButton(
          <ClientProfilePage companyId={viewingClientId} onBack={() => setCurrentSection('clients')} />,
          'clients'
        ) : null;
      case 'communities':
        return (
          <PlugSocial
            onCreatePost={() => setCurrentSection('create-feed-post')}
            onViewHub={(hubId) => { setViewingHubId(hubId); setCurrentSection('community-view'); }}
            onCreateHub={() => setCurrentSection('create-community')}
            onOpenMessages={() => setCurrentSection('messages')}
            initialTab="communities"
          />
        );
      case 'create-community':
        return withBackButton(<CreateCommunityHub
          onSuccess={(hubId) => { setViewingHubId(hubId); setCurrentSection('community-view'); }}
          onCancel={() => setCurrentSection('feed')}
        />, 'feed');
      case 'community-view':
        return viewingHubId ? withBackButton(
          <CommunityHubView hubId={viewingHubId} onBack={() => setCurrentSection('feed')} />,
          'feed'
        ) : null;
      case 'missions':
        return withBackButton(
          <MissionBoard 
            onCreateMission={() => setCurrentSection('create-mission' as DashboardSection)} 
            onMyMissions={() => setCurrentSection('my-missions' as DashboardSection)} 
          />
        );
      case 'create-mission':
        return withBackButton(
          <CreateMissionForm 
            onSuccess={() => setCurrentSection('missions' as DashboardSection)} 
            onCancel={() => setCurrentSection('missions' as DashboardSection)} 
          />,
          'missions' as DashboardSection
        );
      case 'my-missions':
        return withBackButton(
          <MyMissions onBack={() => setCurrentSection('missions' as DashboardSection)} />,
          'missions' as DashboardSection
        );
      case 'schedule':
        return withBackButton(<ScheduleCalendar />);
      case 'hr-tools':
        return withBackButton(<HRToolsHub />);
      case 'referrals':
        return withBackButton(<ReferralPanel />);
      case 'my-stats':
        return withBackButton(<MyStatsPage />);
    }
  };

  const scrollToChat = () => {
    setCurrentSection('overview');
    setTimeout(() => {
      chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const startTour = () => {
    setCurrentSection('overview');
    setTimeout(() => {
      if (role === 'job_seeker') {
        window.dispatchEvent(new CustomEvent('plug:start-job-seeker-tour'));
      } else if (role === 'freelance_hr' || role === 'inhouse_hr') {
        window.dispatchEvent(new CustomEvent('plug:start-recruiter-tour'));
      } else {
        toast.info(isRTL 
          ? 'סיור מודרך לתפקיד שלך יהיה זמין בקרוב!' 
          : 'Guided tour for your role coming soon!');
      }
    }, 100);
  };


  return (
    <DashboardLayout 
      currentSection={currentSection} 
      onSectionChange={(next) => {
        if (next !== 'chat') setChatContextSection(next);
        setCurrentSection(next);
      }}
      onChatOpen={(initialMessage, sourceSection) => {
        if (sourceSection && sourceSection !== 'chat') {
          setChatContextSection(sourceSection);
        }
        if (initialMessage) {
          setPendingMessage(initialMessage);
          setPendingMessageKey((k) => k + 1);
        }
        setCurrentSection('chat');
      }}
      onStartTour={() => {
        // Open the TourGuideFAB panel
        window.dispatchEvent(new CustomEvent('plug:open-tour-guide'));
      }}
    >
      {/* Interactive tours */}
      <JobSeekerTour 
        currentSection={currentSection}
        onNavigate={setCurrentSection}
      />
      <RecruiterTour 
        currentSection={currentSection}
        onNavigate={setCurrentSection}
      />

      {/* Onboarding Wizard — first login for job seekers */}
      {showOnboardingWizard && (
        <OnboardingWizard onComplete={() => setShowOnboardingWizard(false)} />
      )}

      {/* Daily Welcome (first visit of the day) — skip if wizard is showing */}
      {!showOnboardingWizard && <DailyWelcome />}


      {renderSectionContent()}

      {/* Resume Upload Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'העלאת קורות חיים' : 'Upload Resume'}
            </DialogTitle>
          </DialogHeader>
          <ResumeUpload 
            onSuccess={() => {
              setShowResumeDialog(false);
              refetchStats();
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* Tour Guide FAB */}
      <TourGuideFAB onNavigate={setCurrentSection} onStartTour={startTour} />

      {/* Mobile Bottom Bar */}
      <MobileBottomBar currentSection={currentSection} onSectionChange={(next) => {
        if (next !== 'chat') setChatContextSection(next);
        setCurrentSection(next);
      }} />
    </DashboardLayout>
  );
}
