import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface CreateMissionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateMissionForm({ onSuccess, onCancel }: CreateMissionFormProps) {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const BackIcon = isHebrew ? ArrowRight : ArrowLeft;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    commission_model: 'percentage',
    commission_value: '',
    scope: 'open',
    urgency: 'standard',
    job_id: '',
    min_reliability_score: '',
    company_website: '',
  });

  // Fetch user's companies
  const { data: companies } = useQuery({
    queryKey: ['my-companies', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').eq('created_by', user!.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch jobs for selected company
  const { data: jobs } = useQuery({
    queryKey: ['my-jobs', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('jobs').select('id, title').eq('created_by', user!.id).eq('status', 'active');
      return data || [];
    },
    enabled: !!user?.id,
  });

  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  const handleSubmit = async () => {
    if (!user || !form.title) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('missions').insert({
        title: form.title,
        description: form.description || null,
        commission_model: form.commission_model,
        commission_value: parseFloat(form.commission_value) || 0,
        scope: form.scope,
        urgency: form.urgency,
        created_by: user.id,
        company_id: selectedCompanyId || null,
        job_id: form.job_id || null,
        min_reliability_score: form.min_reliability_score ? parseInt(form.min_reliability_score) : null,
        company_website: form.company_website || null,
      } as any);

      if (error) throw error;
      toast.success(isHebrew ? 'הפרויקט פורסם!' : 'Project posted!');
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error(isHebrew ? 'שגיאה בפרסום הפרויקט' : 'Failed to post project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <BackIcon className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          {isHebrew ? 'פרסום פרויקט חדש' : 'Post New Project'}
        </h2>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label>{isHebrew ? 'כותרת הפרויקט' : 'Project Title'} *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={isHebrew ? 'מגייס/ת Full Stack Developer' : 'Recruit Full Stack Developer'}
            />
          </div>

          <div className="space-y-2">
            <Label>{isHebrew ? 'תיאור' : 'Description'}</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={isHebrew ? 'פרטי הפרויקט...' : 'Project details...'}
              rows={4}
            />
          </div>

          {companies && companies.length > 0 && (
            <div className="space-y-2">
              <Label>{isHebrew ? 'חברה' : 'Company'}</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger><SelectValue placeholder={isHebrew ? 'בחר חברה' : 'Select company'} /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {jobs && jobs.length > 0 && (
            <div className="space-y-2">
              <Label>{isHebrew ? 'קישור למשרה' : 'Link to Job'}</Label>
              <Select value={form.job_id} onValueChange={(v) => setForm(f => ({ ...f, job_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isHebrew ? 'בחר משרה' : 'Select job'} /></SelectTrigger>
                <SelectContent>
                  {jobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isHebrew ? 'מודל עמלה' : 'Commission Model'}</Label>
              <Select value={form.commission_model} onValueChange={(v) => setForm(f => ({ ...f, commission_model: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{isHebrew ? 'אחוז משכר' : '% of Salary'}</SelectItem>
                  <SelectItem value="flat_fee">{isHebrew ? 'סכום קבוע' : 'Flat Fee'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{form.commission_model === 'percentage' ? '%' : '₪'}</Label>
              <Input
                type="number"
                value={form.commission_value}
                onChange={(e) => setForm(f => ({ ...f, commission_value: e.target.value }))}
                placeholder={form.commission_model === 'percentage' ? '15' : '10000'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isHebrew ? 'היקף' : 'Scope'}</Label>
              <Select value={form.scope} onValueChange={(v) => setForm(f => ({ ...f, scope: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">{isHebrew ? 'פתוח' : 'Open'}</SelectItem>
                  <SelectItem value="exclusive">{isHebrew ? 'בלעדי' : 'Exclusive'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isHebrew ? 'דחיפות' : 'Urgency'}</Label>
              <Select value={form.urgency} onValueChange={(v) => setForm(f => ({ ...f, urgency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{isHebrew ? 'רגיל' : 'Standard'}</SelectItem>
                  <SelectItem value="high">{isHebrew ? 'גבוה' : 'High'}</SelectItem>
                  <SelectItem value="critical">{isHebrew ? 'קריטי' : 'Critical'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isHebrew ? 'ציון אמינות מינימלי (אופציונלי)' : 'Min Reliability Score (optional)'}</Label>
            <Input
              type="number"
              value={form.min_reliability_score}
              onChange={(e) => setForm(f => ({ ...f, min_reliability_score: e.target.value }))}
              placeholder="90"
              min={0}
              max={100}
            />
          </div>

          <div className="space-y-2">
            <Label>{isHebrew ? 'אתר החברה (אופציונלי)' : 'Company Website (optional)'}</Label>
            <Input
              value={form.company_website}
              onChange={(e) => setForm(f => ({ ...f, company_website: e.target.value }))}
              placeholder="https://example.com"
              type="url"
            />
          </div>

          <Button onClick={handleSubmit} disabled={isSubmitting || !form.title} className="w-full gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            {isHebrew ? 'פרסם פרויקט' : 'Post Project'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
