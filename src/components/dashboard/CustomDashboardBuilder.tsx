import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  Plus,
  Trash2,
  Settings,
  ChevronUp,
  ChevronDown,
  LayoutDashboard,
  Clock,
  Briefcase,
  Users,
  Calendar,
  Gift,
  PieChart,
  Activity,
  Star,
  AlertCircle,
  DollarSign,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  Share2,
  Loader2,
  CheckCircle2,
  Save,
  Copy,
  Pencil,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type WidgetType =
  | 'pipeline_funnel'
  | 'time_to_hire'
  | 'open_jobs'
  | 'applications_today'
  | 'upcoming_interviews'
  | 'offer_status'
  | 'source_breakdown'
  | 'team_activity'
  | 'candidate_nps'
  | 'sla_monitor'
  | 'revenue'
  | 'dei_summary';

type WidgetSize = 'small' | 'medium' | 'large';

interface WidgetConfig {
  widget_type: WidgetType;
  size: WidgetSize;
  position: number;
}

interface CustomDashboard {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  layout: WidgetConfig[];
  is_default: boolean;
  is_shared: boolean;
  created_at?: string;
  updated_at?: string;
}

// ─── Widget Catalog ───────────────────────────────────────────────────────────

interface WidgetMeta {
  type: WidgetType;
  labelEn: string;
  labelHe: string;
  icon: React.ElementType;
  color: string;
  category: 'recruiting' | 'analytics' | 'team' | 'finance';
}

const WIDGET_CATALOG: WidgetMeta[] = [
  { type: 'pipeline_funnel',      labelEn: 'Pipeline Funnel',     labelHe: 'משפך גיוס',         icon: LayoutDashboard, color: 'text-indigo-500',  category: 'recruiting' },
  { type: 'time_to_hire',         labelEn: 'Time to Hire',        labelHe: 'זמן לגיוס',          icon: Clock,           color: 'text-blue-500',    category: 'analytics'  },
  { type: 'open_jobs',            labelEn: 'Open Jobs',           labelHe: 'משרות פתוחות',       icon: Briefcase,       color: 'text-emerald-500', category: 'recruiting' },
  { type: 'applications_today',   labelEn: 'Applications Today',  labelHe: 'מועמדויות היום',     icon: Users,           color: 'text-violet-500',  category: 'recruiting' },
  { type: 'upcoming_interviews',  labelEn: 'Upcoming Interviews', labelHe: 'ראיונות קרובים',     icon: Calendar,        color: 'text-sky-500',     category: 'recruiting' },
  { type: 'offer_status',         labelEn: 'Offer Status',        labelHe: 'סטטוס הצעות',        icon: Gift,            color: 'text-amber-500',   category: 'recruiting' },
  { type: 'source_breakdown',     labelEn: 'Source Breakdown',    labelHe: 'פילוח מקורות',       icon: PieChart,        color: 'text-pink-500',    category: 'analytics'  },
  { type: 'team_activity',        labelEn: 'Team Activity',       labelHe: 'פעילות צוות',        icon: Activity,        color: 'text-orange-500',  category: 'team'       },
  { type: 'candidate_nps',        labelEn: 'Candidate NPS',       labelHe: 'NPS מועמדים',        icon: Star,            color: 'text-yellow-500',  category: 'analytics'  },
  { type: 'sla_monitor',         labelEn: 'SLA Monitor',         labelHe: 'מעקב SLA',           icon: AlertCircle,     color: 'text-red-500',     category: 'analytics'  },
  { type: 'revenue',              labelEn: 'Revenue',             labelHe: 'הכנסות',             icon: DollarSign,      color: 'text-green-500',   category: 'finance'    },
  { type: 'dei_summary',          labelEn: 'DEI Summary',         labelHe: 'סיכום DEI',          icon: Heart,           color: 'text-rose-500',    category: 'team'       },
];

const CATEGORY_LABELS: Record<string, { en: string; he: string }> = {
  recruiting: { en: 'Recruiting',  he: 'גיוס'     },
  analytics:  { en: 'Analytics',   he: 'אנליטיקס' },
  team:       { en: 'Team',        he: 'צוות'     },
  finance:    { en: 'Finance',     he: 'פיננסים'  },
};

const SIZE_LABELS: Record<WidgetSize, { en: string; he: string; cols: number }> = {
  small:  { en: 'Small (1 col)',  he: 'קטן (1 עמודה)',    cols: 1 },
  medium: { en: 'Medium (2 col)', he: 'בינוני (2 עמודות)', cols: 2 },
  large:  { en: 'Large (3 col)',  he: 'גדול (3 עמודות)',  cols: 3 },
};

// ─── Mock widget data fetchers ────────────────────────────────────────────────

function useDashboardStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard-widget-stats', userId],
    queryFn: async () => {
      if (!userId) return {};

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [jobsRes, appsRes, interviewsRes, offersRes] = await Promise.all([
        supabase.from('jobs').select('id, status', { count: 'exact' })
          .or(`created_by.eq.${userId},shared_by_user_id.eq.${userId}`)
          .eq('status', 'open') as any,
        supabase.from('applications').select('id, created_at, current_stage', { count: 'exact' })
          .gte('created_at', today.toISOString()) as any,
        supabase.from('interviews').select('id, scheduled_at').gte('scheduled_at', new Date().toISOString()).limit(10) as any,
        supabase.from('applications').select('id', { count: 'exact' }).eq('current_stage', 'offer_extended') as any,
      ]);

      return {
        openJobs:           jobsRes.count        ?? 0,
        applicationsToday:  appsRes.count        ?? 0,
        upcomingInterviews: interviewsRes.data?.length ?? 0,
        pendingOffers:      offersRes.count      ?? 0,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Individual Widget Renderer ───────────────────────────────────────────────

interface WidgetRendererProps {
  widget: WidgetConfig;
  stats: Record<string, number>;
  isHebrew: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSizeChange: (size: WidgetSize) => void;
  isFirst: boolean;
  isLast: boolean;
}

function WidgetRenderer({
  widget,
  stats,
  isHebrew,
  onRemove,
  onMoveUp,
  onMoveDown,
  onSizeChange,
  isFirst,
  isLast,
}: WidgetRendererProps) {
  const meta = WIDGET_CATALOG.find(w => w.type === widget.widget_type)!;
  const Icon = meta.icon;
  const label = isHebrew ? meta.labelHe : meta.labelEn;
  const colSpan = SIZE_LABELS[widget.size].cols;

  const colClass = colSpan === 1 ? 'col-span-1' : colSpan === 2 ? 'col-span-1 sm:col-span-2' : 'col-span-1 sm:col-span-2 lg:col-span-3';

  // Build a small in-widget stat/visual based on type
  const widgetBody = (() => {
    switch (widget.widget_type) {
      case 'open_jobs':
        return <StatBlock value={stats.openJobs ?? 12} label={isHebrew ? 'משרות פעילות' : 'Active Positions'} trend="up" color="text-emerald-500" />;
      case 'applications_today':
        return <StatBlock value={stats.applicationsToday ?? 7} label={isHebrew ? 'הגשות היום' : "Today's applications"} trend="up" color="text-violet-500" />;
      case 'upcoming_interviews':
        return <StatBlock value={stats.upcomingInterviews ?? 3} label={isHebrew ? 'ראיונות מתוכננים' : 'Scheduled interviews'} trend="neutral" color="text-sky-500" />;
      case 'offer_status':
        return <StatBlock value={stats.pendingOffers ?? 2} label={isHebrew ? 'הצעות ממתינות' : 'Pending offers'} trend="up" color="text-amber-500" />;
      case 'pipeline_funnel':
        return <FunnelMock isHebrew={isHebrew} />;
      case 'time_to_hire':
        return <StatBlock value={18} label={isHebrew ? 'ימים בממוצע' : 'Avg. days'} trend="down" color="text-blue-500" />;
      case 'source_breakdown':
        return <BarsMock isHebrew={isHebrew} />;
      case 'team_activity':
        return <ActivityMock isHebrew={isHebrew} />;
      case 'candidate_nps':
        return <StatBlock value={72} label={isHebrew ? 'ציון NPS' : 'NPS Score'} trend="up" color="text-yellow-500" />;
      case 'sla_monitor':
        return <SLAMock isHebrew={isHebrew} />;
      case 'revenue':
        return <StatBlock value="₪180K" label={isHebrew ? 'הכנסות חודשיות' : 'Monthly revenue'} trend="up" color="text-green-500" />;
      case 'dei_summary':
        return <DEIMock isHebrew={isHebrew} />;
      default:
        return null;
    }
  })();

  return (
    <Card className={cn('bg-card border-border relative group', colClass)}>
      {/* Widget header toolbar */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 min-w-0">
            <Icon className={cn('w-4 h-4 shrink-0', meta.color)} />
            <span className="truncate">{label}</span>
          </CardTitle>

          {/* Controls — visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {/* Size selector */}
            <Select value={widget.size} onValueChange={(v) => onSizeChange(v as WidgetSize)}>
              <SelectTrigger className="h-6 text-xs w-24 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SIZE_LABELS) as WidgetSize[]).map(s => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {isHebrew ? SIZE_LABELS[s].he : SIZE_LABELS[s].en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost" size="icon"
              className="h-6 w-6"
              disabled={isFirst}
              onClick={onMoveUp}
              aria-label={isHebrew ? 'הזז למעלה' : 'Move up'}
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6"
              disabled={isLast}
              onClick={onMoveDown}
              aria-label={isHebrew ? 'הזז למטה' : 'Move down'}
            >
              <ChevronDown className="w-3 h-3" />
            </Button>

            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              aria-label={isHebrew ? 'הגדרות' : 'Configure'}
              onClick={() => toast.info(isHebrew ? 'הגדרות ווידג\'ט — בקרוב' : 'Widget settings — coming soon')}
            >
              <Settings className="w-3 h-3" />
            </Button>

            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={onRemove}
              aria-label={isHebrew ? 'הסר ווידג\'ט' : 'Remove widget'}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {widgetBody}
      </CardContent>
    </Card>
  );
}

// ─── Mini visual sub-components ───────────────────────────────────────────────

function StatBlock({ value, label, trend, color }: { value: number | string; label: string; trend: 'up' | 'down' | 'neutral'; color: string }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
  return (
    <div className="flex items-end justify-between">
      <div>
        <p className={cn('text-3xl font-bold', color)}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
      <TrendIcon className={cn('w-5 h-5 mb-1', trendColor)} />
    </div>
  );
}

function FunnelMock({ isHebrew }: { isHebrew: boolean }) {
  const stages = isHebrew
    ? [{ l: 'סקירה', v: 100 }, { l: 'טלפון', v: 60 }, { l: 'ראיון', v: 30 }, { l: 'הצעה', v: 10 }]
    : [{ l: 'Review', v: 100 }, { l: 'Phone', v: 60 }, { l: 'Interview', v: 30 }, { l: 'Offer', v: 10 }];
  const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-sky-500', 'bg-emerald-500'];
  return (
    <div className="space-y-1.5">
      {stages.map((s, i) => (
        <div key={s.l} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12 shrink-0">{s.l}</span>
          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
            <div className={cn('h-full rounded-full', colors[i])} style={{ width: `${s.v}%` }} />
          </div>
          <span className="text-xs font-medium w-6 text-end">{s.v}</span>
        </div>
      ))}
    </div>
  );
}

function BarsMock({ isHebrew }: { isHebrew: boolean }) {
  const sources = isHebrew
    ? [{ l: 'לינקדאין', v: 45 }, { l: 'אורגני', v: 30 }, { l: 'הפניה', v: 15 }, { l: 'אחר', v: 10 }]
    : [{ l: 'LinkedIn', v: 45 }, { l: 'Organic', v: 30 }, { l: 'Referral', v: 15 }, { l: 'Other', v: 10 }];
  const colors = ['bg-pink-500', 'bg-blue-500', 'bg-amber-500', 'bg-muted-foreground'];
  return (
    <div className="space-y-1.5">
      {sources.map((s, i) => (
        <div key={s.l} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-14 shrink-0">{s.l}</span>
          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
            <div className={cn('h-full rounded-full', colors[i])} style={{ width: `${s.v}%` }} />
          </div>
          <span className="text-xs font-medium w-8 text-end">{s.v}%</span>
        </div>
      ))}
    </div>
  );
}

function ActivityMock({ isHebrew }: { isHebrew: boolean }) {
  const days = isHebrew
    ? ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const heights = [60, 80, 40, 90, 70, 30, 20];
  return (
    <div className="flex items-end gap-1 h-12">
      {days.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
          <div
            className="w-full rounded-sm bg-orange-500/70"
            style={{ height: `${(heights[i] / 100) * 40}px` }}
          />
          <span className="text-[9px] text-muted-foreground">{d}</span>
        </div>
      ))}
    </div>
  );
}

function SLAMock({ isHebrew }: { isHebrew: boolean }) {
  const items = isHebrew
    ? [{ l: 'Google', days: 5, ok: true }, { l: 'Meta', days: 12, ok: true }, { l: 'Startup X', days: 28, ok: false }]
    : [{ l: 'Google', days: 5, ok: true }, { l: 'Meta', days: 12, ok: true }, { l: 'Startup X', days: 28, ok: false }];
  return (
    <div className="space-y-1.5">
      {items.map(it => (
        <div key={it.l} className="flex items-center justify-between">
          <span className="text-xs text-foreground">{it.l}</span>
          <Badge variant="outline" className={cn('text-xs', it.ok ? 'border-green-500/40 text-green-500' : 'border-red-500/40 text-red-500')}>
            {it.days}{isHebrew ? ' ימים' : ' days'}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function DEIMock({ isHebrew }: { isHebrew: boolean }) {
  const items = [
    { label: isHebrew ? 'נשים' : 'Women',    pct: 43, color: 'bg-rose-500' },
    { label: isHebrew ? 'גיוון' : 'Diversity', pct: 31, color: 'bg-violet-500' },
  ];
  return (
    <div className="space-y-2">
      {items.map(it => (
        <div key={it.label} className="space-y-0.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{it.label}</span>
            <span className="font-medium">{it.pct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', it.color)} style={{ width: `${it.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Add Widget Dialog ─────────────────────────────────────────────────────────

interface AddWidgetDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (type: WidgetType) => void;
  existingTypes: WidgetType[];
  isHebrew: boolean;
}

function AddWidgetDialog({ open, onClose, onAdd, existingTypes, isHebrew }: AddWidgetDialogProps) {
  const [search, setSearch] = useState('');
  const categories = Array.from(new Set(WIDGET_CATALOG.map(w => w.category)));

  const filtered = WIDGET_CATALOG.filter(w => {
    const label = isHebrew ? w.labelHe : w.labelEn;
    return label.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xl" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {isHebrew ? 'הוסף ווידג\'ט' : 'Add Widget'}
          </DialogTitle>
        </DialogHeader>

        <Input
          placeholder={isHebrew ? 'חפש ווידג\'ט...' : 'Search widgets...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-4"
          autoFocus
        />

        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
          {categories.map(cat => {
            const catWidgets = filtered.filter(w => w.category === cat);
            if (!catWidgets.length) return null;
            const catLabel = isHebrew ? CATEGORY_LABELS[cat].he : CATEGORY_LABELS[cat].en;
            return (
              <div key={cat}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{catLabel}</p>
                <div className="grid grid-cols-2 gap-2">
                  {catWidgets.map(w => {
                    const Icon = w.icon;
                    const already = existingTypes.includes(w.type);
                    return (
                      <button
                        key={w.type}
                        disabled={already}
                        onClick={() => { onAdd(w.type); onClose(); }}
                        className={cn(
                          'flex items-center gap-2 p-2.5 rounded-lg border text-sm text-start transition-colors',
                          already
                            ? 'border-border bg-muted/40 text-muted-foreground cursor-not-allowed'
                            : 'border-border hover:border-primary/40 hover:bg-accent cursor-pointer'
                        )}
                        aria-label={isHebrew ? w.labelHe : w.labelEn}
                      >
                        <Icon className={cn('w-4 h-4 shrink-0', w.color)} />
                        <span className="truncate font-medium">{isHebrew ? w.labelHe : w.labelEn}</span>
                        {already && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground ms-auto shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {isHebrew ? 'לא נמצאו ווידג\'טים' : 'No widgets found'}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Save / Rename Dialog ─────────────────────────────────────────────────────

interface SaveDialogProps {
  open: boolean;
  onClose: () => void;
  initialName: string;
  initialDesc: string;
  onSave: (name: string, desc: string) => void;
  isHebrew: boolean;
  isLoading: boolean;
}

function SaveDialog({ open, onClose, initialName, initialDesc, onSave, isHebrew, isLoading }: SaveDialogProps) {
  const [name, setName] = useState(initialName);
  const [desc, setDesc] = useState(initialDesc);

  // Reset when dialog re-opens with new initial values
  const handleOpen = (v: boolean) => {
    if (v) { setName(initialName); setDesc(initialDesc); }
    else onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent dir={isHebrew ? 'rtl' : 'ltr'} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isHebrew ? 'שמור דשבורד' : 'Save Dashboard'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dash-name">{isHebrew ? 'שם' : 'Name'}</Label>
            <Input
              id="dash-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={isHebrew ? 'שם הדשבורד' : 'Dashboard name'}
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dash-desc">{isHebrew ? 'תיאור (אופציונלי)' : 'Description (optional)'}</Label>
            <Input
              id="dash-desc"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder={isHebrew ? 'תיאור קצר' : 'Short description'}
              maxLength={120}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              {isHebrew ? 'ביטול' : 'Cancel'}
            </Button>
            <Button
              onClick={() => onSave(name.trim(), desc.trim())}
              disabled={!name.trim() || isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="ms-1">{isHebrew ? 'שמור' : 'Save'}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CustomDashboardBuilder() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isHebrew = language === 'he';
  const isRTL = language === 'he';

  // ── UI state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(null);

  // Local layout (unsaved changes)
  const [localLayout, setLocalLayout] = useState<WidgetConfig[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // ── Saved dashboards query
  const { data: dashboards = [], isLoading: dashLoading } = useQuery<CustomDashboard[]>({
    queryKey: ['custom-dashboards', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from('custom_dashboards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        ...d,
        layout: Array.isArray(d.layout) ? d.layout : [],
      }));
    },
    enabled: !!user?.id,
  });

  // When dashboards load, auto-select default or first
  const activeDashboard: CustomDashboard | undefined =
    dashboards.find(d => d.id === activeDashboardId) ??
    dashboards.find(d => d.is_default) ??
    dashboards[0];

  // Sync local layout when active dashboard changes
  const syncLayout = useCallback((dashboard: CustomDashboard | undefined) => {
    if (dashboard) {
      setLocalLayout(dashboard.layout);
      setIsDirty(false);
    } else {
      setLocalLayout([]);
      setIsDirty(false);
    }
  }, []);

  // Derived: when user selects from dropdown
  const handleSelectDashboard = (id: string) => {
    setActiveDashboardId(id);
    const dash = dashboards.find(d => d.id === id);
    syncLayout(dash);
  };

  // Initialize layout when dashboards first load (if none selected yet)
  const hasInitialized = activeDashboard && localLayout.length === 0 && !isDirty && activeDashboard.layout.length > 0;
  if (hasInitialized) {
    setLocalLayout(activeDashboard.layout);
  }

  // ── Stats query
  const { data: stats = {} } = useDashboardStats(user?.id);

  // ── Mutations
  const saveMutation = useMutation({
    mutationFn: async ({ name, desc }: { name: string; desc: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const payload = {
        user_id: user.id,
        name,
        description: desc || null,
        layout: localLayout,
        is_default: activeDashboard?.is_default ?? false,
        is_shared: activeDashboard?.is_shared ?? false,
      };
      if (activeDashboard) {
        // Update existing
        const { error } = await (supabase as any)
          .from('custom_dashboards')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', activeDashboard.id);
        if (error) throw error;
        return activeDashboard.id;
      } else {
        // Insert new
        const { data, error } = await (supabase as any)
          .from('custom_dashboards')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        return data.id as string;
      }
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['custom-dashboards', user?.id] });
      setActiveDashboardId(id);
      setIsDirty(false);
      setSaveDialogOpen(false);
      toast.success(isHebrew ? 'הדשבורד נשמר' : 'Dashboard saved');
    },
    onError: (err: any) => {
      toast.error(err.message || (isHebrew ? 'שגיאה בשמירה' : 'Error saving'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!activeDashboard) return;
      const { error } = await (supabase as any)
        .from('custom_dashboards')
        .delete()
        .eq('id', activeDashboard.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-dashboards', user?.id] });
      setActiveDashboardId(null);
      setLocalLayout([]);
      setIsDirty(false);
      setDeleteConfirmOpen(false);
      toast.success(isHebrew ? 'הדשבורד נמחק' : 'Dashboard deleted');
    },
    onError: (err: any) => {
      toast.error(err.message || (isHebrew ? 'שגיאה במחיקה' : 'Error deleting'));
    },
  });

  const toggleDefaultMutation = useMutation({
    mutationFn: async (value: boolean) => {
      if (!activeDashboard) return;
      // Clear default from all others first
      if (value) {
        await (supabase as any)
          .from('custom_dashboards')
          .update({ is_default: false })
          .eq('user_id', user!.id);
      }
      const { error } = await (supabase as any)
        .from('custom_dashboards')
        .update({ is_default: value })
        .eq('id', activeDashboard.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-dashboards', user?.id] });
      toast.success(isHebrew ? 'עודכן' : 'Updated');
    },
  });

  const toggleSharedMutation = useMutation({
    mutationFn: async (value: boolean) => {
      if (!activeDashboard) return;
      const { error } = await (supabase as any)
        .from('custom_dashboards')
        .update({ is_shared: value })
        .eq('id', activeDashboard.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-dashboards', user?.id] });
      toast.success(
        isHebrew
          ? 'הדשבורד שותף עם הצוות'
          : 'Dashboard shared with team'
      );
    },
  });

  // ── Layout manipulation helpers
  const addWidget = (type: WidgetType) => {
    setLocalLayout(prev => [
      ...prev,
      { widget_type: type, size: 'medium', position: prev.length },
    ]);
    setIsDirty(true);
  };

  const removeWidget = (index: number) => {
    setLocalLayout(prev => prev.filter((_, i) => i !== index).map((w, i) => ({ ...w, position: i })));
    setIsDirty(true);
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    setLocalLayout(prev => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((w, i) => ({ ...w, position: i }));
    });
    setIsDirty(true);
  };

  const changeSize = (index: number, size: WidgetSize) => {
    setLocalLayout(prev => prev.map((w, i) => i === index ? { ...w, size } : w));
    setIsDirty(true);
  };

  const handleNewDashboard = () => {
    setActiveDashboardId(null);
    setLocalLayout([]);
    setIsDirty(false);
    setSaveDialogOpen(true);
  };

  const handleDuplicateDashboard = () => {
    if (!activeDashboard) return;
    setActiveDashboardId(null);
    setLocalLayout(activeDashboard.layout.map((w, i) => ({ ...w, position: i })));
    setIsDirty(true);
    setSaveDialogOpen(true);
  };

  // ── Empty state
  const isEmpty = localLayout.length === 0;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-4">
      {/* ── Top bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Dashboard selector */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <LayoutDashboard className="w-5 h-5 text-primary shrink-0" />
          <h2 className="text-lg font-semibold text-foreground shrink-0">
            {isHebrew ? 'דשבורד מותאם אישית' : 'Custom Dashboard'}
          </h2>

          {dashLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : dashboards.length > 0 ? (
            <Select
              value={activeDashboard?.id ?? ''}
              onValueChange={handleSelectDashboard}
            >
              <SelectTrigger className="max-w-xs border-border">
                <SelectValue placeholder={isHebrew ? 'בחר דשבורד' : 'Select dashboard'} />
              </SelectTrigger>
              <SelectContent>
                {dashboards.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    <span className="flex items-center gap-1.5">
                      {d.name}
                      {d.is_default && <Badge variant="secondary" className="text-[10px] px-1 py-0">{isHebrew ? 'ברירת מחדל' : 'Default'}</Badge>}
                      {d.is_shared && <Share2 className="w-3 h-3 text-muted-foreground" />}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {isDirty && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-500 text-xs shrink-0">
              {isHebrew ? 'לא נשמר' : 'Unsaved'}
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleNewDashboard} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            {isHebrew ? 'חדש' : 'New'}
          </Button>

          {activeDashboard && (
            <Button variant="outline" size="sm" onClick={handleDuplicateDashboard} className="gap-1.5">
              <Copy className="w-3.5 h-3.5" />
              {isHebrew ? 'שכפל' : 'Duplicate'}
            </Button>
          )}

          <Button
            variant="outline" size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {isHebrew ? 'הוסף ווידג\'ט' : 'Add Widget'}
          </Button>

          <Button
            size="sm"
            onClick={() => setSaveDialogOpen(true)}
            disabled={saveMutation.isPending}
            className="gap-1.5"
          >
            {saveMutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Save className="w-3.5 h-3.5" />
            }
            {isHebrew ? 'שמור' : 'Save'}
          </Button>
        </div>
      </div>

      {/* ── Dashboard meta bar (for saved dashboards) ── */}
      {activeDashboard && (
        <Card className="bg-card border-border">
          <CardContent className="py-3 px-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Name + description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground truncate">{activeDashboard.name}</p>
                  <Button
                    variant="ghost" size="icon"
                    className="h-5 w-5 text-muted-foreground shrink-0"
                    onClick={() => setSaveDialogOpen(true)}
                    aria-label={isHebrew ? 'ערוך שם' : 'Edit name'}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
                {activeDashboard.description && (
                  <p className="text-xs text-muted-foreground truncate">{activeDashboard.description}</p>
                )}
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Switch
                    checked={activeDashboard.is_default}
                    onCheckedChange={v => toggleDefaultMutation.mutate(v)}
                    disabled={toggleDefaultMutation.isPending}
                    aria-label={isHebrew ? 'ברירת מחדל' : 'Set as default'}
                  />
                  <span className="text-muted-foreground text-xs">{isHebrew ? 'ברירת מחדל' : 'Default'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Switch
                    checked={activeDashboard.is_shared}
                    onCheckedChange={v => toggleSharedMutation.mutate(v)}
                    disabled={toggleSharedMutation.isPending}
                    aria-label={isHebrew ? 'שתף עם הצוות' : 'Share with team'}
                  />
                  <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <Share2 className="w-3 h-3" />
                    {isHebrew ? 'שיתוף' : 'Share'}
                  </span>
                </label>

                <Button
                  variant="ghost" size="sm"
                  className="text-destructive hover:text-destructive h-7 px-2 gap-1"
                  onClick={() => setDeleteConfirmOpen(true)}
                  aria-label={isHebrew ? 'מחק דשבורד' : 'Delete dashboard'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isHebrew ? 'מחק' : 'Delete'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Widget Grid ── */}
      {isEmpty ? (
        <EmptyState isHebrew={isHebrew} onAdd={() => setAddDialogOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {localLayout.map((widget, index) => (
            <WidgetRenderer
              key={`${widget.widget_type}-${index}`}
              widget={widget}
              stats={stats}
              isHebrew={isHebrew}
              onRemove={() => removeWidget(index)}
              onMoveUp={() => moveWidget(index, 'up')}
              onMoveDown={() => moveWidget(index, 'down')}
              onSizeChange={size => changeSize(index, size)}
              isFirst={index === 0}
              isLast={index === localLayout.length - 1}
            />
          ))}

          {/* Add widget inline card */}
          <button
            className="col-span-1 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors min-h-[120px]"
            onClick={() => setAddDialogOpen(true)}
            aria-label={isHebrew ? 'הוסף ווידג\'ט' : 'Add widget'}
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm font-medium">{isHebrew ? 'הוסף ווידג\'ט' : 'Add Widget'}</span>
          </button>
        </div>
      )}

      {/* ── Dialogs ── */}
      <AddWidgetDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={addWidget}
        existingTypes={localLayout.map(w => w.widget_type)}
        isHebrew={isHebrew}
      />

      <SaveDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        initialName={activeDashboard?.name ?? ''}
        initialDesc={activeDashboard?.description ?? ''}
        onSave={(name, desc) => saveMutation.mutate({ name, desc })}
        isHebrew={isHebrew}
        isLoading={saveMutation.isPending}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isHebrew ? 'מחיקת דשבורד' : 'Delete Dashboard'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isHebrew
                ? `האם למחוק את הדשבורד "${activeDashboard?.name}"? פעולה זו אינה ניתנת לביטול.`
                : `Delete "${activeDashboard?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isHebrew ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isHebrew ? 'מחק' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isHebrew, onAdd }: { isHebrew: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <LayoutDashboard className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold text-foreground">
          {isHebrew ? 'הדשבורד שלך ריק' : 'Your dashboard is empty'}
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          {isHebrew
            ? 'הוסף ווידג\'טים כדי לעצב את הדשבורד שלך'
            : 'Add widgets to build your personalized dashboard'}
        </p>
      </div>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="w-4 h-4" />
        {isHebrew ? 'הוסף ווידג\'ט ראשון' : 'Add your first widget'}
      </Button>
    </div>
  );
}

export default CustomDashboardBuilder;
