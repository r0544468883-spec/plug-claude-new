import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Search, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Question {
  id: string;
  question_text: string;
  is_required: boolean;
  correct_answer: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  questions: Question[];
  jobId: string;
  jobTitle: string;
  onPassed: () => void;
  onFailed: (failedOn: string) => void;
}

export function KnockoutQuestionsModal({ open, onClose, questions, jobId, jobTitle, onPassed, onFailed }: Props) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [submitting, setSubmitting] = useState(false);

  const allAnswered = questions.every(q => answers[q.id] !== undefined && answers[q.id] !== null);

  const handleSubmit = async () => {
    if (!allAnswered || !user) return;
    setSubmitting(true);

    try {
      const answersToInsert = questions.map(q => {
        const answer = answers[q.id] as boolean;
        const passed = answer === q.correct_answer;
        return { question_id: q.id, candidate_id: user.id, answer, passed };
      });

      const { error } = await supabase.from('knockout_answers').insert(answersToInsert as any);
      if (error) throw error;

      // Check if any required question failed
      const failedRequired = questions.find(q => {
        const answer = answers[q.id] as boolean;
        return q.is_required && answer !== q.correct_answer;
      });

      if (failedRequired) {
        const requirement = failedRequired.correct_answer
          ? failedRequired.question_text.replace('?', '')
          : `לא ${failedRequired.question_text.replace('?', '')}`;
        onFailed(requirement);
      } else {
        onPassed();
      }
    } catch {
      toast.error(isHebrew ? 'שגיאה בשמירת התשובות' : 'Failed to save answers');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            {isHebrew ? 'שאלות קצרות לפני ההגשה' : 'Quick Questions Before Applying'}
          </DialogTitle>
          <DialogDescription>
            {isHebrew
              ? `כמה שאלות קצרות לגבי ${jobTitle}`
              : `A few quick questions about ${jobTitle}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2" dir={isHebrew ? 'rtl' : 'ltr'}>
          {questions.map((q, idx) => (
            <div key={q.id} className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium text-muted-foreground mt-1 shrink-0">{idx + 1}.</span>
                <p className="text-sm font-medium">{q.question_text}</p>
                {q.is_required && (
                  <Badge variant="outline" className="shrink-0 text-xs border-primary/30 text-primary">
                    {isHebrew ? 'חובה' : 'Required'}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 ps-5">
                <Button
                  variant={answers[q.id] === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnswers(prev => ({ ...prev, [q.id]: true }))}
                  className="gap-1.5 flex-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isHebrew ? 'כן' : 'Yes'}
                </Button>
                <Button
                  variant={answers[q.id] === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnswers(prev => ({ ...prev, [q.id]: false }))}
                  className="gap-1.5 flex-1"
                >
                  <XCircle className="w-4 h-4" />
                  {isHebrew ? 'לא' : 'No'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {isHebrew ? 'ביטול' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="flex-1 gap-2"
          >
            {isHebrew ? 'המשך להגשה' : 'Continue to Apply'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RejectedModalProps {
  open: boolean;
  onClose: () => void;
  requirement: string;
  onSearchJobs: () => void;
}

export function KnockoutRejectedModal({ open, onClose, requirement, onSearchJobs }: RejectedModalProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md text-center">
        <div className="py-4 space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {isHebrew ? 'משרה זו לא מתאימה כרגע' : 'This position may not be a fit right now'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {isHebrew
                ? `המשרה דורשת ${requirement}. אולי משרות אחרות יתאימו לך יותר?`
                : `This role requires ${requirement}. Other positions might be a better match for you!`}
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={onClose}>
              {isHebrew ? 'סגור' : 'Close'}
            </Button>
            <Button onClick={onSearchJobs} className="gap-2">
              <Search className="w-4 h-4" />
              {isHebrew ? 'חפש משרות מתאימות' : 'Find Matching Jobs'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
