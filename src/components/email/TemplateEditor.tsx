import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  Variable,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  trigger_stage: string | null;
  auto_send: boolean;
  is_active: boolean;
  created_at: string;
}

const STAGES = [
  { value: 'screening', he: 'סינון ראשוני', en: 'Screening' },
  { value: 'interview', he: 'ראיון', en: 'Interview' },
  { value: 'task', he: 'מטלת בית', en: 'Home Assignment' },
  { value: 'offer', he: 'הצעת עבודה', en: 'Offer' },
  { value: 'hired', he: 'התקבל', en: 'Hired' },
  { value: 'rejected', he: 'נדחה', en: 'Rejected' },
];

const VARIABLES = [
  { key: '{candidate_name}', he: 'שם המועמד', en: 'Candidate Name' },
  { key: '{job_title}', he: 'שם המשרה', en: 'Job Title' },
  { key: '{company_name}', he: 'שם החברה', en: 'Company Name' },
  { key: '{interview_date}', he: 'תאריך ראיון', en: 'Interview Date' },
];

export function TemplateEditor() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [triggerStage, setTriggerStage] = useState<string>('');
  const [autoSend, setAutoSend] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['email-templates', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('email_templates')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmailTemplate[];
    },
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (template: Partial<EmailTemplate>) => {
      if (editingTemplate) {
        const { error } = await (supabase as any)
          .from('email_templates')
          .update({
            name: template.name,
            subject: template.subject,
            body: template.body,
            trigger_stage: template.trigger_stage || null,
            auto_send: template.auto_send || false,
            is_active: template.is_active ?? true,
          })
          .eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('email_templates')
          .insert({
            created_by: user?.id,
            name: template.name,
            subject: template.subject,
            body: template.body,
            trigger_stage: template.trigger_stage || null,
            auto_send: template.auto_send || false,
            is_active: template.is_active ?? true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'התבנית נשמרה' : 'Template saved');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בשמירה' : 'Error saving template');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('email_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'התבנית נמחקה' : 'Template deleted');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
  });

  const resetForm = () => {
    setEditingTemplate(null);
    setName('');
    setSubject('');
    setBody('');
    setTriggerStage('');
    setAutoSend(false);
    setIsActive(true);
  };

  const openEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setName(template.name);
    setSubject(template.subject);
    setBody(template.body);
    setTriggerStage(template.trigger_stage || '');
    setAutoSend(template.auto_send);
    setIsActive(template.is_active);
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const insertVariable = (variable: string) => {
    setBody((prev) => prev + variable);
  };

  const handleSave = () => {
    if (!name || !subject || !body) {
      toast.error(isHebrew ? 'נא למלא שם, נושא ותוכן' : 'Please fill name, subject and body');
      return;
    }
    saveMutation.mutate({ name, subject, body, trigger_stage: triggerStage || null, auto_send: autoSend, is_active: isActive });
  };

  // Preview with sample data
  const previewText = body
    .replace(/\{candidate_name\}/g, 'ישראל ישראלי')
    .replace(/\{job_title\}/g, 'Full Stack Developer')
    .replace(/\{company_name\}/g, 'PLUG Tech')
    .replace(/\{interview_date\}/g, '2026-04-01 14:00');

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5 text-primary" />
          {isHebrew ? 'תבניות מייל' : 'Email Templates'}
        </CardTitle>
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          {isHebrew ? 'תבנית חדשה' : 'New Template'}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !templates || templates.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{isHebrew ? 'אין תבניות עדיין' : 'No templates yet'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{t.name}</p>
                    {!t.is_active && (
                      <Badge variant="outline" className="text-xs">{isHebrew ? 'לא פעיל' : 'Inactive'}</Badge>
                    )}
                    {t.trigger_stage && (
                      <Badge className="text-xs bg-purple-500/20 text-purple-700">
                        <Zap className="w-2.5 h-2.5 mr-1" />
                        {STAGES.find(s => s.value === t.trigger_stage)?.[isHebrew ? 'he' : 'en'] || t.trigger_stage}
                      </Badge>
                    )}
                    {t.auto_send && (
                      <Badge className="text-xs bg-green-500/20 text-green-700">
                        {isHebrew ? 'אוטומטי' : 'Auto-send'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.subject}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(t.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir={isHebrew ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {editingTemplate
                ? (isHebrew ? 'עריכת תבנית' : 'Edit Template')
                : (isHebrew ? 'תבנית חדשה' : 'New Template')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1">
              <Label>{isHebrew ? 'שם התבנית' : 'Template Name'}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isHebrew ? 'לדוגמה: הזמנה לראיון' : 'e.g. Interview Invitation'}
              />
            </div>

            {/* Subject */}
            <div className="space-y-1">
              <Label>{isHebrew ? 'נושא המייל' : 'Email Subject'}</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={isHebrew ? 'נושא...' : 'Subject...'}
              />
            </div>

            {/* Variable Buttons */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                <Variable className="w-3.5 h-3.5" />
                {isHebrew ? 'משתנים' : 'Variables'}
              </Label>
              <div className="flex flex-wrap gap-1">
                {VARIABLES.map((v) => (
                  <Button
                    key={v.key}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => insertVariable(v.key)}
                  >
                    {v.key} — {isHebrew ? v.he : v.en}
                  </Button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="space-y-1">
              <Label>{isHebrew ? 'תוכן' : 'Body'}</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={isHebrew ? 'תוכן המייל...' : 'Email body...'}
                className="min-h-[180px] resize-none"
              />
            </div>

            {/* Preview */}
            {body && (
              <div className="space-y-1">
                <Label className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {isHebrew ? 'תצוגה מקדימה' : 'Preview'}
                </Label>
                <div className="p-3 rounded-lg bg-muted/30 border text-sm whitespace-pre-wrap">
                  {previewText}
                </div>
              </div>
            )}

            {/* Trigger Stage */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                {isHebrew ? 'שלב מפעיל (אופציונלי)' : 'Trigger Stage (optional)'}
              </Label>
              <Select value={triggerStage} onValueChange={setTriggerStage}>
                <SelectTrigger>
                  <SelectValue placeholder={isHebrew ? 'ללא — שליחה ידנית בלבד' : 'None — manual send only'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isHebrew ? 'ללא' : 'None'}</SelectItem>
                  {STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {isHebrew ? s.he : s.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Auto-send toggle */}
            {triggerStage && triggerStage !== 'none' && (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div>
                  <p className="text-sm font-medium">
                    {isHebrew ? 'שליחה אוטומטית' : 'Auto-send'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isHebrew
                      ? 'שלח מייל אוטומטית כשמועמד עובר לשלב זה'
                      : 'Automatically send when candidate moves to this stage'}
                  </p>
                </div>
                <Switch checked={autoSend} onCheckedChange={setAutoSend} />
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <Label>{isHebrew ? 'תבנית פעילה' : 'Active'}</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {isHebrew ? 'ביטול' : 'Cancel'}
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  isHebrew ? 'שמור' : 'Save'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
