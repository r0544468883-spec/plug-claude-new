import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DashboardSection } from './DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Briefcase, FileText, Users, Zap, Search, FileEdit, Mic,
  Calendar, ChevronRight, ChevronLeft, CheckCircle2, Circle,
  TrendingUp, Eye, Send, MessageSquare, ClipboardList, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OverviewHomeProps {
  onNavigate: (section: DashboardSection) => void;
  onShowResumeDialog: () => void;
  onOpenChat: (message?: string) => void;
}

export function OverviewHome({ onNavigate, onShowResumeDialog, onOpenChat }: OverviewHomeProps) {
  const { profile, user, role } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;

  const firstName = profile?.full_name?.split(' ')[0] || '';

  // ── Profile completion calculation ──
  const profileCompletion = (() => {
    if (!profile) return 0;
    const fields = [
      profile.full_name,
      profile.headline,
      profile.bio,
      profile.location,
      profile.phone,
      profile.skills?.length,
      profile.experience_years,
      profile.linkedin_url,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  })();

  // ── Dashboard stats ──
  const { data: stats } = useQuery({
    queryKey: ['overview-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: applications } = await supabase
        .from('applications')
        .select('id, status, current_stage, created_at')
        .eq('candidate_id', user.id);

      const { data: interviews } = await supabase
        .from('interview_reminders')
        .select('id, application_id, interview_date')
        .gte('interview_date', new Date().toISOString());

      const appIds = applications?.map(a => a.id) || [];
      const userInterviews = interviews?.filter(i => appIds.includes(i.application_id)) || [];

      // Weekly stats
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekApps = applications?.filter(a => new Date(a.created_at) >= weekAgo) || [];

      return {
        totalApplications: applications?.length || 0,
        activeApplications: applications?.filter(a => a.status === 'active').length || 0,
        interviews: userInterviews.length,
        weeklyApps: weekApps.length,
        weeklyInterviews: userInterviews.filter(i => new Date(i.interview_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length,
      };
    },
    enabled: !!user?.id && role === 'job_seeker',
  });

  // ── Recent applications ──
  const { data: recentApps } = useQuery({
    queryKey: ['overview-recent-apps', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('applications')
        .select('id, status, current_stage, created_at, job_id, jobs(title, company)')
        .eq('candidate_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3) as any;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // ── Upcoming interviews ──
  const { data: upcomingInterviews } = useQuery({
    queryKey: ['overview-upcoming-interviews', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: apps } = await supabase
        .from('applications')
        .select('id')
        .eq('candidate_id', user.id);
      const appIds = apps?.map(a => a.id) || [];
      if (!appIds.length) return [];
      const { data } = await supabase
        .from('interview_reminders')
        .select('id, interview_date, interview_type, notes, application_id')
        .in('application_id', appIds)
        .gte('interview_date', new Date().toISOString())
        .order('interview_date', { ascending: true })
        .limit(3);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // ── Matched jobs preview ──
  const { data: matchedJobs } = useQuery({
    queryKey: ['overview-matched-jobs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('jobs')
        .select('id, title, company, location, job_type, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // ── Daily tasks ──
  const [dailyTasks, setDailyTasks] = useState(() => {
    const stored = localStorage.getItem('plug-daily-tasks-' + new Date().toDateString());
    if (stored) return JSON.parse(stored);
    return [
      { id: 'apply3', label: { he: 'הגש ל-3 משרות חדשות', en: 'Apply to 3 new jobs' }, done: false },
      { id: 'updatecv', label: { he: 'עדכן קורות חיים', en: 'Update your CV' }, done: false },
      { id: 'practice', label: { he: 'תרגל ראיון', en: 'Practice an interview' }, done: false },
      { id: 'checkpending', label: { he: 'בדוק הגשות ממתינות', en: 'Check pending applications' }, done: false },
    ];
  });

  const toggleTask = (id: string) => {
    const updated = dailyTasks.map((t: any) => t.id === id ? { ...t, done: !t.done } : t);
    setDailyTasks(updated);
    localStorage.setItem('plug-daily-tasks-' + new Date().toDateString(), JSON.stringify(updated));
  };

  const completedTasks = dailyTasks.filter((t: any) => t.done).length;

  // ── Time-based greeting ──
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
    const map: Record<string, { he: string; en: string }> = {
      applied: { he: 'הוגש', en: 'Applied' },
      screening: { he: 'סינון', en: 'Screening' },
      interview: { he: 'ראיון', en: 'Interview' },
      offer: { he: 'הצעה', en: 'Offer' },
      rejected: { he: 'נדחה', en: 'Rejected' },
    };
    return map[stage]?.[isRTL ? 'he' : 'en'] || stage;
  };

  const formatInterviewDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const timeStr = date.toLocaleTimeString(isRTL ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' });

    if (date.toDateString() === today.toDateString()) return `${isRTL ? 'היום' : 'Today'} ${timeStr}`;
    if (date.toDateString() === tomorrow.toDateString()) return `${isRTL ? 'מחר' : 'Tomorrow'} ${timeStr}`;
    return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + timeStr;
  };

  const jobTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      remote: 'bg-violet-500/15 text-violet-400',
      hybrid: 'bg-pink-500/15 text-pink-400',
      onsite: 'bg-cyan-500/15 text-cyan-400',
    };
    const labels: Record<string, string> = {
      remote: 'REMOTE',
      hybrid: 'HYBRID',
      onsite: 'ONSITE',
    };
    return (
      <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', colors[type] || 'bg-muted text-muted-foreground')}>
        {labels[type] || type}
      </span>
    );
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── 1. Greeting + Profile Strength ── */}
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-foreground">{greeting}</h1>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                {isRTL ? 'חוזק הפרופיל' : 'Profile Strength'}
              </span>
              <span className={cn(
                'text-sm font-bold',
                profileCompletion < 40 ? 'text-red-400' :
                profileCompletion < 70 ? 'text-amber-400' : 'text-emerald-400'
              )}>
                {profileCompletion}%
              </span>
            </div>
            <Progress value={profileCompletion} className="h-2" />
            {profileCompletion < 100 && (
              <Button
                variant="link"
                size="sm"
                className="px-0 mt-1 text-xs"
                onClick={() => onNavigate('profile-settings')}
              >
                {isRTL ? 'השלם את הפרופיל' : 'Complete your profile'}
                <ArrowIcon className="w-3 h-3 ms-1" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 2. Quick Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: isRTL ? 'הגשות' : 'Applied', value: stats?.totalApplications || 0, icon: Send, color: 'text-blue-400' },
          { label: isRTL ? 'ראיונות' : 'Interviews', value: stats?.interviews || 0, icon: Users, color: 'text-violet-400' },
          { label: isRTL ? 'פעילות' : 'Active', value: stats?.activeApplications || 0, icon: Zap, color: 'text-emerald-400' },
        ].map((s, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <s.icon className={cn('w-5 h-5 mx-auto mb-1', s.color)} />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── 3. Weekly Stats ── */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            {isRTL ? 'השבוע שלך' : 'Your Week'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: isRTL ? 'הגשות השבוע' : 'Applications this week', value: stats?.weeklyApps || 0 },
              { label: isRTL ? 'ראיונות קרובים' : 'Upcoming interviews', value: stats?.weeklyInterviews || 0 },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 4. Daily Tasks ── */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              {isRTL ? 'המטלות של היום' : "Today's Tasks"}
            </h3>
            <span className="text-xs text-muted-foreground font-medium">
              {completedTasks}/{dailyTasks.length}
            </span>
          </div>
          <Progress value={(completedTasks / dailyTasks.length) * 100} className="h-1.5 mb-3" />
          <div className="space-y-2">
            {dailyTasks.map((task: any) => (
              <button
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-start"
              >
                {task.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className={cn(
                  'text-sm',
                  task.done ? 'line-through text-muted-foreground' : 'text-foreground'
                )}>
                  {isRTL ? task.label.he : task.label.en}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 5. Matching Jobs Preview ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            {isRTL ? 'משרות שמתאימות לך' : 'Jobs for you'}
          </h3>
          <Button variant="link" size="sm" className="text-xs px-0" onClick={() => onNavigate('job-search')}>
            {isRTL ? 'הצג הכל' : 'View all'}
            <ArrowIcon className="w-3 h-3 ms-1" />
          </Button>
        </div>
        <div className="space-y-3">
          {matchedJobs?.length ? matchedJobs.map((job: any) => (
            <Card key={job.id} className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate('job-search')}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{job.company}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{job.title}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {job.job_type && jobTypeBadge(job.job_type)}
                      {job.location && (
                        <span className="text-[11px] text-muted-foreground">{job.location}</span>
                      )}
                    </div>
                  </div>
                  <ArrowIcon className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          )) : (
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'חפש משרות שמתאימות לך' : 'Search for matching jobs'}
                </p>
                <Button size="sm" className="mt-3" onClick={() => onNavigate('job-search')}>
                  {isRTL ? 'חפש עכשיו' : 'Search now'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── 6. Recent Applications ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            {isRTL ? 'המשרות שהגשתי' : 'My Applications'}
          </h3>
          <Button variant="link" size="sm" className="text-xs px-0" onClick={() => onNavigate('applications')}>
            {isRTL ? 'הצג הכל' : 'View all'}
            <ArrowIcon className="w-3 h-3 ms-1" />
          </Button>
        </div>
        <div className="space-y-3">
          {recentApps?.length ? recentApps.map((app: any) => (
            <Card key={app.id} className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate('applications')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{app.jobs?.company || ''}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{app.jobs?.title || isRTL ? 'משרה' : 'Job'}</p>
                    <span className={cn(
                      'inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-2',
                      app.current_stage === 'interview' ? 'bg-violet-500/15 text-violet-400' :
                      app.current_stage === 'offer' ? 'bg-emerald-500/15 text-emerald-400' :
                      app.current_stage === 'rejected' ? 'bg-red-500/15 text-red-400' :
                      'bg-blue-500/15 text-blue-400'
                    )}>
                      {stageLabel(app.current_stage || 'applied')}
                    </span>
                  </div>
                  <ArrowIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          )) : (
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <Briefcase className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'עדיין לא הגשת למשרות' : 'No applications yet'}
                </p>
                <Button size="sm" className="mt-3" onClick={() => onNavigate('job-search')}>
                  {isRTL ? 'חפש משרות' : 'Find jobs'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── 7. Upcoming Interviews ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            {isRTL ? 'הראיונות הקרובים' : 'Upcoming Interviews'}
          </h3>
          <Button variant="link" size="sm" className="text-xs px-0" onClick={() => onNavigate('schedule')}>
            {isRTL ? 'פתח יומן' : 'Open calendar'}
            <ArrowIcon className="w-3 h-3 ms-1" />
          </Button>
        </div>
        {upcomingInterviews?.length ? (
          <div className="space-y-2">
            {upcomingInterviews.map((interview: any) => (
              <Card key={interview.id} className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate('schedule')}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <Calendar className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatInterviewDate(interview.interview_date)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {interview.interview_type || (isRTL ? 'ראיון' : 'Interview')}
                      {interview.notes ? ` — ${interview.notes}` : ''}
                    </p>
                  </div>
                  <ArrowIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'אין ראיונות קרובים' : 'No upcoming interviews'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── 8. Quick Tools ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card
          className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => onNavigate('cv-builder')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileEdit className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {isRTL ? 'בניית קורות חיים' : 'CV Builder'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isRTL ? 'עדכן או צור חדש' : 'Update or create new'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card
          className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => onNavigate('interview-prep')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Mic className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {isRTL ? 'הכנה לראיון' : 'Interview Prep'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isRTL ? 'תרגול עם AI' : 'Practice with AI'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 9. PLUG Assistant Entry ── */}
      <Card
        className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors"
        onClick={() => onOpenChat()}
      >
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">PLUG Assistant</p>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'איך אפשר לעזור לך היום?' : 'How can I help you today?'}
            </p>
          </div>
          <ArrowIcon className="w-4 h-4 text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );
}
