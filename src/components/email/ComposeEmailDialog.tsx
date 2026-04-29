import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Send, Loader2, FileText, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmailInlineAI } from './EmailInlineAI';

interface ComposeEmailDialogProps {
  trigger?: React.ReactNode;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  applicationId?: string;
  replyToMessageId?: string;
  candidateName?: string;
  jobTitle?: string;
  companyName?: string;
  stage?: string;
}

export function ComposeEmailDialog({
  trigger,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  applicationId,
  replyToMessageId,
  candidateName,
  jobTitle,
  companyName,
  stage,
}: ComposeEmailDialogProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Check if email is connected
  const { data: emailTokens } = useQuery({
    queryKey: ['email-oauth-tokens', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('email_oauth_tokens')
        .select('provider, email_address')
        .eq('user_id', user?.id);
      if (error) throw error;
      return data as Array<{ provider: string; email_address: string }>;
    },
    enabled: !!user?.id,
  });

  // Fetch email templates
  const { data: templates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Array<{
        id: string;
        name: string;
        subject: string;
        body: string;
      }>;
    },
  });

  const isConnected = emailTokens && emailTokens.length > 0;
  const connectedEmail = emailTokens?.[0]?.email_address;

  const replaceTemplateVars = (text: string) => {
    return text
      .replace(/\{candidate_name\}/g, candidateName || '')
      .replace(/\{job_title\}/g, jobTitle || '')
      .replace(/\{company_name\}/g, companyName || '')
      .replace(/\{interview_date\}/g, '');
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setSubject(replaceTemplateVars(template.subject));
      setBody(replaceTemplateVars(template.body));
    }
  };

  const handleDraftWithAI = async () => {
    setDrafting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-ai-assist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            action: 'draft',
            job_title: jobTitle || '',
            company_name: companyName || '',
            stage: stage || 'applied',
            language: isHebrew ? 'he' : 'en',
            user_name: candidateName || '',
          }),
        }
      );

      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.subject) setSubject(data.subject);
      if (data.body) setBody(data.body);
    } catch {
      toast.error(isHebrew ? 'שגיאה ביצירת טיוטה — נסה שוב' : 'Failed to generate draft — try again');
    } finally {
      setDrafting(false);
    }
  };

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast.error(isHebrew ? 'נא למלא את כל השדות' : 'Please fill in all fields');
      return;
    }

    setSending(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-via-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            to,
            subject,
            body_html: `<div dir="${isHebrew ? 'rtl' : 'ltr'}" style="font-family: Arial, sans-serif;">${body.replace(/\n/g, '<br/>')}</div>`,
            application_id: applicationId || null,
            reply_to_message_id: replyToMessageId || null,
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to send');

      toast.success(
        isHebrew
          ? `מייל נשלח בהצלחה מ-${result.from}`
          : `Email sent successfully from ${result.from}`
      );
      setOpen(false);
      setTo(defaultTo);
      setSubject(defaultSubject);
      setBody(defaultBody);
      setSelectedTemplate('');
    } catch (err: any) {
      toast.error(err.message || (isHebrew ? 'שגיאה בשליחת מייל' : 'Error sending email'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Mail className="h-4 w-4" />
            {isHebrew ? 'שלח מייל' : 'Send Email'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {isHebrew ? 'שליחת מייל' : 'Send Email'}
          </DialogTitle>
        </DialogHeader>

        {!isConnected ? (
          <div className="text-center py-6 space-y-3">
            <Mail className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              {isHebrew
                ? 'יש לחבר חשבון מייל בהגדרות לפני שליחה'
                : 'Please connect an email account in Settings before sending'}
            </p>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {isHebrew ? 'סגור' : 'Close'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* From */}
            <div className="text-sm text-muted-foreground">
              {isHebrew ? 'מאת:' : 'From:'} <span className="font-medium text-foreground">{connectedEmail}</span>
            </div>

            {/* Template selector + Draft with AI */}
            <div className="flex items-end gap-2">
              {templates && templates.length > 0 && (
                <div className="space-y-1 flex-1">
                  <Label className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {isHebrew ? 'תבנית' : 'Template'}
                  </Label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder={isHebrew ? 'בחר תבנית...' : 'Choose template...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDraftWithAI}
                disabled={drafting}
                className="gap-1.5 shrink-0 text-primary border-primary/30 hover:bg-primary/5"
                data-tour="email-ai"
              >
                {drafting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                {isHebrew ? 'טיוטה עם AI' : 'Draft with AI'}
              </Button>
            </div>

            {/* To */}
            <div className="space-y-1">
              <Label>{isHebrew ? 'אל' : 'To'}</Label>
              <Input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="email@example.com"
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

            {/* Body with inline AI rewrite */}
            <div className="space-y-1">
              <Label>{isHebrew ? 'תוכן' : 'Body'}</Label>
              <EmailInlineAI
                value={body}
                onChange={setBody}
                placeholder={isHebrew ? 'כתוב את תוכן המייל...' : 'Write your email...'}
                className="min-h-[200px] resize-none"
                rows={8}
              />
            </div>

            {/* Send Button */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {isHebrew ? 'ביטול' : 'Cancel'}
              </Button>
              <Button onClick={handleSend} disabled={sending || !to || !subject || !body}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {isHebrew ? 'שלח' : 'Send'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
