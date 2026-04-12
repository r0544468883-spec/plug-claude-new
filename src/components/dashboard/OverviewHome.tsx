import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCredits } from '@/contexts/CreditsContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DashboardSection } from './DashboardLayout';
import { FeedCarouselWidget } from '@/components/feed/FeedCarouselWidget';
import { ExtensionAgentPanel } from '@/components/extension/ExtensionAgentPanel';
import { VouchWidget } from '@/components/vouch/VouchWidget';
import { VouchDiscovery } from '@/components/vouch/VouchDiscovery';
import { ConnectionsWidget } from '@/components/connections/ConnectionsWidget';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Briefcase, Users as UsersIcon, Zap, Search, FileEdit, Mic,
  Calendar, ChevronRight, ChevronLeft, CheckCircle2, Circle,
  TrendingUp, Send, MessageSquare, ClipboardList, Gem, Sparkles, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGenderedText } from '@/hooks/useGenderedText';

interface OverviewHomeProps {
  onNavigate: (section: DashboardSection) => void;
  onShowResumeDialog: () => void;
  onOpenChat: (message?: string) => void;
}

export function OverviewHome({ onNavigate, onShowResumeDialog, onOpenChat }: OverviewHomeProps) {
  const { profile, user, role } = useAuth();
  const { language } = useLanguage();
  const { credits, totalCredits } = useCredits();
  const navigate = useNavigate();
  const isRTL = language === 'he';
  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;
  const firstName = profile?.full_name?.split(' ')[0] || '';
  const { gt } = useGenderedText();

  // ── Profile completion ──
  const profileCompletion = (() => {
    if (!profile) return 0;
    const fields = [profile.full_name, profile.headline, profile.bio, profile.location, profile.phone, profile.skills?.length, profile.experience_years, profile.linkedin_url];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  })();

  // ── Stats ──
  const { data: stats } = useQuery({
    queryKey: ['overview-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: applications } = await supabase.from('applications').select('id, status, current_stage, created_at').eq('candidate_id', user.id);
      const { data: interviews } = await supabase.from('interview_reminders').select('id, application_id, interview_date').gte('interview_date', new Date().toISOString());
      const appIds = applications?.map(a => a.id) || [];
      const userInterviews = interviews?.filter(i => appIds.includes(i.application_id)) || [];
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const weekApps = applications?.filter(a => new Date(a.created_at) >= weekAgo) || [];
      return {
        totalApplications: applications?.length || 0,
        activeApplications: applications?.filter(a => a.status === 'active').length || 0,
        interviews: userInterviews.length,
        weeklyApps: weekApps.length,
        weeklyInterviews: userInterviews.filter(i => new Date(i.interview_date) <= new Date(Date.now() + 7 * 86400000)).length,
      };
    },
    enabled: !!user?.id && role === 'job_seeker',
  });

  // ── Recent apps ──
  const { data: recentApps } = useQuery({
    queryKey: ['overview-recent-apps', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from('applications').select('id, status, current_stage, created_at, job_id, jobs(title, company)').eq('candidate_id', user.id).order('created_at', { ascending: false }).limit(3) as any;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // ── Upcoming interviews ──
  const { data: upcomingInterviews } = useQuery({
    queryKey: ['overview-upcoming-interviews', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: apps } = await supabase.from('applications').select('id').eq('candidate_id', user.id);
      const appIds = apps?.map(a => a.id) || [];
      if (!appIds.length) return [];
      const { data } = await supabase.from('interview_reminders').select('id, interview_date, interview_type, notes, application_id').in('application_id', appIds).gte('interview_date', new Date().toISOString()).order('interview_date', { ascending: true }).limit(3);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // ── Matched jobs ──
  const { data: matchedJobs } = useQuery({
    queryKey: ['overview-matched-jobs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from('jobs').select('id, title, company, location, job_type, created_at').eq('status', 'active').order('created_at', { ascending: false }).limit(3);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // ── Assignments preview ──
  const { data: assignments } = useQuery({
    queryKey: ['overview-assignments'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('assignment_templates').select('id, title, difficulty, estimated_hours, view_count').eq('is_active', true).order('created_at', { ascending: false }).limit(3);
      return data || [];
    },
  });

  // ── Communities preview ──
  const { data: communities } = useQuery({
    queryKey: ['overview-communities'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('community_hubs').select('id, name, member_count, category').eq('is_active', true).order('member_count', { ascending: false }).limit(3);
      return data || [];
    },
  });

  // ── Daily tasks ──
  const [dailyTasks, setDailyTasks] = useState(() => {
    const stored = localStorage.getItem('plug-daily-tasks-' + new Date().toDateString());
    if (stored) return JSON.parse(stored);
    return [
      { id: 'apply3', label: { he_m: 'הגש ל-3 משרות חדשות', he_f: 'הגישי ל-3 משרות חדשות', en: 'Apply to 3 new jobs' }, done: false },
      { id: 'updatecv', label: { he_m: 'עדכן קורות חיים', he_f: 'עדכני קורות חיים', en: 'Update your CV' }, done: false },
      { id: 'practice', label: { he_m: 'תרגל ראיון', he_f: 'תרגלי ראיון', en: 'Practice an interview' }, done: false },
      { id: 'checkpending', label: { he_m: 'בדוק הגשות ממתינות', he_f: 'בדקי הגשות ממתינות', en: 'Check pending applications' }, done: false },
    ];
  });
  const toggleTask = (id: string) => {
    const updated = dailyTasks.map((t: any) => t.id === id ? { ...t, done: !t.done } : t);
    setDailyTasks(updated);
    localStorage.setItem('plug-daily-tasks-' + new Date().toDateString(), JSON.stringify(updated));
  };
  const completedTasks = dailyTasks.filter((t: any) => t.done).length;

  // ── Helpers ──
  const greeting = (() => {
    const h = new Date().getHours();
    if (isRTL) {
      if (h >= 5 && h < 12) return `בוקר טוב, ${firstName}`;
      if (h >= 12 && h < 17) return `צהריים טובים, ${firstName}`;
      if (h >= 17 && h < 21) return `ערב טוב, ${firstName}`;
      return `לילה טוב, ${firstName}`;
    }
    if (h >= 5 && h < 12) return `Good morning, ${firstName}`;
    if (h >= 12 && h < 17) return `Good afternoon, ${firstName}`;
    if (h >= 17 && h < 21) return `Good evening, ${firstName}`;
    return `Good night, ${firstName}`;
  })();

  const stageLabel = (stage: string) => {
    const map: Record<string, { he: string; en: string }> = { applied: { he: 'הוגש', en: 'Applied' }, screening: { he: 'סינון', en: 'Screening' }, interview: { he: 'ראיון', en: 'Interview' }, offer: { he: 'הצעה', en: 'Offer' }, rejected: { he: 'נדחה', en: 'Rejected' } };
    return map[stage]?.[isRTL ? 'he' : 'en'] || stage;
  };

  const formatInterviewDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date(); const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
    const timeStr = date.toLocaleTimeString(isRTL ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    if (date.toDateString() === today.toDateString()) return `${isRTL ? 'היום' : 'Today'} ${timeStr}`;
    if (date.toDateString() === tomorrow.toDateString()) return `${isRTL ? 'מחר' : 'Tomorrow'} ${timeStr}`;
    return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + timeStr;
  };

  const jobTypeBadge = (type: string) => {
    const colors: Record<string, string> = { remote: 'bg-violet-500/15 text-violet-400', hybrid: 'bg-pink-500/15 text-pink-400', onsite: 'bg-cyan-500/15 text-cyan-400' };
    return <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', colors[type] || 'bg-muted text-muted-foreground')}>{type?.toUpperCase()}</span>;
  };

  const diffBadge = (diff: string) => {
    const colors: Record<string, string> = { easy: 'bg-emerald-500/15 text-emerald-400', medium: 'bg-amber-500/15 text-amber-400', hard: 'bg-red-500/15 text-red-400' };
    const labels: Record<string, string> = { easy: isRTL ? 'קל' : 'Easy', medium: isRTL ? 'בינוני' : 'Medium', hard: isRTL ? 'קשה' : 'Hard' };
    return <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', colors[diff] || 'bg-muted text-muted-foreground')}>{labels[diff] || diff}</span>;
  };

  // Section header helper
  const SectionHeader = ({ icon: Icon, title, actionLabel, onAction }: { icon: any; title: string; actionLabel: string; onAction: () => void }) => (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </h3>
      <Button variant="link" size="sm" className="text-xs px-0" onClick={onAction}>
        {actionLabel}<ArrowIcon className="w-3 h-3 ms-1" />
      </Button>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Row 0: Greeting + Profile Banner ── */}
      <Card className="bg-card border-border mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground flex-1">{greeting}</h1>
          <div className="flex items-center gap-3 w-full sm:w-auto sm:min-w-[250px]">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{isRTL ? 'חוזק פרופיל' : 'Profile'}</span>
            <Progress value={profileCompletion} className="h-2 flex-1" />
            <span className={cn('text-xs font-bold', profileCompletion < 40 ? 'text-red-400' : profileCompletion < 70 ? 'text-amber-400' : 'text-emerald-400')}>{profileCompletion}%</span>
            {profileCompletion < 100 && (
              <Button variant="link" size="sm" className="px-0 text-[11px] whitespace-nowrap" onClick={() => onNavigate('profile-settings')}>
                {isRTL ? gt('השלם', 'השלימי') : 'Complete'}<ArrowIcon className="w-3 h-3 ms-0.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* ── Quick Stats ── */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {isRTL ? 'סטטיסטיקות' : 'Quick Stats'}
            </h3>
            <div className="space-y-3">
              {[
                { label: isRTL ? 'סה״כ הגשות' : 'Total Applied', value: stats?.totalApplications || 0, icon: Send, color: 'text-blue-400' },
                { label: isRTL ? 'ראיונות' : 'Interviews', value: stats?.interviews || 0, icon: UsersIcon, color: 'text-violet-400' },
                { label: isRTL ? 'פעילות' : 'Active', value: stats?.activeApplications || 0, icon: Zap, color: 'text-emerald-400' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <s.icon className={cn('w-4 h-4', s.color)} />
                  <span className="text-sm text-muted-foreground flex-1">{s.label}</span>
                  <span className="text-lg font-bold text-foreground">{s.value}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{isRTL ? 'הגשות השבוע' : 'This week'}</span>
                  <span className="font-medium text-foreground">{stats?.weeklyApps || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Daily Tasks ── */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                {isRTL ? 'המטלות של היום' : "Today's Tasks"}
              </h3>
              <span className="text-xs text-muted-foreground font-medium">{completedTasks}/{dailyTasks.length}</span>
            </div>
            <Progress value={(completedTasks / dailyTasks.length) * 100} className="h-1.5 mb-3" />
            <div className="space-y-1.5">
              {dailyTasks.map((task: any) => (
                <button key={task.id} onClick={() => toggleTask(task.id)} className="w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-start">
                  {task.done ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className={cn('text-sm', task.done ? 'line-through text-muted-foreground' : 'text-foreground')}>{isRTL ? gt(task.label.he_m, task.label.he_f) : task.label.en}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Credits Balance ── */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Gem className="w-4 h-4 text-primary" />
              {isRTL ? 'הקרדיטים שלי' : 'My Credits'}
            </h3>
            <div className="text-center py-2">
              <p className="text-3xl font-bold text-foreground">{totalCredits || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{isRTL ? 'דלק זמין' : 'Available fuel'}</p>
            </div>
            <div className="flex gap-2 mt-3">
              <div className="flex-1 p-2 rounded-lg bg-emerald-500/10 text-center">
                <p className="text-sm font-bold text-emerald-400">{credits?.daily_fuel || 0}</p>
                <p className="text-[10px] text-muted-foreground">{isRTL ? 'יומי' : 'Daily'}</p>
              </div>
              <div className="flex-1 p-2 rounded-lg bg-violet-500/10 text-center">
                <p className="text-sm font-bold text-violet-400">{credits?.permanent_fuel || 0}</p>
                <p className="text-[10px] text-muted-foreground">{isRTL ? 'קבוע' : 'Permanent'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-3 text-xs" onClick={() => navigate('/fuel-up')}>
              {isRTL ? 'טען דלק' : 'Get more fuel'}
            </Button>
          </CardContent>
        </Card>

        {/* ── My Network ── */}
        <ConnectionsWidget />

        {/* ── Matching Jobs ── */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardContent className="p-4">
            <SectionHeader icon={Search} title={isRTL ? 'משרות שמתאימות לך' : 'Jobs for you'} actionLabel={isRTL ? 'הצג הכל' : 'View all'} onAction={() => onNavigate('job-search')} />
            {matchedJobs?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {matchedJobs.map((job: any) => (
                  <div key={job.id} className="p-3 rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-colors" onClick={() => onNavigate('job-search')}>
                    <p className="text-[11px] text-muted-foreground">{job.company}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{job.title}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {job.job_type && jobTypeBadge(job.job_type)}
                      {job.location && <span className="text-[10px] text-muted-foreground">{job.location}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Search className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{isRTL ? 'חפש משרות' : 'Search for jobs'}</p>
                <Button size="sm" className="mt-2" onClick={() => onNavigate('job-search')}>{isRTL ? 'חפש עכשיו' : 'Search now'}</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Extension Agent ── */}
        <div className="lg:col-span-1">
          <ExtensionAgentPanel />
        </div>

        {/* ── Recent Applications ── */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <SectionHeader icon={Briefcase} title={isRTL ? 'המשרות שהגשתי' : 'My Applications'} actionLabel={isRTL ? 'הצג הכל' : 'View all'} onAction={() => onNavigate('applications')} />
            {recentApps?.length ? (
              <div className="space-y-2">
                {recentApps.map((app: any) => (
                  <div key={app.id} className="p-2.5 rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-colors" onClick={() => onNavigate('applications')}>
                    <p className="text-[11px] text-muted-foreground">{app.jobs?.company || ''}</p>
                    <p className="text-sm font-medium text-foreground truncate">{app.jobs?.title || (isRTL ? 'משרה' : 'Job')}</p>
                    <span className={cn('inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1',
                      app.current_stage === 'interview' ? 'bg-violet-500/15 text-violet-400' :
                      app.current_stage === 'offer' ? 'bg-emerald-500/15 text-emerald-400' :
                      app.current_stage === 'rejected' ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'
                    )}>{stageLabel(app.current_stage || 'applied')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">{isRTL ? 'עדיין לא הגשת' : 'No applications yet'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Upcoming Interviews ── */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <SectionHeader icon={Calendar} title={isRTL ? 'ראיונות קרובים' : 'Upcoming Interviews'} actionLabel={isRTL ? 'יומן' : 'Calendar'} onAction={() => onNavigate('schedule')} />
            {upcomingInterviews?.length ? (
              <div className="space-y-2">
                {upcomingInterviews.map((iv: any) => (
                  <div key={iv.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-colors" onClick={() => onNavigate('schedule')}>
                    <div className="p-1.5 rounded-lg bg-violet-500/10"><Calendar className="w-3.5 h-3.5 text-violet-400" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{formatInterviewDate(iv.interview_date)}</p>
                      <p className="text-xs text-muted-foreground truncate">{iv.interview_type || (isRTL ? 'ראיון' : 'Interview')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">{isRTL ? 'אין ראיונות קרובים' : 'No upcoming interviews'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Weekly + Vouches ── */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {isRTL ? 'השבוע שלך' : 'Your Week'}
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                <p className="text-lg font-bold text-foreground">{stats?.weeklyApps || 0}</p>
                <p className="text-[10px] text-muted-foreground">{isRTL ? 'הגשות' : 'Applied'}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                <p className="text-lg font-bold text-foreground">{stats?.weeklyInterviews || 0}</p>
                <p className="text-[10px] text-muted-foreground">{isRTL ? 'ראיונות' : 'Interviews'}</p>
              </div>
            </div>
            <div className="border-t border-border pt-3 space-y-3">
              <VouchWidget onNavigate={() => onNavigate('profile-settings')} />
              <VouchDiscovery />
            </div>
          </CardContent>
        </Card>

        {/* ── Feed Carousel ── */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <SectionHeader icon={Sparkles} title={isRTL ? 'הזדמנויות חדשות' : 'New Discoveries'} actionLabel={isRTL ? 'הצג הכל' : 'View all'} onAction={() => onNavigate('feed')} />
            <FeedCarouselWidget onNavigateToFeed={() => onNavigate('feed')} />
          </CardContent>
        </Card>

        {/* ── Assignments Preview ── */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <SectionHeader icon={ClipboardList} title={isRTL ? 'לוח המטלות' : 'Assignments Board'} actionLabel={isRTL ? 'הצג הכל' : 'View all'} onAction={() => navigate('/assignments')} />
            {assignments?.length ? (
              <div className="space-y-2">
                {assignments.map((a: any) => (
                  <div key={a.id} className="p-2.5 rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-colors" onClick={() => navigate('/assignments')}>
                    <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {a.difficulty && diffBadge(a.difficulty)}
                      {a.estimated_hours && <span className="text-[10px] text-muted-foreground">{a.estimated_hours}h</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">{isRTL ? 'אין מטלות זמינות' : 'No assignments available'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Communities Preview ── */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <SectionHeader icon={Globe} title={isRTL ? 'קהילות' : 'Communities'} actionLabel={isRTL ? 'הצג הכל' : 'View all'} onAction={() => onNavigate('communities' as DashboardSection)} />
            {communities?.length ? (
              <div className="space-y-2">
                {communities.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-colors" onClick={() => onNavigate('communities' as DashboardSection)}>
                    <div className="p-1.5 rounded-lg bg-primary/10"><Globe className="w-3.5 h-3.5 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.member_count || 0} {isRTL ? 'חברים' : 'members'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">{isRTL ? 'אין קהילות זמינות' : 'No communities yet'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Bottom Tools Row ── */}
        <div className="col-span-full grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate('cv-builder')}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><FileEdit className="w-4 h-4 text-blue-400" /></div>
              <div>
                <p className="text-sm font-medium text-foreground">{isRTL ? 'בניית CV' : 'CV Builder'}</p>
                <p className="text-[10px] text-muted-foreground">{isRTL ? 'עדכן או צור חדש' : 'Update or create'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate('interview-prep')}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10"><Mic className="w-4 h-4 text-violet-400" /></div>
              <div>
                <p className="text-sm font-medium text-foreground">{isRTL ? 'הכנה לראיון' : 'Interview Prep'}</p>
                <p className="text-[10px] text-muted-foreground">{isRTL ? 'תרגול עם AI' : 'Practice with AI'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate('job-search' as DashboardSection)}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><Briefcase className="w-4 h-4 text-amber-400" /></div>
              <div>
                <p className="text-sm font-medium text-foreground">{isRTL ? 'חברות מעניינות' : 'Companies'}</p>
                <p className="text-[10px] text-muted-foreground">{isRTL ? 'חברות שיכולות להתאים' : 'Companies for you'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onOpenChat()}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><MessageSquare className="w-4 h-4 text-primary" /></div>
              <div>
                <p className="text-sm font-medium text-foreground">PLUG Assistant</p>
                <p className="text-[10px] text-muted-foreground">{isRTL ? 'שאל אותי הכל' : 'Ask me anything'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
