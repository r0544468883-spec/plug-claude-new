import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Globe,
  Loader2,
  RefreshCw,
  PlayCircle,
  PauseCircle,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Wifi,
  WifiOff,
  BarChart2,
  CalendarRange,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BoardStatus = 'draft' | 'scheduled' | 'published' | 'paused' | 'failed';

interface BoardConfig {
  id?: string;
  job_id: string;
  created_by: string;
  channel: string;
  auto_publish: boolean;
  custom_title: string | null;
  custom_description: string | null;
  budget_daily: number | null;
  start_date: string | null;
  end_date: string | null;
  status: BoardStatus;
  external_post_id: string | null;
  external_url: string | null;
  last_synced_at: string | null;
}

interface BoardDefinition {
  key: string;
  nameEn: string;
  nameHe: string;
  color: string;
  letter: string;
  isPaid: boolean;
  isAlwaysOn: boolean;
  isConnected: boolean;
}

// ---------------------------------------------------------------------------
// Board catalogue
// ---------------------------------------------------------------------------

const BOARDS: BoardDefinition[] = [
  { key: 'plug',          nameEn: 'PLUG',          nameHe: 'PLUG',         color: 'bg-violet-600',  letter: 'P', isPaid: false, isAlwaysOn: true,  isConnected: true  },
  { key: 'linkedin',      nameEn: 'LinkedIn',      nameHe: 'LinkedIn',     color: 'bg-blue-600',    letter: 'L', isPaid: true,  isAlwaysOn: false, isConnected: false },
  { key: 'indeed',        nameEn: 'Indeed',        nameHe: 'Indeed',       color: 'bg-sky-500',     letter: 'I', isPaid: true,  isAlwaysOn: false, isConnected: false },
  { key: 'glassdoor',     nameEn: 'Glassdoor',     nameHe: 'Glassdoor',    color: 'bg-green-600',   letter: 'G', isPaid: false, isAlwaysOn: false, isConnected: false },
  { key: 'alljobs',       nameEn: 'AllJobs',       nameHe: 'AllJobs',      color: 'bg-orange-500',  letter: 'A', isPaid: true,  isAlwaysOn: false, isConnected: false },
  { key: 'drushim',       nameEn: 'Drushim',       nameHe: 'דרושים',       color: 'bg-red-500',     letter: 'ד', isPaid: true,  isAlwaysOn: false, isConnected: false },
  { key: 'google_jobs',   nameEn: 'Google Jobs',   nameHe: 'Google Jobs',  color: 'bg-yellow-500',  letter: 'G', isPaid: false, isAlwaysOn: false, isConnected: true  },
  { key: 'facebook_jobs', nameEn: 'Facebook Jobs', nameHe: 'פייסבוק Jobs', color: 'bg-blue-700',    letter: 'F', isPaid: true,  isAlwaysOn: false, isConnected: false },
  { key: 'jobmaster',     nameEn: 'JobMaster',     nameHe: 'JobMaster',    color: 'bg-teal-600',    letter: 'J', isPaid: true,  isAlwaysOn: false, isConnected: false },
  { key: 'gotfriends',    nameEn: 'GotFriends',    nameHe: 'GotFriends',   color: 'bg-pink-500',    letter: 'G', isPaid: false, isAlwaysOn: false, isConnected: false },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_META: Record<BoardStatus, { en: string; he: string; className: string }> = {
  draft:     { en: 'Draft',      he: 'טיוטה',    className: 'border-muted-foreground/30 text-muted-foreground' },
  scheduled: { en: 'Scheduled',  he: 'מתוזמן',   className: 'border-yellow-500/40 text-yellow-600' },
  published: { en: 'Published',  he: 'פורסם',    className: 'border-green-500/40 text-green-600' },
  paused:    { en: 'Paused',     he: 'מושהה',    className: 'border-orange-500/40 text-orange-600' },
  failed:    { en: 'Failed',     he: 'נכשל',     className: 'border-destructive/40 text-destructive' },
};

function statusIcon(status: BoardStatus) {
  if (status === 'published') return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  if (status === 'failed')    return <XCircle      className="h-3.5 w-3.5 text-destructive" />;
  if (status === 'paused')    return <PauseCircle  className="h-3.5 w-3.5 text-orange-500" />;
  if (status === 'scheduled') return <CalendarClock className="h-3.5 w-3.5 text-yellow-500" />;
  return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
}

function fmtDate(iso: string | null, isRTL: boolean) {
  if (!iso) return isRTL ? 'לא סונכרן' : 'Never synced';
  try { return format(parseISO(iso), 'dd MMM HH:mm'); } catch { return iso; }
}

// ---------------------------------------------------------------------------
// Default config factory
// ---------------------------------------------------------------------------

function makeDefault(jobId: string, userId: string, channel: string): BoardConfig {
  return {
    job_id: jobId,
    created_by: userId,
    channel,
    auto_publish: channel === 'plug',
    custom_title: null,
    custom_description: null,
    budget_daily: null,
    start_date: null,
    end_date: null,
    status: 'draft',
    external_post_id: null,
    external_url: null,
    last_synced_at: null,
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MultiboardPublisherProps {
  jobId: string;
  jobTitle?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MultiboardPublisher({ jobId, jobTitle }: MultiboardPublisherProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  // Local UI state
  const [expandedBoard, setExpandedBoard] = useState<string | null>(null);
  const [enabledBoards, setEnabledBoards] = useState<Set<string>>(new Set(['plug']));
  const [editingConfig, setEditingConfig] = useState<BoardConfig | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduledBoards, setScheduledBoards] = useState<string[]>([]);

  // Per-board draft edits (keyed by channel)
  const [draftEdits, setDraftEdits] = useState<Record<string, Partial<BoardConfig>>>({});

  // ---------------------------------------------------------------------------
  // Query: fetch existing configs
  // ---------------------------------------------------------------------------

  const { data: configs = [], isLoading } = useQuery<BoardConfig[]>({
    queryKey: ['job-board-configs', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_board_configs' as any)
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const rows = (data || []) as BoardConfig[];
      // Sync enabled set from persisted data
      const enabled = new Set(rows.filter(r => r.status !== 'draft' || r.auto_publish).map(r => r.channel));
      enabled.add('plug');
      setEnabledBoards(enabled);
      return rows;
    },
    enabled: !!jobId && !!user,
  });

  // ---------------------------------------------------------------------------
  // Derive a merged config map: persisted OR default
  // ---------------------------------------------------------------------------

  function getConfig(channel: string): BoardConfig {
    const persisted = configs.find(c => c.channel === channel);
    const draft = draftEdits[channel] ?? {};
    const base = persisted ?? makeDefault(jobId, user?.id ?? '', channel);
    return { ...base, ...draft };
  }

  // ---------------------------------------------------------------------------
  // Mutation: upsert a single board config
  // ---------------------------------------------------------------------------

  const upsertMutation = useMutation({
    mutationFn: async (config: BoardConfig) => {
      const payload = { ...config };
      if (config.id) {
        const { error } = await supabase
          .from('job_board_configs' as any)
          .update(payload)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('job_board_configs' as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-board-configs', jobId] });
    },
    onError: (e: Error) => {
      toast.error(isRTL ? `שגיאה: ${e.message}` : `Error: ${e.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // Publish selected
  // ---------------------------------------------------------------------------

  async function handlePublishSelected() {
    const targets = Array.from(enabledBoards);
    if (!targets.length) {
      toast.warning(isRTL ? 'לא נבחרו לוחות' : 'No boards selected');
      return;
    }

    let successCount = 0;
    for (const channel of targets) {
      const cfg = getConfig(channel);
      try {
        await upsertMutation.mutateAsync({ ...cfg, status: 'published', last_synced_at: new Date().toISOString() });
        successCount++;
      } catch {
        // error toasted in onError
      }
    }

    if (successCount > 0) {
      toast.success(
        isRTL
          ? `פורסם ב-${successCount} לוחות בהצלחה`
          : `Published to ${successCount} board${successCount > 1 ? 's' : ''} successfully`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Pause / Resume all
  // ---------------------------------------------------------------------------

  async function handlePauseAll() {
    const published = configs.filter(c => c.status === 'published');
    for (const cfg of published) {
      await upsertMutation.mutateAsync({ ...cfg, status: 'paused' });
    }
    toast.success(isRTL ? 'כל הפרסומים הושהו' : 'All publications paused');
  }

  async function handleResumeAll() {
    const paused = configs.filter(c => c.status === 'paused');
    for (const cfg of paused) {
      await upsertMutation.mutateAsync({ ...cfg, status: 'published', last_synced_at: new Date().toISOString() });
    }
    toast.success(isRTL ? 'כל הפרסומים חודשו' : 'All publications resumed');
  }

  // ---------------------------------------------------------------------------
  // Schedule
  // ---------------------------------------------------------------------------

  function openScheduleDialog() {
    setScheduledBoards(Array.from(enabledBoards));
    setScheduleAt('');
    setScheduleDialogOpen(true);
  }

  async function handleScheduleConfirm() {
    if (!scheduleAt) {
      toast.warning(isRTL ? 'נא לבחור תאריך ושעה' : 'Please select a date and time');
      return;
    }
    for (const channel of scheduledBoards) {
      const cfg = getConfig(channel);
      await upsertMutation.mutateAsync({
        ...cfg,
        status: 'scheduled',
        start_date: new Date(scheduleAt).toISOString(),
      });
    }
    setScheduleDialogOpen(false);
    toast.success(isRTL ? 'פרסום תוזמן בהצלחה' : 'Publication scheduled successfully');
  }

  // ---------------------------------------------------------------------------
  // Save per-board config edits
  // ---------------------------------------------------------------------------

  async function handleSaveConfig(channel: string) {
    const cfg = getConfig(channel);
    await upsertMutation.mutateAsync(cfg);
    // Clear draft edits for this channel after save
    setDraftEdits(prev => {
      const next = { ...prev };
      delete next[channel];
      return next;
    });
    toast.success(isRTL ? 'ההגדרות נשמרו' : 'Config saved');
  }

  // ---------------------------------------------------------------------------
  // Summary stats
  // ---------------------------------------------------------------------------

  const publishedCount = configs.filter(c => c.status === 'published').length;
  const totalApplications = 0; // Would come from a join query in a real implementation
  const lastSynced = configs
    .map(c => c.last_synced_at)
    .filter(Boolean)
    .sort()
    .reverse()[0] ?? null;

  // ---------------------------------------------------------------------------
  // Toggle board enabled
  // ---------------------------------------------------------------------------

  function toggleBoard(key: string, isAlwaysOn: boolean) {
    if (isAlwaysOn) return;
    setEnabledBoards(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{isRTL ? 'טוען...' : 'Loading...'}</span>
      </div>
    );
  }

  const isPending = upsertMutation.isPending;
  const hasAnyPaused = configs.some(c => c.status === 'paused');
  const hasAnyPublished = configs.some(c => c.status === 'published');

  return (
    <div className={cn('space-y-4', isRTL && 'rtl')} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ------------------------------------------------------------------ */}
      {/* Status Summary Bar                                                  */}
      {/* ------------------------------------------------------------------ */}
      <Card className="border-border/60 bg-muted/30">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-violet-500" />
              <span className="font-medium text-foreground">
                {publishedCount}
              </span>
              <span className="text-muted-foreground">
                {isRTL ? 'לוחות פעילים' : `board${publishedCount !== 1 ? 's' : ''} active`}
              </span>
            </div>

            <Separator orientation="vertical" className="h-4 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <BarChart2 className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-foreground">{totalApplications}</span>
              <span className="text-muted-foreground">
                {isRTL ? 'מועמדויות' : 'applications'}
              </span>
            </div>

            <Separator orientation="vertical" className="h-4 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">
                {isRTL ? 'סונכרן לאחרונה:' : 'Last synced:'}{' '}
                {fmtDate(lastSynced, isRTL)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Action Buttons                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handlePublishSelected}
          disabled={isPending || enabledBoards.size === 0}
          className="gap-1.5"
          size="sm"
        >
          {isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <PlayCircle className="h-4 w-4" />}
          {isRTL ? 'פרסם נבחרים' : 'Publish Selected'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={openScheduleDialog}
          disabled={isPending}
          className="gap-1.5"
        >
          <CalendarClock className="h-4 w-4" />
          {isRTL ? 'תזמן' : 'Schedule'}
        </Button>

        {hasAnyPublished && (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePauseAll}
            disabled={isPending}
            className="gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50"
          >
            <PauseCircle className="h-4 w-4" />
            {isRTL ? 'השהה הכל' : 'Pause All'}
          </Button>
        )}

        {hasAnyPaused && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResumeAll}
            disabled={isPending}
            className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50"
          >
            <PlayCircle className="h-4 w-4" />
            {isRTL ? 'חדש הכל' : 'Resume All'}
          </Button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Board Grid                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BOARDS.map(board => {
          const cfg = getConfig(board.key);
          const isEnabled = enabledBoards.has(board.key);
          const isExpanded = expandedBoard === board.key;
          const statusMeta = STATUS_META[cfg.status];
          const boardName = isRTL ? board.nameHe : board.nameEn;

          return (
            <Card
              key={board.key}
              className={cn(
                'border transition-all duration-200',
                isEnabled
                  ? 'border-violet-300/60 bg-violet-50/30 dark:bg-violet-950/20'
                  : 'border-border/50 bg-card',
                board.isAlwaysOn && 'border-violet-400/80',
              )}
            >
              <CardContent className="p-3 space-y-0">
                {/* Header row */}
                <div className="flex items-center gap-3">
                  {/* Logo circle */}
                  <div
                    className={cn(
                      'h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm select-none',
                      board.color,
                      !isEnabled && 'opacity-50',
                    )}
                  >
                    {board.letter}
                  </div>

                  {/* Name + connection badge */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn('font-semibold text-sm truncate', !isEnabled && 'text-muted-foreground')}>
                        {boardName}
                      </span>
                      {board.isAlwaysOn && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 border-violet-400/50 text-violet-600">
                          {isRTL ? 'תמיד פעיל' : 'Always on'}
                        </Badge>
                      )}
                      {board.isPaid && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 border-yellow-400/50 text-yellow-600">
                          {isRTL ? 'בתשלום' : 'Paid'}
                        </Badge>
                      )}
                    </div>

                    {/* Connection + sync row */}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={cn('flex items-center gap-1 text-[11px]', board.isConnected ? 'text-green-600' : 'text-muted-foreground')}>
                        {board.isConnected
                          ? <><Wifi className="h-3 w-3" />{isRTL ? 'מחובר' : 'Connected'}</>
                          : <><WifiOff className="h-3 w-3" />{isRTL ? 'לא מחובר' : 'Not connected'}</>}
                      </span>
                      {cfg.last_synced_at && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <RefreshCw className="h-2.5 w-2.5" />
                          {fmtDate(cfg.last_synced_at, isRTL)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side: status badge + toggle + expand */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      {statusIcon(cfg.status)}
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] px-1.5 py-0', statusMeta.className)}
                      >
                        {statusMeta[isRTL ? 'he' : 'en']}
                      </Badge>
                    </div>

                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleBoard(board.key, board.isAlwaysOn)}
                      disabled={board.isAlwaysOn}
                      aria-label={isRTL ? `הפעל ${boardName}` : `Enable ${boardName}`}
                      className="scale-90"
                    />

                    <button
                      onClick={() => setExpandedBoard(isExpanded ? null : board.key)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label={isExpanded ? (isRTL ? 'כווץ' : 'Collapse') : (isRTL ? 'הרחב' : 'Expand')}
                    >
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* External URL link if published */}
                {cfg.external_url && cfg.status === 'published' && (
                  <div className="mt-2">
                    <a
                      href={cfg.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-violet-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {isRTL ? 'צפה בפרסום' : 'View post'}
                    </a>
                  </div>
                )}

                {/* Expanded config panel */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                    {/* Custom title */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {isRTL ? 'כותרת מותאמת (אופציונלי)' : 'Custom title (optional)'}
                      </Label>
                      <Input
                        value={draftEdits[board.key]?.custom_title ?? cfg.custom_title ?? ''}
                        onChange={e =>
                          setDraftEdits(prev => ({
                            ...prev,
                            [board.key]: { ...prev[board.key], custom_title: e.target.value || null },
                          }))
                        }
                        placeholder={jobTitle ?? (isRTL ? 'כותרת המשרה' : 'Job title')}
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Custom description */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {isRTL ? 'תיאור מותאם (אופציונלי)' : 'Custom description (optional)'}
                      </Label>
                      <Textarea
                        value={draftEdits[board.key]?.custom_description ?? cfg.custom_description ?? ''}
                        onChange={e =>
                          setDraftEdits(prev => ({
                            ...prev,
                            [board.key]: { ...prev[board.key], custom_description: e.target.value || null },
                          }))
                        }
                        placeholder={isRTL ? 'תיאור המשרה בלוח זה...' : 'Job description for this board...'}
                        rows={3}
                        className="text-sm resize-none"
                      />
                    </div>

                    {/* Daily budget (paid boards only) */}
                    {board.isPaid && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {isRTL ? 'תקציב יומי (₪)' : 'Daily budget (₪)'}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={draftEdits[board.key]?.budget_daily ?? cfg.budget_daily ?? ''}
                          onChange={e =>
                            setDraftEdits(prev => ({
                              ...prev,
                              [board.key]: {
                                ...prev[board.key],
                                budget_daily: e.target.value ? Number(e.target.value) : null,
                              },
                            }))
                          }
                          placeholder="0"
                          className="h-8 text-sm"
                        />
                      </div>
                    )}

                    {/* Date range */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarRange className="h-3 w-3" />
                          {isRTL ? 'תאריך התחלה' : 'Start date'}
                        </Label>
                        <Input
                          type="date"
                          value={(draftEdits[board.key]?.start_date ?? cfg.start_date ?? '').slice(0, 10)}
                          onChange={e =>
                            setDraftEdits(prev => ({
                              ...prev,
                              [board.key]: {
                                ...prev[board.key],
                                start_date: e.target.value ? new Date(e.target.value).toISOString() : null,
                              },
                            }))
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {isRTL ? 'תאריך סיום' : 'End date'}
                        </Label>
                        <Input
                          type="date"
                          value={(draftEdits[board.key]?.end_date ?? cfg.end_date ?? '').slice(0, 10)}
                          onChange={e =>
                            setDraftEdits(prev => ({
                              ...prev,
                              [board.key]: {
                                ...prev[board.key],
                                end_date: e.target.value ? new Date(e.target.value).toISOString() : null,
                              },
                            }))
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* Auto-publish toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="text-xs font-medium">
                          {isRTL ? 'פרסום אוטומטי' : 'Auto-publish'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {isRTL
                            ? 'פרסם אוטומטית כשמשרה מאושרת'
                            : 'Automatically publish when job is approved'}
                        </p>
                      </div>
                      <Switch
                        checked={draftEdits[board.key]?.auto_publish ?? cfg.auto_publish}
                        onCheckedChange={val =>
                          setDraftEdits(prev => ({
                            ...prev,
                            [board.key]: { ...prev[board.key], auto_publish: val },
                          }))
                        }
                        aria-label={isRTL ? 'פרסום אוטומטי' : 'Auto-publish'}
                      />
                    </div>

                    {/* Save config button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs mt-1"
                      onClick={() => handleSaveConfig(board.key)}
                      disabled={isPending}
                    >
                      {isPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : (isRTL ? 'שמור הגדרות' : 'Save config')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Not-connected notice                                                 */}
      {/* ------------------------------------------------------------------ */}
      {Array.from(enabledBoards).some(k => {
        const board = BOARDS.find(b => b.key === k);
        return board && !board.isConnected;
      }) && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-300/50 bg-yellow-50/50 dark:bg-yellow-950/20 p-3 text-sm">
          <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-700 dark:text-yellow-400 text-xs">
            {isRTL
              ? 'חלק מהלוחות הנבחרים אינם מחוברים עדיין. חיבור חשבונות חיצוניים יתאפשר בקרוב דרך הגדרות החשבון.'
              : 'Some selected boards are not yet connected. External account linking will be available soon in account settings.'}
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Schedule Dialog                                                      */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent
          className={cn('max-w-md', isRTL && 'rtl')}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'תזמן פרסום' : 'Schedule Publication'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Date + time picker */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                {isRTL ? 'תאריך ושעת פרסום' : 'Publish date & time'}
              </Label>
              <Input
                type="datetime-local"
                value={scheduleAt}
                onChange={e => setScheduleAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="h-9"
              />
            </div>

            {/* Board selection for schedule */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                {isRTL ? 'לוחות לתזמון' : 'Boards to schedule'}
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {BOARDS.map(board => (
                  <div key={board.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`sched-${board.key}`}
                      checked={scheduledBoards.includes(board.key)}
                      onCheckedChange={checked => {
                        setScheduledBoards(prev =>
                          checked
                            ? [...prev, board.key]
                            : prev.filter(k => k !== board.key),
                        );
                      }}
                    />
                    <label
                      htmlFor={`sched-${board.key}`}
                      className="text-sm cursor-pointer select-none"
                    >
                      {isRTL ? board.nameHe : board.nameEn}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              {isRTL ? 'ביטול' : 'Cancel'}
            </Button>
            <Button
              onClick={handleScheduleConfirm}
              disabled={isPending || !scheduleAt || scheduledBoards.length === 0}
              className="gap-1.5"
            >
              {isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CalendarClock className="h-4 w-4" />}
              {isRTL ? 'אשר תזמון' : 'Confirm Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
