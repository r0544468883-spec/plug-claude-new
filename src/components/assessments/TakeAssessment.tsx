import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Clock, ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react';

interface TakeAssessmentProps {
  assessmentId: string;
  onCompleted?: () => void;
}

export function TakeAssessment({ assessmentId, onCompleted }: TakeAssessmentProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  const { data: assessment, isLoading } = useQuery({
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

  // Check if already submitted
  const { data: existing } = useQuery({
    queryKey: ['assessment-submission', assessmentId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('assessment_submissions' as any)
        .select('id')
        .eq('assessment_id', assessmentId)
        .eq('candidate_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (assessment?.questions) {
      setAnswers(new Array(assessment.questions.length).fill(''));
    }
    if (assessment?.time_limit_minutes) {
      setTimeLeft(assessment.time_limit_minutes * 60);
    }
  }, [assessment]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t !== null && t <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return t !== null ? t - 1 : null;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft !== null && timeLeft > 0 ? true : false]);

  const handleSubmit = async () => {
    if (!user || !assessment) return;
    try {
      const { error } = await supabase.from('assessment_submissions' as any).insert({
        assessment_id: assessmentId,
        candidate_id: user.id,
        answers: answers.map((a, i) => ({ question_index: i, answer: a, score: null })),
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success(isRTL ? 'המבחן הוגש!' : 'Assessment submitted!');
      onCompleted?.();
    } catch {
      toast.error(isRTL ? 'שגיאה בהגשת המבחן' : 'Failed to submit');
    }
  };

  const submitMutation = useMutation({ mutationFn: handleSubmit });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!assessment) return null;
  if (existing || submitted) {
    return (
      <div className="text-center py-8 space-y-3">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <p className="font-medium">{isRTL ? 'המבחן הוגש בהצלחה!' : 'Assessment submitted successfully!'}</p>
        <p className="text-sm text-muted-foreground">{isRTL ? 'המגייס יחזור אליך עם תוצאות' : 'The recruiter will review and get back to you'}</p>
      </div>
    );
  }

  const questions: any[] = assessment.questions || [];
  const progressPct = ((currentQ + 1) / questions.length) * 100;
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">{assessment.title}</h2>
          {timeLeft !== null && (
          <Badge variant="outline" className={`gap-1 ${timeLeft < 300 ? 'border-destructive/40 text-destructive' : 'border-border'}`}>
              <Clock className="h-3 w-3" />
              {formatTime(timeLeft)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Progress value={progressPct} className="flex-1 h-2" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {currentQ + 1} / {questions.length}
          </span>
        </div>
      </div>

      {/* Question */}
      {questions[currentQ] && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/40 border border-border">
            <p className="font-medium text-sm leading-relaxed">
              {questions[currentQ].question}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {isRTL ? `ניקוד מקסימלי: ${questions[currentQ].max_score}` : `Max score: ${questions[currentQ].max_score}`}
            </p>
          </div>

          <Textarea
            value={answers[currentQ] || ''}
            onChange={e => {
              const updated = [...answers];
              updated[currentQ] = e.target.value;
              setAnswers(updated);
            }}
            placeholder={isRTL ? 'כתוב את תשובתך כאן...' : 'Write your answer here...'}
            className="min-h-[160px] resize-none"
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentQ(prev => prev - 1)}
          disabled={currentQ === 0}
          className="gap-1"
        >
          {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {isRTL ? 'הקודמת' : 'Previous'}
        </Button>

        {currentQ < questions.length - 1 ? (
          <Button
            size="sm"
            onClick={() => setCurrentQ(prev => prev + 1)}
            disabled={!answers[currentQ]?.trim()}
            className="gap-1"
          >
            {isRTL ? 'הבאה' : 'Next'}
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : (
          <Button
            size="sm"
            className="gap-1"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || answers.some(a => !a.trim())}
          >
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isRTL ? 'הגש מבחן' : 'Submit'}
          </Button>
        )}
      </div>
    </div>
  );
}
