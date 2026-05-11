import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { XCircle, Mail, Loader2, Eye, Edit3 } from 'lucide-react';

// Each reason has an empathetic email paragraph (not a generic one-liner)
const REJECTION_REASONS = [
  {
    key: 'experience',
    labelHe: 'חוסר ניסיון רלוונטי',
    labelEn: 'Insufficient relevant experience',
    emailHe: 'אנחנו מחפשים כרגע מישהו עם ניסיון ישיר יותר בתחום הספציפי הזה. זה לא אומר שאתה לא מוכשר — זה פשוט עניין של התאמה לצורך הנוכחי. אנחנו ממליצים להמשיך לצבור ניסיון בתחום, ונשמח לראות מועמדות שלך שוב בעתיד.',
    emailEn: 'We\'re currently looking for someone with more direct experience in this specific area. This doesn\'t reflect on your talent — it\'s simply about the fit for our current needs. We encourage you to keep building your experience, and we\'d love to see your application again in the future.',
  },
  {
    key: 'skills',
    labelHe: 'כישורים טכניים לא מתאימים',
    labelEn: 'Technical skills mismatch',
    emailHe: 'לאחר בחינה של הדרישות הטכניות של המשרה, הרגשנו שיש פער בין הכלים והטכנולוגיות שהמשרה דורשת לבין הניסיון שלך כרגע. זה דבר שניתן לגשר עליו עם לימוד ופרקטיקה, ואנחנו בהחלט מעודדים אותך להמשיך להתפתח.',
    emailEn: 'After reviewing the technical requirements for this role, we felt there\'s a gap between the tools and technologies required and your current experience. This is something that can be bridged with learning and practice, and we absolutely encourage you to keep growing.',
  },
  {
    key: 'culture',
    labelHe: 'התאמה תרבותית',
    labelEn: 'Culture fit',
    emailHe: 'חיפשנו מישהו שמתאים באופן ספציפי לאופי הצוות ולסגנון העבודה שלנו. זה לא אומר שום דבר שלילי עליך — כל צוות הוא שונה, ואנחנו בטוחים שתמצא סביבה שתתאים לך בדיוק.',
    emailEn: 'We were looking for someone who specifically matches our team dynamics and work style. This says nothing negative about you — every team is different, and we\'re confident you\'ll find an environment that\'s a perfect fit.',
  },
  {
    key: 'overqualified',
    labelHe: 'Overqualified',
    labelEn: 'Overqualified',
    emailHe: 'הניסיון והיכולות שלך מרשימים מאוד, ובעצם הם מעבר למה שהמשרה הזו דורשת. חששנו שלא נוכל להציע לך את האתגר וההתפתחות שמגיעים לך. אנחנו ממליצים לחפש משרה ברמה שתתאים יותר לכישרונות שלך.',
    emailEn: 'Your experience and skills are truly impressive — in fact, they go beyond what this role requires. We were concerned we wouldn\'t be able to offer you the challenge and growth you deserve. We recommend looking for a position that better matches your level of talent.',
  },
  {
    key: 'salary',
    labelHe: 'ציפיות שכר',
    labelEn: 'Salary expectations',
    emailHe: 'לצערנו, יש פער בין ציפיות השכר שלך לבין התקציב שהוגדר למשרה הזו. אנחנו מעריכים את הערך שלך ומבינים שהציפיות שלך לגיטימיות — פשוט לא יכולנו להגיע למספרים שמתאימים לשני הצדדים.',
    emailEn: 'Unfortunately, there\'s a gap between your salary expectations and the budget allocated for this position. We appreciate your value and understand your expectations are legitimate — we simply couldn\'t reach numbers that work for both sides.',
  },
  {
    key: 'location',
    labelHe: 'מיקום גיאוגרפי',
    labelEn: 'Location mismatch',
    emailHe: 'המשרה דורשת נוכחות פיזית שלא תואמת את המיקום שלך כרגע. אם בעתיד יהיה שינוי — מצדך או מצדנו — נשמח מאוד לחזור ולשוחח.',
    emailEn: 'This role requires physical presence that doesn\'t align with your current location. If things change in the future — on your end or ours — we\'d be happy to reconnect.',
  },
  {
    key: 'position_filled',
    labelHe: 'המשרה אוישה',
    labelEn: 'Position filled',
    emailHe: 'המשרה אוישה כבר, אבל רצינו שתדע שהמועמדות שלך הרשימה אותנו. אנחנו שומרים את הפרטים שלך ונשמח ליצור קשר כשתיפתח משרה מתאימה.',
    emailEn: 'The position has been filled, but we want you to know that your application impressed us. We\'re keeping your details on file and would love to reach out when a suitable opening comes up.',
  },
  {
    key: 'other',
    labelHe: 'אחר',
    labelEn: 'Other',
    emailHe: '',
    emailEn: '',
  },
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
  const isHebrew = language === 'he';

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [personalNote, setPersonalNote] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'preview'>('compose');

  const reason = REJECTION_REASONS.find(r => r.key === selectedReason);

  // Build the full email body for preview
  const emailBody = useMemo(() => {
    const reasonParagraph = reason
      ? (isHebrew ? reason.emailHe : reason.emailEn)
      : '';

    if (isHebrew) {
      return [
        `שלום ${candidateName},`,
        '',
        `קודם כל, תודה שהקדשת מזמנך להגיש מועמדות למשרת ${jobTitle || 'המשרה'}${companyName ? ` ב-${companyName}` : ''}. אנחנו מעריכים את זה מאוד.`,
        '',
        `אחרי שעברנו על המועמדות שלך בקפידה, החלטנו שלא נמשיך בתהליך הזה.`,
        reasonParagraph ? '' : null,
        reasonParagraph || null,
        personalNote ? '' : null,
        personalNote || null,
        '',
        `אנחנו מאחלים לך המון הצלחה בהמשך — אנחנו בטוחים שהמקום הנכון מחכה לך.`,
        '',
        `בהצלחה,`,
      ].filter(line => line !== null).join('\n');
    }
    return [
      `Hi ${candidateName},`,
      '',
      `First of all, thank you for taking the time to apply for the ${jobTitle || 'position'}${companyName ? ` at ${companyName}` : ''} role. We truly appreciate it.`,
      '',
      `After carefully reviewing your application, we've decided not to move forward with this process.`,
      reasonParagraph ? '' : null,
      reasonParagraph || null,
      personalNote ? '' : null,
      personalNote || null,
      '',
      `We wish you all the best moving forward — we're sure the right opportunity is out there for you.`,
      '',
      `Best wishes,`,
    ].filter(line => line !== null).join('\n');
  }, [candidateName, jobTitle, companyName, reason, personalNote, isHebrew]);

  const emailHtml = useMemo(() => {
    const dir = isHebrew ? 'rtl' : 'ltr';
    const paragraphs = emailBody.split('\n').map(line =>
      line.trim() === '' ? '<br/>' : `<p style="margin:0 0 2px 0;">${line}</p>`
    ).join('');
    return `<div dir="${dir}" style="font-family: Arial, sans-serif; line-height: 1.8; max-width: 600px;">${paragraphs}</div>`;
  }, [emailBody, isHebrew]);

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
                  ? `עדכון לגבי המועמדות שלך — ${jobTitle || ''}`
                  : `Update regarding your application — ${jobTitle || ''}`,
                body_html: emailHtml,
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
      setActiveTab('compose');
    } catch (err) {
      console.error(err);
      toast.error(isHebrew ? 'שגיאה' : 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            {isHebrew ? `דחיית ${candidateName}` : `Reject ${candidateName}`}
          </DialogTitle>
          <DialogDescription>
            {isHebrew
              ? 'בחרי סיבת דחייה. המייל ייבנה אוטומטית עם טקסט אמפתי — תוכלי לצפות בו ולהוסיף הערה אישית.'
              : 'Choose a rejection reason. The email will be built automatically with empathetic text — you can preview it and add a personal note.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose" className="gap-1.5 text-sm">
              <Edit3 className="w-3.5 h-3.5" />
              {isHebrew ? 'עריכה' : 'Compose'}
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5 text-sm" disabled={!sendEmail}>
              <Eye className="w-3.5 h-3.5" />
              {isHebrew ? 'תצוגה מקדימה' : 'Preview'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4 mt-3">
            {/* Reason Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {isHebrew ? 'סיבת דחייה' : 'Rejection Reason'}
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {REJECTION_REASONS.map(r => (
                  <Badge
                    key={r.key}
                    variant={selectedReason === r.key ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={() => setSelectedReason(
                      selectedReason === r.key ? null : r.key
                    )}
                  >
                    {isHebrew ? r.labelHe : r.labelEn}
                  </Badge>
                ))}
              </div>
              {reason && (isHebrew ? reason.emailHe : reason.emailEn) && (
                <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg mt-2 leading-relaxed">
                  {isHebrew ? reason.emailHe : reason.emailEn}
                </p>
              )}
            </div>

            {/* Personal Note */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {isHebrew ? 'הערה אישית (תוצג במייל)' : 'Personal note (shown in email)'}
              </Label>
              <Textarea
                value={personalNote}
                onChange={e => setPersonalNote(e.target.value)}
                placeholder={isHebrew
                  ? 'למשל: היית מרשים מאוד בראיון, ממליץ לחזק את ה-React hooks...'
                  : 'e.g., You were very impressive in the interview, I recommend strengthening React hooks...'}
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
          </TabsContent>

          <TabsContent value="preview" className="mt-3">
            <div className="border rounded-lg overflow-hidden">
              {/* Email header */}
              <div className="bg-muted/50 px-4 py-2.5 border-b space-y-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{isHebrew ? 'אל:' : 'To:'}</span> {candidateEmail}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{isHebrew ? 'נושא:' : 'Subject:'}</span>{' '}
                  {isHebrew
                    ? `עדכון לגבי המועמדות שלך — ${jobTitle || ''}`
                    : `Update regarding your application — ${jobTitle || ''}`}
                </p>
              </div>
              {/* Email body */}
              <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap bg-background">
                {emailBody}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 mt-2">
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
