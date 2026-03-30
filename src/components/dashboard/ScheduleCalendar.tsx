import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday,
  isPast, parseISO, addMonths, subMonths, startOfWeek, endOfWeek, addDays, subDays
} from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Clock, Tag, Trash2, CheckCircle2,
  Circle, Loader2, CalendarDays, List, Filter, MapPin, Link2, Users, UserPlus, X, Sun,
  RefreshCw, Unlink, Search, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type TaskType = 'interview' | 'phone_call' | 'frontal_interview' | 'home_assignment' | 'followup' | 'task' | 'meeting' | 'deadline' | 'reminder';
type ViewMode = 'day' | 'week' | 'calendar' | 'list';

interface ExternalAttendee { name: string; email: string; }

interface ScheduleTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: TaskPriority;
  task_type: TaskType;
  is_completed: boolean;
  related_candidate?: string | null;
  related_job?: string | null;
  location?: string | null;
  meeting_link?: string | null;
  external_attendees?: ExternalAttendee[] | null;
  source?: string | null;
  source_id?: string | null;
  reminder_minutes_before?: number | null;
  created_at: string;
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-muted text-muted-foreground border-border',
  medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  high: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  urgent: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const priorityLabels: Record<TaskPriority, { he: string; en: string }> = {
  low: { he: 'נמוכה', en: 'Low' },
  medium: { he: 'בינונית', en: 'Medium' },
  high: { he: 'גבוהה', en: 'High' },
  urgent: { he: 'דחוף', en: 'Urgent' },
};

const typeColors: Record<TaskType, string> = {
  interview:         'bg-purple-500/15 text-purple-400 border-purple-500/30',
  phone_call:        'bg-green-500/15 text-green-400 border-green-500/30',
  frontal_interview: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  home_assignment:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  followup:          'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  task:              'bg-primary/15 text-primary border-primary/30',
  meeting:           'bg-orange-500/15 text-orange-400 border-orange-500/30',
  deadline:          'bg-red-500/15 text-red-400 border-red-500/30',
  reminder:          'bg-secondary/15 text-secondary border-secondary/30',
};

const typeBg: Record<TaskType, string> = {
  interview:         'bg-purple-500/20 border-purple-500/40 hover:bg-purple-500/30',
  phone_call:        'bg-green-500/20 border-green-500/40 hover:bg-green-500/30',
  frontal_interview: 'bg-violet-500/20 border-violet-500/40 hover:bg-violet-500/30',
  home_assignment:   'bg-yellow-500/20 border-yellow-500/40 hover:bg-yellow-500/30',
  followup:          'bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30',
  task:              'bg-primary/20 border-primary/40 hover:bg-primary/30',
  meeting:           'bg-orange-500/20 border-orange-500/40 hover:bg-orange-500/30',
  deadline:          'bg-red-500/20 border-red-500/40 hover:bg-red-500/30',
  reminder:          'bg-secondary/20 border-secondary/40 hover:bg-secondary/30',
};

const typeIcons: Record<TaskType, string> = {
  interview:         '🎤',
  phone_call:        '📞',
  frontal_interview: '🤝',
  home_assignment:   '💻',
  followup:          '↩️',
  task:              '✓',
  meeting:           '👥',
  deadline:          '⏰',
  reminder:          '🔔',
};

const typeLabels: Record<TaskType, { he: string; en: string }> = {
  interview:         { he: 'ראיון', en: 'Interview' },
  phone_call:        { he: 'שיחת טלפון', en: 'Phone Call' },
  frontal_interview: { he: 'ראיון פרונטלי', en: 'Frontal Interview' },
  home_assignment:   { he: 'מטלת בית', en: 'Home Assignment' },
  followup:          { he: 'מעקב', en: 'Follow-up' },
  task:              { he: 'משימה', en: 'Task' },
  meeting:           { he: 'פגישה', en: 'Meeting' },
  deadline:          { he: 'דד-ליין', en: 'Deadline' },
  reminder:          { he: 'תזכורת', en: 'Reminder' },
};

/** Build a "Add to Google Calendar" URL for a task */
function buildGoogleCalendarUrl(task: ScheduleTask): string {
  const title = encodeURIComponent(task.title);
  const details = encodeURIComponent(
    [task.description, task.related_job ? `Job: ${task.related_job}` : '']
      .filter(Boolean)
      .join('\n')
  );
  const location = encodeURIComponent(task.location || task.meeting_link || '');

  let dates = '';
  if (task.due_date) {
    const [y, m, d] = task.due_date.split('-');
    if (task.due_time) {
      const [hh, mm] = task.due_time.split(':');
      const startH = parseInt(hh, 10);
      const endH = startH + 1;
      dates = `${y}${m}${d}T${hh}${mm}00/${y}${m}${d}T${String(endH).padStart(2, '0')}${mm}00`;
    } else {
      dates = `${y}${m}${d}/${y}${m}${d}`;
    }
  }

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00–22:00

export function ScheduleCalendar() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const locale = isRTL ? he : enUS;
  const queryClient = useQueryClient();
  const dayViewRef = useRef<HTMLDivElement>(null);

  // ── Filter persistence ──────────────────────────
  const filterStorageKey = user ? `plug_schedule_filters_${user.id}` : null;
  const savedFilters = useMemo(() => {
    if (!filterStorageKey) return null;
    try {
      const raw = sessionStorage.getItem(filterStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [filterStorageKey]);

  const [viewMode, setViewMode] = useState<ViewMode>(savedFilters?.viewMode || 'day');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<TaskType | 'all'>(savedFilters?.filterType || 'all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>(savedFilters?.filterPriority || 'all');
  const [showCompleted, setShowCompleted] = useState(savedFilters?.showCompleted || false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [prefilledHour, setPrefilledHour] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<ScheduleTask | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);

  // Stats dialog
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);

  // Delete confirmation
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Google Calendar integration state
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalLastSynced, setGcalLastSynced] = useState<string | null>(null);
  const [gcalSyncing, setGcalSyncing] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(selectedDate);
  const [newDueTime, setNewDueTime] = useState('09:00');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newType, setNewType] = useState<TaskType>('task');
  const [newRelatedCandidate, setNewRelatedCandidate] = useState('');
  const [newRelatedJob, setNewRelatedJob] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newMeetingLink, setNewMeetingLink] = useState('');
  const [externalAttendees, setExternalAttendees] = useState<ExternalAttendee[]>([]);
  const [newAttendeeEmail, setNewAttendeeEmail] = useState('');
  const [newAttendeeName, setNewAttendeeName] = useState('');
  const [newReminderMinutes, setNewReminderMinutes] = useState<number | null>(null);

  // Persist filters
  useEffect(() => {
    if (filterStorageKey) {
      sessionStorage.setItem(filterStorageKey, JSON.stringify({
        viewMode, filterType, filterPriority, showCompleted,
      }));
    }
  }, [viewMode, filterType, filterPriority, showCompleted, filterStorageKey]);

  // ── Queries & Mutations ──────────────────────────

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['schedule-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('schedule_tasks' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ScheduleTask[];
    },
    enabled: !!user?.id,
  });

  const addTaskMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !newTitle.trim()) throw new Error('Missing data');
      const { error } = await supabase.from('schedule_tasks' as any).insert({
        user_id: user.id,
        title: newTitle.trim(),
        description: newDescription || null,
        due_date: newDueDate ? format(newDueDate, 'yyyy-MM-dd') : null,
        due_time: newDueTime || null,
        priority: newPriority,
        task_type: newType,
        is_completed: false,
        related_candidate: newRelatedCandidate || null,
        related_job: newRelatedJob || null,
        location: newLocation || null,
        meeting_link: newMeetingLink || null,
        external_attendees: externalAttendees.length > 0 ? externalAttendees : [],
        source: 'manual',
        reminder_minutes_before: newReminderMinutes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'משימה נוצרה!' : 'Task created!');
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      setAddDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error(isRTL ? 'שגיאה ביצירת משימה' : 'Error creating task'),
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from('schedule_tasks' as any)
        .update({ is_completed: !is_completed })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('schedule_tasks' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'משימה נמחקה' : 'Task deleted');
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      setTaskDetailOpen(false);
    },
  });

  // ── Delete confirmation ──────────────────────────

  const confirmDelete = (id: string) => {
    setTaskToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const executeDelete = () => {
    if (taskToDelete) {
      deleteTaskMutation.mutate(taskToDelete);
    }
    setDeleteConfirmOpen(false);
    setTaskToDelete(null);
  };

  // ── Helpers ──────────────────────────

  const resetForm = () => {
    setNewTitle(''); setNewDescription(''); setNewDueDate(new Date());
    setNewDueTime('09:00'); setNewPriority('medium'); setNewType('task');
    setNewRelatedCandidate(''); setNewRelatedJob('');
    setNewLocation(''); setNewMeetingLink('');
    setExternalAttendees([]); setNewAttendeeName(''); setNewAttendeeEmail('');
    setPrefilledHour(null); setNewReminderMinutes(null);
  };

  /** Generate and download an .ics file for a task */
  const downloadICS = (task: ScheduleTask) => {
    if (!task.due_date) return;
    const [y, m, d] = task.due_date.split('-');
    const [hh, mm] = (task.due_time || '09:00').split(':');
    const endHH = String(parseInt(hh, 10) + 1).padStart(2, '0');
    const start = `${y}${m}${d}T${hh}${mm}00`;
    const end   = `${y}${m}${d}T${endHH}${mm}00`;
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const uid = `${Date.now()}-${Math.random().toString(36).substr(2,9)}@plug.app`;

    let alarmBlock = '';
    if (task.reminder_minutes_before != null) {
      alarmBlock = `BEGIN:VALARM\nTRIGGER:-PT${task.reminder_minutes_before}M\nACTION:DISPLAY\nDESCRIPTION:תזכורת: ${task.title}\nEND:VALARM\n`;
    }

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Plug App//Interview Scheduler//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${task.title}`,
      `DESCRIPTION:${(task.description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${task.location || task.meeting_link || ''}`,
      'STATUS:CONFIRMED',
      alarmBlock,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${task.title.replace(/[^a-zA-Z0-9א-ת]/g, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openCreateWithHour = (hour: number) => {
    setPrefilledHour(hour);
    setNewDueDate(selectedDate);
    setNewDueTime(`${String(hour).padStart(2, '0')}:00`);
    setAddDialogOpen(true);
  };

  const addAttendee = () => {
    if (!newAttendeeName.trim() || !newAttendeeEmail.trim()) return;
    setExternalAttendees(prev => [...prev, { name: newAttendeeName.trim(), email: newAttendeeEmail.trim() }]);
    setNewAttendeeName(''); setNewAttendeeEmail('');
  };

  // ── Google Calendar integration ──────────────────────────

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('google_calendar_tokens' as any)
      .select('last_synced_at')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setGcalConnected(true);
          setGcalLastSynced((data as any).last_synced_at);
        }
      });
  }, [user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gcal_connected') === 'true') {
      setGcalConnected(true);
      toast.success(isRTL ? 'יומן Google חובר בהצלחה!' : 'Google Calendar connected!');
      window.history.replaceState({}, '', window.location.pathname);
      handleGcalSync();
    } else if (params.get('gcal_error')) {
      toast.error(isRTL ? 'שגיאה בחיבור יומן Google' : 'Google Calendar connection failed');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleGcalConnect = () => {
    if (!user?.id) return;
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const CLIENT_ID    = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri  = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;

    const params = new URLSearchParams({
      client_id:     CLIENT_ID,
      redirect_uri:  redirectUri,
      response_type: 'code',
      scope:         'https://www.googleapis.com/auth/calendar.readonly',
      access_type:   'offline',
      prompt:        'consent',
      state:         user.id,
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  const handleGcalSync = async () => {
    if (!user) return;
    setGcalSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      toast.success(isRTL
        ? `סונכרנו ${result.synced} אירועים מ-Google Calendar`
        : `Synced ${result.synced} events from Google Calendar`
      );
      setGcalLastSynced(new Date().toISOString());
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
    } catch (e: any) {
      if (e.message === 'not_connected') {
        setGcalConnected(false);
      } else {
        toast.error(isRTL ? 'שגיאה בסנכרון יומן Google' : 'Google Calendar sync failed');
      }
    } finally {
      setGcalSyncing(false);
    }
  };

  const handleGcalDisconnect = async () => {
    if (!user?.id) return;
    await supabase.from('google_calendar_tokens' as any).delete().eq('user_id', user.id);
    setGcalConnected(false);
    setGcalLastSynced(null);
    toast.success(isRTL ? 'יומן Google נותק' : 'Google Calendar disconnected');
  };

  // Scroll to current hour on day view mount
  useEffect(() => {
    if (viewMode === 'day' && dayViewRef.current) {
      const currentHour = new Date().getHours();
      const scrollHour = Math.max(7, Math.min(currentHour - 1, 21));
      const hourEl = dayViewRef.current.querySelector(`[data-hour="${scrollHour}"]`);
      if (hourEl) hourEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [viewMode, selectedDate]);

  // ── Computed data ──────────────────────────

  const filteredTasks = tasks.filter((t) => {
    if (!showCompleted && t.is_completed) return false;
    if (filterType !== 'all' && t.task_type !== filterType) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const tasksForDate = (date: Date) =>
    filteredTasks.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), date));

  const selectedDateTasks = tasksForDate(selectedDate);

  // Day view: bucket tasks by hour
  const timedTasks = selectedDateTasks.filter(t => t.due_time);
  const allDayTasks = selectedDateTasks.filter(t => !t.due_time);
  const tasksByHour: Record<number, ScheduleTask[]> = {};
  timedTasks.forEach(t => {
    const hour = parseInt(t.due_time!.split(':')[0]);
    if (!tasksByHour[hour]) tasksByHour[hour] = [];
    tasksByHour[hour].push(t);
  });

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const dayNames = isRTL
    ? ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Week view
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Stats
  const totalTasks = filteredTasks.length;
  const completedTasks = tasks.filter((t) => t.is_completed).length;
  const todayTasks = tasksForDate(new Date()).length;
  const urgentTasks = filteredTasks.filter((t) => t.priority === 'urgent' && !t.is_completed).length;

  const hasActiveFilters = filterType !== 'all' || filterPriority !== 'all' || showCompleted || searchQuery;

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ═══ COMPACT TOOLBAR ═══ */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Title + count */}
        <h2 className="text-lg font-bold flex items-center gap-2 me-auto">
          <Calendar className="w-5 h-5 text-primary" />
          {isRTL ? 'יומן החיפוש שלי' : 'My Search Calendar'}
          <Badge variant="secondary" className="text-xs">{totalTasks}</Badge>
        </h2>

        {/* View mode pills */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {([
            ['day', isRTL ? 'יום' : 'Day', Sun],
            ['week', isRTL ? 'שבוע' : 'Week', CalendarDays],
            ['calendar', isRTL ? 'חודש' : 'Month', Calendar],
            ['list', isRTL ? 'רשימה' : 'List', List],
          ] as [ViewMode, string, any][]).map(([mode, label, Icon]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors min-h-[36px]',
                viewMode === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        {searchExpanded ? (
          <div className="flex items-center gap-1">
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isRTL ? 'חפש משימה...' : 'Search tasks...'}
              className="h-9 w-48 text-xs"
              autoFocus
              onBlur={() => { if (!searchQuery) setSearchExpanded(false); }}
            />
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setSearchQuery(''); setSearchExpanded(false); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setSearchExpanded(true)} title={isRTL ? 'חיפוש' : 'Search'}>
            <Search className="w-4 h-4" />
          </Button>
        )}

        {/* Add task */}
        <Dialog open={addDialogOpen} onOpenChange={(o) => { setAddDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 h-9">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{isRTL ? 'הוסף' : 'Add'}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle>{isRTL ? 'משימה / אירוע חדש' : 'New Task / Event'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>{isRTL ? 'כותרת' : 'Title'} *</Label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={isRTL ? 'תיאור המשימה...' : 'Task title...'} />
              </div>
              <div className="space-y-1">
                <Label>{isRTL ? 'פרטים' : 'Description'}</Label>
                <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder={isRTL ? 'פרטים נוספים...' : 'Additional details...'} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{isRTL ? 'תאריך' : 'Date'}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start text-start">
                        {newDueDate ? format(newDueDate, 'dd/MM/yy') : isRTL ? 'בחר תאריך' : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarUI mode="single" selected={newDueDate} onSelect={setNewDueDate} locale={locale} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label>{isRTL ? 'שעה' : 'Time'}</Label>
                  <Input type="time" value={newDueTime} onChange={(e) => setNewDueTime(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{isRTL ? 'סוג' : 'Type'}</Label>
                  <Select value={newType} onValueChange={(v) => setNewType(v as TaskType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(typeLabels) as TaskType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {typeIcons[t]} {isRTL ? typeLabels[t].he : typeLabels[t].en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{isRTL ? 'עדיפות' : 'Priority'}</Label>
                  <Select value={newPriority} onValueChange={(v) => setNewPriority(v as TaskPriority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(priorityLabels) as TaskPriority[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          {isRTL ? priorityLabels[p].he : priorityLabels[p].en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Reminder */}
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5">{isRTL ? 'תזכורת לפני' : 'Remind me before'}</Label>
                <Select
                  value={newReminderMinutes === null ? 'none' : String(newReminderMinutes)}
                  onValueChange={(v) => setNewReminderMinutes(v === 'none' ? null : parseInt(v, 10))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{isRTL ? 'ללא תזכורת' : 'No reminder'}</SelectItem>
                    <SelectItem value="10">{isRTL ? '10 דקות לפני' : '10 minutes before'}</SelectItem>
                    <SelectItem value="15">{isRTL ? '15 דקות לפני' : '15 minutes before'}</SelectItem>
                    <SelectItem value="30">{isRTL ? '30 דקות לפני' : '30 minutes before'}</SelectItem>
                    <SelectItem value="60">{isRTL ? 'שעה לפני' : '1 hour before'}</SelectItem>
                    <SelectItem value="120">{isRTL ? 'שעתיים לפני' : '2 hours before'}</SelectItem>
                    <SelectItem value="1440">{isRTL ? 'יום לפני' : '1 day before'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location & Meeting link */}
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{isRTL ? 'מיקום' : 'Location'}</Label>
                <Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder={isRTL ? 'כתובת / שם מקום...' : 'Address / venue...'} />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" />{isRTL ? 'לינק לפגישה' : 'Meeting Link'}</Label>
                <Input value={newMeetingLink} onChange={(e) => setNewMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." />
              </div>

              {/* External attendees */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" />{isRTL ? 'משתתפים חיצוניים' : 'External Attendees'}</Label>
                {externalAttendees.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/40 border border-border text-xs">
                    <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1">{a.name} — {a.email}</span>
                    <button onClick={() => setExternalAttendees(prev => prev.filter((_, j) => j !== i))} aria-label={isRTL ? 'הסר משתתף' : 'Remove attendee'}>
                      <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input value={newAttendeeName} onChange={(e) => setNewAttendeeName(e.target.value)} placeholder={isRTL ? 'שם' : 'Name'} className="h-8 text-xs" />
                  <Input value={newAttendeeEmail} onChange={(e) => setNewAttendeeEmail(e.target.value)} placeholder="Email" className="h-8 text-xs" type="email" />
                  <Button type="button" size="sm" variant="outline" className="h-8 px-2 shrink-0" onClick={addAttendee}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{isRTL ? 'מועמד קשור' : 'Related Candidate'}</Label>
                  <Input value={newRelatedCandidate} onChange={(e) => setNewRelatedCandidate(e.target.value)} placeholder={isRTL ? 'שם מועמד...' : 'Candidate name...'} />
                </div>
                <div className="space-y-1">
                  <Label>{isRTL ? 'משרה קשורה' : 'Related Job'}</Label>
                  <Input value={newRelatedJob} onChange={(e) => setNewRelatedJob(e.target.value)} placeholder={isRTL ? 'שם המשרה...' : 'Job title...'} />
                </div>
              </div>

              <Button className="w-full" onClick={() => addTaskMutation.mutate()} disabled={!newTitle.trim() || addTaskMutation.isPending}>
                {addTaskMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Plus className="w-4 h-4 me-2" />}
                {isRTL ? 'צור אירוע' : 'Create Event'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stats button */}
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setStatsDialogOpen(true)} title={isRTL ? 'סטטיסטיקות' : 'Statistics'}>
          <BarChart3 className="w-4 h-4" />
        </Button>

        {/* Google Calendar popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 relative" title={isRTL ? 'יומן Google' : 'Google Calendar'}>
              <Calendar className="w-4 h-4" />
              {gcalConnected && (
                <span className="absolute -top-0.5 -end-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                <div>
                  <p className="text-sm font-medium">{isRTL ? 'יומן Google' : 'Google Calendar'}</p>
                  {gcalConnected ? (
                    <p className="text-xs text-muted-foreground">
                      {gcalLastSynced
                        ? (isRTL
                            ? `סונכרן: ${format(new Date(gcalLastSynced), 'dd/MM HH:mm')}`
                            : `Synced: ${format(new Date(gcalLastSynced), 'dd/MM HH:mm')}`)
                        : (isRTL ? 'מחובר — לא סונכרן עדיין' : 'Connected — not yet synced')}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'חבר כדי לייבא אירועים' : 'Connect to import events'}
                    </p>
                  )}
                </div>
              </div>
              {gcalConnected ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1.5" onClick={handleGcalSync} disabled={gcalSyncing}>
                    <RefreshCw className={cn('w-3.5 h-3.5', gcalSyncing && 'animate-spin')} />
                    {gcalSyncing ? (isRTL ? 'מסנכרן...' : 'Syncing...') : (isRTL ? 'סנכרן' : 'Sync')}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive" onClick={handleGcalDisconnect}>
                    <Unlink className="w-3.5 h-3.5" />
                    {isRTL ? 'נתק' : 'Disconnect'}
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="w-full h-8 text-xs gap-1.5" onClick={handleGcalConnect}>
                  <Calendar className="w-3.5 h-3.5" />
                  {isRTL ? 'חבר יומן Google' : 'Connect Google Calendar'}
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* ═══ COMPACT FILTER ROW ═══ */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filterType} onValueChange={(v) => setFilterType(v as TaskType | 'all')}>
          <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder={isRTL ? 'סוג' : 'Type'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? 'כל הסוגים' : 'All Types'}</SelectItem>
            {(Object.keys(typeLabels) as TaskType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {typeIcons[t]} {isRTL ? typeLabels[t].he : typeLabels[t].en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              {isRTL ? 'עוד פילטרים' : 'More Filters'}
              {(filterPriority !== 'all' || showCompleted) && (
                <Badge variant="secondary" className="text-[10px] px-1 h-4 ms-1">
                  {[filterPriority !== 'all', showCompleted].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="space-y-1">
              <Label className="text-xs">{isRTL ? 'עדיפות' : 'Priority'}</Label>
              <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as TaskPriority | 'all')}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'כל העדיפויות' : 'All Priorities'}</SelectItem>
                  {(Object.keys(priorityLabels) as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {isRTL ? priorityLabels[p].he : priorityLabels[p].en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant={showCompleted ? 'default' : 'outline'}
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => setShowCompleted(!showCompleted)}
            >
              <CheckCircle2 className="w-3 h-3 me-1" />
              {isRTL ? 'הצג שהושלמו' : 'Show Completed'}
            </Button>
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={() => {
            setFilterType('all'); setFilterPriority('all'); setShowCompleted(false); setSearchQuery(''); setSearchExpanded(false);
          }}>
            <X className="w-3 h-3 me-1" />{isRTL ? 'נקה הכל' : 'Clear All'}
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {filterType !== 'all' && (
            <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setFilterType('all')}>
              {typeIcons[filterType]} {isRTL ? typeLabels[filterType].he : typeLabels[filterType].en}
              <X className="w-3 h-3" />
            </Badge>
          )}
          {filterPriority !== 'all' && (
            <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setFilterPriority('all')}>
              {isRTL ? priorityLabels[filterPriority].he : priorityLabels[filterPriority].en}
              <X className="w-3 h-3" />
            </Badge>
          )}
          {showCompleted && (
            <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setShowCompleted(false)}>
              {isRTL ? 'מוצגות שהושלמו' : 'Showing Completed'}
              <X className="w-3 h-3" />
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => { setSearchQuery(''); setSearchExpanded(false); }}>
              "{searchQuery}"
              <X className="w-3 h-3" />
            </Badge>
          )}
        </div>
      )}

      {/* ═══ STATS DIALOG ═══ */}
      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent className="max-w-sm" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'סטטיסטיקות' : 'Statistics'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: isRTL ? 'סה"כ משימות' : 'Total Tasks', value: totalTasks, color: 'text-foreground' },
              { label: isRTL ? 'הושלמו' : 'Completed', value: completedTasks, color: 'text-primary' },
              { label: isRTL ? 'היום' : 'Today', value: todayTasks, color: 'text-accent' },
              { label: isRTL ? 'דחוף' : 'Urgent', value: urgentTasks, color: 'text-red-400' },
            ].map((s) => (
              <Card key={s.label} className="bg-card border-border">
                <CardContent className="p-3 text-center">
                  <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ DAY VIEW ═══ */}
      {viewMode === 'day' && (
        <div className="space-y-4">
          {/* Day nav header */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px]" onClick={() => setSelectedDate(d => subDays(d, 1))}>
              {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </Button>
            <div className="text-center">
              <p className="font-bold text-lg">{format(selectedDate, 'EEEE', { locale })}</p>
              <p className="text-sm text-muted-foreground">{format(selectedDate, 'dd MMMM yyyy', { locale })}</p>
            </div>
            <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px]" onClick={() => setSelectedDate(d => addDays(d, 1))}>
              {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </Button>
          </div>
          {!isToday(selectedDate) && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedDate(new Date())}>
                {isRTL ? 'חזרה להיום' : 'Back to Today'}
              </Button>
            </div>
          )}

          <Card className="bg-card border-border overflow-hidden">
            {/* All-day row */}
            {allDayTasks.length > 0 && (
              <div className="border-b border-border bg-muted/20 px-4 py-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{isRTL ? 'כל היום' : 'All Day'}</p>
                <div className="flex flex-wrap gap-2">
                  {allDayTasks.map(t => (
                    <button
                      key={t.id}
                      className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all min-h-[36px]', typeBg[t.task_type])}
                      onClick={() => { setSelectedTask(t); setTaskDetailOpen(true); }}
                    >
                      <span>{typeIcons[t.task_type]}</span>
                      <span className={t.is_completed ? 'line-through opacity-60' : ''}>{t.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hourly grid */}
            <div className="overflow-y-auto h-[calc(100vh-18rem)]" ref={dayViewRef}>
              {HOURS.map(hour => {
                const hourTasks = tasksByHour[hour] || [];
                const isCurrentHour = isToday(selectedDate) && new Date().getHours() === hour;
                return (
                  <div
                    key={hour}
                    data-hour={hour}
                    className={cn(
                      'flex min-h-[56px] border-b border-border/50 group',
                      isCurrentHour && 'bg-primary/5'
                    )}
                  >
                    {/* Hour label */}
                    <div className={cn(
                      'w-16 shrink-0 px-3 py-2 text-xs text-muted-foreground font-mono border-e border-border/50 flex flex-col justify-start pt-2',
                      isCurrentHour && 'text-primary font-bold'
                    )}>
                      {String(hour).padStart(2, '0')}:00
                    </div>

                    {/* Task slot */}
                    <div
                      className="flex-1 px-2 py-1.5 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => hourTasks.length === 0 && openCreateWithHour(hour)}
                    >
                      {hourTasks.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors select-none">
                          + {isRTL ? 'הוסף אירוע' : 'Add event'}
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {hourTasks.map(t => (
                            <button
                              key={t.id}
                              className={cn(
                                'w-full text-start px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all min-h-[36px]',
                                typeBg[t.task_type],
                                t.is_completed && 'opacity-50'
                              )}
                              onClick={(e) => { e.stopPropagation(); setSelectedTask(t); setTaskDetailOpen(true); }}
                            >
                              <span>{typeIcons[t.task_type]}</span>
                              <span className={cn('flex-1 truncate', t.is_completed && 'line-through')}>
                                {t.title}
                              </span>
                              {t.due_time && <span className="text-[10px] opacity-70 shrink-0">{t.due_time.slice(0, 5)}</span>}
                              {t.location && <MapPin className="w-3 h-3 opacity-60 shrink-0" />}
                              {t.meeting_link && <Link2 className="w-3 h-3 opacity-60 shrink-0" />}
                              {t.source && t.source !== 'manual' && (
                                <Badge variant="outline" className="text-[8px] px-1 h-3 shrink-0">
                                  {isRTL ? 'יומן' : 'Cal'}
                                </Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Empty state */}
          {selectedDateTasks.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'לא נמצאו אירועים היום — לחץ על שעה כלשהי להוספת משימה' : 'No events today — click any hour slot to add a task'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ WEEK VIEW ═══ */}
      {viewMode === 'week' && (
        <div className="space-y-4">
          {/* Week nav */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px]" onClick={() => setSelectedDate(d => subDays(d, 7))}>
              {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </Button>
            <div className="text-center">
              <p className="font-bold text-base">
                {format(weekStart, 'd MMM', { locale })} – {format(weekEnd, 'd MMM yyyy', { locale })}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px]" onClick={() => setSelectedDate(d => addDays(d, 7))}>
              {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </Button>
          </div>

          {/* Back to today */}
          {!weekDays.some(d => isToday(d)) && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedDate(new Date())}>
                {isRTL ? 'חזרה להיום' : 'Back to Today'}
              </Button>
            </div>
          )}

          {/* 7 columns */}
          {isLoading ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-2 space-y-2">
                  <Skeleton className="h-5 w-12 mx-auto" />
                  <Skeleton className="h-8 w-8 rounded-full mx-auto" />
                  <Skeleton className="h-10 w-full rounded" />
                  <Skeleton className="h-10 w-full rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2 overflow-x-auto">
              {weekDays.map(day => {
                const dayTasks = tasksForDate(day);
                const isSel = isSameDay(day, selectedDate);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'min-w-[120px] rounded-lg border p-2 space-y-1.5 cursor-pointer transition-all',
                      isSel ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30',
                      isToday(day) && !isSel && 'border-primary/50'
                    )}
                    onClick={() => { setSelectedDate(day); setViewMode('day'); }}
                  >
                    <div className="text-center">
                      <p className={cn('text-xs font-medium', isToday(day) && 'text-primary')}>
                        {format(day, 'EEE', { locale })}
                      </p>
                      <p className={cn('text-lg font-bold', isToday(day) && 'text-primary')}>
                        {format(day, 'd')}
                      </p>
                    </div>
                    <div className="space-y-1 max-h-[calc(100vh-22rem)] overflow-y-auto">
                      {dayTasks.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground text-center py-4">
                          {isRTL ? 'ריק' : 'Empty'}
                        </p>
                      ) : (
                        dayTasks.map(t => (
                          <div
                            key={t.id}
                            className={cn(
                              'px-2 py-1.5 rounded border text-xs cursor-pointer',
                              typeBg[t.task_type],
                              t.is_completed && 'opacity-50'
                            )}
                            onClick={e => { e.stopPropagation(); setSelectedTask(t); setTaskDetailOpen(true); }}
                          >
                            <span className={t.is_completed ? 'line-through' : ''}>{t.title}</span>
                            {t.due_time && <span className="block text-[10px] opacity-70">{t.due_time.slice(0, 5)}</span>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ CALENDAR VIEW ═══ */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px]" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </Button>
                <h3 className="text-base font-semibold">{format(currentMonth, 'MMMM yyyy', { locale })}</h3>
                <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px]" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-7 mb-2">
                {dayNames.map((d) => (
                  <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {calDays.map((day) => {
                  const dayTasks = tasksForDate(day);
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const hasTasks = dayTasks.length > 0;
                  const hasUrgent = dayTasks.some((t) => t.priority === 'urgent' && !t.is_completed);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => { setSelectedDate(day); setViewMode('day'); }}
                      className={cn(
                        'relative aspect-square flex flex-col items-center justify-start p-1 rounded-lg transition-all text-xs min-h-[44px]',
                        !isCurrentMonth && 'opacity-30',
                        isSelected && 'bg-primary text-primary-foreground',
                        !isSelected && isToday(day) && 'border border-primary text-primary',
                        !isSelected && !isToday(day) && 'hover:bg-muted/50',
                        isPast(day) && !isToday(day) && !isSelected && 'text-muted-foreground',
                      )}
                    >
                      <span className="font-medium">{format(day, 'd')}</span>
                      {hasTasks && (
                        <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                          {dayTasks.slice(0, 3).map((_, i) => (
                            <span key={i} className={cn('w-1.5 h-1.5 rounded-full', hasUrgent ? 'bg-red-400' : isSelected ? 'bg-primary-foreground' : 'bg-primary')} />
                          ))}
                          {dayTasks.length > 3 && <span className={cn('text-[8px]', isSelected ? 'text-primary-foreground' : 'text-muted-foreground')}>+{dayTasks.length - 3}</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex justify-center">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>
                  {isRTL ? 'חזרה להיום' : 'Today'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                {format(selectedDate, 'EEEE, d MMMM', { locale })}
                {selectedDateTasks.length > 0 && <Badge variant="secondary" className="text-xs">{selectedDateTasks.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 h-[calc(100vh-22rem)] overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3 p-3">
                      <Skeleton className="w-4 h-4 rounded-full mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <div className="flex gap-1.5">
                          <Skeleton className="h-5 w-16 rounded-full" />
                          <Skeleton className="h-5 w-12 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedDateTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">{isRTL ? 'אין משימות ביום זה' : 'No tasks this day'}</p>
                  <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => { setNewDueDate(selectedDate); setAddDialogOpen(true); }}>
                    <Plus className="w-3 h-3 me-1" />{isRTL ? 'הוסף משימה' : 'Add task'}
                  </Button>
                </div>
              ) : (
                selectedDateTasks.map((task) => (
                  <TaskCard key={task.id} task={task} isRTL={isRTL}
                    onToggle={() => toggleCompleteMutation.mutate({ id: task.id, is_completed: task.is_completed })}
                    onDelete={() => confirmDelete(task.id)}
                    onClick={() => { setSelectedTask(task); setTaskDetailOpen(true); }}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ LIST VIEW ═══ */}
      {viewMode === 'list' && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-2 h-[calc(100vh-16rem)] overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-3">
                    <Skeleton className="w-4 h-4 rounded-full mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <div className="flex gap-1.5">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-12 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">{isRTL ? 'אין משימות' : 'No tasks yet'}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 me-2" />{isRTL ? 'הוסף משימה ראשונה' : 'Add first task'}
                </Button>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <TaskCard key={task.id} task={task} isRTL={isRTL} showDate
                  onToggle={() => toggleCompleteMutation.mutate({ id: task.id, is_completed: task.is_completed })}
                  onDelete={() => confirmDelete(task.id)}
                  onClick={() => { setSelectedTask(task); setTaskDetailOpen(true); }}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ TASK DETAIL DIALOG ═══ */}
      <Dialog open={taskDetailOpen} onOpenChange={setTaskDetailOpen}>
        {selectedTask && (
          <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{typeIcons[selectedTask.task_type]}</span>
                <span className={selectedTask.is_completed ? 'line-through opacity-60' : ''}>{selectedTask.title}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={cn('text-xs', typeColors[selectedTask.task_type])}>
                  {typeIcons[selectedTask.task_type]} {isRTL ? typeLabels[selectedTask.task_type].he : typeLabels[selectedTask.task_type].en}
                </Badge>
                <Badge variant="outline" className={cn('text-xs', priorityColors[selectedTask.priority])}>
                  {isRTL ? priorityLabels[selectedTask.priority].he : priorityLabels[selectedTask.priority].en}
                </Badge>
                {selectedTask.source && selectedTask.source !== 'manual' && (
                  <Badge variant="secondary" className="text-xs">{isRTL ? 'מיומן Google' : 'From Google Calendar'}</Badge>
                )}
              </div>

              {selectedTask.description && (
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
              )}

              <div className="space-y-1.5 text-sm">
                {selectedTask.due_date && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>{format(parseISO(selectedTask.due_date), 'dd MMMM yyyy', { locale })}</span>
                    {selectedTask.due_time && <span className="font-medium text-foreground">{selectedTask.due_time.slice(0, 5)}</span>}
                  </div>
                )}
                {selectedTask.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>{selectedTask.location}</span>
                  </div>
                )}
                {selectedTask.meeting_link && (
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <a href={selectedTask.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs truncate">{selectedTask.meeting_link}</a>
                  </div>
                )}
                {selectedTask.related_candidate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="w-4 h-4 shrink-0" />
                    <span>{selectedTask.related_candidate}</span>
                  </div>
                )}
              </div>

              {(selectedTask.external_attendees as ExternalAttendee[] || []).length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isRTL ? 'משתתפים חיצוניים' : 'External Attendees'}</p>
                  {(selectedTask.external_attendees as ExternalAttendee[]).map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>{a.name} — <a href={`mailto:${a.email}`} className="text-primary hover:underline">{a.email}</a></span>
                    </div>
                  ))}
                </div>
              )}

              {/* Calendar export buttons */}
              {selectedTask.due_date && (
                <div className="flex gap-2">
                  <a
                    href={buildGoogleCalendarUrl(selectedTask)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-xs font-medium min-h-[44px]"
                  >
                    <span>📅</span>
                    {isRTL ? 'יומן Google' : 'Google Calendar'}
                  </a>
                  <button
                    onClick={() => downloadICS(selectedTask)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-xs font-medium min-h-[44px]"
                  >
                    <span>⬇️</span>
                    {isRTL ? 'הורד .ics' : 'Download .ics'}
                  </button>
                </div>
              )}
              {selectedTask.reminder_minutes_before != null && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  {isRTL
                    ? `תזכורת ${selectedTask.reminder_minutes_before < 60
                        ? `${selectedTask.reminder_minutes_before} דקות לפני`
                        : selectedTask.reminder_minutes_before === 60 ? 'שעה לפני'
                        : selectedTask.reminder_minutes_before === 120 ? 'שעתיים לפני'
                        : 'יום לפני'}`
                    : `Reminder ${selectedTask.reminder_minutes_before < 60
                        ? `${selectedTask.reminder_minutes_before} min before`
                        : selectedTask.reminder_minutes_before === 60 ? '1 hour before'
                        : selectedTask.reminder_minutes_before === 120 ? '2 hours before'
                        : '1 day before'}`}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => toggleCompleteMutation.mutate({ id: selectedTask.id, is_completed: selectedTask.is_completed })}
                >
                  {selectedTask.is_completed ? <Circle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {selectedTask.is_completed ? (isRTL ? 'ביטול השלמה' : 'Reopen') : (isRTL ? 'סמן כהושלם' : 'Complete')}
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="min-w-[44px] min-h-[44px]"
                  onClick={() => confirmDelete(selectedTask.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ═══ DELETE CONFIRMATION ═══ */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'מחיקת משימה' : 'Delete Task'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? 'האם אתה בטוח שברצונך למחוק משימה זו? פעולה זו לא ניתנת לביטול.'
                : 'Are you sure you want to delete this task? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isRTL ? 'מחק' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══ TASK CARD COMPONENT ═══

interface TaskCardProps {
  task: ScheduleTask;
  isRTL: boolean;
  showDate?: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onClick?: () => void;
}

function TaskCard({ task, isRTL, showDate, onToggle, onDelete, onClick }: TaskCardProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer',
        task.is_completed ? 'bg-muted/20 border-border/50 opacity-60' : 'bg-card border-border hover:border-primary/30'
      )}
      onClick={onClick}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="mt-0.5 flex-shrink-0 p-1 -m-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
      >
        {task.is_completed ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <span className="text-sm">{typeIcons[task.task_type]}</span>
          <span className={cn('text-sm font-medium', task.is_completed && 'line-through text-muted-foreground')}>{task.title}</span>
          {task.source && task.source !== 'manual' && <Badge variant="outline" className="text-[9px] px-1 h-3.5">{isRTL ? 'יומן' : 'Cal'}</Badge>}
        </div>
        {task.description && <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">{task.description}</p>}
        <div className="flex flex-wrap gap-1.5 items-center">
          <Badge variant="outline" className={cn('text-xs py-0', typeColors[task.task_type])}>
            {typeIcons[task.task_type]} {isRTL ? typeLabels[task.task_type].he : typeLabels[task.task_type].en}
          </Badge>
          <Badge variant="outline" className={cn('text-xs py-0', priorityColors[task.priority])}>
            {isRTL ? priorityLabels[task.priority].he : priorityLabels[task.priority].en}
          </Badge>
          {showDate && task.due_date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(parseISO(task.due_date), 'dd/MM')}
              {task.due_time && ` ${task.due_time.slice(0, 5)}`}
            </span>
          )}
          {!showDate && task.due_time && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />{task.due_time.slice(0, 5)}
            </span>
          )}
          {task.location && <MapPin className="w-3 h-3 text-muted-foreground" />}
          {task.meeting_link && <Link2 className="w-3 h-3 text-muted-foreground" />}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 p-2.5 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={isRTL ? 'מחק משימה' : 'Delete task'}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
