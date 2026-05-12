import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Download,
  Info,
  Users,
  TrendingUp,
  AlertTriangle,
  Medal,
  Accessibility,
  BarChart3,
} from 'lucide-react';

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────
interface EEORow {
  id: string;
  submitted_at: string;
  gender: string | null;
  race_ethnicity: string | null;
  veteran_status: string | null;
  disability_status: string | null;
  // joined from applications
  application_status?: string | null;
  current_stage?: string | null;
}

interface AggregateStats {
  total: number;
  gender: Record<string, number>;
  race: Record<string, number>;
  veteran: Record<string, number>;
  disability: Record<string, number>;
  // For adverse impact: hired counts per group
  hiredByGender: Record<string, number>;
  hiredByRace: Record<string, number>;
}

// ─────────────────────────────────────────────
//  Label maps
// ─────────────────────────────────────────────
const GENDER_LABELS: Record<string, { en: string; he: string; color: string }> = {
  male: { en: 'Male', he: 'זכר', color: '#3B82F6' },
  female: { en: 'Female', he: 'נקבה', color: '#EC4899' },
  non_binary: { en: 'Non-binary', he: 'לא בינארי', color: '#8B5CF6' },
  prefer_not_to_say: { en: 'Not disclosed', he: 'לא ציין/ה', color: '#6B7280' },
};

const RACE_LABELS: Record<string, { en: string; he: string; color: string }> = {
  white: { en: 'White', he: 'לבן/לבנה', color: '#60A5FA' },
  black_african_american: { en: 'Black / African Am.', he: 'שחור/ה', color: '#1D4ED8' },
  hispanic_latino: { en: 'Hispanic / Latino', he: 'היספני/ת', color: '#F59E0B' },
  asian: { en: 'Asian', he: 'אסייתי/ת', color: '#10B981' },
  native_american: { en: 'Native American', he: 'יליד/ת אמריקה', color: '#EF4444' },
  pacific_islander: { en: 'Pacific Islander', he: 'איי האוקיאנוס', color: '#06B6D4' },
  two_or_more: { en: 'Two or more', he: 'שתיים+', color: '#F97316' },
  prefer_not_to_say: { en: 'Not disclosed', he: 'לא ציין/ה', color: '#6B7280' },
};

const VETERAN_LABELS: Record<string, { en: string; he: string }> = {
  veteran: { en: 'Protected Veteran', he: 'ותיק/ה מוגן/ת' },
  not_veteran: { en: 'Not a Veteran', he: 'לא ותיק/ה' },
  prefer_not_to_say: { en: 'Not disclosed', he: 'לא ציין/ה' },
};

const DISABILITY_LABELS: Record<string, { en: string; he: string }> = {
  yes: { en: 'Has disability', he: 'יש מוגבלות' },
  no: { en: 'No disability', he: 'אין מוגבלות' },
  prefer_not_to_say: { en: 'Not disclosed', he: 'לא ציין/ה' },
};

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

function buildAggregate(rows: EEORow[]): AggregateStats {
  const stats: AggregateStats = {
    total: rows.length,
    gender: {},
    race: {},
    veteran: {},
    disability: {},
    hiredByGender: {},
    hiredByRace: {},
  };

  for (const row of rows) {
    const g = row.gender ?? 'prefer_not_to_say';
    const r = row.race_ethnicity ?? 'prefer_not_to_say';
    const v = row.veteran_status ?? 'prefer_not_to_say';
    const d = row.disability_status ?? 'prefer_not_to_say';
    const isHired = row.current_stage === 'hired' || row.application_status === 'hired';

    stats.gender[g] = (stats.gender[g] ?? 0) + 1;
    stats.race[r] = (stats.race[r] ?? 0) + 1;
    stats.veteran[v] = (stats.veteran[v] ?? 0) + 1;
    stats.disability[d] = (stats.disability[d] ?? 0) + 1;

    if (isHired) {
      stats.hiredByGender[g] = (stats.hiredByGender[g] ?? 0) + 1;
      stats.hiredByRace[r] = (stats.hiredByRace[r] ?? 0) + 1;
    }
  }

  return stats;
}

/** 4/5ths adverse impact ratio for a given group vs the most-selected group */
function adverseImpactRatios(
  totalByGroup: Record<string, number>,
  hiredByGroup: Record<string, number>
): { group: string; selectionRate: number; ratio: number; flag: boolean }[] {
  // selection rate = hired / applied for each group
  const rates: { group: string; rate: number }[] = Object.entries(totalByGroup)
    .filter(([g]) => g !== 'prefer_not_to_say')
    .map(([group, total]) => ({
      group,
      rate: total === 0 ? 0 : (hiredByGroup[group] ?? 0) / total,
    }));

  if (rates.length === 0) return [];

  const maxRate = Math.max(...rates.map((r) => r.rate));

  return rates.map(({ group, rate }) => ({
    group,
    selectionRate: Math.round(rate * 100),
    ratio: maxRate === 0 ? 1 : Math.round((rate / maxRate) * 100) / 100,
    flag: maxRate > 0 && rate / maxRate < 0.8,
  }));
}

function downloadCSV(stats: AggregateStats, isRTL: boolean) {
  const lines: string[] = [];
  lines.push(isRTL ? 'קטגוריה,ערך,מספר,אחוז' : 'Category,Value,Count,Percentage');

  const push = (cat: string, record: Record<string, number>, total: number) => {
    for (const [key, count] of Object.entries(record)) {
      lines.push(`${cat},${key},${count},${pct(count, total)}%`);
    }
  };

  push('gender', stats.gender, stats.total);
  push('race_ethnicity', stats.race, stats.total);
  push('veteran_status', stats.veteran, stats.total);
  push('disability_status', stats.disability, stats.total);

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eeo_aggregate_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────
export function ComplianceDashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [days, setDays] = useState('90');

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(days, 10));
    return d.toISOString();
  }, [days]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['eeo-compliance', user?.id, days],
    queryFn: async () => {
      if (!user) return [];
      // Fetch aggregate eeo_submissions joined with applications for stage info
      // Only recruiters see this — applications for jobs they own
      const { data: jobs } = await (supabase as any)
        .from('jobs')
        .select('id')
        .eq('created_by', user.id);

      if (!jobs?.length) return [];
      const jobIds = jobs.map((j: any) => j.id);

      const { data: apps } = await (supabase as any)
        .from('applications')
        .select('id, current_stage, status')
        .in('job_id', jobIds);

      if (!apps?.length) return [];
      const appIds = apps.map((a: any) => a.id);

      const { data: subs, error } = await (supabase as any)
        .from('eeo_submissions')
        .select('id, submitted_at, gender, race_ethnicity, veteran_status, disability_status, application_id')
        .in('application_id', appIds)
        .gte('submitted_at', cutoff);

      if (error) throw error;

      // Merge application stage into each submission row
      const appMap: Record<string, { current_stage: string; status: string }> = {};
      for (const a of apps) appMap[a.id] = a;

      return (subs || []).map((s: any) => ({
        ...s,
        current_stage: appMap[s.application_id]?.current_stage ?? null,
        application_status: appMap[s.application_id]?.status ?? null,
      })) as EEORow[];
    },
    enabled: !!user,
  });

  const stats = useMemo(() => buildAggregate(rows), [rows]);

  const genderAI = useMemo(
    () => adverseImpactRatios(stats.gender, stats.hiredByGender),
    [stats]
  );
  const raceAI = useMemo(
    () => adverseImpactRatios(stats.race, stats.hiredByRace),
    [stats]
  );

  const handleExport = () => {
    if (stats.total === 0) {
      toast.error(isRTL ? 'אין נתונים לייצוא' : 'No data to export');
      return;
    }
    downloadCSV(stats, isRTL);
    toast.success(isRTL ? 'הנתונים יוצאו בהצלחה' : 'Data exported successfully');
  };

  const hasFlags = genderAI.some((r) => r.flag) || raceAI.some((r) => r.flag);

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {isRTL ? 'לוח בקרת ציות EEO/OFCCP' : 'EEO/OFCCP Compliance Dashboard'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? 'נתונים מצטברים בלבד — ללא זיהוי מועמדים בודדים'
                : 'Aggregate data only — no individual candidate identification'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-36" aria-label={isRTL ? 'טווח תאריכים' : 'Date range'}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{isRTL ? '7 ימים' : 'Last 7 days'}</SelectItem>
              <SelectItem value="30">{isRTL ? '30 ימים' : 'Last 30 days'}</SelectItem>
              <SelectItem value="90">{isRTL ? '90 ימים' : 'Last 90 days'}</SelectItem>
              <SelectItem value="365">{isRTL ? 'שנה אחרונה' : 'Last 365 days'}</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExport}
            disabled={isLoading || stats.total === 0}
            aria-label={isRTL ? 'ייצוא CSV' : 'Export CSV'}
          >
            <Download className="h-4 w-4" />
            {isRTL ? 'ייצוא CSV' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Adverse impact alert */}
      {hasFlags && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {isRTL ? 'אזהרת השפעה שלילית (כלל 4/5)' : 'Adverse Impact Alert (4/5ths Rule)'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isRTL
                ? 'קבוצה אחת או יותר מציגה יחס בחירה הנמוך מ-80% ביחס לקבוצת הייחוס. ייתכן שיש צורך בסקירה.'
                : 'One or more groups show a selection rate below 80% of the highest-rated group. Review may be warranted.'}
            </p>
          </div>
        </div>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Users className="h-5 w-5 text-primary" />}
          label={isRTL ? 'סה"כ תשובות' : 'Total Submissions'}
          value={isLoading ? null : stats.total}
          isRTL={isRTL}
        />
        <SummaryCard
          icon={<Medal className="h-5 w-5 text-amber-500" />}
          label={isRTL ? 'ותיקים מוגנים' : 'Protected Veterans'}
          value={
            isLoading
              ? null
              : `${pct(stats.veteran['veteran'] ?? 0, stats.total)}%`
          }
          sub={isRTL ? 'מכלל המשיבים' : 'of respondents'}
          isRTL={isRTL}
          tooltip={isRTL ? 'VEVRAA — מחויבות ל-7% ייצוג ותיקים' : 'VEVRAA — 7% veteran utilization goal'}
        />
        <SummaryCard
          icon={<Accessibility className="h-5 w-5 text-blue-500" />}
          label={isRTL ? 'מוגבלויות' : 'Disability Disclosure'}
          value={
            isLoading
              ? null
              : `${pct(stats.disability['yes'] ?? 0, stats.total)}%`
          }
          sub={isRTL ? 'מכלל המשיבים' : 'of respondents'}
          isRTL={isRTL}
          tooltip={isRTL ? 'Section 503 — יעד 7% לאנשים עם מוגבלות' : 'Section 503 — 7% utilization goal for people with disabilities'}
        />
        <SummaryCard
          icon={<BarChart3 className="h-5 w-5 text-green-500" />}
          label={isRTL ? 'שיעור השתתפות' : 'Response Rate'}
          value={isLoading ? null : stats.total > 0 ? `${stats.total}` : '—'}
          sub={isRTL ? 'שאלונים הוגשו' : 'surveys completed'}
          isRTL={isRTL}
        />
      </div>

      {/* Gender breakdown */}
      <BreakdownCard
        title={isRTL ? 'פיצול מגדרי' : 'Gender Breakdown'}
        isRTL={isRTL}
        isLoading={isLoading}
        tooltip={
          isRTL
            ? 'EEOC מחייב דיווח מגדרי. נתונים מוצגים כאחוזים בלבד.'
            : 'EEOC requires gender reporting. Data shown as percentages only.'
        }
      >
        {Object.entries(stats.gender).map(([key, count]) => {
          const meta = GENDER_LABELS[key] ?? { en: key, he: key, color: '#6B7280' };
          return (
            <BreakdownRow
              key={key}
              label={isRTL ? meta.he : meta.en}
              count={count}
              total={stats.total}
              color={meta.color}
            />
          );
        })}
        {Object.keys(stats.gender).length === 0 && !isLoading && (
          <EmptyState isRTL={isRTL} />
        )}
      </BreakdownCard>

      {/* Race/Ethnicity breakdown */}
      <BreakdownCard
        title={isRTL ? 'פיצול גזעי/אתני' : 'Race / Ethnicity Breakdown'}
        isRTL={isRTL}
        isLoading={isLoading}
        tooltip={
          isRTL
            ? 'EEO-1 מחייב דיווח לפי 7 קטגוריות גזעיות. נתונים מוצגים כאחוזים בלבד.'
            : 'EEO-1 requires reporting across 7 racial categories. Data shown as percentages only.'
        }
      >
        {Object.entries(stats.race).map(([key, count]) => {
          const meta = RACE_LABELS[key] ?? { en: key, he: key, color: '#6B7280' };
          return (
            <BreakdownRow
              key={key}
              label={isRTL ? meta.he : meta.en}
              count={count}
              total={stats.total}
              color={meta.color}
            />
          );
        })}
        {Object.keys(stats.race).length === 0 && !isLoading && (
          <EmptyState isRTL={isRTL} />
        )}
      </BreakdownCard>

      {/* Veteran & Disability side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BreakdownCard
          title={isRTL ? 'סטטוס ותיק/ה' : 'Veteran Status'}
          isRTL={isRTL}
          isLoading={isLoading}
          tooltip={
            isRTL
              ? 'VEVRAA מחייב שאלון הזדהות עצמית של ותיקים מכל המתאים/ות לעבודה.'
              : 'VEVRAA requires self-identification from all applicants. 7% utilization goal applies.'
          }
        >
          {Object.entries(stats.veteran).map(([key, count]) => {
            const meta = VETERAN_LABELS[key] ?? { en: key, he: key };
            const color = key === 'veteran' ? '#F59E0B' : key === 'not_veteran' ? '#10B981' : '#6B7280';
            return (
              <BreakdownRow
                key={key}
                label={isRTL ? meta.he : meta.en}
                count={count}
                total={stats.total}
                color={color}
              />
            );
          })}
          {Object.keys(stats.veteran).length === 0 && !isLoading && (
            <EmptyState isRTL={isRTL} />
          )}
        </BreakdownCard>

        <BreakdownCard
          title={isRTL ? 'מוגבלות' : 'Disability Status'}
          isRTL={isRTL}
          isLoading={isLoading}
          tooltip={
            isRTL
              ? 'Section 503 of the Rehabilitation Act — יעד 7% לאנשים עם מוגבלות.'
              : 'Section 503 of the Rehabilitation Act — 7% utilization goal for individuals with disabilities.'
          }
        >
          {Object.entries(stats.disability).map(([key, count]) => {
            const meta = DISABILITY_LABELS[key] ?? { en: key, he: key };
            const color = key === 'yes' ? '#3B82F6' : key === 'no' ? '#10B981' : '#6B7280';
            return (
              <BreakdownRow
                key={key}
                label={isRTL ? meta.he : meta.en}
                count={count}
                total={stats.total}
                color={color}
              />
            );
          })}
          {Object.keys(stats.disability).length === 0 && !isLoading && (
            <EmptyState isRTL={isRTL} />
          )}
        </BreakdownCard>
      </div>

      {/* Adverse Impact Analysis */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <CardTitle className="text-base">
                {isRTL ? 'ניתוח השפעה שלילית — כלל 4/5' : 'Adverse Impact Analysis — 4/5ths Rule'}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {isRTL
                  ? 'יחס בחירה של קבוצה מחולק בשיעור הבחירה של הקבוצה הגבוהה ביותר. ערך < 0.80 מצביע על השפעה שלילית אפשרית (OFCCP).'
                  : 'Selection rate of each group divided by the highest-rated group. A ratio < 0.80 may indicate adverse impact (OFCCP standard).'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          ) : genderAI.length === 0 && raceAI.length === 0 ? (
            <EmptyState isRTL={isRTL} message={isRTL ? 'לא מספיק נתוני גיוס לחישוב' : 'Insufficient hiring data to calculate'} />
          ) : (
            <>
              {genderAI.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {isRTL ? 'לפי מגדר' : 'By Gender'}
                  </p>
                  {genderAI.map((r) => {
                    const meta = GENDER_LABELS[r.group] ?? { en: r.group, he: r.group, color: '#6B7280' };
                    return (
                      <AdverseImpactRow
                        key={r.group}
                        label={isRTL ? meta.he : meta.en}
                        selectionRate={r.selectionRate}
                        ratio={r.ratio}
                        flag={r.flag}
                        isRTL={isRTL}
                      />
                    );
                  })}
                </div>
              )}

              {raceAI.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {isRTL ? 'לפי גזע/מוצא' : 'By Race / Ethnicity'}
                  </p>
                  {raceAI.map((r) => {
                    const meta = RACE_LABELS[r.group] ?? { en: r.group, he: r.group, color: '#6B7280' };
                    return (
                      <AdverseImpactRow
                        key={r.group}
                        label={isRTL ? meta.he : meta.en}
                        selectionRate={r.selectionRate}
                        ratio={r.ratio}
                        flag={r.flag}
                        isRTL={isRTL}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Legal footer */}
      <p className="text-xs text-muted-foreground border-t border-border pt-4 leading-relaxed">
        {isRTL
          ? '* הנתונים המוצגים הם מצטברים ואנונימיים לחלוטין. לא ניתן לזהות מועמדים בודדים מנתונים אלה. שמירת נתונים: OFCCP מחייב שמירת רשומות EEO למשך שנתיים לפחות.'
          : '* Data displayed is fully aggregate and anonymized. Individual candidates cannot be identified. Record Retention: OFCCP requires EEO records to be maintained for a minimum of 2 years.'}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  sub,
  isRTL,
  tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number | null;
  sub?: string;
  isRTL: boolean;
  tooltip?: string;
}) {
  const [showTip, setShowTip] = useState(false);

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-5 pb-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {icon}
            {tooltip && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTip((v) => !v)}
                  aria-label={isRTL ? 'מידע' : 'Info'}
                  className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <Info className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
                {showTip && (
                  <div
                    className={`absolute z-10 top-5 ${isRTL ? 'right-0' : 'left-0'} w-56 rounded-md border border-border bg-popover p-2.5 text-xs text-muted-foreground shadow-md`}
                  >
                    {tooltip}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="mt-3">
          {value === null ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold text-foreground">{value}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          {sub && <p className="text-xs text-muted-foreground/70">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  isRTL,
  isLoading,
  tooltip,
  children,
}: {
  title: string;
  isRTL: boolean;
  isLoading: boolean;
  tooltip?: string;
  children: React.ReactNode;
}) {
  const [showTip, setShowTip] = useState(false);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {tooltip && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTip((v) => !v)}
                aria-label={isRTL ? 'מידע' : 'Info'}
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
              {showTip && (
                <div
                  className={`absolute z-10 top-5 ${isRTL ? 'right-0' : 'left-0'} w-64 rounded-md border border-border bg-popover p-3 text-xs text-muted-foreground shadow-md`}
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  {tooltip}
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function BreakdownRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = pct(count, total);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground font-medium">{percentage}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

function AdverseImpactRow({
  label,
  selectionRate,
  ratio,
  flag,
  isRTL,
}: {
  label: string;
  selectionRate: number;
  ratio: number;
  flag: boolean;
  isRTL: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="flex-1 text-sm text-foreground truncate">{label}</span>
      <span className="text-xs text-muted-foreground w-16 text-center">
        {selectionRate}% {isRTL ? 'נבחרו' : 'selected'}
      </span>
      <div className="w-16 flex justify-center">
        <Badge
          variant="outline"
          className={
            flag
              ? 'border-amber-500/40 text-amber-500 bg-amber-500/5'
              : 'border-green-500/40 text-green-500 bg-green-500/5'
          }
        >
          {ratio.toFixed(2)}
        </Badge>
      </div>
      {flag && (
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" aria-label={isRTL ? 'אזהרה' : 'Warning'} />
      )}
    </div>
  );
}

function EmptyState({ isRTL, message }: { isRTL: boolean; message?: string }) {
  return (
    <p className="text-sm text-muted-foreground text-center py-4">
      {message ?? (isRTL ? 'אין נתונים לתקופה זו' : 'No data for this period')}
    </p>
  );
}
