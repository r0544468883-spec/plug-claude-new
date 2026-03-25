import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CHANNEL_LABELS: Record<string, { en: string; he: string }> = {
  plug: { en: 'PLUG', he: 'PLUG' },
  alljobs: { en: 'AllJobs', he: 'AllJobs' },
  drushim: { en: 'Drushim', he: 'דרושים' },
  linkedin: { en: 'LinkedIn', he: 'LinkedIn' },
  indeed: { en: 'Indeed', he: 'Indeed' },
  google_jobs: { en: 'Google Jobs', he: 'Google Jobs' },
  facebook_jobs: { en: 'Facebook Jobs', he: 'פייסבוק Jobs' },
};

interface PublicationStatusProps {
  jobId: string;
}

export function PublicationStatus({ jobId }: PublicationStatusProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  const { data: publications = [], isLoading } = useQuery({
    queryKey: ['job-publications', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_publications' as any)
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (pubId: string) => {
      const { error } = await supabase
        .from('job_publications' as any)
        .update({ status: 'removed' })
        .eq('id', pubId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-publications', jobId] });
      toast.success(isRTL ? 'המשרה הוסרה מהערוץ' : 'Job removed from channel');
    },
  });

  if (isLoading) return <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  if (!publications.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {isRTL ? 'ערוצי פרסום' : 'Publication Channels'}
      </p>
      <div className="space-y-1.5">
        {(publications as any[]).map((pub) => {
          const label = CHANNEL_LABELS[pub.channel]?.[isRTL ? 'he' : 'en'] || pub.channel;
          const isActive = pub.status === 'published';
          const isFailed = pub.status === 'failed';
          const isRemoved = pub.status === 'removed';
          const isPending = pub.status === 'pending';

          return (
            <div key={pub.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50 group">
              <div className="flex items-center gap-2">
                {isActive && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
                {isFailed && <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
                {(isPending || isRemoved) && <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                <span className={cn('text-sm font-medium', isRemoved && 'line-through text-muted-foreground')}>
                  {label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    isActive && 'border-green-500/30 text-green-600',
                    isFailed && 'border-destructive/30 text-destructive',
                    isPending && 'border-yellow-500/30 text-yellow-600',
                    isRemoved && 'border-muted-foreground/30 text-muted-foreground',
                  )}
                >
                  {isActive ? (isRTL ? 'פורסם' : 'Published') :
                   isFailed ? (isRTL ? 'נכשל' : 'Failed') :
                   isPending ? (isRTL ? 'ממתין' : 'Pending') :
                   (isRTL ? 'הוסר' : 'Removed')}
                </Badge>
                {isActive && pub.channel !== 'plug' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMutation.mutate(pub.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
