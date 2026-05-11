import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, ThumbsUp, MessageSquare, BarChart3 } from 'lucide-react';


export function SurveyResults({ jobId }: { jobId?: string }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const { data: surveys = [], isLoading } = useQuery({
    queryKey: ['survey-results', user?.id, jobId],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase.from('candidate_surveys').select('*');
      if (jobId) {
        query = query.eq('job_id', jobId);
      } else {
        const { data: myJobs } = await supabase.from('jobs').select('id').eq('created_by', user.id);
        const ids = (myJobs || []).map((j: any) => j.id);
        if (ids.length === 0) return [];
        query = query.in('job_id', ids);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  const isEmpty = surveys.length === 0;
  const displaySurveys = surveys;

  const avg = (key: string) => {
    const vals = displaySurveys.filter((s: any) => s[key]).map((s: any) => s[key] as number);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  };

  const nps = (() => {
    const withRec = displaySurveys.filter((s: any) => s.would_recommend !== null);
    if (!withRec.length) return null;
    const promoters = withRec.filter((s: any) => s.would_recommend === true).length;
    return Math.round((promoters / withRec.length) * 100);
  })();

  return (
    <div className="space-y-4" dir={isHebrew ? 'rtl' : 'ltr'}>
      {isEmpty && (
        <div className="text-center py-8 text-muted-foreground">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{isHebrew ? 'אין סקרים עדיין' : 'No surveys yet'}</p>
          <p className="text-sm mt-1">{isHebrew ? 'סקרים יופיעו לאחר תהליכי גיוס' : 'Surveys will appear after recruitment processes'}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <Star className="w-5 h-5 text-yellow-400" />, val: avg('overall_rating'), label: isHebrew ? 'חוויה כללית' : 'Overall' },
          { icon: <Star className="w-5 h-5 text-blue-400" />, val: avg('communication_rating'), label: isHebrew ? 'תקשורת' : 'Communication' },
          { icon: <Star className="w-5 h-5 text-purple-400" />, val: avg('process_rating'), label: isHebrew ? 'תהליך' : 'Process' },
          { icon: <ThumbsUp className="w-5 h-5 text-green-400" />, val: nps !== null ? `${nps}%` : '—', label: 'NPS' },
        ].map((item, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="flex justify-center mb-1">{item.icon}</div>
              <div className="text-2xl font-bold">{item.val}</div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            {isHebrew ? `הערות אחרונות (${displaySurveys.length} סקרים)` : `Recent Comments (${displaySurveys.length} surveys)`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {displaySurveys.filter((s: any) => s.feedback_text).slice(0, 5).map((s: any, i: number) => (
            <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm text-foreground">{s.feedback_text}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">{s.overall_rating}/5 ⭐</Badge>
                <Badge variant="outline" className="text-xs capitalize">{s.trigger_event?.replace('_', ' ')}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
