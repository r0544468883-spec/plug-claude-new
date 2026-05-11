import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { XCircle, Mail, Loader2 } from 'lucide-react';

const REJECTION_REASONS = [
  { key: 'experience', labelHe: 'חוסר ניסיון רלוונטי', labelEn: 'Insufficient relevant experience' },
  { key: 'skills', labelHe: 'כישורים טכניים לא מתאימים', labelEn: 'Technical skills mismatch' },
  { key: 'culture', labelHe: 'התאמה תרבותית', labelEn: 'Culture fit' },
  { key: 'overqualified', labelHe: 'Overqualified', labelEn: 'Overqualified' },
  { key: 'salary', labelHe: 'ציפיות שכר', labelEn: 'Salary expectations' },
  { key: 'location', labelHe: 'מיקום גיאוגרפי', labelEn: 'Location mismatch' },
  { key: 'position_filled', labelHe: 'המשרה אוישה', labelEn: 'Position filled' },
  { key: 'other', labelHe: 'אחר', labelEn: 'Other' },
];

interface RejectCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  candidateName: string;
  candidateEmail?: string | null;
  jobTitle?: string;
  companyName?: string;
  onRejected: () => void;
}

export function RejectCandidateDialog({
  open,
  onOpenChange,
  applicationId,
  candidateName,
  candidateEmail,
  jobTitle,
  companyName,
  onRejected,
}: RejectCandidateDialogProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [personalNote, setPersonalNote] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleReject = async () => {
    setIsSaving(true);
    try {
      // Update application stage
      const { error } = await supabase
        .from('applications')
        .update({
          current_stage: 'rejected',
          status: 'rejected',
          rejection_reason: selectedReason || null,
          last_interaction: new Date().toISOString(),
          last_stage_change_at: new Date().toISOString(),
        } as any)
        .eq('id', applicationId);

      if (error) throw error;

      // Add timeline event
      await supabase.from('application_timeline').insert({
        application_id: applicationId,
        event_type: 'stage_change',
        old_value: 'active',
        new_value: 'rejected',
      });

      // Send rejection email if enabled
      if (sendEmail && candidateEmail) {
        const reasonLabel = REJECTION_REASONS.find(r => r.key === selectedReason);
        const reasonText = reasonLabel
          ? (isHebrew ? reasonLabel.labelHe : reasonLabel.labelEn)
          : '';

        const bodyHtml = isHebrew
          ? `<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.8;">
              <p>שלום ${candidateName},</p>
              <p>תודה על הגשת המועמדות שלך למשרת <strong>${jobTitle || ''}</strong>${companyName ? ` ב-<strong>${companyName}</strong>` : ''}.</p>
              <p>לאחר שקילה מדוקדקת, החלטנו לא להמשיך בתהליך הזה.</p>
              ${reasonText ? `<p>סיבה: ${reasonText}</p>` : ''}
              ${personalNote ? `<p>${personalNote}</p>` : ''}
              <p>אנו מאחלים לך הצלחה בהמשך חיפוש העבודה.</p>
              <p>בברכה</p>
            </div>`
          : `<div style="font-family: Arial, sans-serif; line-height: 1.8;">
              <p>Hi ${candidateName},</p>
              <p>Thank you for your application for the <strong>${jobTitle || ''}</strong> position${companyName ? ` at <strong>${companyName}</strong>` : ''}.</p>
              <p>After careful consideration, we've decided not to move forward at this time.</p>
              ${reasonText ? `<p>Reason: ${reasonText}</p>` : ''}
              ${personalNote ? `<p>${personalNote}</p>` : ''}
              <p>We wish you the best in your job search.</p>
              <p>Best regards</p>
            </div>`;

        try {
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;

          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-via-user`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({
                to: candidateEmail,
                subject: isHebrew
                  ? `עדכון לגבי המועמדות שלך - ${jobTitle || ''}`
                  : `Update regarding your application - ${jobTitle || ''}`,
                body_html: bodyHtml,
                application_id: applicationId,
              }),
            }
          );
        } catch (emailErr) {
          console.error('Rejection email failed:', emailErr);
        }
      }

      toast.success(isHebrew ? 'המועמד נדחה' : 'Candidate rejected');
      onRejected();
      onOpenChange(false);
      setSelectedReason(null);
      setPersonalNote('');
    } catch (err) {
      console.error(err);
      toast.error(isHebrew ? 'שגיאה' : 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            {isHebrew ? `דחיית ${candidateName}` : `Reject ${candidateName}`}
          </DialogTitle>
          <DialogDescription>
            {isHebrew
              ? 'בחר סיבת דחייה ובחר אם לשלוח מייל למועמד.'
              : 'Choose a rejection reason and whether to send an email to the candidate.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Reason Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {isHebrew ? 'סיבת דחייה' : 'Rejection Reason'}
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {REJECTION_REASONS.map(reason => (
                <Badge
                  key={reason.key}
                  variant={selectedReason === reason.key ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => setSelectedReason(
                    selectedReason === reason.key ? null : reason.key
                  )}
                >
                  {isHebrew ? reason.labelHe : reason.labelEn}
                </Badge>
              ))}
            </div>
          </div>

          {/* Personal Note */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {isHebrew ? 'הערה אישית (אופציונלי)' : 'Personal note (optional)'}
            </Label>
            <Textarea
              value={personalNote}
              onChange={e => setPersonalNote(e.target.value)}
              placeholder={isHebrew ? 'הוסף הערה אישית למייל...' : 'Add a personal note to the email...'}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Send Email Toggle */}
          {candidateEmail && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {isHebrew ? 'שלח מייל דחייה' : 'Send rejection email'}
                  </p>
                  <p className="text-xs text-muted-foreground">{candidateEmail}</p>
                </div>
              </div>
              <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {isHebrew ? 'ביטול' : 'Cancel'}
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            {isHebrew ? 'דחה מועמד' : 'Reject Candidate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
