import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Video, Plus, Users, Calendar, Clock, Bell, ExternalLink,
  Loader2, Settings, Trash2, BarChart3, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isFuture, isPast } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface WebinarDashboardProps {
  companyId?: string;
}

export function WebinarDashboard({ companyId }: WebinarDashboardProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const locale = isRTL ? he : enUS;
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: webinars = [], isLoading } = useQuery({
    queryKey: ['webinars-dashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from('webinars')
        .select('*, webinar_registrations(count)')
        .eq('creator_id', user.id)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const upcoming = webinars.filter((w: any) => isFuture(new Date(w.scheduled_at)));
  const past = webinars.filter((w: any) => isPast(new Date(w.scheduled_at)));

  const deleteWebinar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('webinars').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'הוובינר נמחק' : 'Webinar deleted');
      queryClient.invalidateQueries({ queryKey: ['webinars-dashboard'] });
    },
    onError: () => toast.error(isRTL ? 'שגיאה במחיקה' : 'Delete failed'),
  });

  return (
    <div className={cn('space-y-6', isRTL && 'rtl')} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          {isRTL ? 'ניהול וובינרים' : 'Webinar Management'}
        </h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="w-4 h-4" />
              {isRTL ? 'וובינר חדש' : 'New Webinar'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle>{isRTL ? 'יצירת וובינר חדש' : 'Create New Webinar'}</DialogTitle>
            </DialogHeader>
            <CreateWebinarForm
              companyId={companyId}
              onSuccess={() => {
                setShowCreate(false);
                queryClient.invalidateQueries({ queryKey: ['webinars-dashboard'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: isRTL ? 'סה"כ וובינרים' : 'Total Webinars', value: webinars.length, icon: Video },
          { label: isRTL ? 'קרובים' : 'Upcoming', value: upcoming.length, icon: Calendar },
          { label: isRTL ? 'שהסתיימו' : 'Completed', value: past.length, icon: CheckCircle2 },
          {
            label: isRTL ? 'סה"כ נרשמים' : 'Total Registrations',
            value: webinars.reduce((sum: number, w: any) => sum + (w.webinar_registrations?.[0]?.count || 0), 0),
            icon: Users,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-3 text-center">
              <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">
            {isRTL ? 'קרובים' : 'Upcoming'}
          </h3>
          {upcoming.map((w: any) => (
            <WebinarCard
              key={w.id}
              webinar={w}
              isRTL={isRTL}
              locale={locale}
              onDelete={() => deleteWebinar.mutate(w.id)}
              isDeleting={deleteWebinar.isPending}
            />
          ))}
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">
            {isRTL ? 'וובינרים שהסתיימו' : 'Past Webinars'}
          </h3>
          {past.map((w: any) => (
            <WebinarCard
              key={w.id}
              webinar={w}
              isRTL={isRTL}
              locale={locale}
              onDelete={() => deleteWebinar.mutate(w.id)}
              isDeleting={deleteWebinar.isPending}
              isPast
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && webinars.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground mb-4">
              {isRTL ? 'עדיין לא יצרת וובינרים' : 'No webinars created yet'}
            </p>
            <Button onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              {isRTL ? 'צור את הראשון' : 'Create your first'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== Webinar Card ====================

function WebinarCard({
  webinar,
  isRTL,
  locale,
  onDelete,
  isDeleting,
  isPast = false,
}: {
  webinar: any;
  isRTL: boolean;
  locale: Locale;
  onDelete: () => void;
  isDeleting: boolean;
  isPast?: boolean;
}) {
  const title = isRTL ? (webinar.title_he || webinar.title_en) : (webinar.title_en || webinar.title_he);
  const regCount = webinar.webinar_registrations?.[0]?.count || 0;
  const scheduledAt = new Date(webinar.scheduled_at);

  return (
    <Card className={cn('transition-shadow hover:shadow-sm', isPast && 'opacity-70')}>
      <CardContent className="p-4 flex items-center gap-4">
        {/* Date block */}
        <div className="hidden sm:flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary shrink-0">
          <span className="text-lg font-bold leading-none">{format(scheduledAt, 'd')}</span>
          <span className="text-xs font-medium uppercase">{format(scheduledAt, 'MMM', { locale })}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold truncate">{title}</h4>
            {webinar.is_internal && (
              <Badge variant="outline" className="text-[10px]">
                {isRTL ? 'פנימי' : 'Internal'}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(scheduledAt, 'HH:mm', { locale })}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {regCount} {isRTL ? 'נרשמים' : 'registered'}
            </span>
            {webinar.reminder_1_minutes && (
              <span className="flex items-center gap-1">
                <Bell className="w-3 h-3" />
                {webinar.reminder_1_minutes}min
              </span>
            )}
            <span className="text-muted-foreground/50">
              {formatDistanceToNow(scheduledAt, { addSuffix: true, locale })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 shrink-0">
          {webinar.link_url && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={() => window.open(webinar.link_url, '_blank')}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {isRTL ? 'פתח' : 'Open'}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== Create Webinar Form ====================

function CreateWebinarForm({ companyId, onSuccess }: { companyId?: string; onSuccess: () => void }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [titleEn, setTitleEn] = useState('');
  const [titleHe, setTitleHe] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [reminder1, setReminder1] = useState('30');
  const [reminder2, setReminder2] = useState('5');

  const create = useMutation({
    mutationFn: async () => {
      if (!user?.id || !titleEn.trim() || !scheduledAt) throw new Error('Missing fields');
      const { error } = await (supabase as any).from('webinars').insert({
        creator_id: user.id,
        company_id: companyId || null,
        title_en: titleEn.trim(),
        title_he: titleHe.trim() || titleEn.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
        link_url: linkUrl.trim() || null,
        is_internal: isInternal,
        reminder_1_minutes: parseInt(reminder1) || 30,
        reminder_2_minutes: parseInt(reminder2) || 5,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'הוובינר נוצר!' : 'Webinar created!');
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Title (EN) *</Label>
        <Input value={titleEn} onChange={e => setTitleEn(e.target.value)} placeholder="Monthly HR Webinar" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">כותרת (HE)</Label>
        <Input value={titleHe} onChange={e => setTitleHe(e.target.value)} placeholder="וובינר HR חודשי" dir="rtl" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{isRTL ? 'תאריך ושעה *' : 'Date & Time *'}</Label>
        <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} dir="ltr" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{isRTL ? 'לינק לוובינר (Zoom, Meet, Jitsi)' : 'Webinar Link (Zoom, Meet, Jitsi)'}</Label>
        <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://zoom.us/j/..." dir="ltr" />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{isRTL ? 'וובינר פנימי' : 'Internal webinar'}</Label>
        <Switch checked={isInternal} onCheckedChange={setIsInternal} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{isRTL ? 'תזכורת 1 (דקות לפני)' : 'Reminder 1 (min before)'}</Label>
          <Select value={reminder1} onValueChange={setReminder1}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="60">60</SelectItem>
              <SelectItem value="1440">24h</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{isRTL ? 'תזכורת 2 (דקות לפני)' : 'Reminder 2 (min before)'}</Label>
          <Select value={reminder2} onValueChange={setReminder2}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="30">30</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        onClick={() => create.mutate()}
        disabled={!titleEn.trim() || !scheduledAt || create.isPending}
        className="w-full gap-2"
      >
        {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {isRTL ? 'צור וובינר' : 'Create Webinar'}
      </Button>
    </div>
  );
}
