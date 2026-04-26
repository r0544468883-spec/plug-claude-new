import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { STAGE_MAP } from './stageConfig';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, CalendarDays, Plus, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

const KANBAN_COLUMNS = [
  { id: 'application', he: 'הגשה',    en: 'Applied',     targetStage: 'applied',        groups: ['application'], accent: 'border-t-indigo-400', calendarType: null },
  { id: 'screening',   he: 'סינון',   en: 'Screening',   targetStage: 'screening',       groups: ['screening'],   accent: 'border-t-blue-400',   calendarType: 'phone_call' },
  { id: 'interview',   he: 'ראיונות', en: 'Interview',   targetStage: 'interview',       groups: ['interview'],   accent: 'border-t-purple-400', calendarType: 'interview' },
  { id: 'assignment',  he: 'מטלות',   en: 'Assignment',  targetStage: 'home_assignment', groups: ['assignment'],  accent: 'border-t-orange-400', calendarType: 'home_assignment' },
  { id: 'final',       he: 'הצעה',    en: 'Offer',       targetStage: 'offer',           groups: ['final'],       accent: 'border-t-emerald-400', calendarType: 'followup' },
  { id: 'terminal',    he: 'נדחה',    en: 'Rejected',    targetStage: 'rejected',        groups: ['terminal'],    accent: 'border-t-red-400',    calendarType: null },
];

interface KanbanApplication {
  id: string;
  current_stage: string;
  match_score: number | null;
  job_title?: string | null;
  job_company?: string | null;
  job: {
    title: string;
    company: { name: string; logo_url: string | null } | null;
  } | null;
}

interface KanbanViewProps {
  applications: KanbanApplication[];
  onStageChange: (id: string, stage: string) => void;
  onViewDetails: (app: KanbanApplication) => void;
  onNavigateToSchedule: () => void;
}

interface PendingCalendar {
  app: KanbanApplication;
  taskType: string;
}

export function KanbanView({ applications, onStageChange, onViewDetails, onNavigateToSchedule }: KanbanViewProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [pendingCalendar, setPendingCalendar] = useState<PendingCalendar | null>(null);

  // Calendar dialog state
  const [calDate, setCalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [calTime, setCalTime] = useState('10:00');
  const [calType, setCalType] = useState('interview');

  // Option 2: Query linked tasks for all app IDs
  const appIds = useMemo(() => applications.map(a => a.id), [applications]);
  const { data: linkedTasks = [] } = useQuery({
    queryKey: ['kanban-linked-tasks', user?.id, appIds.join(',')],
    queryFn: async () => {
      if (!user || appIds.length === 0) return [];
      const { data } = await (supabase as any)
        .from('schedule_tasks')
        .select('id, source_id, title, due_date, due_time, task_type, is_completed')
        .eq('user_id', user.id)
        .in('source_id', appIds);
      return (data || []) as { id: string; source_id: string; title: string; due_date: string | null; due_time: string | null; task_type: string; is_completed: boolean }[];
    },
    enabled: !!user && appIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // Map: appId → tasks[]
  const tasksByApp = useMemo(() => {
    const map: Record<string, typeof linkedTasks> = {};
    linkedTasks.forEach(t => {
      if (!map[t.source_id]) map[t.source_id] = [];
      map[t.source_id].push(t);
    });
    return map;
  }, [linkedTasks]);

  // Mutation: create a schedule task
  const createTaskMutation = useMutation({
    mutationFn: async ({ app, taskType, date, time }: { app: KanbanApplication; taskType: string; date: string; time: string }) => {
      if (!user) throw new Error('Not authenticated');
      const title = app.job?.title || app.job_title || (isRTL ? 'ראיון' : 'Interview');
      const company = app.job?.company?.name || app.job_company || '';
      const taskTitle = isRTL
        ? `${title}${company ? ` — ${company}` : ''}`
        : `${title}${company ? ` @ ${company}` : ''}`;

      const { error } = await (supabase as any).from('schedule_tasks').insert({
        user_id: user.id,
        title: taskTitle,
        due_date: date,
        due_time: time,
        task_type: taskType,
        priority: 'high',
        is_completed: false,
        source: 'kanban',
        source_id: app.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'נוסף ליומן!' : 'Added to calendar!');
      queryClient.invalidateQueries({ queryKey: ['kanban-linked-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      setPendingCalendar(null);
    },
    onError: () => toast.error(isRTL ? 'שגיאה ביצירת אירוע' : 'Error creating event'),
  });

  const getColApps = (groups: string[]) =>
    applications.filter(app => {
      const stageKey = app.current_stage || 'applied';
      const stage = STAGE_MAP[stageKey] || STAGE_MAP['applied'];
      return groups.includes(stage.group);
    });

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  };

  const handleDrop = (e: React.DragEvent, col: typeof KANBAN_COLUMNS[0]) => {
    e.preventDefault();
    if (!draggedId) return;

    onStageChange(draggedId, col.targetStage);

    // Option 1: offer calendar prompt for relevant stages
    if (col.calendarType) {
      const app = applications.find(a => a.id === draggedId);
      if (app) {
        setCalType(col.calendarType);
        setCalDate(format(new Date(), 'yyyy-MM-dd'));
        setCalTime('10:00');
        setPendingCalendar({ app, taskType: col.calendarType });
      }
    }

    setDraggedId(null);
    setDragOverCol(null);
  };

  // Option 3: "+" button on card to manually add to calendar
  const openCalendarForApp = (e: React.MouseEvent, app: KanbanApplication) => {
    e.stopPropagation();
    const stageKey = app.current_stage || 'applied';
    const stage = STAGE_MAP[stageKey];
    const col = KANBAN_COLUMNS.find(c => c.groups.includes(stage?.group || ''));
    setCalType(col?.calendarType || 'reminder');
    setCalDate(format(new Date(), 'yyyy-MM-dd'));
    setCalTime('10:00');
    setPendingCalendar({ app, taskType: col?.calendarType || 'reminder' });
  };

  const typeOptions = [
    { value: 'interview',         label: isRTL ? 'ראיון' : 'Interview' },
    { value: 'phone_call',        label: isRTL ? 'שיחת טלפון' : 'Phone Call' },
    { value: 'frontal_interview', label: isRTL ? 'ראיון פרונטלי' : 'Frontal Interview' },
    { value: 'home_assignment',   label: isRTL ? 'מטלת בית' : 'Home Assignment' },
    { value: 'followup',          label: isRTL ? 'מעקב' : 'Follow-up' },
    { value: 'reminder',          label: isRTL ? 'תזכורת' : 'Reminder' },
  ];

  return (
    <>
      <div className="overflow-x-auto pb-2" dir="ltr">
        <div className="flex gap-3 min-w-[960px]">
          {KANBAN_COLUMNS.map(col => {
            const colApps = getColApps(col.groups);
            const isOver = dragOverCol === col.id;

            return (
              <div
                key={col.id}
                className={cn(
                  'flex-1 min-w-[150px] rounded-lg border border-border bg-muted/30 flex flex-col border-t-2 transition-colors',
                  col.accent,
                  isOver && 'bg-primary/5 border-primary/30',
                )}
                onDragOver={e => handleDragOver(e, col.id)}
                onDrop={e => handleDrop(e, col)}
                onDragLeave={() => setDragOverCol(null)}
              >
                {/* Column header */}
                <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
                  <span className="text-xs font-semibold">{isRTL ? col.he : col.en}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                    {colApps.length}
                  </Badge>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 flex-1 min-h-[180px]">
                  {colApps.map(app => {
                    const title = app.job?.title || app.job_title || (isRTL ? 'משרה לא ידועה' : 'Unknown job');
                    const company = app.job?.company?.name || app.job_company || '';
                    const logo = app.job?.company?.logo_url;
                    const appTasks = tasksByApp[app.id] || [];
                    const pendingTasks = appTasks.filter(t => !t.is_completed);

                    return (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={e => handleDragStart(e, app.id)}
                        onDragEnd={() => { setDraggedId(null); setDragOverCol(null); }}
                        onClick={() => onViewDetails(app as any)}
                        className={cn(
                          'group bg-card border border-border rounded-lg p-2.5 cursor-grab active:cursor-grabbing',
                          'hover:border-primary/40 hover:shadow-sm transition-all select-none',
                          draggedId === app.id && 'opacity-40 scale-95',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {logo ? (
                            <img src={logo} alt={company} className="w-6 h-6 rounded object-contain flex-shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-snug line-clamp-2">{title}</p>
                            {company && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{company}</p>}
                          </div>
                        </div>

                        {/* Bottom row: match score + calendar badges + add button */}
                        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                          {app.match_score != null && (
                            <span className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                              app.match_score >= 80 ? 'bg-emerald-500/10 text-emerald-600' :
                              app.match_score >= 60 ? 'bg-blue-500/10 text-blue-600' :
                              'bg-amber-500/10 text-amber-600'
                            )}>
                              {app.match_score}%
                            </span>
                          )}

                          {/* Option 2: Badge for linked tasks */}
                          {pendingTasks.length > 0 && (
                            <button
                              onClick={e => { e.stopPropagation(); onNavigateToSchedule(); }}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors cursor-pointer"
                              title={isRTL ? `${pendingTasks.length} אירועים ביומן` : `${pendingTasks.length} calendar event(s)`}
                            >
                              <CalendarDays className="w-3 h-3" />
                              <span className="text-[10px] font-medium">{pendingTasks.length}</span>
                            </button>
                          )}

                          {/* Option 3: Add to calendar button (visible on hover) */}
                          <button
                            onClick={e => openCalendarForApp(e, app)}
                            className={cn(
                              'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full transition-colors cursor-pointer',
                              'bg-muted/0 text-muted-foreground/0 group-hover:bg-muted/60 group-hover:text-muted-foreground',
                            )}
                            title={isRTL ? 'הוסף ליומן' : 'Add to calendar'}
                          >
                            <Plus className="w-3 h-3" />
                            <Calendar className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {colApps.length === 0 && (
                    <div className={cn(
                      'min-h-[80px] rounded border-2 border-dashed border-border/40 flex items-center justify-center transition-colors',
                      isOver && 'border-primary/50 bg-primary/5'
                    )}>
                      <span className="text-[10px] text-muted-foreground/40">
                        {isRTL ? 'גרור לכאן' : 'Drop here'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Option 1 + 3: Quick calendar dialog */}
      <Dialog open={!!pendingCalendar} onOpenChange={open => { if (!open) setPendingCalendar(null); }}>
        <DialogContent className="max-w-sm" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-primary" />
              {isRTL ? 'הוסף ליומן החיפוש' : 'Add to Schedule'}
            </DialogTitle>
          </DialogHeader>

          {pendingCalendar && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {pendingCalendar.app.job?.title || pendingCalendar.app.job_title}
                {(pendingCalendar.app.job?.company?.name || pendingCalendar.app.job_company)
                  ? ` · ${pendingCalendar.app.job?.company?.name || pendingCalendar.app.job_company}`
                  : ''}
              </p>

              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'סוג' : 'Type'}</Label>
                <Select value={calType} onValueChange={setCalType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{isRTL ? 'תאריך' : 'Date'}</Label>
                  <Input
                    type="date"
                    value={calDate}
                    onChange={e => setCalDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{isRTL ? 'שעה' : 'Time'}</Label>
                  <Input
                    type="time"
                    value={calTime}
                    onChange={e => setCalTime(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => createTaskMutation.mutate({
                    app: pendingCalendar.app,
                    taskType: calType,
                    date: calDate,
                    time: calTime,
                  })}
                  disabled={createTaskMutation.isPending}
                >
                  <CalendarDays className="w-3.5 h-3.5 me-1.5" />
                  {isRTL ? 'הוסף' : 'Add'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => setPendingCalendar(null)}
                >
                  {isRTL ? 'דלג' : 'Skip'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
