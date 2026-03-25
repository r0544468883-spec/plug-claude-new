import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ChevronDown, ChevronUp, Sparkles, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

interface AssessmentResultsProps {
  assessmentId: string;
}

export function AssessmentResults({ assessmentId }: AssessmentResultsProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const [openSub, setOpenSub] = useState<string | null>(null);

  const { data: assessment } = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments' as any)
        .select('*')
        .eq('id', assessmentId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['assessment-submissions', assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_submissions' as any)
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('submitted_at', { ascending: false });
      if (error) throw error;

      // Fetch candidate profiles
      const ids = (data || []).map((s: any) => s.candidate_id);
      if (!ids.length) return data || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', ids);

      return (data || []).map((s: any) => ({
        ...s,
        profile: profiles?.find(p => p.user_id === s.candidate_id) || null,
      }));
    },
  });

  const aiScoreMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const sub = (submissions as any[]).find(s => s.id === submissionId);
      if (!sub || !assessment) return;

      const { data, error } = await supabase.functions.invoke('plug-chat', {
        body: {
          message: `Score these assessment answers (1-${assessment.questions?.reduce((a: number, q: any) => a + q.max_score, 0)} total) and give brief feedback for each:\n\nQuestions and answers:\n${(sub.answers || []).map((a: any, i: number) => `Q${i+1}: ${assessment.questions?.[i]?.question}\nA: ${a.answer}`).join('\n\n')}`,
          context: { role: 'recruiter' },
        },
      });
      if (error) throw error;

      const feedback = data?.response || '';
      const totalScore = assessment.questions?.reduce((acc: number, q: any) => acc + q.max_score, 0) || 10;
      const estimatedScore = Math.round((sub.answers?.filter((a: any) => a.answer?.length > 50).length / (sub.answers?.length || 1)) * totalScore);

      await supabase.from('assessment_submissions' as any)
        .update({ total_score: estimatedScore, ai_feedback: feedback })
        .eq('id', submissionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-submissions', assessmentId] });
      toast.success(isRTL ? 'הדירוג בוצע' : 'AI scoring complete');
    },
    onError: () => toast.error(isRTL ? 'שגיאה בדירוג' : 'Scoring failed'),
  });

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          {assessment?.title || (isRTL ? 'תוצאות מבחן' : 'Assessment Results')}
          <Badge variant="secondary">{(submissions as any[]).length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(submissions as any[]).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {isRTL ? 'אין הגשות עדיין' : 'No submissions yet'}
          </p>
        ) : (
          (submissions as any[]).map(sub => (
            <Collapsible key={sub.id} open={openSub === sub.id} onOpenChange={o => setOpenSub(o ? sub.id : null)}>
              <div className="border border-border rounded-lg overflow-hidden">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={sub.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {sub.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{sub.profile?.full_name || (isRTL ? 'מועמד' : 'Candidate')}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sub.submitted_at).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sub.total_score !== null && (
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {sub.total_score} {isRTL ? 'נק׳' : 'pts'}
                        </Badge>
                      )}
                      {openSub === sub.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    {(sub.answers || []).map((a: any, i: number) => (
                      <div key={i} className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {isRTL ? `שאלה ${i + 1}:` : `Q${i + 1}:`} {assessment?.questions?.[i]?.question}
                        </p>
                        <p className="text-sm bg-muted/40 rounded p-2">{a.answer || (isRTL ? '(ריק)' : '(empty)')}</p>
                      </div>
                    ))}
                    {sub.ai_feedback && (
                      <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {isRTL ? 'הערכת AI:' : 'AI Feedback:'}
                        </p>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{sub.ai_feedback}</p>
                      </div>
                    )}
                    {!sub.ai_feedback && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs h-7"
                        onClick={() => aiScoreMutation.mutate(sub.id)}
                        disabled={aiScoreMutation.isPending}
                      >
                        {aiScoreMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
                        {isRTL ? 'דרג עם AI' : 'Score with AI'}
                      </Button>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))
        )}
      </CardContent>
    </Card>
  );
}
