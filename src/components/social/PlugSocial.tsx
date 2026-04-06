import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { FeedPage } from '@/components/feed/FeedPage';
import { FeedProfileSidebar } from '@/components/feed/FeedProfileSidebar';
import { FeedSuggestedRecruiters } from '@/components/feed/FeedSuggestedRecruiters';
import { FeedSidebarWidgets } from '@/components/feed/FeedSidebarWidgets';
import { FeedPeopleYouKnow } from '@/components/feed/FeedPeopleYouKnow';
import { FeedJobSearchInsights } from '@/components/feed/FeedJobSearchInsights';
import { CommunityHubsList } from '@/components/communities/CommunityHubsList';
import { Button } from '@/components/ui/button';
import { Newspaper, Globe, Plus, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlugSocialProps {
  onCreatePost?: () => void;
  onViewHub: (hubId: string) => void;
  onCreateHub: () => void;
  initialTab?: 'feed' | 'communities';
}

export function PlugSocial({ onCreatePost, onViewHub, onCreateHub, initialTab = 'feed' }: PlugSocialProps) {
  const [activeTab, setActiveTab] = useState<'feed' | 'communities'>(initialTab);
  const { language } = useLanguage();
  const { profile } = useAuth();
  const isRTL = language === 'he';

  const [isLightMode, setIsLightMode] = useState(() => {
    try { return localStorage.getItem('plug_feed_light_mode') === 'true'; } catch { return false; }
  });

  const toggleTheme = () => {
    const next = !isLightMode;
    setIsLightMode(next);
    document.documentElement.classList.toggle('light', next);
    try { localStorage.setItem('plug_feed_light_mode', String(next)); } catch {};
  };

  useEffect(() => {
    if (isLightMode) document.documentElement.classList.add('light');
    return () => { document.documentElement.classList.remove('light'); };
  }, []);

  return (
    <div className="min-h-full bg-muted/50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Social Header Bar — sticky below the main header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border">
        <div className="max-w-[1128px] mx-auto px-4 md:px-6">
          {/* Title row */}
          <div className="flex items-center justify-between py-3">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-primary" />
              PLUG Social
            </h1>
            <div className="flex items-center gap-2">
              {/* Dark/Light toggle */}
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 rounded-full"
                title={isLightMode ? (isRTL ? 'מצב כהה' : 'Dark mode') : (isRTL ? 'מצב בהיר' : 'Light mode')}
              >
                {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              {activeTab === 'feed' && onCreatePost && (
                <Button size="sm" className="gap-1.5" onClick={onCreatePost}>
                  <Plus className="w-4 h-4" />
                  {isRTL ? 'צור פוסט' : 'Create Post'}
                </Button>
              )}
              {activeTab === 'communities' && (
                <Button size="sm" className="gap-1.5" onClick={onCreateHub}>
                  <Plus className="w-4 h-4" />
                  {isRTL ? 'צור קהילה' : 'Create Community'}
                </Button>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 -mb-px">
            <TabButton
              active={activeTab === 'feed'}
              onClick={() => setActiveTab('feed')}
              icon={<Newspaper className="w-4 h-4" />}
              label={isRTL ? 'פיד' : 'Feed'}
            />
            <TabButton
              active={activeTab === 'communities'}
              onClick={() => setActiveTab('communities')}
              icon={<Globe className="w-4 h-4" />}
              label={isRTL ? 'קהילות' : 'Communities'}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1128px] mx-auto px-4 md:px-6 py-6">
        {activeTab === 'feed' && (
          <div className="grid grid-cols-1 lg:grid-cols-[225px_1fr_300px] gap-6">
            {/* Left Sidebar — Profile + Job Search Insights (hidden on mobile) */}
            <aside className="hidden lg:block">
              <div className="sticky top-[100px] space-y-3 pb-4">
                <FeedProfileSidebar />
                <FeedJobSearchInsights />
              </div>
            </aside>

            {/* Center — Feed */}
            <main className="min-w-0">
              <FeedPage onCreatePost={onCreatePost} />
            </main>

            {/* Right Sidebar — People You Know + Widgets (hidden on mobile) */}
            <aside className="hidden lg:block">
              <div className="sticky top-[100px] space-y-3 pb-4">
                <FeedPeopleYouKnow />
                <FeedSuggestedRecruiters />
                <FeedSidebarWidgets />
              </div>
            </aside>
          </div>
        )}
        {activeTab === 'communities' && (
          <CommunityHubsList onViewHub={onViewHub} onCreateHub={onCreateHub} />
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      )}
    >
      {icon}
      {label}
    </button>
  );
}
