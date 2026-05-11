import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface KnockoutAnswersViewProps {
  applicationId: string;
  candidateId: string;
  jobId: string;
}

export function KnockoutAnswersView({ applicationId, candidateId, jobId }: KnockoutAnswersViewProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const { data, isLoading } = useQuery({
    queryKey: ['knockout-answers', candidateId, jobId],
    queryFn: async () => {
      // Get questions for this job
      const { data: questions } = await (supabase as any)
        .from('knockout_questions')
        .select('id, question_text, question_order, correct_answer, is_required')
        .eq('job_id', jobId)
        .order('question_order');

      if (!questions || questions.length === 0) return null;

      // Get candidate answers
      const questionIds = questions.map((q: any) => q.id);
      const { data: answers } = await (supabase as any)
        .from('knockout_answers')
        .select('question_id, answer, passed')
        .eq('candidate_id', candidateId)
        .in('question_id', questionIds);

      const answerMap = new Map((answers || []).map((a: any) => [a.question_id, a]));

      return questions.map((q: any) => {
        const answer = answerMap.get(q.id);
        return {
          ...q,
          candidateAnswer: answer?.answer ?? null,
          passed: answer?.passed ?? null,
        };
      });
    },
    enabled: !!candidateId && !!jobId,
  });

  if (isLoading) return <Skeleton className="h-16 rounded-lg" />;
  if (!data || data.length === 0) return null;

  const totalPassed = data.filter((q: any) => q.passed === true).length;
  const totalFailed = data.filter((q: any) => q.passed === false).length;
  const totalUnanswered = data.filter((q: any) => q.candidateAnswer === null).length;

  return (
    <div className="space-y-2" dir={isHebrew ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-primary" />
          {isHebrew ? 'שאלות סינון' : 'Screening Questions'}
        </h4>
        <div className="flex items-center gap-2">
          {totalPassed > 0 && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
              <CheckCircle2 className="w-3 h-3" />{totalPassed}
            </Badge>
          )}
          {totalFailed > 0 && (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="w-3 h-3" />{totalFailed}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {data.map((q: any, i: number) => (
          <div
            key={q.id}
            className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
              q.passed === true
                ? 'bg-green-500/5 border border-green-500/15'
                : q.passed === false
                  ? 'bg-red-500/5 border border-red-500/15'
                  : 'bg-muted/30 border border-border'
            }`}
          >
            {q.passed === true ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            ) : q.passed === false ? (
              <XCircle className="w-4 h-4 text-red-500 shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
            )}
            <span className="flex-1 text-foreground/80">{q.question_text}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {q.candidateAnswer === null
                ? (isHebrew ? 'לא ענה' : 'No answer')
                : q.candidateAnswer
                  ? (isHebrew ? 'כן' : 'Yes')
                  : (isHebrew ? 'לא' : 'No')
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
