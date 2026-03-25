import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Loader2, Clock, MapPin, Link as LinkIcon } from 'lucide-react';

interface ScheduleMeetingButtonProps {
  otherUser: { user_id: string; full_name: string };
  conversationId: string;
  size?: 'sm' | 'default';
}

export function ScheduleMeetingButton({ otherUser, conversationId, size = 'sm' }: ScheduleMeetingButtonProps) {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [reminder, setReminder] = useState('30');

  const resetForm = () => {
    setTitle('');
    setDate('');
    setTime('');
    setLocation('');
    setMeetingLink('');
    setReminder('30');
  };

  const createMeeting = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // Create schedule_task
      const { error: taskError } = await supabase.from('schedule_tasks' as any).insert({
        user_id: user.id,
        title: title || (isHebrew ? `פגישה עם ${otherUser.full_name}` : `Meeting with ${otherUser.full_name}`),
        due_date: date,
        due_time: time || null,
        location: location || null,
        meeting_link: meetingLink || null,
        task_type: 'meeting',
        priority: 'medium',
        related_candidate: otherUser.full_name,
        external_attendees: JSON.stringify([{ name: otherUser.full_name }]),
        reminder_minutes_before: parseInt(reminder) || 30,
      });
      if (taskError) throw taskError;

      // Send auto-message in conversation
      const myName = (profile as any)?.full_name || '';
      const dateStr = new Date(date).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US', { day: 'numeric', month: 'long' });
      const timeStr = time ? ` ${isHebrew ? 'בשעה' : 'at'} ${time}` : '';
      const locationStr = location ? `\n${isHebrew ? 'מיקום' : 'Location'}: ${location}` : '';
      const linkStr = meetingLink ? `\n${isHebrew ? 'קישור' : 'Link'}: ${meetingLink}` : '';

      const content = isHebrew
        ? `📅 תזמנתי פגישה ב-${dateStr}${timeStr}${locationStr}${linkStr}`
        : `📅 I scheduled a meeting on ${dateStr}${timeStr}${locationStr}${linkStr}`;

      const toUserId = conversationId
        ? (await supabase.from('conversations').select('participant_1, participant_2').eq('id', conversationId).single())
            .data
        : null;

      if (toUserId) {
        const recipient = toUserId.participant_1 === user.id ? toUserId.participant_2 : toUserId.participant_1;
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          from_user_id: user.id,
          to_user_id: recipient,
          content,
        });
        await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
      }
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'הפגישה נוצרה ונשלחה הודעה!' : 'Meeting created and message sent!');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['chat-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      resetForm();
      setOpen(false);
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה ביצירת הפגישה' : 'Failed to create meeting');
    },
  });

  // Build Google Calendar URL
  const buildGoogleCalendarUrl = () => {
    if (!date) return '';
    const start = time ? `${date.replace(/-/g, '')}T${time.replace(/:/g, '')}00` : `${date.replace(/-/g, '')}`;
    const meetingTitle = title || `Meeting with ${otherUser.full_name}`;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: meetingTitle,
      dates: `${start}/${start}`,
      ...(location && { location }),
      ...(meetingLink && { details: meetingLink }),
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={size} className="gap-1.5 text-xs">
          <Calendar className="w-3.5 h-3.5" />
          {isHebrew ? 'פגישה' : 'Meet'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isHebrew ? `תזמן פגישה עם ${otherUser.full_name}` : `Schedule meeting with ${otherUser.full_name}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isHebrew ? 'כותרת (אופציונלי)' : 'Title (optional)'}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="ps-9"
                required
              />
            </div>
            <div className="w-32 relative">
              <Clock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="ps-9"
              />
            </div>
          </div>
          <div className="relative">
            <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={isHebrew ? 'מיקום' : 'Location'}
              className="ps-9"
            />
          </div>
          <div className="relative">
            <LinkIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder={isHebrew ? 'קישור לפגישה (Zoom, Meet...)' : 'Meeting link (Zoom, Meet...)'}
              className="ps-9"
            />
          </div>
          <Select value={reminder} onValueChange={setReminder}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">{isHebrew ? 'תזכורת 15 דקות לפני' : 'Remind 15m before'}</SelectItem>
              <SelectItem value="30">{isHebrew ? 'תזכורת 30 דקות לפני' : 'Remind 30m before'}</SelectItem>
              <SelectItem value="60">{isHebrew ? 'תזכורת שעה לפני' : 'Remind 1h before'}</SelectItem>
              <SelectItem value="1440">{isHebrew ? 'תזכורת יום לפני' : 'Remind 1 day before'}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => createMeeting.mutate()}
              disabled={!date || createMeeting.isPending}
              className="flex-1"
            >
              {createMeeting.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (isHebrew ? 'צור פגישה' : 'Create meeting')}
            </Button>
            {date && (
              <Button variant="outline" size="icon" asChild>
                <a href={buildGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer" title="Google Calendar">
                  <Calendar className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
