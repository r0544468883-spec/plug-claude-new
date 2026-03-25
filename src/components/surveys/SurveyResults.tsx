import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, ThumbsUp, MessageSquare, BarChart3 } from 'lucide-react';

const DEMO_SURVEYS = [
  { id: 'd1', overall_rating: 5, communication_rating: 4, process_rating: 5, would_recommend: true, feedback_text: 'תהליך מאוד מקצועי ומהיר. הגייסת הייתה קשובה וזמינה לאורך כל הדרך.', trigger_event: 'after_interview' },
  { id: 'd2', overall_rating: 4, communication_rating: 5, process_rating: 4, would_recommend: true, feedback_text: 'חוויה חיובית בסה"כ. אשמח לתהליך קצת יותר מהיר בעתיד.', trigger_event: 'after_offer' },
  { id: 'd3', overall_rating: 3, communication_rating: 3, process_rating: 2, would_recommend: false, feedback_text: 'ציפיתי לתגובות מהירות יותר בין שלבי הראיון.', trigger_event: 'after_rejection' },
  { id: 'd4', overall_rating: 5, communication_rating: 5, process_rating: 5, would_recommend: true, feedback_text: null, trigger_event: 'after_hire' },
  { id: 'd5', overall_rating: 4, communication_rating: 4, process_rating: 3, would_recommend: true, feedback_text: 'תהליך טוב, השאלות בראיון היו רלוונטיות ומאתגרות.', trigger_event: 'after_interview' },
];

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

  const isDemo = surveys.length === 0;
  const displaySurveys = isDemo ? DEMO_SURVEYS : surveys;

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
      {isDemo && (
        <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600">
          ✨ {isHebrew ? 'נתוני דוגמה — סקרים אמיתיים יופיעו לאחר תהליכי גיוס' : 'Demo data — real surveys appear after recruitment processes'}
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
