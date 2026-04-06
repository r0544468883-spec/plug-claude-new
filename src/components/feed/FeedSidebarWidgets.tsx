import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Briefcase, TrendingUp, Building2, Award, Users, Crown,
  Lock, Sparkles, Star, MessageSquare
} from 'lucide-react';

// ─── Job Market Pulse ───────────────────────────────────────
function JobMarketPulse() {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const { data: stats } = useQuery({
    queryKey: ['job-market-pulse'],
    queryFn: async () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [{ count: totalJobs }, { count: newThisWeek }] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open').gte('created_at', oneWeekAgo),
      ]);

      return {
        totalJobs: totalJobs || 0,
        newThisWeek: newThisWeek || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card className="bg-card shadow-sm border border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {isRTL ? 'דופק שוק העבודה' : 'Job Market Pulse'}
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2.5 bg-primary/5 rounded-lg">
            <p className="text-2xl font-bold text-primary">{stats?.totalJobs || 0}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isRTL ? 'משרות פתוחות' : 'Open jobs'}
            </p>
          </div>
          <div className="text-center p-2.5 bg-green-500/10 rounded-lg">
            <p className="text-2xl font-bold text-green-600">+{stats?.newThisWeek || 0}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isRTL ? 'חדשות השבוע' : 'New this week'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Top Hiring Companies ───────────────────────────────────
function TopHiringCompanies() {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const { data: companies } = useQuery({
    queryKey: ['top-hiring-companies'],
    queryFn: async () => {
      // Get open jobs with company_id
      const { data: jobs } = await supabase
        .from('jobs')
        .select('company_id')
        .eq('status', 'open')
        .not('company_id', 'is', null);

      if (!jobs?.length) return [];

      // Count jobs per company
      const countMap: Record<string, number> = {};
      for (const j of jobs) {
        if (j.company_id) countMap[j.company_id] = (countMap[j.company_id] || 0) + 1;
      }

      // Sort and take top 3
      const top3Ids = Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => id);

      if (!top3Ids.length) return [];

      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', top3Ids);

      return top3Ids.map((id, i) => ({
        id,
        name: companyData?.find((c: any) => c.id === id)?.name || '',
        jobCount: countMap[id],
        rank: i + 1,
      })).filter(c => c.name);
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!companies?.length) return null;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <Card className="bg-card shadow-sm border border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">
            {isRTL ? 'חברות מובילות בגיוס' : 'Top Hiring Companies'}
          </h3>
        </div>
        <div className="space-y-2.5">
          {companies.map((company) => (
            <div key={company.id} className="flex items-center gap-2.5">
              <span className="text-base">{medals[company.rank - 1]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{company.name}</p>
              </div>
              <span className="text-xs font-semibold text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                {company.jobCount} {isRTL ? 'משרות' : 'jobs'}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Featured HR (Premium) ──────────────────────────────────
function FeaturedHR() {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const { data: topRecruiters } = useQuery({
    queryKey: ['featured-hr'],
    queryFn: async () => {
      // Get recruiters with most followers
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['freelance_hr', 'inhouse_hr'])
        .limit(50) as any;

      if (!roles?.length) return [];

      const recruiterIds = roles.map((r: any) => r.user_id);

      // Count followers for each
      const followerCounts: { id: string; count: number }[] = [];
      for (const id of recruiterIds.slice(0, 20)) {
        const { count } = await supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('followed_user_id', id);
        followerCounts.push({ id, count: count || 0 });
      }

      const top3 = followerCounts.sort((a, b) => b.count - a.count).slice(0, 3);
      if (!top3.length) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, title, avatar_url')
        .in('user_id', top3.map(t => t.id));

      return top3.map((t, i) => ({
        user_id: t.id,
        full_name: profiles?.find((p: any) => p.user_id === t.id)?.full_name || '',
        title: profiles?.find((p: any) => p.user_id === t.id)?.title || '',
        followers: t.count,
        rank: i + 1,
      })).filter(r => r.full_name);
    },
    staleTime: 15 * 60 * 1000,
  });

  return (
    <Card className="bg-card shadow-sm border border-border relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">
              {isRTL ? 'HR מצטיינים' : 'Top Recruiters'}
            </h3>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
            <Crown className="w-3 h-3" />
            Premium
          </span>
        </div>

        <div className="space-y-3">
          {(topRecruiters && topRecruiters.length > 0) ? (
            topRecruiters.map((rec) => {
              const initials = rec.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div key={rec.user_id} className="flex items-center gap-2.5">
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-amber-50 text-amber-700 text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {rec.rank === 1 && (
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 absolute -top-1 -end-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{rec.full_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{rec.title || (isRTL ? 'מגייס/ת' : 'Recruiter')}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="w-3 h-3" />
                    {rec.followers}
                  </div>
                </div>
              );
            })
          ) : (
            // Placeholder blurred rows
            [1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2.5 blur-[3px] select-none pointer-events-none">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">HR</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="h-3.5 w-20 bg-muted rounded" />
                  <div className="h-2.5 w-16 bg-muted/60 rounded mt-1" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Lock overlay for non-premium */}
        {(!topRecruiters || topRecruiters.length === 0) && (
          <div className="absolute inset-0 bg-card/60 backdrop-blur-[1px] flex items-center justify-center">
            <div className="text-center">
              <Lock className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground font-medium">
                {isRTL ? 'זמין למנויי פרימיום' : 'Premium feature'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Community Stats ────────────────────────────────────────
function CommunityStats() {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const { data: stats } = useQuery({
    queryKey: ['community-stats-sidebar'],
    queryFn: async () => {
      const [{ count: totalMembers }, { count: activeHubs }, { count: totalPosts }] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('community_hubs').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('feed_posts').select('id', { count: 'exact', head: true }).eq('is_published', true),
      ]);
      return {
        totalMembers: totalMembers || 0,
        activeHubs: activeHubs || 0,
        totalPosts: totalPosts || 0,
      };
    },
    staleTime: 10 * 60 * 1000,
  });

  return (
    <Card className="bg-card shadow-sm border border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-foreground">
            {isRTL ? 'הקהילה שלנו' : 'Our Community'}
          </h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{isRTL ? 'חברים' : 'Members'}</span>
            </div>
            <span className="text-xs font-semibold text-foreground">{stats?.totalMembers?.toLocaleString() || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{isRTL ? 'קהילות פעילות' : 'Active communities'}</span>
            </div>
            <span className="text-xs font-semibold text-foreground">{stats?.activeHubs || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{isRTL ? 'פוסטים' : 'Posts'}</span>
            </div>
            <span className="text-xs font-semibold text-foreground">{stats?.totalPosts || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Today on PLUG ──────────────────────────────────────────
function TodayOnPlug() {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const { data: todayStats } = useQuery({
    queryKey: ['today-on-plug'],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      const [{ count: appsToday }, { count: newUsersToday }] = await Promise.all([
        supabase.from('applications').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
      ]);

      return {
        appsToday: appsToday || 0,
        newUsersToday: newUsersToday || 0,
      };
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm border border-primary/15">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {isRTL ? 'היום ב-PLUG' : 'Today on PLUG'}
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 bg-card/80 rounded-lg">
            <p className="text-xl font-bold text-primary">{todayStats?.appsToday || 0}</p>
            <p className="text-[10px] text-muted-foreground">{isRTL ? 'הגשות היום' : 'Apps today'}</p>
          </div>
          <div className="text-center p-2 bg-card/80 rounded-lg">
            <p className="text-xl font-bold text-blue-600">{todayStats?.newUsersToday || 0}</p>
            <p className="text-[10px] text-muted-foreground">{isRTL ? 'חברים חדשים' : 'New members'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Export ─────────────────────────────────────────────
export function FeedSidebarWidgets() {
  return (
    <div className="space-y-3">
      <TodayOnPlug />
      <JobMarketPulse />
      <TopHiringCompanies />
      <CommunityStats />
      <FeaturedHR />
    </div>
  );
}
