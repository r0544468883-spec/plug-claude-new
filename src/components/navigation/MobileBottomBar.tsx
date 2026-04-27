import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Home, Search, Sparkles, FileText, User, Users, Briefcase, Target, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardSection } from '@/components/dashboard/DashboardLayout';

interface MobileBottomBarProps {
  currentSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
}

interface TabItem {
  icon: typeof Home;
  label: string;
  section: DashboardSection;
  isCenter?: boolean;
}

export function MobileBottomBar({ currentSection, onSectionChange }: MobileBottomBarProps) {
  const { role } = useAuth();
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const isRTL = language === 'he';

  if (!isMobile) return null;

  const getTabs = (): TabItem[] => {
    if (role === 'job_seeker') {
      return [
        { icon: Home, label: isRTL ? 'בית' : 'Home', section: 'overview' },
        { icon: Search, label: isRTL ? 'משרות' : 'Jobs', section: 'job-search' },
        { icon: Sparkles, label: 'Plug', section: 'chat', isCenter: true },
        { icon: FileText, label: isRTL ? 'קו"ח' : 'CV', section: 'cv-builder' },
        { icon: User, label: isRTL ? 'פרופיל' : 'Profile', section: 'profile-settings' },
      ];
    }
    if (role === 'freelance_hr' || role === 'inhouse_hr') {
      return [
        { icon: Home, label: isRTL ? 'בית' : 'Home', section: 'overview' },
        { icon: Users, label: isRTL ? 'מועמדים' : 'Candidates', section: 'candidates' },
        { icon: Briefcase, label: 'CRM', section: 'clients', isCenter: true },
        { icon: Target, label: 'Missions', section: 'missions' },
        { icon: User, label: isRTL ? 'פרופיל' : 'Profile', section: 'recruiter-profile' as DashboardSection },
      ];
    }
    return [
      { icon: Home, label: isRTL ? 'בית' : 'Home', section: 'overview' },
      { icon: Briefcase, label: isRTL ? 'משרות' : 'Jobs', section: 'post-job' as DashboardSection },
      { icon: Users, label: isRTL ? 'מועמדים' : 'Candidates', section: 'candidates', isCenter: true },
      { icon: Award, label: 'Vouches', section: 'profile-docs' },
      { icon: User, label: isRTL ? 'פרופיל' : 'Profile', section: 'profile-docs' },
    ];
  };

  const tabs = getTabs();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border/50 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="flex items-end justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = currentSection === tab.section;
          const Icon = tab.icon;

          if (tab.isCenter) {
            return (
              <button
                key={tab.section}
                onClick={() => onSectionChange(tab.section)}
                className="relative -mt-3 flex flex-col items-center"
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95',
                    isActive ? 'bg-primary' : 'bg-primary'
                  )}
                  style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' }}
                >
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-[10px] mt-0.5 text-primary font-medium">{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.section}
              onClick={() => onSectionChange(tab.section)}
              className="flex flex-col items-center justify-center flex-1 py-2 transition-colors"
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={cn('w-5 h-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-[10px] mt-0.5', isActive ? 'text-primary font-medium' : 'text-muted-foreground')}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
