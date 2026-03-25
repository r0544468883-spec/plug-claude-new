import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, Loader2, Calendar, Link as LinkIcon } from 'lucide-react';

const REMINDER_OPTIONS = [
  { value: '1440', labelEn: '24 hours before', labelHe: '24 שעות לפני' },
  { value: '720', labelEn: '12 hours before', labelHe: '12 שעות לפני' },
  { value: '360', labelEn: '6 hours before', labelHe: '6 שעות לפני' },
  { value: '60', labelEn: '1 hour before', labelHe: 'שעה לפני' },
  { value: '30', labelEn: '30 minutes before', labelHe: '30 דקות לפני' },
  { value: '15', labelEn: '15 minutes before', labelHe: '15 דקות לפני' },
];

export function CreateWebinar() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'he';

  const [titleEn, setTitleEn] = useState('');
  const [titleHe, setTitleHe] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descHe, setDescHe] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [reminder1, setReminder1] = useState('1440');
  const [reminder2, setReminder2] = useState('60');
  const [publishing, setPublishing] = useState(false);

  const canPublish = () => {
    return (titleEn.trim() || titleHe.trim()) && scheduledAt && (isInternal || linkUrl.trim());
  };

  const handlePublish = async () => {
    if (!user?.id || !canPublish()) return;
    setPublishing(true);

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('active_company_id')
        .eq('user_id', user.id)
        .single();

      const { error } = await supabase.from('webinars').insert({
        creator_id: user.id,
        company_id: profileData?.active_company_id || null,
        title_en: titleEn || titleHe,
        title_he: titleHe || titleEn,
        description_en: descEn || descHe,
        description_he: descHe || descEn,
        scheduled_at: new Date(scheduledAt).toISOString(),
        link_url: isInternal ? null : linkUrl,
        is_internal: isInternal,
        reminder_1_minutes: parseInt(reminder1),
        reminder_2_minutes: parseInt(reminder2),
      } as any);

      if (error) throw error;

      toast.success(isRTL ? 'הוובינר נוצר בהצלחה! 🎉' : 'Webinar created successfully! 🎉');
      setTitleEn(''); setTitleHe(''); setDescEn(''); setDescHe('');
      setScheduledAt(''); setLinkUrl(''); setIsInternal(false);
    } catch (err: any) {
      console.error('Create webinar error:', err);
      toast.error(isRTL ? 'שגיאה ביצירת הוובינר' : 'Error creating webinar');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <Video className="w-6 h-6 text-primary" />
        {isRTL ? 'יצירת וובינר' : 'Create Webinar'}
      </h2>
      <p className="text-muted-foreground text-sm -mt-4">
        {isRTL ? 'צרו אירוע חי למועמדים עם תזכורות אוטומטיות' : 'Create a live event for candidates with automated reminders'}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{isRTL ? 'פרטי הוובינר' : 'Webinar Details'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Title EN */}
          <div className="space-y-2">
            <Label>{isRTL ? 'כותרת באנגלית' : 'Title (English)'}</Label>
            <Input value={titleEn} onChange={e => setTitleEn(e.target.value)} placeholder="Webinar title..." />
          </div>

          {/* Title HE */}
          <div className="space-y-2">
            <Label>{isRTL ? 'כותרת בעברית' : 'Title (Hebrew)'}</Label>
            <Input value={titleHe} onChange={e => setTitleHe(e.target.value)} placeholder="כותרת הוובינר..." dir="rtl" />
          </div>

          {/* Description EN */}
          <div className="space-y-2">
            <Label>{isRTL ? 'תיאור באנגלית' : 'Description (English)'}</Label>
            <Textarea value={descEn} onChange={e => setDescEn(e.target.value)} placeholder="Description..." rows={3} />
          </div>

          {/* Description HE */}
          <div className="space-y-2">
            <Label>{isRTL ? 'תיאור בעברית' : 'Description (Hebrew)'}</Label>
            <Textarea value={descHe} onChange={e => setDescHe(e.target.value)} placeholder="תיאור..." dir="rtl" rows={3} />
          </div>

          {/* Date/Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {isRTL ? 'תאריך ושעה' : 'Date & Time'}
            </Label>
            <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          </div>

          {/* Internal toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={isInternal} onCheckedChange={setIsInternal} />
            <Label>{isRTL ? 'שידור פנימי ב-PLUG' : 'Internal PLUG Stream'}</Label>
          </div>

          {/* External link */}
          {!isInternal && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                {isRTL ? 'קישור (Zoom / Meet)' : 'Link (Zoom / Meet)'}
              </Label>
              <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://zoom.us/j/..." />
            </div>
          )}

          {/* Reminders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'תזכורת ראשונה' : 'Reminder 1'}</Label>
              <Select value={reminder1} onValueChange={setReminder1}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{isRTL ? o.labelHe : o.labelEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'תזכורת שנייה' : 'Reminder 2'}</Label>
              <Select value={reminder2} onValueChange={setReminder2}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{isRTL ? o.labelHe : o.labelEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit */}
          <Button onClick={handlePublish} disabled={!canPublish() || publishing} className="w-full gap-2">
            {publishing && <Loader2 className="w-4 h-4 animate-spin" />}
            {isRTL ? 'צור וובינר' : 'Create Webinar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
