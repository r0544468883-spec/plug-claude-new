import { useState } from 'react';
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

interface RejectionFeedbackDialogProps {
  applicationId: string;
  open: boolean;
  onClose: () => void;
}

const REASONS = [
  { value: 'no_feedback',     he: 'אין פידבק מהמעסיק',  en: 'No feedback received' },
  { value: 'overqualified',   he: 'Overqualified',       en: 'Overqualified' },
  { value: 'skills_mismatch', he: 'חוסר כישורים',       en: 'Skills mismatch' },
  { value: 'timing',          he: 'תזמון / קפאון גיוס', en: 'Timing / hiring freeze' },
  { value: 'other',           he: 'אחר',                 en: 'Other' },
];

export function RejectionFeedbackDialog({ applicationId, open, onClose }: RejectionFeedbackDialogProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [selected, setSelected] = useState('no_feedback');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('applications')
      .update({ rejection_reason: selected } as any)
      .eq('id', applicationId);

    setSaving(false);
    if (!error) {
      toast.success(isHebrew ? 'הפידבק נשמר' : 'Feedback saved');
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{isHebrew ? 'מה הסיבה לדחייה?' : 'Why were you rejected?'}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {isHebrew
              ? 'זה יעזור לנו לנתח patterns ולשפר את הסיכויים שלך'
              : 'This helps us analyze patterns and improve your chances'}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={selected} onValueChange={setSelected} className="gap-3 mt-2">
          {REASONS.map((r) => (
            <div key={r.value} className="flex items-center gap-3 cursor-pointer">
              <RadioGroupItem value={r.value} id={r.value} />
              <Label htmlFor={r.value} className="cursor-pointer text-sm font-normal">
                {isHebrew ? r.he : r.en}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {isHebrew ? 'דלג' : 'Skip'}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {isHebrew ? 'שמור' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
