import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Send, Inbox, Loader2, Sparkles, Clock, CalendarCheck, CalendarPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { useState } from 'react';
import { toast } from 'sonner';
import { ComposeEmailDialog } from './ComposeEmailDialog';
import { PasteEmailDialog } from './PasteEmailDialog';

interface EmailThreadViewProps {
  applicationId: string;
  jobTitle?: string;
  companyName?: string;
  candidateName?: string;
  candidateEmail?: string;
}

const CLASSIFICATION_LABELS: Record<string, { he: string; en: string; color: string }> = {
  interview_invitation: { he: 'הזמנה לראיון', en: 'Interview Invite', color: 'bg-blue-500/20 text-blue-700' },
  rejection: { he: 'דחייה', en: 'Rejection', color: 'bg-red-500/20 text-red-700' },
  offer: { he: 'הצעת עבודה', en: 'Job Offer', color: 'bg-green-500/20 text-green-700' },
  task_assignment: { he: 'מטלת בית', en: 'Home Assignment', color: 'bg-purple-500/20 text-purple-700' },
  follow_up: { he: 'מעקב', en: 'Follow-up', color: 'bg-yellow-500/20 text-yellow-700' },
  acknowledgment: { he: 'אישור קבלה', en: 'Acknowledgment', color: 'bg-gray-500/20 text-gray-700' },
  info_request: { he: 'בקשת מידע', en: 'Info Request', color: 'bg-orange-500/20 text-orange-700' },
  general: { he: 'כללי', en: 'General', color: 'bg-gray-400/20 text-gray-600' },
};

export function EmailThreadView({
  applicationId,
  jobTitle,
  companyName,
  candidateName,
  candidateEmail,
}: EmailThreadViewProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';

  const { data: emails, isLoading } = useQuery({
    queryKey: ['application-emails', applicationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('application_emails')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Array<{
        id: string;
        direction: string;
        from_email: string;
        to_email: string;
        subject: string;
        body_text: string;
        body_html: string;
        ai_classification: string | null;
        ai_confidence: number | null;
        auto_updated: boolean;
        created_at: string;
      }>;
    },
    enabled: !!applicationId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const [addingToCalendar, setAddingToCalendar] = useState(false);

  const addToCalendar = async (email: typeof emails[0]) => {
    setAddingToCalendar(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const interviewDate = (email as any).ai_extracted_data?.interview_date;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-interview-to-calendar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            interview_date: interviewDate,
            job_title: jobTitle,
            company_name: companyName,
            application_id: applicationId,
          }),
        }
      );
      const data = await res.json();
      if (data.error === 'no_calendar') {
        toast.error(isHebrew ? 'חבר Google Calendar בהגדרות קודם' : 'Connect Google Calendar in Settings first');
      } else if (data.success) {
        toast.success(isHebrew ? 'הראיון נוסף ליומן!' : 'Interview added to calendar!');
      } else {
        throw new Error(data.error);
      }
    } catch {
      toast.error(isHebrew ? 'שגיאה בהוספה ליומן' : 'Failed to add to calendar');
    } finally {
      setAddingToCalendar(false);
    }
  };

  // Detect interview invite in this thread
  const interviewInvite = emails?.find(e => e.ai_classification === 'interview_invitation' && e.direction === 'received');

  return (
    <div className="space-y-4">
      {/* Interview invite — one-click reply banner */}
      {interviewInvite && (
        <div data-tour="email-interview-actions" className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
            <CalendarCheck className="w-4 h-4 shrink-0" />
            {isHebrew ? 'קיבלת הזמנה לראיון!' : 'You received an interview invite!'}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(interviewInvite as any).ai_extracted_data?.interview_date && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-blue-500/40 text-blue-600"
                onClick={() => addToCalendar(interviewInvite)}
                disabled={addingToCalendar}
              >
                {addingToCalendar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />}
                {isHebrew ? 'הוסף ליומן' : 'Add to calendar'}
              </Button>
            )}
            <ComposeEmailDialog
              defaultTo={interviewInvite.from_email}
              applicationId={applicationId}
              candidateName={candidateName}
              jobTitle={jobTitle}
              companyName={companyName}
              replyToMessageId={interviewInvite.id}
              stage="interview"
              trigger={
                <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                  <Send className="h-3.5 w-3.5" />
                  {isHebrew ? 'ענה עם זמינות' : 'Reply with availability'}
                </Button>
              }
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <ComposeEmailDialog
          defaultTo={candidateEmail}
          applicationId={applicationId}
          candidateName={candidateName}
          jobTitle={jobTitle}
          companyName={companyName}
          trigger={
            <Button variant="outline" size="sm" className="gap-2">
              <Send className="h-4 w-4" />
              {isHebrew ? 'שלח מייל' : 'Send Email'}
            </Button>
          }
        />
        <PasteEmailDialog
          applicationId={applicationId}
          trigger={
            <Button variant="ghost" size="sm" className="gap-2">
              <Inbox className="h-4 w-4" />
              {isHebrew ? 'הדבק מייל' : 'Paste Email'}
            </Button>
          }
        />
      </div>

      {/* Email Thread */}
      {!emails || emails.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Mail className="w-10 h-10 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {isHebrew ? 'אין מיילים עדיין למשרה זו' : 'No emails yet for this application'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isHebrew
              ? 'חבר מייל בהגדרות כדי לסנכרן מיילים אוטומטית, או הדבק מייל ידנית'
              : 'Connect email in Settings to sync automatically, or paste an email manually'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => {
            const isSent = email.direction === 'sent';
            const classLabel = email.ai_classification
              ? CLASSIFICATION_LABELS[email.ai_classification]
              : null;

            return (
              <div
                key={email.id}
                className={`p-3 rounded-lg border ${
                  isSent
                    ? 'bg-primary/5 border-primary/20 mr-0 ml-4'
                    : 'bg-muted/30 border-border ml-0 mr-4'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isSent ? (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Send className="w-2.5 h-2.5" />
                        {isHebrew ? 'נשלח' : 'Sent'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Inbox className="w-2.5 h-2.5" />
                        {isHebrew ? 'נתקבל' : 'Received'}
                      </Badge>
                    )}
                    {classLabel && (
                      <Badge className={`text-xs gap-1 ${classLabel.color}`}>
                        <Sparkles className="w-2.5 h-2.5" />
                        {isHebrew ? classLabel.he : classLabel.en}
                        {email.ai_confidence && (
                          <span className="opacity-70">
                            {Math.round(email.ai_confidence * 100)}%
                          </span>
                        )}
                      </Badge>
                    )}
                    {email.auto_updated && (
                      <Badge className="text-xs bg-amber-500/20 text-amber-700">
                        {isHebrew ? 'עדכון אוטומטי' : 'Auto-updated'}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(email.created_at), {
                      addSuffix: true,
                      locale: isHebrew ? he : enUS,
                    })}
                  </span>
                </div>

                {/* From/To */}
                <p className="text-xs text-muted-foreground mb-1">
                  {isSent ? (isHebrew ? 'אל:' : 'To:') : (isHebrew ? 'מאת:' : 'From:')}{' '}
                  <span className="font-medium">{isSent ? email.to_email : email.from_email}</span>
                </p>

                {/* Subject */}
                {email.subject && (
                  <p className="text-sm font-medium mb-1">{email.subject}</p>
                )}

                {/* Body */}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                  {email.body_text}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
