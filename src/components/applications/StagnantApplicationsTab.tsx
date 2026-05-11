import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Clock,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Archive,
  XCircle,
  ArrowRight,
  Building2,
  Briefcase,
} from 'lucide-react';
import { PIPELINE_STAGES, getStage } from './stageConfig';
import { cn } from '@/lib/utils';
import { differenceInDays, formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface Application {
  id: string;
  status: string;
  current_stage: string;
  match_score: number | null;
  created_at: string;
  last_interaction: string;
  notes: string | null;
  source: string | null;
  job_url: string | null;
  job_title?: string | null;
  job_company?: string | null;
  job: {
    id: string;
    title: string;
    location: string | null;
    job_type: string | null;
    salary_range: string | null;
    description: string | null;
    requirements: string | null;
    source_url: string | null;
    company: {
      id: string;
      name: string;
      logo_url: string | null;
    } | null;
  } | null;
}

interface StagnantApplicationsTabProps {
  applications: Application[];
  onStageChange: (id: string, newStage: string) => void;
  onWithdraw: (id: string) => void;
}

const TERMINAL_STAGES = ['rejected', 'withdrawn', 'hired'];
const STAGNANT_DAYS = 30;

type SortOption = 'oldest' | 'newest' | 'stage';

export function StagnantApplicationsTab({
  applications,
  onStageChange,
  onWithdraw,
}: StagnantApplicationsTabProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('oldest');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stagnantApps = useMemo(() => {
    const now = new Date();
    const filtered = applications.filter((app) => {
      if (TERMINAL_STAGES.includes(app.current_stage)) return false;
      if (TERMINAL_STAGES.includes(app.status)) return false;
      const lastDate = new Date(app.last_interaction || app.created_at);
      return differenceInDays(now, lastDate) >= STAGNANT_DAYS;
    });

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.last_interaction || a.created_at).getTime() -
          new Date(b.last_interaction || b.created_at).getTime();
      }
      if (sortBy === 'newest') {
        return new Date(b.last_interaction || b.created_at).getTime() -
          new Date(a.last_interaction || a.created_at).getTime();
      }
      // sort by stage order
      return getStage(a.current_stage).order - getStage(b.current_stage).order;
    });
  }, [applications, sortBy]);

  const allSelected = stagnantApps.length > 0 && selectedIds.size === stagnantApps.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(stagnantApps.map((a) => a.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const executeBulkAction = () => {
    if (!bulkAction || selectedIds.size === 0) return;

    if (bulkAction === 'reject') {
      selectedIds.forEach((id) => onStageChange(id, 'rejected'));
    } else if (bulkAction === 'withdraw') {
      selectedIds.forEach((id) => onWithdraw(id));
    } else {
      // It's a stage slug
      selectedIds.forEach((id) => onStageChange(id, bulkAction));
    }
    setSelectedIds(new Set());
    setBulkAction('');
  };

  const getDaysSince = (app: Application) => {
    return differenceInDays(new Date(), new Date(app.last_interaction || app.created_at));
  };

  const getDaysLabel = (days: number) => {
    if (days >= 90) return { color: 'text-red-500 bg-red-500/10', icon: 'critical' };
    if (days >= 60) return { color: 'text-orange-500 bg-orange-500/10', icon: 'warning' };
    return { color: 'text-yellow-500 bg-yellow-500/10', icon: 'mild' };
  };

  // Stats
  const avgDays = stagnantApps.length > 0
    ? Math.round(stagnantApps.reduce((sum, a) => sum + getDaysSince(a), 0) / stagnantApps.length)
    : 0;
  const over60 = stagnantApps.filter((a) => getDaysSince(a) >= 60).length;
  const over90 = stagnantApps.filter((a) => getDaysSince(a) >= 90).length;

  if (stagnantApps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
          <Clock className="w-6 h-6 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold mb-1">
          {isRTL ? 'אין מועמדויות תקועות' : 'No Stagnant Applications'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {isRTL
            ? 'כל המועמדויות שלך עודכנו ב-30 הימים האחרונים. מצוין!'
            : 'All your applications have been updated in the last 30 days. Great job!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stagnantApps.length}</p>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'תקועות (30+ יום)' : 'Stagnant (30+ days)'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{avgDays}</p>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'ממוצע ימים' : 'Avg. days'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{over60}</p>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'מעל 60 יום' : '60+ days'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{over90}</p>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'מעל 90 יום' : '90+ days'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: select all + bulk actions + sort */}
      <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAll}
            aria-label={isRTL ? 'בחר הכל' : 'Select all'}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.size > 0
              ? `${selectedIds.size} / ${stagnantApps.length} ${isRTL ? 'נבחרו' : 'selected'}`
              : (isRTL ? 'בחר הכל' : 'Select all')}
          </span>
        </div>

        <div className="flex-1" />

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <Select value={bulkAction} onValueChange={setBulkAction}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder={isRTL ? 'פעולה מרובה...' : 'Bulk action...'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reject">
                  <span className="flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                    {isRTL ? 'סמן כדחייה' : 'Mark as Rejected'}
                  </span>
                </SelectItem>
                <SelectItem value="withdraw">
                  <span className="flex items-center gap-1.5">
                    <Archive className="w-3.5 h-3.5" />
                    {isRTL ? 'משוך מועמדות' : 'Withdraw'}
                  </span>
                </SelectItem>
                {PIPELINE_STAGES.filter(s => s.order > 0).map((stage) => (
                  <SelectItem key={stage.slug} value={stage.slug}>
                    <span className="flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-primary" />
                      {isRTL ? stage.he : stage.en}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={executeBulkAction}
              disabled={!bulkAction}
            >
              {isRTL ? 'בצע' : 'Apply'}
            </Button>
          </div>
        )}

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="oldest">{isRTL ? 'הישן ביותר' : 'Oldest first'}</SelectItem>
            <SelectItem value="newest">{isRTL ? 'החדש ביותר' : 'Newest first'}</SelectItem>
            <SelectItem value="stage">{isRTL ? 'לפי שלב' : 'By stage'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Application list */}
      <div className="space-y-2">
        {stagnantApps.map((app) => {
          const days = getDaysSince(app);
          const severity = getDaysLabel(days);
          const stage = getStage(app.current_stage);
          const isExpanded = expandedId === app.id;
          const jobTitle = app.job?.title || app.job_title || (isRTL ? 'משרה לא ידועה' : 'Unknown Job');
          const companyName = app.job?.company?.name || app.job_company || '';

          return (
            <Card
              key={app.id}
              className={cn(
                'transition-colors',
                selectedIds.has(app.id) && 'ring-1 ring-primary/40 bg-primary/5'
              )}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(app.id)}
                    onCheckedChange={() => toggleOne(app.id)}
                    className="mt-1 shrink-0"
                    aria-label={`${isRTL ? 'בחר' : 'Select'} ${jobTitle}`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{jobTitle}</p>
                        {companyName && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="w-3 h-3 shrink-0" />
                            {companyName}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Days badge */}
                        <Badge variant="outline" className={cn('text-xs gap-1', severity.color)}>
                          <Clock className="w-3 h-3" />
                          {days} {isRTL ? 'יום' : 'd'}
                        </Badge>
                        {/* Stage badge */}
                        <Badge className={cn('text-xs', stage.color)}>
                          {isRTL ? stage.he : stage.en}
                        </Badge>
                      </div>
                    </div>

                    {/* Last activity info */}
                    <p className="text-xs text-muted-foreground mt-1">
                      {isRTL ? 'עדכון אחרון: ' : 'Last update: '}
                      {formatDistanceToNow(new Date(app.last_interaction || app.created_at), {
                        addSuffix: true,
                        locale: isRTL ? he : enUS,
                      })}
                    </p>

                    {/* Expanded actions */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 text-xs gap-1"
                          onClick={() => onStageChange(app.id, 'rejected')}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {isRTL ? 'דחייה' : 'Reject'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1"
                          onClick={() => onWithdraw(app.id)}
                        >
                          <Archive className="w-3.5 h-3.5" />
                          {isRTL ? 'משוך מועמדות' : 'Withdraw'}
                        </Button>
                        <Select onValueChange={(stage) => onStageChange(app.id, stage)}>
                          <SelectTrigger className="h-8 w-[150px] text-xs">
                            <SelectValue placeholder={isRTL ? 'קדם שלב...' : 'Advance to...'} />
                          </SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STAGES.filter(
                              (s) => s.order > getStage(app.current_stage).order
                            ).map((s) => (
                              <SelectItem key={s.slug} value={s.slug}>
                                {isRTL ? s.he : s.en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Expand toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setExpandedId(isExpanded ? null : app.id)}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
