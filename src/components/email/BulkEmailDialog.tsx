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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail,
  Send,
  Loader2,
  Users,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface BulkEmailDialogProps {
  jobId: string;
  trigger?: React.ReactNode;
}

interface Candidate {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  current_stage: string;
  selected: boolean;
}

const STAGES = [
  { value: 'applied', he: 'הגיש', en: 'Applied' },
  { value: 'screening', he: 'סינון', en: 'Screening' },
  { value: 'interview', he: 'ראיון', en: 'Interview' },
  { value: 'task', he: 'מטלה', en: 'Task' },
  { value: 'offer', he: 'הצעה', en: 'Offer' },
  { value: 'hired', he: 'התקבל', en: 'Hired' },
  { value: 'rejected', he: 'נדחה', en: 'Rejected' },
];

export function BulkEmailDialog({ jobId, trigger }: BulkEmailDialogProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';
  const [open, setOpen] = useState(false);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ sent: number; failed: number } | null>(null);

  // Fetch candidates for this job
  const { data: allCandidates, isLoading: loadingCandidates } = useQuery({
    queryKey: ['job-candidates-bulk', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          candidate_id,
          current_stage,
          profiles_secure!applications_candidate_id_fkey(full_name, email)
        ` as any)
        .eq('job_id', jobId)
        .not('status', 'eq', 'withdrawn');

      if (error) throw error;
      return (data || []).map((app: any) => ({
        id: app.id,
        candidate_id: app.candidate_id,
        candidate_name: app.profiles_secure?.full_name || 'Unknown',
        candidate_email: app.profiles_secure?.email || '',
        current_stage: app.current_stage,
        selected: true,
      }));
    },
    enabled: !!jobId && open,
  });

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ['email-templates', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('email_templates')
        .select('*')
        .eq('created_by', user?.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Array<{ id: string; name: string; subject: string; body: string }>;
    },
    enabled: !!user?.id && open,
  });

  // Update candidates when data loads or filter changes
  const filteredCandidates = (allCandidates || []).filter(
    (c: Candidate) => filterStage === 'all' || c.current_stage === filterStage
  );

  const toggleCandidate = (candidateId: string) => {
    setCandidates((prev) => {
      const existing = prev.find((c) => c.candidate_id === candidateId);
      if (existing) {
        return prev.map((c) =>
          c.candidate_id === candidateId ? { ...c, selected: !c.selected } : c
        );
      }
      const fromAll = filteredCandidates.find((c: Candidate) => c.candidate_id === candidateId);
      if (fromAll) {
        return [...prev, { ...fromAll, selected: true }];
      }
      return prev;
    });
  };

  const isSelected = (candidateId: string) => {
    const c = candidates.find((c) => c.candidate_id === candidateId);
    return c ? c.selected : true; // Default selected
  };

  const selectedCount = filteredCandidates.filter((c: Candidate) => isSelected(c.candidate_id)).length;

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates?.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const toggleSelectAll = () => {
    const allSelected = filteredCandidates.every((c: Candidate) => isSelected(c.candidate_id));
    setCandidates(
      filteredCandidates.map((c: Candidate) => ({ ...c, selected: !allSelected }))
    );
  };

  const handleSendBulk = async () => {
    const toSend = filteredCandidates.filter((c: Candidate) => isSelected(c.candidate_id) && c.candidate_email);
    if (toSend.length === 0) {
      toast.error(isHebrew ? 'לא נבחרו מועמדים' : 'No candidates selected');
      return;
    }
    if (!subject || !body) {
      toast.error(isHebrew ? 'נא למלא נושא ותוכן' : 'Please fill subject and body');
      return;
    }

    setSending(true);
    setProgress(0);
    setResults(null);

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < toSend.length; i++) {
      const candidate = toSend[i];
      const personalizedBody = body
        .replace(/\{candidate_name\}/g, candidate.candidate_name)
        .replace(/\{company_name\}/g, '')
        .replace(/\{job_title\}/g, '');

      const personalizedSubject = subject
        .replace(/\{candidate_name\}/g, candidate.candidate_name);

      try {
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
              to: candidate.candidate_email,
              subject: personalizedSubject,
              body_html: `<div dir="${isHebrew ? 'rtl' : 'ltr'}" style="font-family: Arial, sans-serif;">${personalizedBody.replace(/\n/g, '<br/>')}</div>`,
              application_id: candidate.id,
            }),
          }
        );

        if (res.ok) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      setProgress(Math.round(((i + 1) / toSend.length) * 100));

      // Rate limit: 1 second between emails
      if (i < toSend.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setResults({ sent, failed });
    setSending(false);

    if (failed === 0) {
      toast.success(isHebrew ? `${sent} מיילים נשלחו בהצלחה` : `${sent} emails sent successfully`);
    } else {
      toast.warning(
        isHebrew
          ? `נשלחו ${sent}, נכשלו ${failed}`
          : `${sent} sent, ${failed} failed`
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="h-4 w-4" />
            {isHebrew ? 'שליחה המונית' : 'Bulk Email'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {isHebrew ? 'שליחת מייל המוני' : 'Bulk Email Send'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stage Filter */}
          <div className="space-y-1">
            <Label>{isHebrew ? 'סנן לפי שלב' : 'Filter by Stage'}</Label>
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isHebrew ? 'הכל' : 'All'}</SelectItem>
                {STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {isHebrew ? s.he : s.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Candidate List */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>{isHebrew ? 'מועמדים' : 'Candidates'} ({selectedCount}/{filteredCandidates.length})</Label>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={toggleSelectAll}>
                {isHebrew ? 'בחר/בטל הכל' : 'Select/Deselect All'}
              </Button>
            </div>
            <div className="max-h-[180px] overflow-y-auto border rounded-lg p-2 space-y-1">
              {loadingCandidates ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : filteredCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isHebrew ? 'אין מועמדים' : 'No candidates'}
                </p>
              ) : (
                filteredCandidates.map((c: Candidate) => (
                  <div
                    key={c.candidate_id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleCandidate(c.candidate_id)}
                  >
                    <Checkbox checked={isSelected(c.candidate_id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.candidate_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.candidate_email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {STAGES.find((s) => s.value === c.current_stage)?.[isHebrew ? 'he' : 'en'] || c.current_stage}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Template */}
          {templates && templates.length > 0 && (
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                {isHebrew ? 'תבנית' : 'Template'}
              </Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={isHebrew ? 'בחר תבנית...' : 'Choose template...'} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
            <Label>{isHebrew ? 'תוכן' : 'Body'}</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={isHebrew ? 'תוכן המייל... (השתמש ב-{candidate_name} להתאמה אישית)' : 'Email body... (use {candidate_name} for personalization)'}
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Progress */}
          {sending && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">
                {isHebrew ? `שולח... ${progress}%` : `Sending... ${progress}%`}
              </p>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="flex gap-4 p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                {isHebrew ? `${results.sent} נשלחו` : `${results.sent} sent`}
              </div>
              {results.failed > 0 && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {isHebrew ? `${results.failed} נכשלו` : `${results.failed} failed`}
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
              onClick={handleSendBulk}
              disabled={sending || selectedCount === 0 || !subject || !body}
              className="gap-2"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {isHebrew ? `שלח ל-${selectedCount} מועמדים` : `Send to ${selectedCount} candidates`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
