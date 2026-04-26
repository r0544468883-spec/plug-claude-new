import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Lightbulb, TrendingUp } from 'lucide-react';

interface RejectionFeedbackDialogProps {
  applicationId: string;
  open: boolean;
  onClose: () => void;
}

const REASONS = [
  { value: 'no_feedback',     he: 'אין פידבק מהמעסיק',  en: 'No feedback received' },
  { value: 'overqualified',   he: 'Overqualified',       en: 'Overqualified' },
  { value: 'skills_mismatch', he: 'חוסר כישורים',       en: 'Skills mismatch' },
  { value: 'salary',          he: 'ציפיות שכר',          en: 'Salary expectations' },
  { value: 'timing',          he: 'תזמון / קפאון גיוס', en: 'Timing / hiring freeze' },
  { value: 'culture_fit',     he: 'התאמה תרבותית',       en: 'Culture fit' },
  { value: 'other',           he: 'אחר',                 en: 'Other' },
];

const INSIGHTS: Record<string, { he: string; en: string }> = {
  no_feedback:     { he: 'פנה שוב בעוד שבוע עם שאלה ספציפית — זה מגדיל פידבק ב-40%', en: 'Follow up in a week with a specific question — increases response rate 40%' },
  overqualified:   { he: 'שקול להדגיש מוטיבציה ספציפית לחברה בכתב — "למה כאן ולמה עכשיו"', en: 'Emphasize your specific motivation for this company — "why here, why now"' },
  skills_mismatch: { he: 'הוסף 1-2 פרויקטים שמדגימים את הכישורים החסרים — אפילו side projects', en: 'Add 1-2 projects showing the missing skills — side projects count' },
  salary:          { he: 'תחקור טווח שכר לפני הראיון הבא — Glassdoor + LinkedIn Salary', en: 'Research salary range before the next interview — Glassdoor + LinkedIn Salary' },
  timing:          { he: 'בקש להישאר בטאלנט פול — חברות מגייסות שוב תוך 3-6 חודשים', en: 'Ask to stay in the talent pool — companies re-hire within 3-6 months' },
  culture_fit:     { he: 'בראיון הבא שאל יותר על ערכי החברה — הראה שעשית מחקר', en: 'In your next interview, ask more about company values — show you did research' },
  other:           { he: 'נתח את ה-CV שלך מול דרישות המשרה — לפני הגשה הבאה', en: 'Analyze your CV against job requirements — before next application' },
};

export function RejectionFeedbackDialog({ applicationId, open, onClose }: RejectionFeedbackDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [selected, setSelected] = useState('no_feedback');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rejectionCount, setRejectionCount] = useState<number | null>(null);

  // Fetch total rejection count for this user
  useEffect(() => {
    if (!user || !open) return;
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('candidate_id', user.id)
      .eq('current_stage', 'rejected')
      .then(({ count }) => setRejectionCount(count ?? 0));
  }, [user, open]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('applications')
      .update({ rejection_reason: selected, notes: notes || undefined } as any)
      .eq('id', applicationId);

    setSaving(false);
    if (!error) {
      setSaved(true);
    } else {
      toast.error(isHebrew ? 'שגיאה בשמירה' : 'Error saving');
    }
  };

  const insight = INSIGHTS[selected];

  if (saved) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) { setSaved(false); onClose(); } }}>
        <DialogContent className="max-w-md z-[200]" dir={isHebrew ? 'rtl' : 'ltr'}>
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Lightbulb className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold mb-1">{isHebrew ? 'הפידבק נשמר ✓' : 'Feedback saved ✓'}</p>
              {rejectionCount !== null && rejectionCount > 1 && (
                <p className="text-xs text-muted-foreground mb-3 flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {isHebrew ? `${rejectionCount} דחיות מתועדות סה"כ` : `${rejectionCount} rejections tracked total`}
                </p>
              )}
              <div className={cn(
                'text-sm rounded-xl p-3 border',
                'bg-primary/5 border-primary/20 text-start'
              )}>
                <p className="text-xs font-semibold text-primary mb-1">{isHebrew ? '💡 טיפ' : '💡 Tip'}</p>
                <p className="text-xs leading-relaxed text-foreground/80">
                  {isHebrew ? insight.he : insight.en}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              <Button size="sm" variant="outline" onClick={() => { setSaved(false); onClose(); }}>
                {isHebrew ? 'סגור' : 'Close'}
              </Button>
              <Button size="sm" onClick={() => {
                setSaved(false);
                onClose();
                window.dispatchEvent(new CustomEvent('plug:navigate', { detail: 'plug-chat' }));
              }}>
                {isHebrew ? 'שאל את PLUG AI' : 'Ask PLUG AI'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md z-[200]" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{isHebrew ? 'מה הסיבה לדחייה?' : 'Why were you rejected?'}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {isHebrew
              ? 'זה יעזור לנו לנתח patterns ולשפר את הסיכויים שלך'
              : 'This helps us analyze patterns and improve your chances'}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={selected} onValueChange={setSelected} className="gap-2.5 mt-2">
          {REASONS.map((r) => (
            <div
              key={r.value}
              onClick={() => setSelected(r.value)}
              className={cn(
                'flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg border transition-colors',
                selected === r.value
                  ? 'bg-primary/5 border-primary/30'
                  : 'border-transparent hover:bg-muted/50'
              )}
            >
              <RadioGroupItem value={r.value} id={r.value} />
              <Label htmlFor={r.value} className="cursor-pointer text-sm font-normal">
                {isHebrew ? r.he : r.en}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="mt-3">
          <Textarea
            placeholder={isHebrew ? 'פרטים נוספים (אופציונלי)...' : 'Additional notes (optional)...'}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="text-xs resize-none h-16"
          />
        </div>

        <div className="flex gap-2 mt-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {isHebrew ? 'דלג' : 'Skip'}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {isHebrew ? 'שמור וקבל טיפ' : 'Save & Get Tip'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
