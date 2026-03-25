import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface EasyApplyButtonProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  onApplied?: () => void;
  className?: string;
}

export function EasyApplyButton({ jobId, jobTitle, companyName, onApplied, className }: EasyApplyButtonProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const { percentage, missing, isComplete } = useProfileCompleteness();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [applying, setApplying] = useState(false);

  if (!user) return null;

  const handleApply = async () => {
    setApplying(true);
    try {
      const { error } = await supabase.from('applications').insert({
        job_id: jobId,
        candidate_id: user.id,
        apply_method: 'easy_apply',
        status: 'active',
        current_stage: 'applied',
      });
      if (error) throw error;
      setDone(true);
      toast.success(isHebrew ? 'הוגשת בהצלחה! ⚡' : 'Applied successfully! ⚡');
      setTimeout(() => { setOpen(false); onApplied?.(); }, 1500);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setApplying(false);
    }
  };

  if (!isComplete) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              disabled
              className={cn('gap-2 opacity-60 cursor-not-allowed', className)}
              variant="outline"
            >
              <Zap className="w-4 h-4" />
              {isHebrew ? 'הגש בלחיצה' : 'Easy Apply'}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-60 text-xs" dir={isHebrew ? 'rtl' : 'ltr'}>
          <p className="font-medium mb-1">{isHebrew ? 'השלם פרופיל להגשה מהירה' : 'Complete profile for Easy Apply'}</p>
          <p>{isHebrew ? `חסר: ${missing.join(', ')}` : `Missing: ${missing.join(', ')}`}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={cn('gap-2 bg-primary text-primary-foreground font-bold hover:bg-primary/90', className)}
      >
        <Zap className="w-4 h-4" />
        {isHebrew ? 'הגש בלחיצה' : 'Easy Apply'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={isHebrew ? 'rtl' : 'ltr'}>
          {done ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
              <h3 className="text-lg font-bold text-foreground">
                {isHebrew ? 'הוגש בהצלחה!' : 'Applied Successfully!'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {isHebrew ? `מועמדותך למשרת ${jobTitle} נשלחה` : `Your application for ${jobTitle} was sent`}
              </p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{isHebrew ? 'הגשת מועמדות מהירה' : 'Easy Apply'}</DialogTitle>
                <DialogDescription className="pt-2">
                  {isHebrew
                    ? `הגשת מועמדות למשרת "${jobTitle}" ב-${companyName}. קורות החיים והפרופיל שלך יישלחו.`
                    : `Applying for "${jobTitle}" at ${companyName}. Your CV and profile will be sent.`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 mt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {isHebrew ? 'ביטול' : 'Cancel'}
                </Button>
                <Button onClick={handleApply} disabled={applying} className="bg-primary text-primary-foreground gap-2">
                  <Zap className="w-4 h-4" />
                  {applying ? (isHebrew ? 'שולח...' : 'Sending...') : (isHebrew ? 'אשר הגשה' : 'Confirm')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
