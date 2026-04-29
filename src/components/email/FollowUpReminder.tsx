import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Bell } from 'lucide-react';
import { ComposeEmailDialog } from './ComposeEmailDialog';
import { Button } from '@/components/ui/button';

const FOLLOWUP_DAYS = 5;

export function FollowUpReminder() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';

  // Applications older than 5 days with status still 'applied' and no received email
  const { data: stale } = useQuery({
    queryKey: ['followup-reminders', user?.id],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - FOLLOWUP_DAYS * 24 * 60 * 60 * 1000).toISOString();

      // Get applications applied > 5 days ago, still pending
      const { data: apps } = await (supabase as any)
        .from('applications')
        .select('id, job_title, job_company, candidate_email, created_at')
        .eq('candidate_id', user?.id)
        .in('status', ['applied', 'pending'])
        .lt('created_at', cutoff)
        .order('created_at', { ascending: true })
        .limit(10);

      if (!apps || apps.length === 0) return [];

      // Filter out ones that already have a received email
      const appIds = apps.map((a: any) => a.id);
      const { data: emails } = await (supabase as any)
        .from('application_emails')
        .select('application_id')
        .in('application_id', appIds)
        .eq('direction', 'received');

      const responded = new Set((emails || []).map((e: any) => e.application_id));
      return apps.filter((a: any) => !responded.has(a.id)) as Array<{
        id: string;
        job_title: string;
        job_company: string;
        candidate_email: string | null;
        created_at: string;
      }>;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  if (!stale || stale.length === 0) return null;

  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium text-sm">
        <Bell className="w-4 h-4 shrink-0" />
        {isHebrew
          ? `${stale.length} חברות לא ענו — שלח פולו-אפ?`
          : `${stale.length} compan${stale.length > 1 ? 'ies' : 'y'} haven't replied — send a follow-up?`}
      </div>
      <ul className="space-y-1.5">
        {stale.slice(0, 4).map(app => {
          const days = Math.floor((Date.now() - new Date(app.created_at).getTime()) / (1000 * 60 * 60 * 24));
          return (
            <li key={app.id} className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground truncate">
                <span className="font-medium text-foreground">{app.job_company || app.job_title}</span>
                {' — '}
                {isHebrew ? `לפני ${days} ימים` : `${days} days ago`}
              </span>
              <ComposeEmailDialog
                defaultTo={app.candidate_email || ''}
                applicationId={app.id}
                jobTitle={app.job_title}
                companyName={app.job_company}
                stage="applied"
                trigger={
                  <Button variant="outline" size="sm" className="text-xs h-6 px-2 shrink-0">
                    {isHebrew ? 'שלח פולו-אפ' : 'Follow up'}
                  </Button>
                }
              />
            </li>
          );
        })}
        {stale.length > 4 && (
          <li className="text-xs text-muted-foreground">
            {isHebrew ? `ועוד ${stale.length - 4}...` : `and ${stale.length - 4} more...`}
          </li>
        )}
      </ul>
    </div>
  );
}
