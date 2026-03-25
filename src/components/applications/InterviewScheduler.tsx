import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, MapPin, Trash2, Plus, Loader2, Bell, ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface InterviewReminder {
  id: string;
  interview_date: string;
  interview_type: string | null;
  location: string | null;
  notes: string | null;
}

interface InterviewSchedulerProps {
  applicationId: string;
  jobTitle?: string;
  companyName?: string;
  onInterviewScheduled?: () => void;
}

const interviewTypes = [
  { value: 'phone', label: { en: 'Phone Screen', he: 'שיחת טלפון' } },
  { value: 'video', label: { en: 'Video Call', he: 'שיחת וידאו' } },
  { value: 'onsite', label: { en: 'On-site', he: 'פגישה פיזית' } },
  { value: 'technical', label: { en: 'Technical', he: 'ראיון טכני' } },
  { value: 'hr', label: { en: 'HR Interview', he: 'ראיון HR' } },
  { value: 'final', label: { en: 'Final Round', he: 'ראיון סופי' } },
];

export function InterviewScheduler({ applicationId, jobTitle, companyName, onInterviewScheduled }: InterviewSchedulerProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [interviews, setInterviews] = useState<InterviewReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('10:00');
  const [type, setType] = useState('video');
  const [location, setLocation] = useState('');

  useEffect(() => {
    fetchInterviews();
  }, [applicationId]);

  const fetchInterviews = async () => {
    try {
      const { data, error } = await supabase
        .from('interview_reminders')
        .select('*')
        .eq('application_id', applicationId)
        .order('interview_date', { ascending: true });

      if (error) throw error;
      setInterviews(data || []);
    } catch (error) {
      console.error('Error fetching interviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCalendar = async (interview: InterviewReminder) => {
    try {
      const interviewDate = new Date(interview.interview_date);
      const endDate = new Date(interviewDate.getTime() + 60 * 60 * 1000); // 1 hour later

      const typeLabel = interviewTypes.find(t => t.value === interview.interview_type)?.label;
      const title = `${isRTL ? typeLabel?.he : typeLabel?.en} - ${jobTitle || 'Interview'}${companyName ? ` @ ${companyName}` : ''}`;

      const { data, error } = await supabase.functions.invoke('calendar-sync', {
        body: {
          title,
          description: `Interview for ${jobTitle || 'position'}${companyName ? ` at ${companyName}` : ''}`,
          location: interview.location || '',
          startTime: interviewDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  };

  const openGoogleCalendar = async (interview: InterviewReminder) => {
    try {
      const data = await handleAddToCalendar(interview);
      window.open(data.calendarUrl, '_blank');
      toast.success(isRTL ? 'נפתח ביומן Google' : 'Opening Google Calendar');
    } catch (error) {
      toast.error(isRTL ? 'שגיאה בפתיחת היומן' : 'Error opening calendar');
    }
  };

  const downloadICS = async (interview: InterviewReminder) => {
    try {
      const data = await handleAddToCalendar(interview);
      
      const blob = new Blob([data.icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview-${format(new Date(interview.interview_date), 'yyyy-MM-dd')}.ics`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(isRTL ? 'קובץ ICS הורד' : 'ICS file downloaded');
    } catch (error) {
      toast.error(isRTL ? 'שגיאה בהורדה' : 'Error downloading');
    }
  };

  const handleAddInterview = async () => {
    if (!date) {
      toast.error(isRTL ? 'יש לבחור תאריך' : 'Please select a date');
      return;
    }

    try {
      setIsSaving(true);

      // Combine date and time
      const [hours, minutes] = time.split(':');
      const interviewDate = new Date(date);
      interviewDate.setHours(parseInt(hours), parseInt(minutes));

      const { error } = await supabase
        .from('interview_reminders')
        .insert({
          application_id: applicationId,
          interview_date: interviewDate.toISOString(),
          interview_type: type,
          location: location || null,
        });

      if (error) throw error;

      // Add timeline event
      await supabase.from('application_timeline').insert({
        application_id: applicationId,
        event_type: 'interview_scheduled',
        new_value: type,
        description: isRTL 
          ? `ראיון ${interviewTypes.find(t => t.value === type)?.label.he} נקבע ל-${format(interviewDate, 'PPp', { locale: he })}`
          : `${interviewTypes.find(t => t.value === type)?.label.en} scheduled for ${format(interviewDate, 'PPp', { locale: enUS })}`,
      });

      toast.success(isRTL ? 'הראיון נקבע!' : 'Interview scheduled!');
      
      // Reset form
      setDate(undefined);
      setTime('10:00');
      setType('video');
      setLocation('');
      setIsAdding(false);
      
      fetchInterviews();
      onInterviewScheduled?.();
    } catch (error) {
      console.error('Error adding interview:', error);
      toast.error(isRTL ? 'שגיאה בקביעת הראיון' : 'Error scheduling interview');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInterview = async (id: string) => {
    try {
      const { error } = await supabase
        .from('interview_reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success(isRTL ? 'הראיון נמחק' : 'Interview deleted');
      fetchInterviews();
    } catch (error) {
      console.error('Error deleting interview:', error);
      toast.error(isRTL ? 'שגיאה במחיקה' : 'Error deleting');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Existing interviews */}
      {interviews.length > 0 && (
        <div className="space-y-2">
          {interviews.map((interview) => {
            const interviewDate = new Date(interview.interview_date);
            const isPast = interviewDate < new Date();
            const typeLabel = interviewTypes.find(t => t.value === interview.interview_type)?.label;

            return (
              <div
                key={interview.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  isPast ? "bg-muted/50 border-muted" : "bg-primary/5 border-primary/20"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  isPast ? "bg-muted" : "bg-primary/20"
                )}>
                  <CalendarIcon className={cn(
                    "h-5 w-5",
                    isPast ? "text-muted-foreground" : "text-primary"
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {isRTL ? typeLabel?.he : typeLabel?.en}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(interviewDate, 'PPp', { locale: isRTL ? he : enUS })}
                  </p>
                  {interview.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {interview.location}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Calendar Sync Button */}
                  {!isPast && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openGoogleCalendar(interview)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {isRTL ? 'הוסף ל-Google Calendar' : 'Add to Google Calendar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadICS(interview)}>
                          <Download className="h-4 w-4 mr-2" />
                          {isRTL ? 'הורד קובץ ICS' : 'Download ICS File'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteInterview(interview.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add interview form */}
      {isAdding ? (
        <div className="space-y-4 p-4 rounded-lg border bg-card">
          <div className="grid gap-4">
            {/* Date picker */}
            <div className="space-y-2">
              <Label>{isRTL ? 'תאריך' : 'Date'}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP', { locale: isRTL ? he : enUS }) : (isRTL ? 'בחר תאריך' : 'Pick a date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label>{isRTL ? 'שעה' : 'Time'}</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>{isRTL ? 'סוג ראיון' : 'Interview Type'}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {interviewTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {isRTL ? t.label.he : t.label.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>{isRTL ? 'מיקום / לינק' : 'Location / Link'}</Label>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={isRTL ? 'Zoom, משרד וכו\'' : 'Zoom, Office, etc.'}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAddInterview}
              disabled={isSaving || !date}
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  {isRTL ? 'קבע ראיון' : 'Schedule'}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsAdding(false)}
              disabled={isSaving}
            >
              {isRTL ? 'ביטול' : 'Cancel'}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          {isRTL ? 'הוסף ראיון' : 'Add Interview'}
        </Button>
      )}
    </div>
  );
}
