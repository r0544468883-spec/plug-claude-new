import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Bell, Plus, Trash2, Loader2, BellOff } from 'lucide-react';
import { JOB_FIELDS } from '@/lib/job-taxonomy';

const JOB_TYPES = [
  { value: 'remote', labelEn: 'Remote', labelHe: 'מרחוק' },
  { value: 'hybrid', labelEn: 'Hybrid', labelHe: 'היברידי' },
  { value: 'full-time', labelEn: 'On-site', labelHe: 'משרד' },
];

export function JobAlertSetup() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [alertName, setAlertName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [locations, setLocations] = useState('');
  const [minSalary, setMinSalary] = useState(0);
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<'immediate' | 'daily' | 'weekly'>('daily');
  const [channel, setChannel] = useState<'push' | 'email' | 'both'>('push');

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['job-alerts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from('job_alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const filters: any = {};
      if (selectedRoles.length) filters.roles = selectedRoles;
      if (locations) filters.locations = locations.split(',').map(s => s.trim());
      if (minSalary > 0) filters.min_salary = minSalary;
      if (jobTypes.length) filters.job_type = jobTypes;

      const { error } = await supabase.from('job_alerts').insert({
        user_id: user!.id,
        alert_name: alertName || (isHebrew ? 'התראת משרות' : 'Job Alert'),
        filters,
        frequency,
        channel,
        is_active: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'ההתראה נשמרה!' : 'Alert saved!');
      setShowForm(false);
      setAlertName(''); setSelectedRoles([]); setLocations(''); setMinSalary(0); setJobTypes([]);
      queryClient.invalidateQueries({ queryKey: ['job-alerts'] });
    },
    onError: () => toast.error(isHebrew ? 'שגיאה בשמירת ההתראה' : 'Failed to save alert'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('job_alerts').update({ is_active } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-alerts'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('job_alerts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'ההתראה נמחקה' : 'Alert deleted');
      queryClient.invalidateQueries({ queryKey: ['job-alerts'] });
    },
  });

  const toggleJobType = (type: string) => {
    setJobTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const toggleRole = (slug: string) => {
    setSelectedRoles(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);
  };

  return (
    <div className="space-y-4" dir={isHebrew ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          {isHebrew ? 'התראות משרות' : 'Job Alerts'}
        </h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          {isHebrew ? 'התראה חדשה' : 'New Alert'}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-card border-border border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isHebrew ? 'הגדר התראה חדשה' : 'Set Up New Alert'}</CardTitle>
            <CardDescription className="text-xs">{isHebrew ? 'קבל התראה כשמשרה מתאימה לפרמטרים שלך' : 'Get notified when a matching job is posted'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm">{isHebrew ? 'שם ההתראה' : 'Alert name'}</Label>
              <Input value={alertName} onChange={(e) => setAlertName(e.target.value)} placeholder={isHebrew ? 'לדוגמה: React בתל אביב' : 'e.g. React in Tel Aviv'} className="text-sm" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{isHebrew ? 'תחומים מעניינים' : 'Relevant fields'}</Label>
              <div className="flex flex-wrap gap-2">
                {JOB_FIELDS.slice(0, 8).map(f => (
                  <Badge
                    key={f.slug}
                    variant={selectedRoles.includes(f.slug) ? "default" : "outline"}
                    className="cursor-pointer hover:border-primary/40"
                    onClick={() => toggleRole(f.slug)}
                  >
                    {isHebrew ? f.name_he : f.name_en}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">{isHebrew ? 'מיקומים (מופרד בפסיקים)' : 'Locations (comma separated)'}</Label>
              <Input value={locations} onChange={(e) => setLocations(e.target.value)} placeholder={isHebrew ? 'תל אביב, ירושלים, מרחוק' : 'Tel Aviv, Remote'} className="text-sm" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{isHebrew ? `שכר מינימום: ₪${minSalary.toLocaleString()}` : `Min salary: ₪${minSalary.toLocaleString()}`}</Label>
              <Slider value={[minSalary]} onValueChange={([v]) => setMinSalary(v)} min={0} max={60000} step={1000} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{isHebrew ? 'סוג עבודה' : 'Work type'}</Label>
              <div className="flex gap-2">
                {JOB_TYPES.map(t => (
                  <Badge
                    key={t.value}
                    variant={jobTypes.includes(t.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleJobType(t.value)}
                  >
                    {isHebrew ? t.labelHe : t.labelEn}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">{isHebrew ? 'תדירות' : 'Frequency'}</Label>
                <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">{isHebrew ? 'מיידי' : 'Immediate'}</SelectItem>
                    <SelectItem value="daily">{isHebrew ? 'יומי' : 'Daily'}</SelectItem>
                    <SelectItem value="weekly">{isHebrew ? 'שבועי' : 'Weekly'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">{isHebrew ? 'ערוץ' : 'Channel'}</Label>
                <Select value={channel} onValueChange={(v: any) => setChannel(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="push">{isHebrew ? 'הודעות Push' : 'Push'}</SelectItem>
                    <SelectItem value="email">{isHebrew ? 'אימייל' : 'Email'}</SelectItem>
                    <SelectItem value="both">{isHebrew ? 'שניהם' : 'Both'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">{isHebrew ? 'ביטול' : 'Cancel'}</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="flex-1 gap-2">
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isHebrew ? 'שמור התראה' : 'Save Alert'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : alerts.length === 0 && !showForm ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">{isHebrew ? 'אין התראות פעילות' : 'No active alerts'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert: any) => {
            const filters = alert.filters as any;
            return (
              <Card key={alert.id} className="bg-card border-border">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {alert.is_active ? <Bell className="w-4 h-4 text-primary shrink-0" /> : <BellOff className="w-4 h-4 text-muted-foreground shrink-0" />}
                      <span className="font-medium text-sm truncate">{alert.alert_name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">{alert.frequency}</Badge>
                      <Badge variant="outline" className="text-xs">{alert.channel}</Badge>
                      {filters.min_salary > 0 && <Badge variant="outline" className="text-xs">₪{filters.min_salary.toLocaleString()}+</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={alert.is_active}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: alert.id, is_active: v })}
                    />
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive w-7 h-7" onClick={() => deleteMutation.mutate(alert.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
