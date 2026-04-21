import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ExternalLink, Check, Bookmark, X, Loader2, Building2, Calendar, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchJob {
  job_id: string;
  score: number;
  recommendation: string;
}

interface MatchBatch {
  id: string;
  trigger_type: string;
  week_start: string;
  created_at: string;
  jobs: BatchJob[];
}

interface JobDetail {
  id: string;
  title: string;
  company_name: string | null;
  source_url: string | null;
  location: string | null;
  created_at: string;
}

interface SwipeAction {
  job_id: string;
  action: string;
  created_at: string;
}

export function MatchHistoryTab() {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const { user } = useAuth();
  const [batches, setBatches] = useState<MatchBatch[]>([]);
  const [jobDetails, setJobDetails] = useState<Record<string, JobDetail>>({});
  const [actions, setActions] = useState<Record<string, SwipeAction>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: batchData } = await (supabase as any)
      .from('job_match_batches')
      .select('id, trigger_type, week_start, created_at, jobs')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const allBatches: MatchBatch[] = batchData || [];
    setBatches(allBatches);

    const allJobIds = new Set<string>();
    allBatches.forEach(b => {
      (b.jobs || []).forEach((j: BatchJob) => allJobIds.add(j.job_id));
    });

    if (allJobIds.size > 0) {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, company_name, source_url, location, created_at')
        .in('id', Array.from(allJobIds));

      const detailMap: Record<string, JobDetail> = {};
      (jobs || []).forEach((j: any) => { detailMap[j.id] = j; });
      setJobDetails(detailMap);

      const { data: actionsData } = await (supabase as any)
        .from('job_swipe_actions')
        .select('job_id, action, created_at')
        .eq('user_id', user.id);

      const actionMap: Record<string, SwipeAction> = {};
      (actionsData || []).forEach((a: SwipeAction) => { actionMap[a.job_id] = a; });
      setActions(actionMap);
    }

    setLoading(false);
  };

  const getRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return isHebrew ? 'היום' : 'Today';
    if (diffDays === 1) return isHebrew ? 'אתמול' : 'Yesterday';
    if (diffDays < 7) return isHebrew ? `לפני ${diffDays} ימים` : `${diffDays} days ago`;
    return new Date(dateStr).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const getActionBadge = (jobId: string, job: JobDetail | undefined) => {
    const action = actions[jobId];
    if (!action) return null;

    if (action.action === 'apply') {
      if (job?.source_url) {
        return (
          <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30 gap-1">
            <ExternalLink className="w-3 h-3" />
            {isHebrew ? 'טרם הוגש' : 'Pending'}
          </Badge>
        );
      }
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
          <Check className="w-3 h-3" />
          {isHebrew ? 'הוגש' : 'Applied'}
        </Badge>
      );
    }
    if (action.action === 'save') {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
          <Bookmark className="w-3 h-3" />
          {isHebrew ? 'נשמר' : 'Saved'}
        </Badge>
      );
    }
    if (action.action === 'skip') {
      return (
        <Badge variant="secondary" className="gap-1">
          <X className="w-3 h-3" />
          {isHebrew ? 'דולג' : 'Skipped'}
        </Badge>
      );
    }
    return null;
  };

  const getSourceLabel = (job: JobDetail | undefined) => {
    if (!job) return null;

    if (job.source_url) {
      const url = job.source_url;
      let source = isHebrew ? 'אתר חיצוני' : 'External';
      if (url.includes('alljobs')) source = 'AllJobs';
      else if (url.includes('linkedin')) source = 'LinkedIn';
      else if (url.includes('drushim')) source = 'Drushim';
      else if (url.includes('indeed')) source = 'Indeed';

      return (
        <a
          href={job.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {source} — {isHebrew ? 'לחץ כאן להגשה באתר' : 'Click to apply on site'}
        </a>
      );
    }

    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link2 className="w-3 h-3" />
        {isHebrew ? 'קישור פנימי — הוגש ישירות' : 'Internal — Applied directly'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground">
          {isHebrew ? 'טוען...' : 'Loading...'}
        </p>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <Sparkles className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">
            {isHebrew ? 'אין היסטוריית התאמות עדיין' : 'No match history yet'}
          </p>
          <Button onClick={() => window.dispatchEvent(new CustomEvent('plug:navigate', { detail: 'job-swipe' }))}>
            {isHebrew ? 'צור התאמות' : 'Generate Matches'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" dir={isHebrew ? 'rtl' : 'ltr'}>
      {batches.map((batch, batchIndex) => {
        const batchJobs = batch.jobs || [];
        const appliedCount = batchJobs.filter(j => actions[j.job_id]?.action === 'apply').length;
        const savedCount = batchJobs.filter(j => actions[j.job_id]?.action === 'save').length;

        return (
          <Card key={batch.id} className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">
                  {isHebrew ? `מאצ׳ #${batches.length - batchIndex}` : `Match #${batches.length - batchIndex}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  — {getRelativeDate(batch.created_at)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {appliedCount > 0 && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                    {appliedCount} {isHebrew ? 'הגשות' : 'applied'}
                  </Badge>
                )}
                {savedCount > 0 && (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                    {savedCount} {isHebrew ? 'נשמרו' : 'saved'}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {batch.trigger_type === 'weekly_free'
                    ? (isHebrew ? 'שבועי חינם' : 'Weekly free')
                    : (isHebrew ? 'קרדיטים' : 'Credits')}
                </Badge>
              </div>
            </div>

            <CardContent className="p-0">
              {batchJobs.map((bj, i) => {
                const job = jobDetails[bj.job_id];
                return (
                  <div
                    key={bj.job_id}
                    className={cn(
                      'px-4 py-3 space-y-2',
                      i < batchJobs.length - 1 && 'border-b border-border/50'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold leading-tight flex-1 min-w-0">
                        {job?.title || bj.job_id}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-bold',
                          bj.score >= 80 ? 'bg-emerald-500/10 text-emerald-600' :
                          bj.score >= 70 ? 'bg-blue-500/10 text-blue-600' :
                          'bg-amber-500/10 text-amber-600'
                        )}>
                          {bj.score}%
                        </div>
                        {getActionBadge(bj.job_id, job)}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        {job?.company_name || (isHebrew ? 'חברה לא צוינה' : 'Company not specified')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {actions[bj.job_id]?.created_at
                          ? new Date(actions[bj.job_id].created_at).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                          : new Date(batch.created_at).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                        }
                      </span>
                    </div>

                    <div className="text-xs">
                      {getSourceLabel(job)}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
