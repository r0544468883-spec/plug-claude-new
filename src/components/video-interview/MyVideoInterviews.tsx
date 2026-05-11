import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Video, Clock, Calendar, CheckCircle2, Inbox, Play } from 'lucide-react';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CandidateVideoRecorder } from './CandidateVideoRecorder';

export function MyVideoInterviews() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [activeInterview, setActiveInterview] = useState<{
    interview: any;
    questions: any[];
  } | null>(null);

  // Get job_ids from candidate's applications
  const { data: interviews, isLoading } = useQuery({
    queryKey: ['my-video-interviews', user?.id],
    queryFn: async () => {
      // Get job_ids from candidate's active applications
      const { data: apps } = await supabase
        .from('applications')
        .select('id, jobs!inner(id, title, company:companies(name))')
        .eq('candidate_id', user!.id)
        .neq('status', 'withdrawn');

      if (!apps || apps.length === 0) return [];

      const jobIds = apps.map((a: any) => a.jobs?.id).filter(Boolean);

      // Get active video interviews for those jobs
      const { data: videoInterviews } = await (supabase as any)
        .from('video_interviews')
        .select('*, video_interview_questions(id, question_text, question_order, question_type)')
        .in('job_id', jobIds)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!videoInterviews) return [];

      // Check which ones the candidate already completed
      const interviewIds = videoInterviews.map((vi: any) => vi.id);
      const { data: responses } = await (supabase as any)
        .from('video_interview_responses')
        .select('interview_id')
        .eq('candidate_id', user!.id)
        .in('interview_id', interviewIds);

      const completedSet = new Set((responses || []).map((r: any) => r.interview_id));

      // Enrich with job info
      const jobMap = new Map(apps.map((a: any) => [a.jobs?.id, a.jobs]));

      return videoInterviews.map((vi: any) => ({
        ...vi,
        completed: completedSet.has(vi.id),
        job: jobMap.get(vi.job_id),
        questions: (vi.video_interview_questions || []).sort(
          (a: any, b: any) => a.question_order - b.question_order
        ),
      }));
    },
    enabled: !!user?.id,
  });

  // Active recording mode
  if (activeInterview) {
    return (
      <CandidateVideoRecorder
        interview={activeInterview.interview}
        questions={activeInterview.questions}
        onComplete={() => setActiveInterview(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!interviews || interviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" dir={isHebrew ? 'rtl' : 'ltr'}>
        <Inbox className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-1">
          {isHebrew ? 'אין ראיונות וידאו' : 'No Video Interviews'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {isHebrew
            ? 'כשמגייס ישלח לך ראיון וידאו, הוא יופיע כאן.'
            : 'When a recruiter sends you a video interview, it will appear here.'}
        </p>
      </div>
    );
  }

  const pending = interviews.filter((i: any) => !i.completed);
  const completed = interviews.filter((i: any) => i.completed);

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Video className="w-5 h-5 text-primary" />
        {isHebrew ? 'ראיונות וידאו' : 'Video Interviews'}
        {pending.length > 0 && (
          <Badge className="bg-primary/10 text-primary">
            {pending.length} {isHebrew ? 'ממתינים' : 'pending'}
          </Badge>
        )}
      </h2>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {isHebrew ? 'ממתינים לתשובה' : 'Awaiting Your Response'}
          </h3>
          {pending.map((vi: any) => (
            <Card key={vi.id} className="border-primary/30 bg-primary/5">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{vi.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {vi.job?.title}{vi.job?.company?.name ? ` — ${vi.job.company.name}` : ''}
                    </p>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Video className="w-3 h-3" />
                    {vi.questions?.length || 0} {isHebrew ? 'שאלות' : 'questions'}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {isHebrew ? 'זמן חשיבה: ' : 'Think time: '}{vi.think_time_seconds}s
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {isHebrew ? 'זמן תשובה: ' : 'Answer time: '}{vi.answer_time_seconds}s
                  </span>
                  {vi.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {isHebrew ? 'דדליין: ' : 'Deadline: '}
                      {format(new Date(vi.deadline), 'PP', { locale: isHebrew ? he : enUS })}
                    </span>
                  )}
                </div>

                {vi.instructions && (
                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                    {vi.instructions}
                  </p>
                )}

                <Button
                  className="w-full gap-2"
                  onClick={() =>
                    setActiveInterview({
                      interview: vi,
                      questions: vi.questions,
                    })
                  }
                >
                  <Play className="w-4 h-4" />
                  {isHebrew ? 'התחל ראיון' : 'Start Interview'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {isHebrew ? 'הושלמו' : 'Completed'}
          </h3>
          {completed.map((vi: any) => (
            <Card key={vi.id} className="border-border bg-muted/30">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{vi.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {vi.job?.title}{vi.job?.company?.name ? ` — ${vi.job.company.name}` : ''}
                  </p>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-500/20 shrink-0">
                  {isHebrew ? 'הושלם' : 'Completed'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
