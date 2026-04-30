import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePresenceTracker } from '@/hooks/usePresenceTracker';
import { useIsMobile } from '@/hooks/use-mobile';
import { PlugFAB } from '@/components/chat/PlugFAB';
import { PlugNudgePopup } from '@/components/nudge/PlugNudgePopup';
import { PlugLogo } from '@/components/PlugLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { GiveVouchDialog } from '@/components/vouch/GiveVouchDialog';
import { VouchNotifications } from '@/components/vouch/VouchNotifications';
import { MessageBadge } from '@/components/messaging/MessageBadge';
import { CreditHUD } from '@/components/credits/CreditHUD';
import { NavTooltip } from '@/components/ui/nav-tooltip';
import { VisibleToHRBanner } from '@/components/sidebar/VisibleToHRBanner';
// PlugFloatingHint removed - notifications now in NotificationBell
import {
  LayoutDashboard, Users, Briefcase, FileText, MessageSquare, Settings, LogOut, Menu, X, User, Search, ArrowLeft, ArrowRight, Heart, FileEdit, Route, Sparkles, Mic, Newspaper, Video, Globe, DollarSign, Building2, Target, Calendar, LayoutGrid, Gem, ClipboardList, BarChart3, UserSearch, Monitor, Share2, History, Lightbulb, Eye, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export type DashboardSection = 'overview' | 'profile-docs' | 'profile-settings' | 'applications' | 'candidates' | 'jobs' | 'job-search' | 'chat' | 'settings' | 'messages' | 'post-job' | 'saved-jobs' | 'cv-builder' | 'interview-prep' | 'feed' | 'create-feed-post' | 'create-webinar' | 'communities' | 'create-community' | 'community-view' | 'content-dashboard' | 'negotiation-sandbox' | 'content-hub' | 'b2b-suite' | 'recruiter-profile' | 'clients' | 'client-profile' | 'missions' | 'create-mission' | 'my-missions' | 'schedule' | 'hr-tools' | 'credits' | 'referrals' | 'analyses' | 'favorite-companies' | 'assignments' | 'candidate-search' | 'analytics' | 'my-stats' | 'vouches' | 'network' | 'job-swipe' | 'my-matches' | 'my-secrets' | 'ideas' | 'my-company' | 'companies';

interface NavItemConfig {
  icon: typeof LayoutDashboard;
  label: string;
  section: DashboardSection;
  tooltipHe: string;
  tooltipEn: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  currentSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  onChatOpen?: (initialMessage?: string, sourceSection?: DashboardSection) => void;
  onStartTour?: () => void;
}

const SOCIAL_SECTIONS: DashboardSection[] = ['feed', 'communities', 'community-view', 'create-community', 'create-feed-post'];

export function DashboardLayout({ children, currentSection, onSectionChange, onChatOpen, onStartTour }: DashboardLayoutProps) {
  const { profile, role, signOut } = useAuth();
  const { t, direction, language } = useLanguage();
  const isRTL = language === 'he';
  usePresenceTracker();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMobileCVWarning, setShowMobileCVWarning] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  // Auto-open the sidebar group that contains the active section
  useEffect(() => {
    const JOB_SECS  = ['job-search', 'job-swipe', 'companies', 'my-secrets'];
    const APP_SECS  = ['applications', 'schedule', 'my-stats'];
    const PREP_SECS = ['cv-builder', 'interview-prep', 'assignments'];
    const COMM_SECS = ['feed', 'network', 'vouches', 'messages', 'communities', 'community-view', 'create-community', 'create-feed-post'];
    if (JOB_SECS.includes(currentSection))       setOpenGroup('Jobs');
    else if (APP_SECS.includes(currentSection))  setOpenGroup('Applications');
    else if (PREP_SECS.includes(currentSection)) setOpenGroup('Preparation');
    else if (COMM_SECS.includes(currentSection)) setOpenGroup('Community');
  }, [currentSection]);

  const navigate = useNavigate();
  const location = useLocation();

  // Check if we can go back (not at initial page)
  const canGoBack = location.key !== 'default';
  const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;
  const isSocialSection = SOCIAL_SECTIONS.includes(currentSection);

  const handleNavClick = (section: DashboardSection) => {
    // Intercept CV Builder on mobile — show humorous warning
    if (section === 'cv-builder' && isMobile) {
      setShowMobileCVWarning(true);
      setSidebarOpen(false);
      return;
    }
    if (section === 'credits') {
      navigate('/credits');
      setSidebarOpen(false);
      return;
    }
    if (section === 'assignments') {
      navigate('/assignments');
      setSidebarOpen(false);
      return;
    }
    if (section === 'candidate-search') {
      navigate('/candidate-search');
      setSidebarOpen(false);
      return;
    }
    if (section === 'vouches') {
      navigate('/vouches');
      setSidebarOpen(false);
      return;
    }
    if (section === 'network') {
      navigate('/network');
      setSidebarOpen(false);
      return;
    }
    if (section === 'job-swipe') {
      navigate('/job-swipe');
      setSidebarOpen(false);
      return;
    }
    if (section === 'my-secrets') {
      navigate('/my-secrets');
      setSidebarOpen(false);
      return;
    }
    if (section === 'analytics') {
      navigate('/analytics');
      setSidebarOpen(false);
      return;
    }
    if (section === 'ideas') {
      navigate('/ideas');
      setSidebarOpen(false);
      return;
    }
    if (section === 'companies') {
      navigate('/companies');
      setSidebarOpen(false);
      return;
    }
    if (section === 'my-company') {
      // Navigate to company dashboard — fetch active_company_id first
      supabase.from('profiles').select('active_company_id').eq('user_id', user?.id || '').single().then(({ data }) => {
        const cid = (data as any)?.active_company_id;
        if (cid) navigate(`/company/${cid}/dashboard`);
        else navigate('/network'); // fallback: claim flow via network page
      });
      setSidebarOpen(false);
      return;
    }
    onSectionChange(section);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'job_seeker': return t('identity.job_seeker');
      case 'freelance_hr': return t('identity.freelance_hr');
      case 'inhouse_hr': return t('identity.inhouse_hr');
      case 'company_employee': return t('identity.company_employee');
      default: return '';
    }
  };

  // Navigation items based on role with tooltips
  const getNavItems = (): NavItemConfig[] => {
    if (role === 'job_seeker') {
      return [
        // ── Core ──
        { icon: User, label: isRTL ? 'הפרופיל שלי' : 'My Profile', section: 'profile-settings', tooltipHe: 'פרופיל, הגדרות, אינטגרציות וחשבון', tooltipEn: 'Profile, settings, integrations & account' },
        { icon: LayoutDashboard, label: isRTL ? 'מסך ראשי' : 'Overview', section: 'overview', tooltipHe: 'מסך ראשי — הצצה לכל מה שקורה אצלך', tooltipEn: 'Home — a peek into everything happening' },
        { icon: Search, label: isRTL ? 'לוח המשרות שלי' : 'My Jobboard', section: 'job-search', tooltipHe: 'חיפוש משרות חדשות וסינון לפי מיקום, קטגוריה וסוג', tooltipEn: 'Search new jobs and filter by location, category, and type' },
        { icon: Target, label: isRTL ? 'ספרינט' : 'Sprint', section: 'job-swipe' as DashboardSection, tooltipHe: 'סוויפ על משרות מותאמות + היסטוריית מאצ׳ים', tooltipEn: 'Swipe through matched jobs + match history' },
        { icon: Sparkles, label: 'PLUG Feed', section: 'feed', tooltipHe: 'פיד מקצועי — טיפים, תוכן ומטלות ממגייסים וחברות', tooltipEn: 'Professional feed — tips, content & assignments from recruiters' },
        { icon: Briefcase, label: isRTL ? 'המשרות שהגשתי אליהם' : 'My job applications', section: 'applications', tooltipHe: 'משרות שהגשתי דרך פלאג, אולג\'ובס ולינקדין', tooltipEn: 'Jobs you applied to via PLUG, AllJobs & LinkedIn' },
        { icon: Calendar, label: isRTL ? 'יומן החיפוש שלי' : 'My applications schedule', section: 'schedule', tooltipHe: 'יומן ראיונות, מעקב ותזכורות', tooltipEn: 'Interviews, follow-ups and reminders calendar' },
        { icon: BarChart3, label: isRTL ? 'נתוני החיפוש שלי' : 'My Stats', section: 'my-stats' as DashboardSection, tooltipHe: 'סטטיסטיקות אישיות ונתוני שוק', tooltipEn: 'Personal statistics & market data' },
        { icon: Heart, label: isRTL ? 'ההמלצות שלי' : 'My Vouches', section: 'vouches' as DashboardSection, tooltipHe: 'המלצות שקיבלת ונתת — מחזקות את הפרופיל', tooltipEn: 'Vouches received and given — strengthen your profile' },
        { icon: Users, label: isRTL ? 'הרשת שלי' : 'My Network', section: 'network' as DashboardSection, tooltipHe: 'קולגות, מגייסים וחברות — כל הקשרים שלך', tooltipEn: 'Colleagues, recruiters and companies — your connections' },
        { icon: Sparkles, label: isRTL ? 'הסודות שלי' : 'My Secrets', section: 'my-secrets' as DashboardSection, tooltipHe: 'תובנות חברות מלינקדאין — מה החברה עושה, אנשי קשר והתאמה', tooltipEn: 'LinkedIn company insights — what they do, contacts & fit' },
        { icon: Building2, label: isRTL ? 'ספריית חברות' : 'Companies', section: 'companies' as DashboardSection, tooltipHe: 'גלה חברות וקרא ביקורות אנונימיות מהקהילה', tooltipEn: 'Discover companies & read anonymous community reviews' },
        // ── Preparation & Profile ──
        { icon: FileEdit, label: isRTL ? 'בניית קורות חיים' : 'CV Builder', section: 'cv-builder', tooltipHe: 'בניית קורות חיים מקצועיים עם תבניות ו-AI', tooltipEn: 'Build professional CVs with templates and AI' },
        { icon: Mic, label: isRTL ? 'הכנה לראיון עבודה' : 'Interview Prep', section: 'interview-prep', tooltipHe: 'הכנה לראיון עבודה עם שאלות ותרגול AI', tooltipEn: 'Interview preparation with AI questions and practice' },
        { icon: ClipboardList, label: isRTL ? 'לוח המטלות' : 'Assignments Board', section: 'assignments' as DashboardSection, tooltipHe: 'לוח המטלות – הוכח את הכישורים שלך עם אתגרים אמיתיים', tooltipEn: 'Assignments board – prove your skills with real challenges' },
        { icon: Lightbulb, label: isRTL ? 'לוח רעיונות' : 'Ideas Board', section: 'ideas' as DashboardSection, tooltipHe: 'הציעו פיצ׳רים חדשים, הצביעו וצרו את עתיד PLUG', tooltipEn: 'Suggest new features, vote and shape PLUG\u2019s future' },
        // ── Discovery & Opportunities ──
        { icon: MessageSquare, label: isRTL ? 'הודעות' : 'Messages', section: 'messages', tooltipHe: 'הודעות פנימיות מקבלים ומגייסים', tooltipEn: 'Internal messages from recruiters and contacts' },
        // ── System ──
        { icon: Gem, label: isRTL ? 'הקרדיטים שלי' : 'Credits', section: 'credits' as DashboardSection, tooltipHe: 'יתרת דלק, היסטוריה ורכישה', tooltipEn: 'Fuel balance, history & purchase' },
      ];
    }

    if (role === 'freelance_hr' || role === 'inhouse_hr') {
      return [
        { icon: LayoutDashboard, label: t('dashboard.overview'), section: 'overview', tooltipHe: 'מבט כללי על הפעילות שלך', tooltipEn: 'Overview of your activity' },
        { icon: User, label: isRTL ? 'הפרופיל שלי' : 'My Profile', section: 'recruiter-profile' as DashboardSection, tooltipHe: 'עריכת הפרופיל המקצועי, Vouches והמלצות', tooltipEn: 'Edit your professional profile, Vouches & recommendations' },
        { icon: Building2, label: isRTL ? 'הלקוחות שלי' : 'My Clients', section: 'clients' as DashboardSection, tooltipHe: 'ניהול לקוחות (חברות מגייסות) עם CRM חכם', tooltipEn: 'Manage hiring companies with smart CRM' },
        { icon: Users, label: 'Candidates', section: 'candidates', tooltipHe: 'צפייה ומעקב אחר מועמדים למשרות שפרסמת', tooltipEn: 'View and track candidates for your posted jobs' },
        { icon: UserSearch, label: isRTL ? 'חיפוש מועמדים' : 'Talent Pool', section: 'candidate-search' as DashboardSection, tooltipHe: 'חפש מועמדים לפי כישורים מהמאגר (פרימיום)', tooltipEn: 'Search candidates by skills from the pool (premium)' },
        { icon: BarChart3, label: isRTL ? 'אנליטיקס' : 'Analytics', section: 'analytics' as DashboardSection, tooltipHe: 'ביצועי משרות ומטלות עם גרפים ונתונים', tooltipEn: 'Job and assignment performance with charts and data' },
        { icon: Briefcase, label: 'Post Job', section: 'post-job', tooltipHe: 'פרסום משרה חדשה וקבלת מועמדויות', tooltipEn: 'Post a new job and receive applications' },
        { icon: LayoutGrid, label: isRTL ? 'כלי HR' : 'HR Tools', section: 'hr-tools' as DashboardSection, tooltipHe: 'אנליטיקות, בנק מועמדים, אישורים, התראות ועוד', tooltipEn: 'Analytics, talent pool, approvals, alerts & more' },
        { icon: Calendar, label: isRTL ? 'יומן' : 'Schedule', section: 'schedule', tooltipHe: 'יומן משימות, ראיונות ותזכורות', tooltipEn: 'Tasks, interviews and reminders calendar' },
        { icon: Newspaper, label: isRTL ? 'תוכן וקהילה' : 'Content & Community', section: 'content-hub' as DashboardSection, tooltipHe: 'דאשבורד תוכן, יצירת פוסטים, וובינרים וקהילות', tooltipEn: 'Content dashboard, posts, webinars & communities' },
        { icon: Target, label: isRTL ? 'לוח פרויקטים' : 'Hunters Billboard', section: 'missions' as DashboardSection, tooltipHe: 'שוק תחרותי לפרויקטי גיוס', tooltipEn: 'Competitive recruitment project marketplace' },
        { icon: ClipboardList, label: isRTL ? 'לוח המטלות' : 'Assignments', section: 'assignments' as DashboardSection, tooltipHe: 'לוח המטלות – פרסם מטלות ומצא טאלנט', tooltipEn: 'Assignment marketplace – post tasks and discover talent' },
        { icon: Lightbulb, label: isRTL ? 'לוח רעיונות' : 'Ideas Board', section: 'ideas' as DashboardSection, tooltipHe: 'הציעו פיצ׳רים חדשים, הצביעו וצרו את עתיד PLUG', tooltipEn: 'Suggest new features, vote and shape PLUG\u2019s future' },
        { icon: MessageSquare, label: 'Messages', section: 'messages', tooltipHe: 'הודעות פנימיות עם מועמדים ואנשי קשר', tooltipEn: 'Internal messages with candidates and contacts' },
        { icon: Heart, label: isRTL ? 'ההמלצות שלי' : 'My Vouches', section: 'vouches' as DashboardSection, tooltipHe: 'המלצות שקיבלת ונתת — מחזקות את הפרופיל', tooltipEn: 'Vouches received and given — strengthen your profile' },
        { icon: Users, label: isRTL ? 'הרשת שלי' : 'My Network', section: 'network' as DashboardSection, tooltipHe: 'קולגות, מגייסים וחברות — כל הקשרים שלך', tooltipEn: 'Colleagues, recruiters and companies — your connections' },
        { icon: Settings, label: isRTL ? 'פרופיל והגדרות' : 'Profile & Settings', section: 'profile-settings', tooltipHe: 'פרופיל, הגדרות, אינטגרציות וחשבון', tooltipEn: 'Profile, settings, integrations & account' },
      ];
    }

    // Default for company_employee and others
    return [
      { icon: LayoutDashboard, label: t('dashboard.overview'), section: 'overview', tooltipHe: 'מבט כללי', tooltipEn: 'Overview' },
      { icon: Building2, label: isRTL ? 'דף החברה שלי' : 'My Company', section: 'my-company' as DashboardSection, tooltipHe: 'ניהול כרטיס החברה, משרות ופוסטים בפיד', tooltipEn: 'Manage company profile, jobs & feed posts' },
      { icon: User, label: isRTL ? 'פרופיל והגדרות' : 'Profile & Settings', section: 'profile-settings', tooltipHe: 'פרופיל, הגדרות, אינטגרציות וחשבון', tooltipEn: 'Profile, settings, integrations & account' },
      { icon: Users, label: isRTL ? 'הרשת שלי' : 'My Network', section: 'network' as DashboardSection, tooltipHe: 'קולגות, מגייסים וחברות — כל הקשרים שלך', tooltipEn: 'Colleagues, recruiters and companies — your connections' },
      { icon: Heart, label: isRTL ? 'ההמלצות שלי' : 'My Vouches', section: 'vouches' as DashboardSection, tooltipHe: 'המלצות שקיבלת ונתת', tooltipEn: 'Vouches received and given' },
      { icon: Share2, label: isRTL ? 'הפניות' : 'Referrals', section: 'referrals', tooltipHe: 'הזמן חברים לPLUG וצבור דלק', tooltipEn: 'Invite friends to PLUG and earn fuel' },
      { icon: MessageSquare, label: 'Messages', section: 'messages', tooltipHe: 'הודעות פנימיות', tooltipEn: 'Internal messages' },
    ];
  };

  const navItems = getNavItems();


  return (
    <div className={cn("min-h-screen flex", "bg-background")} dir={direction}>
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Added bg-background to fix transparency issue on mobile */}
      <aside className={cn(
        'fixed lg:sticky lg:top-0 inset-y-0 z-50 w-64 h-screen bg-background border-e border-sidebar-border flex flex-col transition-transform duration-300',
        direction === 'rtl' ? 'right-0' : 'left-0',
        sidebarOpen ? 'translate-x-0' : direction === 'rtl' ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <PlugLogo size="sm" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mini Profile Card */}
        {profile && (
          <button
            onClick={() => handleNavClick('profile-settings')}
            className="mx-3 mt-3 mb-1 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-start flex items-center gap-3"
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">
                  {(profile.full_name || '?').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {isRTL ? `שלום ${(profile as any).first_name || profile.full_name?.split(' ')[0] || ''}` : `Hi ${(profile as any).first_name || profile.full_name?.split(' ')[0] || ''}`}
              </p>
              {(() => {
                const p = profile as any;
                const items = [
                  !!p?.full_name?.trim(),
                  !!p?.avatar_url,
                  !!p?.personal_tagline?.trim(),
                  !!p?.about_me?.trim(),
                  !!p?.phone?.trim(),
                  !!(p?.cv_data && Object.keys(p.cv_data || {}).length > 0),
                  !!(p?.linkedin_url || p?.portfolio_url || p?.github_url),
                  !!p?.intro_video_url,
                ];
                const pct = Math.round((items.filter(Boolean).length / items.length) * 100);
                if (pct >= 100) return null;
                return (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-muted-foreground/20 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{pct}%</span>
                  </div>
                );
              })()}
            </div>
          </button>
        )}

        {/* Visibility toggle — right below profile card */}
        <VisibleToHRBanner />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto">
          {role === 'job_seeker' ? (
            <>
              {/* ── Pinned ── */}
              <div className="px-2 pt-2 space-y-0.5">
                {([
                  { icon: LayoutDashboard, label: isRTL ? 'מסך ראשי' : 'Overview',    section: 'overview'         as DashboardSection, tooltipHe: 'מסך ראשי — הצצה לכל מה שקורה', tooltipEn: 'Home — everything at a glance' },
                  { icon: User,            label: isRTL ? 'הפרופיל שלי' : 'My Profile', section: 'profile-settings' as DashboardSection, tooltipHe: 'פרופיל, הגדרות, אינטגרציות',    tooltipEn: 'Profile, settings & integrations' },
                ] as NavItemConfig[]).map(item => {
                  const isProfileItem = item.section === 'profile-settings';
                  const p = profile as any;
                  const pItems = [!!p?.full_name?.trim(), !!p?.avatar_url, !!p?.personal_tagline?.trim(), !!p?.about_me?.trim(), !!p?.phone?.trim(), !!(p?.cv_data && Object.keys(p?.cv_data || {}).length > 0), !!(p?.linkedin_url || p?.portfolio_url || p?.github_url)];
                  const pPct = Math.round((pItems.filter(Boolean).length / pItems.length) * 100);
                  return (
                    <NavTooltip key={item.section} content={isRTL ? item.tooltipHe : item.tooltipEn} side={isRTL ? 'left' : 'right'}>
                      <button
                        onClick={() => handleNavClick(item.section)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-start",
                          currentSection === item.section
                            ? "bg-primary/10 text-primary plug-row-active plug-glow-purple"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/10"
                        )}
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        <span className="flex-1 text-sm">{item.label}</span>
                        {isProfileItem && pPct < 80 && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 leading-none">
                            {isRTL ? 'חסר' : 'Fill'}
                          </span>
                        )}
                      </button>
                    </NavTooltip>
                  );
                })}
              </div>

              {/* ── Grouped nav (accordion) ── */}
              <div className="px-2 pb-2">
                {([
                  {
                    labelHe: 'משרות', labelEn: 'Jobs',
                    items: [
                      { icon: Search,    label: isRTL ? 'לוח המשרות שלי' : 'My Jobboard',      section: 'job-search' as DashboardSection, tooltipHe: 'חיפוש משרות חדשות וסינון',            tooltipEn: 'Search & filter new jobs' },
                      { icon: Target,    label: isRTL ? 'ספרינט'          : 'Sprint',            section: 'job-swipe'  as DashboardSection, tooltipHe: 'סוויפ על משרות מותאמות',              tooltipEn: 'Swipe through matched jobs' },
                      { icon: Building2, label: isRTL ? 'ספריית חברות'    : 'Companies',         section: 'companies'  as DashboardSection, tooltipHe: 'גלה חברות וקרא ביקורות',             tooltipEn: 'Discover companies & reviews' },
                      { icon: Eye,       label: isRTL ? 'תובנות חברות'    : 'Company Insights',  section: 'my-secrets' as DashboardSection, tooltipHe: 'תובנות מלינקדאין — אנשי קשר והתאמה', tooltipEn: 'LinkedIn insights — contacts & fit' },
                    ],
                  },
                  {
                    labelHe: 'הגשות', labelEn: 'Applications',
                    items: [
                      { icon: Briefcase, label: isRTL ? 'המשרות שהגשתי'    : 'My Applications', section: 'applications' as DashboardSection, tooltipHe: 'משרות שהגשתי דרך פלאג',        tooltipEn: 'Jobs applied via PLUG' },
                      { icon: Calendar,  label: isRTL ? 'יומן החיפוש'       : 'My Schedule',     section: 'schedule'     as DashboardSection, tooltipHe: 'יומן ראיונות ותזכורות',        tooltipEn: 'Interviews & reminders' },
                      { icon: BarChart3, label: isRTL ? 'נתוני החיפוש שלי'  : 'My Stats',        section: 'my-stats'     as DashboardSection, tooltipHe: 'סטטיסטיקות אישיות ושוק',       tooltipEn: 'Personal statistics & market data' },
                    ],
                  },
                  {
                    labelHe: 'הכנה', labelEn: 'Preparation',
                    items: [
                      { icon: FileEdit,      label: isRTL ? 'בניית קורות חיים' : 'CV Builder',     section: 'cv-builder'     as DashboardSection, tooltipHe: 'בניית קורות חיים עם AI', tooltipEn: 'Build CVs with AI' },
                      { icon: Mic,           label: isRTL ? 'הכנה לראיון'      : 'Interview Prep', section: 'interview-prep'  as DashboardSection, tooltipHe: 'תרגול ראיון עם AI',        tooltipEn: 'AI interview practice' },
                      { icon: ClipboardList, label: isRTL ? 'מטלות אופציונאליות' : 'Optional Assignments', section: 'assignments' as DashboardSection, tooltipHe: 'מטלות אופציונאליות — הוכח כישורים עם אתגרים אמיתיים', tooltipEn: 'Optional assignments — prove your skills with real challenges' },
                    ],
                  },
                  {
                    labelHe: 'קהילה', labelEn: 'Community',
                    items: [
                      { icon: Newspaper,    label: 'PLUG Feed',                                section: 'feed'     as DashboardSection, tooltipHe: 'פיד מקצועי ממגייסים',     tooltipEn: 'Professional feed from recruiters' },
                      { icon: Users,        label: isRTL ? 'הרשת שלי'      : 'My Network',    section: 'network'  as DashboardSection, tooltipHe: 'קשרים מקצועיים',          tooltipEn: 'Professional connections' },
                      { icon: Heart,        label: isRTL ? 'ההמלצות שלי'   : 'My Vouches',    section: 'vouches'  as DashboardSection, tooltipHe: 'המלצות שמחזקות הפרופיל', tooltipEn: 'Vouches that boost your profile' },
                      { icon: MessageSquare,label: isRTL ? 'הודעות'         : 'Messages',      section: 'messages' as DashboardSection, tooltipHe: 'הודעות ממגייסים',         tooltipEn: 'Messages from recruiters' },
                    ],
                  },
                ] as Array<{ labelHe: string; labelEn: string; items: NavItemConfig[] }>).map(group => {
                  const isOpen = openGroup === group.labelEn;
                  const hasActive = group.items.some(i =>
                    i.section === 'feed' ? SOCIAL_SECTIONS.includes(currentSection) : currentSection === i.section
                  );
                  return (
                    <div key={group.labelEn}>
                      <button
                        onClick={() => setOpenGroup(isOpen ? null : group.labelEn)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 mt-2 rounded-lg transition-colors",
                          hasActive
                            ? "text-primary bg-primary/10 font-bold"
                            : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <span className="text-sm font-bold select-none">
                          {isRTL ? group.labelHe : group.labelEn}
                        </span>
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-200 shrink-0", isOpen && "rotate-180")} />
                      </button>
                      {isOpen && (
                        <div className="space-y-0.5 mb-1">
                          {group.items.map(item => (
                            <NavTooltip key={item.section} content={isRTL ? item.tooltipHe : item.tooltipEn} side={isRTL ? 'left' : 'right'}>
                              <button
                                onClick={() => handleNavClick(item.section)}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-start text-sm",
                                  (item.section === 'feed' ? SOCIAL_SECTIONS.includes(currentSection) : currentSection === item.section)
                                    ? "bg-primary/10 text-primary plug-row-active plug-glow-purple"
                                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/10"
                                )}
                              >
                                <item.icon className="w-4 h-4 shrink-0" />
                                <span className="flex-1">{item.label}</span>
                              </button>
                            </NavTooltip>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* ── Extras ── */}
                <div className="border-t border-sidebar-border mt-3 pt-2 space-y-0.5">
                  {([
                    { icon: Lightbulb, label: isRTL ? 'לוח רעיונות'   : 'Ideas Board', section: 'ideas'   as DashboardSection, tooltipHe: 'הציעו פיצ׳רים חדשים', tooltipEn: 'Suggest new features' },
                    { icon: Gem,       label: isRTL ? 'הקרדיטים שלי'  : 'Credits',     section: 'credits' as DashboardSection, tooltipHe: 'יתרת דלק והיסטוריה',  tooltipEn: 'Fuel balance & history' },
                  ] as NavItemConfig[]).map(item => (
                    <NavTooltip key={item.section} content={isRTL ? item.tooltipHe : item.tooltipEn} side={isRTL ? 'left' : 'right'}>
                      <button
                        onClick={() => handleNavClick(item.section)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-start text-sm",
                          currentSection === item.section
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/10"
                        )}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                      </button>
                    </NavTooltip>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* ── Flat nav for non-job_seeker roles ── */
            <div className="p-4 space-y-1">
              {navItems.map((item, index) => {
                const isProfileItem = item.section === 'profile-settings' || item.section === 'recruiter-profile';
                const p = profile as any;
                const profileItems = [
                  !!p?.full_name?.trim(),
                  !!p?.avatar_url,
                  !!p?.personal_tagline?.trim(),
                  !!p?.about_me?.trim(),
                  !!p?.phone?.trim(),
                  !!(p?.cv_data && Object.keys(p?.cv_data || {}).length > 0),
                  !!(p?.linkedin_url || p?.portfolio_url || p?.github_url),
                ];
                const profilePct = Math.round((profileItems.filter(Boolean).length / profileItems.length) * 100);
                const showProfileBadge = isProfileItem && profilePct < 80;
                return (
                  <NavTooltip key={index} content={direction === 'rtl' ? item.tooltipHe : item.tooltipEn} side={direction === 'rtl' ? 'left' : 'right'}>
                    <button
                      onClick={() => handleNavClick(item.section)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-start",
                        (item.section === 'feed' ? SOCIAL_SECTIONS.includes(currentSection) : currentSection === item.section)
                          ? "bg-primary/10 text-primary plug-row-active plug-glow-purple"
                          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/10"
                      )}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {showProfileBadge && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 leading-none">
                          {isRTL ? 'חסר' : 'Fill'}
                        </span>
                      )}
                    </button>
                  </NavTooltip>
                );
              })}
            </div>
          )}
        </nav>

        {/* Extension download banner — shown to job seekers who haven't installed */}
        {role === 'job_seeker' && (
          <a
            href="https://chrome.google.com/webstore/detail/plug"
            target="_blank"
            rel="noopener noreferrer"
            data-tour="extension-download"
            className="mx-3 mb-2 flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors px-3 py-2.5"
          >
            <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
              <Monitor className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-primary leading-tight">
                {isRTL ? 'הורד את התוסף' : 'Get the Extension'}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight truncate">
                {isRTL ? 'הגש מועמדויות ב-1 קליק' : 'Apply to jobs in 1 click'}
              </p>
            </div>
          </a>
        )}

        {/* Tour Guide + Language + Sign out */}
        <div className="p-4 border-t border-sidebar-border space-y-1">
          {onStartTour && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-accent"
              onClick={onStartTour}
            >
              <Route className="w-4 h-4" />
              {isRTL ? 'מדריך המערכת' : 'System Guide'}
            </Button>
          )}
          {/* Language toggle - visible in sidebar on mobile (hidden in top bar) */}
          <div className="sm:hidden flex items-center justify-between px-3 py-1.5">
            <span className="text-sm text-muted-foreground">{isRTL ? 'שפה' : 'Language'}</span>
            <LanguageToggle />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4" />
            {t('auth.logout')}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Top bar */}
        <header className={cn(
          "h-16 border-b flex items-center justify-between px-4 sticky top-0 z-30",
          "bg-card/50 backdrop-blur-sm border-border"
        )}>
          <div className="flex items-center gap-2">
            {/* Back button */}
            {canGoBack && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(-1)}
                className="text-muted-foreground hover:text-foreground"
              >
                <BackIcon className="w-5 h-5" />
              </Button>
            )}
            
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ms-2 rounded-lg text-foreground hover:bg-muted active:bg-muted/80"
              aria-label={isRTL ? 'תפריט ניווט' : 'Navigation menu'}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 lg:flex-initial" />
          
          <div className="flex items-center gap-1 sm:gap-4">
            {/* Credit HUD */}
            <CreditHUD />

            {/* Realtime Message Badge */}
            <NavTooltip content={direction === 'rtl' ? 'תיבת הודעות - צפה בשיחות ושלח הודעות' : 'Inbox - View conversations and send messages'} side="bottom">
              <span>
                <MessageBadge onClick={() => onSectionChange('messages')} />
              </span>
            </NavTooltip>

            <NavTooltip content={direction === 'rtl' ? 'התראות - עדכונים חשובים ופעילות' : 'Notifications - Important updates and activity'} side="bottom">
              <span>
                <NotificationBell />
              </span>
            </NavTooltip>

            {/* Desktop-only: Vouch, Language, Logout (available in sidebar on mobile) */}
            <div className="hidden sm:flex items-center gap-4">
              <NavTooltip content={direction === 'rtl' ? 'תן המלצה (Vouch) - המלץ על אנשי קשר מקצועיים' : 'Give Vouch - Recommend professional contacts'} side="bottom">
                <span>
                  <GiveVouchDialog
                    trigger={
                      <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                        <Heart className="h-5 w-5" />
                      </Button>
                    }
                  />
                </span>
              </NavTooltip>

              <NavTooltip content={direction === 'rtl' ? 'החלף שפה - עברית/אנגלית' : 'Language Toggle - Hebrew/English'} side="bottom">
                <span>
                  <LanguageToggle />
                </span>
              </NavTooltip>

              <NavTooltip content={direction === 'rtl' ? 'התנתק מהמערכת' : 'Sign out'} side="bottom">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </NavTooltip>
            </div>
          </div>
        </header>

        {/* Quick bar — desktop only, below header */}
        {role === 'job_seeker' && (
          <div className="hidden lg:flex items-stretch border-b-2 border-border bg-card sticky top-16 z-20 shrink-0">
            {([
              { icon: Search,    labelHe: 'לוח המשרות', labelEn: 'Job Board',     section: 'job-search'   as DashboardSection },
              { icon: Briefcase, labelHe: 'הגשות',       labelEn: 'Applications', section: 'applications' as DashboardSection },
              { icon: Calendar,  labelHe: 'יומן',         labelEn: 'Calendar',     section: 'schedule'     as DashboardSection },
              { icon: Newspaper, labelHe: 'פיד',          labelEn: 'Feed',         section: 'feed'         as DashboardSection },
              { icon: BarChart3, labelHe: 'נתונים',       labelEn: 'Stats',        section: 'my-stats'     as DashboardSection },
            ]).map(({ icon: Icon, labelHe, labelEn, section }) => {
              const isActive = section === 'feed'
                ? SOCIAL_SECTIONS.includes(currentSection)
                : currentSection === section;
              return (
                <button
                  key={section}
                  onClick={() => handleNavClick(section)}
                  className={cn(
                    "flex flex-1 flex-col items-center justify-center gap-2 py-3 px-4 text-sm font-semibold transition-all border-b-2 -mb-0.5",
                    isActive
                      ? "border-primary text-primary bg-primary/8"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl transition-colors",
                    isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="w-5 h-5 shrink-0" />
                  </div>
                  <span className="leading-none whitespace-nowrap">{isRTL ? labelHe : labelEn}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Page content */}
        <main id="main-content" className={cn(
          "flex-1 overflow-auto pb-20 lg:pb-6",
          isSocialSection ? "p-0" : "p-4 md:p-6"
        )} data-dashboard-scroll>
          {children}
        </main>

      </div>

      {/* Global Plug FAB - accessible from every screen */}
      <PlugFAB contextPage="dashboard" />
      <PlugNudgePopup />
      <VouchNotifications />

      {/* Mobile CV Builder Warning */}
      <Dialog open={showMobileCVWarning} onOpenChange={setShowMobileCVWarning}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex justify-center mb-3">
              <div className="p-4 rounded-full bg-amber-500/10">
                <Monitor className="w-10 h-10 text-amber-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-lg">
              {isRTL ? '🖥️ רגע, לא ככה...' : '🖥️ Hold on, not like this...'}
            </DialogTitle>
            <DialogDescription className="text-center mt-2 leading-relaxed">
              {isRTL
                ? 'בניית קורות חיים על מובייל זה כמו לנסות לצייר מונה ליזה על מפית — טכנית אפשרי, אבל התוצאה... 😅'
                : 'Building a CV on mobile is like painting the Mona Lisa on a napkin — technically possible, but the result... 😅'}
            </DialogDescription>
            <p className="text-center text-sm text-muted-foreground mt-2">
              {isRTL
                ? '💡 פתח את PLUG על מחשב נייד או טאבלט לחוויה הטובה ביותר'
                : '💡 Open PLUG on a laptop or tablet for the best experience'}
            </p>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col mt-2">
            <Button
              onClick={() => {
                setShowMobileCVWarning(false);
                onSectionChange('cv-builder');
              }}
              variant="outline"
              className="w-full"
            >
              {isRTL ? 'סבבה, אני מעדיף לסכן את זה 🤷' : 'Fine, I\'ll risk it 🤷'}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setShowMobileCVWarning(false)}
            >
              {isRTL ? 'טוב, אפתח במחשב' : 'OK, I\'ll use a computer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
