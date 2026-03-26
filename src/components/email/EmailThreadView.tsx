import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Send, Inbox, Loader2, Sparkles, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
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

  return (
    <div className="space-y-4">
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
