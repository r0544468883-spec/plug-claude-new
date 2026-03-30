import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileCompletionCard } from '@/components/dashboard/ProfileCompletionCard';
import { PersonalCardEditor } from '@/components/profile/PersonalCardEditor';
import { RecruiterProfileEditor } from '@/components/profile/RecruiterProfileEditor';
import { PhotoUpload } from '@/components/profile/PhotoUpload';
import { PortfolioLinks } from '@/components/settings/PortfolioLinks';
import { ResumeUpload } from '@/components/documents/ResumeUpload';
import { VouchWidget } from '@/components/vouch/VouchWidget';
import { PreferencesSettings } from '@/components/settings/PreferencesSettings';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { IntegrationStatus } from '@/components/settings/IntegrationStatus';
import { User, Sliders, Plug, KeyRound, Upload } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardSection } from '@/components/dashboard/DashboardLayout';

interface UnifiedProfileSettingsProps {
  initialTab?: string;
  onNavigate?: (section: DashboardSection) => void;
}

export function UnifiedProfileSettings({ initialTab, onNavigate }: UnifiedProfileSettingsProps) {
  const { user, profile, role, isLoading } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = searchParams.get('tab');
  const defaultTab = initialTab || tabFromUrl || 'profile';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Sync tab with URL for deep linking
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL without navigation
    const newParams = new URLSearchParams(searchParams);
    if (value === 'profile') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', value);
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleAvatarUpload = () => {
    // Refresh profile data so avatar updates immediately
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  const tabs = [
    { value: 'profile', label: isHebrew ? 'פרופיל' : 'Profile', icon: User },
    { value: 'preferences', label: isHebrew ? 'העדפות' : 'Preferences', icon: Sliders },
    { value: 'integrations', label: isHebrew ? 'אינטגרציות' : 'Integrations', icon: Plug },
    { value: 'account', label: isHebrew ? 'חשבון' : 'Account', icon: KeyRound },
  ];

  // Loading skeleton while auth loads
  if (isLoading) {
    return (
      <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
        {/* Title skeleton */}
        <Skeleton className="h-8 w-48" />
        {/* Completion card skeleton */}
        <Skeleton className="h-20 w-full rounded-lg" />
        {/* Tabs skeleton */}
        <Skeleton className="h-11 w-full rounded-lg" />
        {/* Form skeleton */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <User className="w-6 h-6 text-primary" />
        {isHebrew ? 'פרופיל והגדרות' : 'Profile & Settings'}
      </h2>

      {/* Profile Completion — always visible */}
      {onNavigate && <ProfileCompletionCard onNavigate={(section) => onNavigate(section as DashboardSection)} />}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 bg-muted/50">
          {tabs.map((tab) => (
            <Tooltip key={tab.value}>
              <TooltipTrigger asChild>
                <TabsTrigger
                  value={tab.value}
                  aria-label={tab.label}
                  className="gap-2 min-w-fit shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2.5"
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">{tab.label}</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="sm:hidden">
                {tab.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </TabsList>

        {/* ── Profile Tab ── */}
        <TabsContent value="profile" className="space-y-6 mt-6">
          {role === 'job_seeker' && (
            <>
              <PersonalCardEditor />
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" />
                    {isHebrew ? 'קורות חיים' : 'Resume / CV'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResumeUpload />
                </CardContent>
              </Card>
            </>
          )}

          {(role === 'freelance_hr' || role === 'inhouse_hr') && (
            <RecruiterProfileEditor />
          )}

          {role !== 'job_seeker' && user && (
            <>
              <Card className="bg-card border-border">
                <CardContent className="p-6 flex flex-col items-center gap-3">
                  <PhotoUpload
                    userId={user.id}
                    currentAvatarUrl={profile?.avatar_url || null}
                    userName={profile?.full_name || 'User'}
                    onUpload={handleAvatarUpload}
                    size="lg"
                  />
                  <p className="font-semibold text-lg">{profile?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                </CardContent>
              </Card>
              {role !== 'freelance_hr' && role !== 'inhouse_hr' && <PortfolioLinks />}
            </>
          )}

          {user && profile && <VouchWidget />}
        </TabsContent>

        {/* ── Preferences Tab ── */}
        <TabsContent value="preferences" className="space-y-6 mt-6">
          <PreferencesSettings />
          <PrivacySettings />
        </TabsContent>

        {/* ── Integrations Tab ── */}
        <TabsContent value="integrations" className="space-y-6 mt-6">
          <IntegrationStatus />
        </TabsContent>

        {/* ── Account Tab ── */}
        <TabsContent value="account" className="space-y-6 mt-6">
          <AccountSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
