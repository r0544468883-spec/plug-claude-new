import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MessageSquare, ArrowRight, X, BellOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SendMessageDialog } from '@/components/messaging/SendMessageDialog';

interface StagnationAlertProps {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  daysSinceChange: number;
  snoozedUntil: string | null;
  currentStage: string;
  onAction?: () => void;
}

export function StagnationAlert({
  applicationId,
  candidateId,
  candidateName,
  daysSinceChange,
  snoozedUntil,
  currentStage,
  onAction,
}: StagnationAlertProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [open, setOpen] = useState(false);

  // Check if snoozed
  if (snoozedUntil && new Date(snoozedUntil) > new Date()) return null;
  if (daysSinceChange < 7) return null;

  const handleSnooze = async () => {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + 7);
    await supabase
      .from('applications')
      .update({ stagnation_snoozed_until: snoozeDate.toISOString() } as any)
      .eq('id', applicationId);
    toast.success(isHebrew ? 'ההתראה הושתקה ל-7 ימים' : 'Alert snoozed for 7 days');
    setOpen(false);
    onAction?.();
  };

  const handleReject = async () => {
    await supabase
      .from('applications')
      .update({ current_stage: 'rejected', status: 'rejected' })
      .eq('id', applicationId);
    toast.success(isHebrew ? 'המועמד סומן כנדחה' : 'Candidate marked as rejected');
    setOpen(false);
    onAction?.();
  };

  const handleNextStage = async () => {
    const stageOrder = ['applied', 'screening', 'interview', 'technical', 'task', 'offer', 'hired'];
    const currentIdx = stageOrder.indexOf(currentStage);
    const nextStage = currentIdx >= 0 && currentIdx < stageOrder.length - 1
      ? stageOrder[currentIdx + 1]
      : currentStage;
    await supabase
      .from('applications')
      .update({ current_stage: nextStage })
      .eq('id', applicationId);
    toast.success(isHebrew ? `הועבר לשלב: ${nextStage}` : `Moved to stage: ${nextStage}`);
    setOpen(false);
    onAction?.();
  };

  return (
    <>
      <Badge
        className="gap-1 cursor-pointer animate-pulse bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30"
        onClick={() => setOpen(true)}
      >
        <AlertTriangle className="w-3 h-3" />
        {isHebrew ? `${daysSinceChange} ימים ללא שינוי` : `Stagnant ${daysSinceChange}d`}
      </Badge>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {isHebrew ? 'מועמד לא פעיל' : 'Stagnant Candidate'}
            </DialogTitle>
            <DialogDescription>
              {isHebrew
                ? `${candidateName} לא התקדם כבר ${daysSinceChange} ימים. מה תרצה לעשות?`
                : `${candidateName} has been stagnant for ${daysSinceChange} days. What action would you like to take?`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <SendMessageDialog
              toUserId={candidateId}
              toUserName={candidateName}
              relatedApplicationId={applicationId}
              trigger={
                <Button variant="outline" className="w-full justify-start gap-3">
                  <MessageSquare className="w-4 h-4" />
                  {isHebrew ? 'שלח הודעה' : 'Send Message'}
                </Button>
              }
            />

            <Button variant="outline" className="w-full justify-start gap-3" onClick={handleNextStage}>
              <ArrowRight className="w-4 h-4" />
              {isHebrew ? 'קדם לשלב הבא' : 'Move to Next Stage'}
            </Button>

            <Button variant="outline" className="w-full justify-start gap-3 text-destructive hover:text-destructive" onClick={handleReject}>
              <X className="w-4 h-4" />
              {isHebrew ? 'דחה מועמד' : 'Reject Candidate'}
            </Button>

            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={handleSnooze}>
              <BellOff className="w-4 h-4" />
              {isHebrew ? 'השתק ל-7 ימים' : 'Snooze for 7 days'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
