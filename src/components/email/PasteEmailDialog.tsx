import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Inbox, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface PasteEmailDialogProps {
  applicationId: string;
  trigger?: React.ReactNode;
}

const CLASSIFICATION_LABELS: Record<string, { he: string; en: string }> = {
  interview_invitation: { he: 'הזמנה לראיון', en: 'Interview Invitation' },
  rejection: { he: 'דחייה', en: 'Rejection' },
  offer: { he: 'הצעת עבודה', en: 'Job Offer' },
  task_assignment: { he: 'מטלת בית', en: 'Home Assignment' },
  follow_up: { he: 'מעקב', en: 'Follow-up' },
  acknowledgment: { he: 'אישור קבלה', en: 'Acknowledgment' },
  info_request: { he: 'בקשת מידע', en: 'Info Request' },
  general: { he: 'כללי', en: 'General' },
};

export function PasteEmailDialog({ applicationId, trigger }: PasteEmailDialogProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [classifying, setClassifying] = useState(false);
  const [result, setResult] = useState<{
    classification: string;
    confidence: number;
    suggestion: string | null;
    stage_updated: boolean;
    new_stage: string | null;
  } | null>(null);

  const handleClassify = async () => {
    if (!subject && !body) {
      toast.error(isHebrew ? 'נא להדביק נושא או תוכן המייל' : 'Please paste subject or body');
      return;
    }

    setClassifying(true);
    setResult(null);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      // First save the email
      const { data: savedEmail, error: saveErr } = await (supabase as any)
        .from('application_emails')
        .insert({
          application_id: applicationId,
          user_id: user?.id,
          direction: 'received',
          from_email: fromEmail || 'unknown@email.com',
          to_email: user?.email || '',
          subject,
          body_text: body,
          body_html: body,
        })
        .select('id')
        .single();

      if (saveErr) throw saveErr;

      // Classify
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classify-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email_id: savedEmail.id,
            subject,
            body_text: body,
            application_id: applicationId,
            auto_update: true,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Classification failed');

      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['application-emails', applicationId] });

      if (data.stage_updated) {
        toast.success(
          isHebrew
            ? `שלב המשרה עודכן אוטומטית ל: ${data.new_stage}`
            : `Application stage auto-updated to: ${data.new_stage}`
        );
      }
    } catch (err: any) {
      toast.error(err.message || (isHebrew ? 'שגיאה בסיווג' : 'Classification error'));
    } finally {
      setClassifying(false);
    }
  };

  const handleConfirmSuggestion = async () => {
    if (!result?.suggestion) return;
    try {
      await supabase
        .from('applications')
        .update({
          current_stage: result.suggestion,
          last_interaction: new Date().toISOString(),
        })
        .eq('id', applicationId);

      toast.success(isHebrew ? 'השלב עודכן!' : 'Stage updated!');
      queryClient.invalidateQueries({ queryKey: ['application-emails', applicationId] });
    } catch {
      toast.error(isHebrew ? 'שגיאה בעדכון' : 'Update error');
    }
  };

  const reset = () => {
    setSubject('');
    setBody('');
    setFromEmail('');
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Inbox className="h-4 w-4" />
            {isHebrew ? 'הדבק מייל' : 'Paste Email'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            {isHebrew ? 'הדבק מייל לסיווג' : 'Paste Email for Classification'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isHebrew
              ? 'הדבק את תוכן המייל שקיבלת — המערכת תסווג אותו אוטומטית ותעדכן את שלב המשרה'
              : 'Paste the email you received — the system will classify it and update the application stage'}
          </p>

          {/* From Email */}
          <div className="space-y-1">
            <Label>{isHebrew ? 'מאת (כתובת השולח)' : 'From (sender email)'}</Label>
            <Input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="recruiter@company.com"
              dir="ltr"
            />
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <Label>{isHebrew ? 'נושא' : 'Subject'}</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={isHebrew ? 'נושא המייל...' : 'Email subject...'}
            />
          </div>

          {/* Body */}
          <div className="space-y-1">
            <Label>{isHebrew ? 'תוכן המייל' : 'Email content'}</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={isHebrew ? 'הדבק את תוכן המייל כאן...' : 'Paste email content here...'}
              className="min-h-[150px] resize-none"
            />
          </div>

          {/* Classification Result */}
          {result && (
            <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">
                  {isHebrew ? 'תוצאת סיווג:' : 'Classification:'}
                </span>
                <Badge>
                  {isHebrew
                    ? CLASSIFICATION_LABELS[result.classification]?.he
                    : CLASSIFICATION_LABELS[result.classification]?.en}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ({Math.round(result.confidence * 100)}%)
                </span>
              </div>

              {result.stage_updated && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  {isHebrew
                    ? `שלב המשרה עודכן אוטומטית ל: ${result.new_stage}`
                    : `Stage auto-updated to: ${result.new_stage}`}
                </div>
              )}

              {result.suggestion && !result.stage_updated && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {isHebrew ? 'הצעה: עדכן ל-' : 'Suggestion: update to '}
                    <strong>{result.suggestion}</strong>?
                  </span>
                  <Button size="sm" variant="outline" onClick={handleConfirmSuggestion}>
                    {isHebrew ? 'עדכן' : 'Update'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {isHebrew ? 'סגור' : 'Close'}
            </Button>
            <Button
              onClick={handleClassify}
              disabled={classifying || (!subject && !body)}
            >
              {classifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isHebrew ? 'סווג מייל' : 'Classify Email'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
