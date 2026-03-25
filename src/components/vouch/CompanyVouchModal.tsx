import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCredits } from '@/contexts/CreditsContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Star, Loader2, Fuel, Building2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyVouchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  companyId: string;
  companyName: string;
  triggerType: 'time_based' | 'stage_change' | 'completion';
  triggerStage?: string;
  onComplete?: () => void;
}

const CREDIT_REWARDS = {
  completion: 50,
  stage_change: 10,
  time_based: 10,
};

type ProcessOutcome = 'hired' | 'rejected' | 'ghosted' | 'withdrew' | 'ongoing';

interface YesNoAnswer {
  yes: boolean | null;
}

export function CompanyVouchModal({
  open,
  onOpenChange,
  applicationId,
  companyId,
  companyName,
  triggerType,
  triggerStage,
  onComplete,
}: CompanyVouchModalProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { refreshCredits } = useCredits();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';

  // Yes/No questions state
  const [answers, setAnswers] = useState({
    responded_after_interview: null as boolean | null,
    reasonable_assignment: null as boolean | null,
    responded_after_assignment: null as boolean | null,
    clear_process: null as boolean | null,
    respectful_communication: null as boolean | null,
  });
  
  const [outcome, setOutcome] = useState<ProcessOutcome | ''>('');
  const [feedback, setFeedback] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  const creditsReward = CREDIT_REWARDS[triggerType];

  // Calculate scores from yes/no answers
  const calculateScores = () => {
    const yesCount = Object.values(answers).filter(v => v === true).length;
    const answeredCount = Object.values(answers).filter(v => v !== null).length;
    
    if (answeredCount === 0) return { communication: null, process_speed: null, transparency: null, overall: null };
    
    // Convert to 1-5 scale based on yes ratio
    const ratio = yesCount / answeredCount;
    const score = Math.round(ratio * 4) + 1; // 1-5 scale
    
    return {
      communication: answers.respectful_communication !== null ? (answers.respectful_communication ? 5 : 2) : null,
      process_speed: answers.responded_after_interview !== null || answers.responded_after_assignment !== null
        ? ((answers.responded_after_interview === true ? 2.5 : 0) + (answers.responded_after_assignment === true ? 2.5 : 0)) || 2
        : null,
      transparency: answers.clear_process !== null ? (answers.clear_process ? 5 : 2) : null,
      overall: score,
    };
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const scores = calculateScores();

      // Submit the company vouch
      // First try to find existing vouch
      const { data: existingVouch } = await supabase
        .from('company_vouches')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .eq('application_id', applicationId)
        .maybeSingle();

      const vouchData = {
        user_id: user.id,
        company_id: companyId,
        application_id: applicationId,
        communication_rating: scores.communication ? Math.round(scores.communication) : null,
        process_speed_rating: scores.process_speed ? Math.round(scores.process_speed) : null,
        transparency_rating: scores.transparency ? Math.round(scores.transparency) : null,
        overall_rating: scores.overall,
        process_outcome: outcome || null,
        feedback_text: feedback || null,
        would_recommend: wouldRecommend,
        updated_at: new Date().toISOString(),
      };

      let vouchError;
      if (existingVouch) {
        const { error } = await supabase
          .from('company_vouches')
          .update(vouchData)
          .eq('id', existingVouch.id);
        vouchError = error;
      } else {
        const { error } = await supabase
          .from('company_vouches')
          .insert(vouchData);
        vouchError = error;
      }

      if (vouchError) throw vouchError;

      // Mark the prompt as completed and award credits
      const { data: existingPrompt } = await supabase
        .from('company_vouch_prompts')
        .select('id')
        .eq('user_id', user.id)
        .eq('application_id', applicationId)
        .eq('trigger_type', triggerType)
        .eq('trigger_stage', triggerStage || '')
        .maybeSingle();

      const promptData = {
        user_id: user.id,
        application_id: applicationId,
        company_id: companyId,
        trigger_type: triggerType,
        trigger_stage: triggerStage,
        vouch_completed: true,
        vouch_completed_at: new Date().toISOString(),
        credits_awarded: creditsReward,
      };

      let promptError;
      if (existingPrompt) {
        const { error } = await supabase
          .from('company_vouch_prompts')
          .update(promptData)
          .eq('id', existingPrompt.id);
        promptError = error;
      } else {
        const { error } = await supabase
          .from('company_vouch_prompts')
          .insert(promptData);
        promptError = error;
      }

      if (promptError) throw promptError;

      // Award credits via edge function
      const { error: creditError } = await supabase.functions.invoke('award-credits', {
        body: {
          userId: user.id,
          amount: creditsReward,
          creditType: 'permanent',
          actionType: 'company_vouch',
          description: `Company vouch for ${companyName}`,
        },
      });

      if (creditError) throw creditError;
    },
    onSuccess: () => {
      toast.success(
        isHebrew 
          ? `תודה! קיבלת +${creditsReward} דלק קבוע 🚀` 
          : `Thanks! You earned +${creditsReward} Permanent Fuel 🚀`
      );
      refreshCredits();
      queryClient.invalidateQueries({ queryKey: ['company-vouch-prompts'] });
      queryClient.invalidateQueries({ queryKey: ['company-ratings'] });
      onComplete?.();
      onOpenChange(false);
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בשליחה' : 'Failed to submit');
    },
  });

  const handleDismiss = async () => {
    if (!user?.id) return;

    try {
      const { data: existingPrompt } = await supabase
        .from('company_vouch_prompts')
        .select('id')
        .eq('user_id', user.id)
        .eq('application_id', applicationId)
        .eq('trigger_type', triggerType)
        .eq('trigger_stage', triggerStage || '')
        .maybeSingle();

      if (existingPrompt) {
        await supabase
          .from('company_vouch_prompts')
          .update({ dismissed: true })
          .eq('id', existingPrompt.id);
      } else {
        await supabase
          .from('company_vouch_prompts')
          .insert({
            user_id: user.id,
            application_id: applicationId,
            company_id: companyId,
            trigger_type: triggerType,
            trigger_stage: triggerStage,
            dismissed: true,
          });
      }
    } catch (error) {
      console.error('Failed to dismiss prompt:', error);
    }

    onOpenChange(false);
  };

  // Yes/No Question Component
  const YesNoQuestion = ({ 
    questionKey,
    questionHe,
    questionEn,
  }: { 
    questionKey: keyof typeof answers;
    questionHe: string;
    questionEn: string;
  }) => {
    const value = answers[questionKey];
    
    return (
      <div className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
        <p className="text-sm flex-1">{isHebrew ? questionHe : questionEn}</p>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={value === true ? 'default' : 'outline'}
            className={cn(
              'h-8 w-8 p-0',
              value === true && 'bg-green-600 hover:bg-green-700'
            )}
            onClick={() => setAnswers(a => ({ ...a, [questionKey]: true }))}
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={value === false ? 'destructive' : 'outline'}
            className="h-8 w-8 p-0"
            onClick={() => setAnswers(a => ({ ...a, [questionKey]: false }))}
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const outcomeOptions: { value: ProcessOutcome; label: string; labelHe: string }[] = [
    { value: 'hired', label: 'Got hired! 🎉', labelHe: 'התקבלתי! 🎉' },
    { value: 'rejected', label: 'Rejected', labelHe: 'נדחיתי' },
    { value: 'ghosted', label: 'Ghosted 👻', labelHe: 'גוסטינג 👻' },
    { value: 'withdrew', label: 'I withdrew', labelHe: 'פרשתי' },
    { value: 'ongoing', label: 'Still ongoing', labelHe: 'עדיין בתהליך' },
  ];

  // At least one question answered
  const isValid = Object.values(answers).some(v => v !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {isHebrew 
              ? `איך התהליך ב-${companyName}?` 
              : `How was the process at ${companyName}?`}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-accent font-medium">
            <Fuel className="h-4 w-4" />
            {isHebrew 
              ? `שתף וקבל +${creditsReward} דלק קבוע!` 
              : `Share and earn +${creditsReward} Permanent Fuel!`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4" dir={isHebrew ? 'rtl' : 'ltr'}>
          {/* Yes/No Questions */}
          <div className="space-y-1 bg-muted/30 rounded-lg p-3">
            <YesNoQuestion
              questionKey="responded_after_interview"
              questionHe="האם חזרו אליך לאחר הראיון?"
              questionEn="Did they respond after the interview?"
            />
            <YesNoQuestion
              questionKey="reasonable_assignment"
              questionHe="האם מטלת הבית היתה סבירה בהתאם לדרישות המשרה?"
              questionEn="Was the assignment reasonable for the position?"
            />
            <YesNoQuestion
              questionKey="responded_after_assignment"
              questionHe="האם חזרו אליך לאחר מטלת הבית?"
              questionEn="Did they respond after the home assignment?"
            />
            <YesNoQuestion
              questionKey="clear_process"
              questionHe="האם התהליך היה ברור ושקוף?"
              questionEn="Was the process clear and transparent?"
            />
            <YesNoQuestion
              questionKey="respectful_communication"
              questionHe="האם התקשורת היתה מכבדת ומקצועית?"
              questionEn="Was communication respectful and professional?"
            />
          </div>

          {/* Process Outcome */}
          <div className="space-y-2">
            <Label>{isHebrew ? 'איך הסתיים התהליך?' : 'How did it end?'}</Label>
            <div className="flex flex-wrap gap-2">
              {outcomeOptions.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={outcome === opt.value ? 'default' : 'outline'}
                  onClick={() => setOutcome(opt.value)}
                  className="text-xs"
                >
                  {isHebrew ? opt.labelHe : opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Would Recommend */}
          <div className="space-y-2">
            <Label>{isHebrew ? 'האם תמליץ על החברה לחברים?' : 'Would you recommend this company to friends?'}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={wouldRecommend === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setWouldRecommend(true)}
                className={cn(wouldRecommend === true && 'bg-green-600 hover:bg-green-700')}
              >
                {isHebrew ? 'כן 👍' : 'Yes 👍'}
              </Button>
              <Button
                type="button"
                variant={wouldRecommend === false ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setWouldRecommend(false)}
              >
                {isHebrew ? 'לא 👎' : 'No 👎'}
              </Button>
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <Label>{isHebrew ? 'משהו נוסף? (אופציונלי)' : 'Anything else? (optional)'}</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={isHebrew ? 'שתף את החוויה שלך...' : 'Share your experience...'}
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Disclaimer */}
          <div className="flex gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <Star className="h-4 w-4 flex-shrink-0 text-accent" />
            <p>
              {isHebrew 
                ? '(*) חשוב לדעת: ה-VOUCH לחברות הוא אנונימי לחלוטין. אנו מצפים מקהילת PLUG לא לעשות שימוש לרעה במערכת, אלא לייצר שקיפות אמיתית שתעזור לכולנו למנוע תופעות כמו גוסטינג ולייעל את תהליכי הגיוס.'
                : '(*) Important: Company VOUCHes are completely anonymous. We expect the PLUG community not to abuse this system, but to create real transparency that helps us all prevent issues like ghosting and improve hiring processes.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={handleDismiss}>
              {isHebrew ? 'לא עכשיו' : 'Not now'}
            </Button>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!isValid || submitMutation.isPending}
              className="gap-2"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Fuel className="h-4 w-4" />
              )}
              {isHebrew ? `שלח וקבל +${creditsReward}` : `Submit & Earn +${creditsReward}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
