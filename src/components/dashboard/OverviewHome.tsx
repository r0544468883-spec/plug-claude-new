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
import { ProfileViewsWidget } from '@/components/profile/ProfileViewsWidget';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Briefcase, Search, FileEdit, Mic,
  Calendar, CheckCircle2, Circle,
  ClipboardList, Gem, Newspaper, BarChart3, ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGenderedText } from '@/hooks/useGenderedText';

interface OverviewHomeProps {
  onNavigate: (section: DashboardSection) => void;
  onShowResumeDialog: () => void;
  onOpenChat: (message?: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title, actionLabel, onAction, color,
}: {
  icon: any; title: string; actionLabel: string; onAction: () => void; color: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className={cn('text-sm font-semibold text-foreground flex items-center gap-2')}>
        <Icon className={cn('w-4 h-4', color)} />
        {title}
      </h3>
      <Button variant="link" size="sm" className="text-xs px-0 text-muted-foreground h-auto gap-0.5" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}

function EmptyState({
  icon, text, action, onAction,
}: {
  icon: React.ReactNode; text: string; action: string; onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-5 gap-2 text-center">
      <div className="text-muted-foreground/40">{icon}</div>
      <p className="text-xs text-muted-foreground">{text}</p>
      <Button variant="outline" size="sm" className="text-xs h-7" onClick={onAction}>{action}</Button>
    </div>
  );
}

const STAGE_STYLES: Record<string, string> = {
  interview: 'bg-violet-500/15 text-violet-400',
  offer:     'bg-emerald-500/15 text-emerald-400',
  rejected:  'bg-red-500/15 text-red-400',
  applied:   'bg-blue-500/15 text-blue-400',
  screening: 'bg-amber-500/15 text-amber-400',
};
const STAGE_LABELS: Record<string, { he: string; en: string }> = {
  interview: { he: 'ראיון',  en: 'Interview' },
  offer:     { he: 'הצעה',   en: 'Offer' },
  rejected:  { he: 'נדחה',   en: 'Rejected' },
  applied:   { he: 'הוגש',   en: 'Applied' },
  screening: { he: 'סינון',  en: 'Screening' },
};

function StageBadge({ stage, isRTL }: { stage: string; isRTL: boolean }) {
  const style = STAGE_STYLES[stage] || 'bg-muted text-muted-foreground';
  const label = STAGE_LABELS[stage]?.[isRTL ? 'he' : 'en'] || stage;
  return (
    <span className={cn('inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1', style)}>
      {label}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OverviewHome({ onNavigate, onShowResumeDialog: _onShowResumeDialog, onOpenChat: _onOpenChat }: OverviewHomeProps) {
  const { profile, user, role } = useAuth();
  const { language } = useLanguage();
  const { credits, totalCredits } = useCredits();
  const navigate = useNavigate();
  const isRTL = language === 'he';
  const firstName = (profile as any)?.first_name || profile?.full_name?.split(' ')[0] || '';
  const { gt } = useGenderedText();

  // ── Profile completion ──────────────────────────────────────────────────────
  const profileCompletion = (() => {
    if (!profile) return 0;
    const p = profile as any;
    const fields = [
      p.full_name, p.personal_tagline, p.about_me, p.location,
      p.phone, p.skills?.length, p.experience_years, p.linkedin_url,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  })();

  // ── Stats ───────────────────────────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ['overview-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: applications } = await supabase
        .from('applications')
        .select('id, status, current_stage, created_at')
        .eq('candidate_id', user.id);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const weekApps = applications?.filter(a => new Date(a.created_at) >= weekAgo) || [];
      return {
        totalApplications: applications?.length || 0,
        activeApplications: applications?.filter(a => a.status === 'active').length || 0,
        interviews: applications?.filter(a => a.current_stage === 'interview').length || 0,
        weeklyApps: weekApps.length,
      };
    },
    enabled: !!user?.id && role === 'job_seeker',
  });

  // ── Recent applications (with job join) ─────────────────────────────────────
  const { data: recentApps } = useQuery({
    queryKey: ['overview-recent-apps', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from('applications')
        .select('id, status, current_stage, created_at, jobs(title, company_name)')
        .eq('candidate_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // ── Applications currently in interview stage ────────────────────────────────
  const { data: interviewApps } = useQuery({
    queryKey: ['overview-interview-apps', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from('applications')
        .select('id, current_stage, created_at, jobs(title, company_name)')
        .eq('candidate_id', user.id)
        .eq('current_stage', 'interview')
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // ── Latest jobs ─────────────────────────────────────────────────────────────
  const { data: latestJobs } = useQuery({
    queryKey: ['overview-latest-jobs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title, company_name, location, job_type')
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  // ── Assignments preview ─────────────────────────────────────────────────────
  const { data: assignments } = useQuery({
    queryKey: ['overview-assignments'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('assignment_templates')
        .select('id, title, difficulty, estimated_hours')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  // ── Daily tasks ─────────────────────────────────────────────────────────────
  const [dailyTasks, setDailyTasks] = useState(() => {
    const stored = localStorage.getItem('plug-daily-tasks-' + new Date().toDateString());
    if (stored) return JSON.parse(stored);
    return [
      { id: 'apply3',      label: { he_m: 'הגש ל-3 משרות חדשות',   he_f: 'הגישי ל-3 משרות חדשות',   en: 'Apply to 3 new jobs' },           done: false },
      { id: 'updatecv',    label: { he_m: 'עדכן קורות חיים',        he_f: 'עדכני קורות חיים',         en: 'Update your CV' },               done: false },
      { id: 'practice',    label: { he_m: 'תרגל ראיון',              he_f: 'תרגלי ראיון',              en: 'Practice an interview' },        done: false },
      { id: 'checkpending',label: { he_m: 'בדוק הגשות ממתינות',     he_f: 'בדקי הגשות ממתינות',       en: 'Check pending applications' },   done: false },
    ];
  });
  const toggleTask = (id: string) => {
    const updated = dailyTasks.map((t: any) => t.id === id ? { ...t, done: !t.done } : t);
    setDailyTasks(updated);
    localStorage.setItem('plug-daily-tasks-' + new Date().toDateString(), JSON.stringify(updated));
  };
  const completedTasks = dailyTasks.filter((t: any) => t.done).length;

  // ── Greeting ────────────────────────────────────────────────────────────────
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

  const jobTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      remote: 'bg-violet-500/15 text-violet-400',
      hybrid: 'bg-pink-500/15 text-pink-400',
      onsite: 'bg-cyan-500/15 text-cyan-400',
    };
    return (
      <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0', colors[type] || 'bg-muted text-muted-foreground')}>
        {type?.toUpperCase()}
      </span>
    );
  };

  const diffBadge = (diff: string) => {
    const colors: Record<string, string> = {
      easy:   'bg-emerald-500/15 text-emerald-400',
      medium: 'bg-amber-500/15 text-amber-400',
      hard:   'bg-red-500/15 text-red-400',
    };
    const labels: Record<string, string> = {
      easy:   isRTL ? 'קל'     : 'Easy',
      medium: isRTL ? 'בינוני' : 'Medium',
      hard:   isRTL ? 'קשה'    : 'Hard',
    };
    return (
      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', colors[diff] || 'bg-muted text-muted-foreground')}>
        {labels[diff] || diff}
      </span>
    );
  };

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── HERO: Greeting + Profile + 4 stat chips ── */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground">{greeting}</h1>
              {profileCompletion < 100 && (
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={profileCompletion} className="h-1.5 w-28" />
                  <span className={cn(
                    'text-xs font-medium shrink-0',
                    profileCompletion < 50 ? 'text-red-400' : profileCompletion < 80 ? 'text-amber-400' : 'text-emerald-400'
                  )}>
                    {profileCompletion}% {isRTL ? 'פרופיל' : 'profile'}
                  </span>
                  <Button variant="link" size="sm" className="px-0 text-xs h-auto gap-0.5 text-muted-foreground" onClick={() => onNavigate('profile-settings')}>
                    {isRTL ? gt('השלם', 'השלימי') : 'Complete'}
                    <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            {/* Stat chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: isRTL ? 'הגשות'     : 'Applied',    value: stats?.totalApplications ?? 0, cls: 'bg-blue-500/10 text-blue-400' },
                { label: isRTL ? 'פעיל'       : 'Active',     value: stats?.activeApplications ?? 0, cls: 'bg-emerald-500/10 text-emerald-400' },
                { label: isRTL ? 'ראיונות'   : 'Interviews', value: stats?.interviews ?? 0, cls: 'bg-violet-500/10 text-violet-400' },
                { label: isRTL ? 'השבוע'      : 'This week',  value: stats?.weeklyApps ?? 0, cls: 'bg-amber-500/10 text-amber-400' },
              ].map((s, i) => (
                <div key={i} className={cn('px-3 py-1.5 rounded-lg text-center min-w-[56px] cursor-pointer', s.cls)} onClick={() => onNavigate('my-stats')}>
                  <p className="text-lg font-bold leading-none">{s.value}</p>
                  <p className="text-[10px] mt-0.5 opacity-80 whitespace-nowrap">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── ROW 1: Jobs (wide) + Recent Applications ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Jobs preview — 2 cols wide */}
        <Card className="bg-card border-border lg:col-span-2 border-t-2 border-t-blue-500/50">
          <CardContent className="p-4">
            <SectionHeader
              icon={Search} color="text-blue-400"
              title={isRTL ? 'משרות אחרונות בפלטפורמה' : 'Latest Jobs'}
              actionLabel={isRTL ? 'כל המשרות ←' : '→ All jobs'}
              onAction={() => onNavigate('job-search')}
            />
            {latestJobs?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {latestJobs.map((job: any) => (
                  <div
                    key={job.id}
                    className="p-3 rounded-lg border border-border hover:border-blue-500/40 hover:bg-blue-500/5 cursor-pointer transition-all"
                    onClick={() => onNavigate('job-search')}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-[11px] text-muted-foreground truncate">{job.company_name}</p>
                      {job.job_type && jobTypeBadge(job.job_type)}
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">{job.title}</p>
                    {job.location && <p className="text-[10px] text-muted-foreground mt-1 truncate">{job.location}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Search className="w-5 h-5" />}
                text={isRTL ? 'אין משרות עדיין' : 'No jobs yet'}
                action={isRTL ? 'חפש עכשיו' : 'Search now'}
                onAction={() => onNavigate('job-search')}
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card className="bg-card border-border border-t-2 border-t-violet-500/50">
          <CardContent className="p-4">
            <SectionHeader
              icon={Briefcase} color="text-violet-400"
              title={isRTL ? 'הגשות אחרונות' : 'Recent Applications'}
              actionLabel={isRTL ? 'כולן ←' : '→ All'}
              onAction={() => onNavigate('applications')}
            />
            {recentApps?.length ? (
              <div className="space-y-2">
                {recentApps.map((app: any) => (
                  <div
                    key={app.id}
                    className="p-2.5 rounded-lg border border-border hover:border-violet-500/30 hover:bg-violet-500/5 cursor-pointer transition-all"
                    onClick={() => onNavigate('applications')}
                  >
                    <p className="text-[11px] text-muted-foreground truncate">{app.jobs?.company_name || ''}</p>
                    <p className="text-sm font-medium text-foreground truncate">{app.jobs?.title || (isRTL ? 'משרה' : 'Job')}</p>
                    <StageBadge stage={app.current_stage || 'applied'} isRTL={isRTL} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Briefcase className="w-5 h-5" />}
                text={isRTL ? 'עדיין לא הגשת' : 'No applications yet'}
                action={isRTL ? 'חפש משרות' : 'Find jobs'}
                onAction={() => onNavigate('job-search')}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── ROW 2: Feed + Daily Tasks + Schedule ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Feed preview */}
        <Card className="bg-card border-border border-t-2 border-t-pink-500/50">
          <CardContent className="p-4">
            <SectionHeader
              icon={Newspaper} color="text-pink-400"
              title="PLUG Feed"
              actionLabel={isRTL ? 'לכל הפיד ←' : '→ Full feed'}
              onAction={() => onNavigate('feed')}
            />
            <FeedCarouselWidget onNavigateToFeed={() => onNavigate('feed')} />
          </CardContent>
        </Card>

        {/* Daily Tasks */}
        <Card className="bg-card border-border border-t-2 border-t-emerald-500/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {isRTL ? 'המטלות של היום' : "Today's Tasks"}
              </h3>
              <span className="text-xs font-bold text-muted-foreground">{completedTasks}/{dailyTasks.length}</span>
            </div>
            <Progress value={(completedTasks / dailyTasks.length) * 100} className="h-1.5 mb-3" />
            <div className="space-y-1.5">
              {dailyTasks.map((task: any) => (
                <button
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-start"
                >
                  {task.done
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className={cn('text-sm', task.done ? 'line-through text-muted-foreground' : 'text-foreground')}>
                    {isRTL ? gt(task.label.he_m, task.label.he_f) : task.label.en}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Schedule — apps in interview stage */}
        <Card className="bg-card border-border border-t-2 border-t-amber-500/50">
          <CardContent className="p-4">
            <SectionHeader
              icon={Calendar} color="text-amber-400"
              title={isRTL ? 'ראיונות ומעקב' : 'Schedule'}
              actionLabel={isRTL ? 'ליומן ←' : '→ Calendar'}
              onAction={() => onNavigate('schedule')}
            />
            {interviewApps?.length ? (
              <div className="space-y-2">
                {interviewApps.map((app: any) => (
                  <div
                    key={app.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border hover:border-amber-500/30 hover:bg-amber-500/5 cursor-pointer transition-all"
                    onClick={() => onNavigate('schedule')}
                  >
                    <div className="p-1.5 rounded-lg bg-amber-500/10 shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{app.jobs?.title || (isRTL ? 'ראיון' : 'Interview')}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{app.jobs?.company_name || ''}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold shrink-0">
                      {isRTL ? 'ראיון' : 'Interview'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Calendar className="w-5 h-5" />}
                text={isRTL ? 'אין ראיונות פעילים' : 'No active interviews'}
                action={isRTL ? 'פתח יומן' : 'Open calendar'}
                onAction={() => onNavigate('schedule')}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── ROW 3: Stats + Assignments + CV & Credits ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Stats */}
        <Card className="bg-card border-border border-t-2 border-t-cyan-500/50">
          <CardContent className="p-4">
            <SectionHeader
              icon={BarChart3} color="text-cyan-400"
              title={isRTL ? 'נתוני החיפוש שלי' : 'My Stats'}
              actionLabel={isRTL ? 'לכל הנתונים ←' : '→ Full stats'}
              onAction={() => onNavigate('my-stats')}
            />
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: isRTL ? 'סה״כ הגשות'    : 'Total applied', value: stats?.totalApplications ?? 0, cls: 'bg-blue-500/10 text-blue-400' },
                { label: isRTL ? 'בפעילות'        : 'Active now',    value: stats?.activeApplications ?? 0, cls: 'bg-emerald-500/10 text-emerald-400' },
                { label: isRTL ? 'ראיונות'        : 'Interviews',    value: stats?.interviews ?? 0, cls: 'bg-violet-500/10 text-violet-400' },
                { label: isRTL ? 'הגשות השבוע'    : 'This week',     value: stats?.weeklyApps ?? 0, cls: 'bg-amber-500/10 text-amber-400' },
              ].map((s, i) => (
                <div key={i} className={cn('p-2.5 rounded-lg text-center cursor-pointer', s.cls)} onClick={() => onNavigate('my-stats')}>
                  <p className="text-xl font-bold leading-none">{s.value}</p>
                  <p className="text-[10px] mt-1 opacity-80">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Assignments */}
        <Card className="bg-card border-border border-t-2 border-t-purple-500/50">
          <CardContent className="p-4">
            <SectionHeader
              icon={ClipboardList} color="text-purple-400"
              title={isRTL ? 'לוח המטלות' : 'Assignments'}
              actionLabel={isRTL ? 'לכל המטלות ←' : '→ All tasks'}
              onAction={() => navigate('/assignments')}
            />
            {assignments?.length ? (
              <div className="space-y-2">
                {assignments.map((a: any) => (
                  <div
                    key={a.id}
                    className="p-2.5 rounded-lg border border-border hover:border-purple-500/30 hover:bg-purple-500/5 cursor-pointer transition-all"
                    onClick={() => navigate('/assignments')}
                  >
                    <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {a.difficulty && diffBadge(a.difficulty)}
                      {a.estimated_hours && <span className="text-[10px] text-muted-foreground">{a.estimated_hours}h</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<ClipboardList className="w-5 h-5" />}
                text={isRTL ? 'אין מטלות כרגע' : 'No assignments yet'}
                action={isRTL ? 'פתח לוח' : 'Open board'}
                onAction={() => navigate('/assignments')}
              />
            )}
          </CardContent>
        </Card>

        {/* CV + Credits — combined card */}
        <Card className="bg-card border-border border-t-2 border-t-rose-500/50">
          <CardContent className="p-4 space-y-4">
            {/* CV */}
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <FileEdit className="w-4 h-4 text-rose-400" />
                {isRTL ? 'קורות חיים' : 'CV Builder'}
              </h3>
              <div className="flex items-center gap-2 mb-2.5">
                <Progress value={profileCompletion} className="h-2 flex-1" />
                <span className={cn(
                  'text-xs font-bold shrink-0',
                  profileCompletion < 50 ? 'text-red-400' : profileCompletion < 80 ? 'text-amber-400' : 'text-emerald-400'
                )}>{profileCompletion}%</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/5" onClick={() => onNavigate('cv-builder')}>
                  <FileEdit className="w-3.5 h-3.5 me-1.5" />
                  {isRTL ? 'ערוך CV' : 'Edit CV'}
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onNavigate('interview-prep')}>
                  <Mic className="w-3.5 h-3.5 me-1.5" />
                  {isRTL ? 'הכנה לראיון' : 'Prep'}
                </Button>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Credits */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Gem className="w-4 h-4 text-violet-400" />
                  {isRTL ? 'הקרדיטים שלי' : 'Credits'}
                </h3>
                <span className="text-xl font-bold text-foreground leading-none">{totalCredits || 0}</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 p-2 rounded-lg bg-emerald-500/10 text-center">
                  <p className="text-sm font-bold text-emerald-400">{credits?.daily_fuel || 0}</p>
                  <p className="text-[10px] text-muted-foreground">{isRTL ? 'יומי' : 'Daily'}</p>
                </div>
                <div className="flex-1 p-2 rounded-lg bg-violet-500/10 text-center">
                  <p className="text-sm font-bold text-violet-400">{credits?.permanent_fuel || 0}</p>
                  <p className="text-[10px] text-muted-foreground">{isRTL ? 'קבוע' : 'Perm'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── ROW 4: Extension Agent + Profile Views ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExtensionAgentPanel />
        <ProfileViewsWidget />
      </div>

    </div>
  );
}
