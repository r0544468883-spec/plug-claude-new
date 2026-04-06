import { ReactNode, useState } from 'react';
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
import { MessageBadge } from '@/components/messaging/MessageBadge';
import { CreditHUD } from '@/components/credits/CreditHUD';
import { NavTooltip } from '@/components/ui/nav-tooltip';
import { VisibleToHRBanner } from '@/components/sidebar/VisibleToHRBanner';
// PlugFloatingHint removed - notifications now in NotificationBell
import {
  LayoutDashboard, Users, Briefcase, FileText, MessageSquare, Settings, LogOut, Menu, X, User, Search, ArrowLeft, ArrowRight, Heart, FileEdit, Route, Sparkles, Mic, Newspaper, Video, Globe, DollarSign, Building2, Target, Calendar, LayoutGrid, Gem, ClipboardList, BarChart3, UserSearch, Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

export type DashboardSection = 'overview' | 'profile-docs' | 'profile-settings' | 'applications' | 'candidates' | 'jobs' | 'job-search' | 'chat' | 'settings' | 'messages' | 'post-job' | 'saved-jobs' | 'cv-builder' | 'interview-prep' | 'feed' | 'create-feed-post' | 'create-webinar' | 'communities' | 'create-community' | 'community-view' | 'content-dashboard' | 'negotiation-sandbox' | 'content-hub' | 'b2b-suite' | 'recruiter-profile' | 'clients' | 'client-profile' | 'missions' | 'create-mission' | 'my-missions' | 'schedule' | 'hr-tools' | 'credits' | 'referrals' | 'analyses' | 'favorite-companies' | 'assignments' | 'candidate-search' | 'analytics' | 'my-stats';

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
    if (section === 'analytics') {
      navigate('/analytics');
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
        { icon: LayoutDashboard, label: isRTL ? 'מסך ראשי' : 'Overview', section: 'overview', tooltipHe: 'מסך ראשי — הצצה לכל מה שקורה אצלך', tooltipEn: 'Home — a peek into everything happening' },
        { icon: Search, label: isRTL ? 'לוח המשרות שלי' : 'My Jobboard', section: 'job-search', tooltipHe: 'חיפוש משרות חדשות וסינון לפי מיקום, קטגוריה וסוג', tooltipEn: 'Search new jobs and filter by location, category, and type' },
        { icon: Sparkles, label: 'PLUG Feed', section: 'feed', tooltipHe: 'פיד מקצועי — טיפים, תוכן ומטלות ממגייסים וחברות', tooltipEn: 'Professional feed — tips, content & assignments from recruiters' },
        { icon: Briefcase, label: isRTL ? 'המשרות שהגשתי אליהם' : 'My job applications', section: 'applications', tooltipHe: 'משרות שהגשתי דרך פלאג, אולג\'ובס ולינקדין', tooltipEn: 'Jobs you applied to via PLUG, AllJobs & LinkedIn' },
        { icon: Calendar, label: isRTL ? 'יומן החיפוש שלי' : 'My applications schedule', section: 'schedule', tooltipHe: 'יומן ראיונות, מעקב ותזכורות', tooltipEn: 'Interviews, follow-ups and reminders calendar' },
        { icon: BarChart3, label: isRTL ? 'נתוני החיפוש שלי' : 'My Stats', section: 'my-stats' as DashboardSection, tooltipHe: 'סטטיסטיקות אישיות ונתוני שוק', tooltipEn: 'Personal statistics & market data' },
        // ── Preparation & Profile ──
        { icon: User, label: isRTL ? 'הפרופיל שלי' : 'My Profile', section: 'profile-settings', tooltipHe: 'פרופיל, הגדרות, אינטגרציות וחשבון', tooltipEn: 'Profile, settings, integrations & account' },
        { icon: FileEdit, label: isRTL ? 'בניית קורות חיים' : 'CV Builder', section: 'cv-builder', tooltipHe: 'בניית קורות חיים מקצועיים עם תבניות ו-AI', tooltipEn: 'Build professional CVs with templates and AI' },
        { icon: Mic, label: isRTL ? 'הכנה לראיון עבודה' : 'Interview Prep', section: 'interview-prep', tooltipHe: 'הכנה לראיון עבודה עם שאלות ותרגול AI', tooltipEn: 'Interview preparation with AI questions and practice' },
        { icon: ClipboardList, label: isRTL ? 'לוח המטלות' : 'Assignments Board', section: 'assignments' as DashboardSection, tooltipHe: 'לוח המטלות – הוכח את הכישורים שלך עם אתגרים אמיתיים', tooltipEn: 'Assignments board – prove your skills with real challenges' },
        // ── Discovery & Opportunities ──
        { icon: Building2, label: isRTL ? 'חברות שיכולות לעניין אותי' : 'My Companies', section: 'favorite-companies' as DashboardSection, tooltipHe: 'חברות שאתה עוקב אחריהן ומשרות רלוונטיות', tooltipEn: 'Companies you follow and relevant openings' },
        { icon: Users, label: isRTL ? 'קהילות' : 'Communities', section: 'communities' as DashboardSection, tooltipHe: 'קהילות מקצועיות ונטוורקינג', tooltipEn: 'Professional communities & networking' },
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
        { icon: MessageSquare, label: 'Messages', section: 'messages', tooltipHe: 'הודעות פנימיות עם מועמדים ואנשי קשר', tooltipEn: 'Internal messages with candidates and contacts' },
        { icon: Settings, label: isRTL ? 'פרופיל והגדרות' : 'Profile & Settings', section: 'profile-settings', tooltipHe: 'פרופיל, הגדרות, אינטגרציות וחשבון', tooltipEn: 'Profile, settings, integrations & account' },
      ];
    }

    // Default for company_employee and others
    return [
      { icon: LayoutDashboard, label: t('dashboard.overview'), section: 'overview', tooltipHe: 'מבט כללי', tooltipEn: 'Overview' },
      { icon: User, label: isRTL ? 'פרופיל והגדרות' : 'Profile & Settings', section: 'profile-settings', tooltipHe: 'פרופיל, הגדרות, אינטגרציות וחשבון', tooltipEn: 'Profile, settings, integrations & account' },
      { icon: Users, label: isRTL ? 'הפניות' : 'Referrals', section: 'referrals', tooltipHe: 'הזמן חברים לPLUG וצבור דלק', tooltipEn: 'Invite friends to PLUG and earn fuel' },
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

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => (
            <NavTooltip 
              key={index} 
              content={direction === 'rtl' ? item.tooltipHe : item.tooltipEn}
              side={direction === 'rtl' ? 'left' : 'right'}
            >
              <button
                onClick={() => handleNavClick(item.section)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-start",
                  (item.section === 'feed' ? SOCIAL_SECTIONS.includes(currentSection) : currentSection === item.section)
                    ? "bg-primary/10 text-primary plug-row-active plug-glow-purple"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/10"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            </NavTooltip>
          ))}
        </nav>

        {/* Visible to HR Banner for job seekers */}
        <VisibleToHRBanner />
        {/* Tour Guide + Sign out */}
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
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 lg:flex-initial" />
          
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Credit HUD */}
            <CreditHUD />
            
            {/* Realtime Message Badge */}
            <NavTooltip content={direction === 'rtl' ? 'תיבת הודעות - צפה בשיחות ושלח הודעות' : 'Inbox - View conversations and send messages'} side="bottom">
              <span>
                <MessageBadge onClick={() => onSectionChange('messages')} />
              </span>
            </NavTooltip>
            
            {/* Global Give Vouch button */}
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
            
            <NavTooltip content={direction === 'rtl' ? 'התראות - עדכונים חשובים ופעילות' : 'Notifications - Important updates and activity'} side="bottom">
              <span>
                <NotificationBell />
              </span>
            </NavTooltip>

            
            <NavTooltip content={direction === 'rtl' ? 'החלף שפה - עברית/אנגלית' : 'Language Toggle - Hebrew/English'} side="bottom">
              <span>
                <LanguageToggle />
              </span>
            </NavTooltip>

            {/* Prominent Logout Button */}
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
        </header>

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
