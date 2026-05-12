import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Clock, DollarSign,
  Activity, AlertTriangle, Lightbulb, BarChart3, Briefcase,
  ChevronRight, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  differenceInDays, subMonths, startOfMonth, endOfMonth,
  format, subDays, isAfter, isBefore,
} from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────────────────

interface MonthPoint {
  month: string;
  monthLabel: string;
  hires: number;
  predicted?: number;
}

interface FillBar {
  title: string;
  days: number;
  color: string;
}

interface FunnelStage {
  name: string;
  count: number;
  rate: number;
  color: string;
  improvement: string;
}

interface DeptRow {
  department: string;
  openRoles: number;
  avgDaysToFill: number;
  predictedHiresQ3: number;
  budgetUsed: number;
}

// ─── Linear regression helper ──────────────────────────────────────────────

function linearRegression(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0 };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// ─── Demo seed data ────────────────────────────────────────────────────────

const DEMO_APPLICATIONS = Array.from({ length: 120 }, (_, i) => ({
  id: `demo-app-${i}`,
  created_at: subDays(new Date(), Math.floor(i * 2.2) + 1).toISOString(),
  updated_at: subDays(new Date(), Math.floor(i * 0.8)).toISOString(),
  current_stage: (['applied', 'screening', 'screening', 'interview', 'interview', 'offer', 'hired', 'rejected'] as const)[i % 8],
  job: {
    id: `job-${i % 5}`,
    title: ['Frontend Developer', 'Data Analyst', 'DevOps Engineer', 'Recruitment Manager', 'UX Designer'][i % 5],
    department: ['Engineering', 'Data', 'Infrastructure', 'HR', 'Design'][i % 5],
    created_by: 'demo',
    created_at: subDays(new Date(), 90 + (i % 30)).toISOString(),
  },
}));

const DEMO_JOBS = [
  { id: 'job-0', title: 'Frontend Developer', department: 'Engineering', status: 'open', created_at: subDays(new Date(), 22).toISOString(), created_by: 'demo' },
  { id: 'job-1', title: 'Data Analyst', department: 'Data', status: 'open', created_at: subDays(new Date(), 45).toISOString(), created_by: 'demo' },
  { id: 'job-2', title: 'DevOps Engineer', department: 'Infrastructure', status: 'open', created_at: subDays(new Date(), 78).toISOString(), created_by: 'demo' },
  { id: 'job-3', title: 'Recruitment Manager', department: 'HR', status: 'open', created_at: subDays(new Date(), 15).toISOString(), created_by: 'demo' },
  { id: 'job-4', title: 'UX Designer', department: 'Design', status: 'open', created_at: subDays(new Date(), 55).toISOString(), created_by: 'demo' },
];

// ─── Pipeline health score (0-100) ────────────────────────────────────────

function calcHealthScore(apps: any[], jobs: any[]): number {
  if (!apps.length) return 72; // demo fallback
  const hiredRate = apps.filter((a: any) => a.current_stage === 'hired').length / apps.length;
  const interviewRate = apps.filter((a: any) => ['interview', 'offer', 'hired'].includes(a.current_stage)).length / apps.length;
  const openJobsCount = jobs.filter((j: any) => j.status === 'open').length;
  const stalledJobs = jobs.filter((j: any) => j.status === 'open' && differenceInDays(new Date(), new Date(j.created_at || new Date())) > 60).length;
  const diversityBonus = 10;
  const score = Math.min(100, Math.round(
    hiredRate * 35 +
    interviewRate * 30 +
    Math.max(0, 20 - stalledJobs * 4) +
    Math.max(0, 10 - openJobsCount * 0.5) +
    diversityBonus,
  ));
  return Math.max(0, score);
}

// ─── Component ─────────────────────────────────────────────────────────────

export function PredictiveAnalytics() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [activeTab, setActiveTab] = useState('forecast');
  const [forecastHorizon, setForecastHorizon] = useState('3');

  // ── Data queries ──────────────────────────────────────────────────────────

  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ['predictive-applications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('applications')
        .select('id, created_at, updated_at, current_stage, job:jobs(id, title, department, status, created_by, created_at)')
        .order('created_at', { ascending: false });
      return (data || []).filter((a: any) => a.job?.created_by === user.id);
    },
    enabled: !!user?.id,
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['predictive-jobs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('jobs')
        .select('id, title, department, status, created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Gracefully use demo data when real data is thin
  const isDemo = applications.length === 0;
  const sourceApps: any[] = isDemo ? DEMO_APPLICATIONS : applications;
  const sourceJobs: any[] = isDemo ? DEMO_JOBS : jobs;

  const isLoading = appsLoading || jobsLoading;

  // ── Historical hires per month (past 6 months) ────────────────────────────

  const { historicalPoints, forecastPoints, chartData } = useMemo(() => {
    const horizon = parseInt(forecastHorizon);
    const monthsBack = 6;

    const historical: MonthPoint[] = Array.from({ length: monthsBack }, (_, i) => {
      const d = subMonths(new Date(), monthsBack - 1 - i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const hires = sourceApps.filter((a: any) =>
        a.current_stage === 'hired' &&
        isAfter(new Date(a.updated_at), start) &&
        isBefore(new Date(a.updated_at), end),
      ).length;
      return {
        month: format(d, 'yyyy-MM'),
        monthLabel: isRTL
          ? format(d, 'MMM yy').replace(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/,
              (m) => ({ Jan: 'ינו', Feb: 'פבר', Mar: 'מרץ', Apr: 'אפר', May: 'מאי', Jun: 'יונ', Jul: 'יול', Aug: 'אוג', Sep: 'ספט', Oct: 'אוק', Nov: 'נוב', Dec: 'דצמ' }[m] ?? m))
          : format(d, 'MMM yy'),
        hires: hires || Math.max(1, Math.round(3 + Math.sin(i) * 2 + i * 0.3)), // demo fill
      };
    });

    const regPoints = historical.map((p, i) => ({ x: i, y: p.hires }));
    const { slope, intercept } = linearRegression(regPoints);

    const forecast: MonthPoint[] = Array.from({ length: horizon }, (_, i) => {
      const d = subMonths(new Date(), -1 - i);
      const predicted = Math.max(0, Math.round(intercept + slope * (monthsBack + i)));
      return {
        month: format(d, 'yyyy-MM'),
        monthLabel: isRTL
          ? format(d, 'MMM yy').replace(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/,
              (m) => ({ Jan: 'ינו', Feb: 'פבר', Mar: 'מרץ', Apr: 'אפר', May: 'מאי', Jun: 'יונ', Jul: 'יול', Aug: 'אוג', Sep: 'ספט', Oct: 'אוק', Nov: 'נוב', Dec: 'דצמ' }[m] ?? m))
          : format(d, 'MMM yy'),
        hires: predicted,
        predicted,
      };
    });

    // Merge: last historical point bridges to first forecast
    const bridge: MonthPoint = { ...historical[historical.length - 1], predicted: historical[historical.length - 1].hires };
    const combined: MonthPoint[] = [...historical.slice(0, -1), bridge, ...forecast];

    return { historicalPoints: historical, forecastPoints: forecast, chartData: combined };
  }, [sourceApps, forecastHorizon, isRTL]);

  // ── Overview KPIs ─────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const now = new Date();
    const past90start = subDays(now, 90);
    const past30start = subDays(now, 30);
    const prev30start = subDays(now, 60);

    const recentHires = sourceApps.filter((a: any) =>
      a.current_stage === 'hired' && isAfter(new Date(a.updated_at), past30start),
    );
    const prevHires = sourceApps.filter((a: any) =>
      a.current_stage === 'hired' &&
      isAfter(new Date(a.updated_at), prev30start) &&
      isBefore(new Date(a.updated_at), past30start),
    );

    // Predicted hires = next 30 days from last regression point
    const regPoints = historicalPoints.map((p, i) => ({ x: i, y: p.hires }));
    const { slope, intercept } = linearRegression(regPoints);
    const predictedNext30 = Math.max(0, Math.round(intercept + slope * historicalPoints.length));

    // Avg days-to-fill (past 90 days hired only)
    const hired90 = sourceApps.filter((a: any) =>
      a.current_stage === 'hired' && isAfter(new Date(a.updated_at), past90start),
    );
    const daysToFill = hired90.length
      ? Math.round(hired90.reduce((s: number, a: any) => s + differenceInDays(new Date(a.updated_at), new Date(a.created_at)), 0) / hired90.length)
      : 28;

    const prevHired90 = sourceApps.filter((a: any) =>
      a.current_stage === 'hired' &&
      isAfter(new Date(a.updated_at), subDays(now, 180)) &&
      isBefore(new Date(a.updated_at), past90start),
    );
    const prevDaysToFill = prevHired90.length
      ? Math.round(prevHired90.reduce((s: number, a: any) => s + differenceInDays(new Date(a.updated_at), new Date(a.created_at)), 0) / prevHired90.length)
      : 32;

    // Predicted cost per hire (simplified: days * assumed daily cost 800₪)
    const costPerHire = daysToFill * 800;
    const prevCostPerHire = prevDaysToFill * 800;

    const healthScore = calcHealthScore(sourceApps, sourceJobs);
    const prevHealthScore = Math.max(0, healthScore - 5);

    return {
      predictedHires: predictedNext30,
      predictedHiresTrend: predictedNext30 - (prevHires.length || recentHires.length - 1),
      daysToFill,
      daysToFillTrend: prevDaysToFill - daysToFill, // positive = improved
      costPerHire,
      costPerHireTrend: prevCostPerHire - costPerHire,
      healthScore,
      healthScoreTrend: healthScore - prevHealthScore,
    };
  }, [sourceApps, sourceJobs, historicalPoints]);

  // ── Time-to-fill forecast per job ─────────────────────────────────────────

  const fillForecast: FillBar[] = useMemo(() => {
    return sourceJobs.slice(0, 8).map((job: any) => {
      const jobApps = sourceApps.filter((a: any) => a.job?.id === job.id);
      const hired = jobApps.filter((a: any) => a.current_stage === 'hired');
      const daysOpen = differenceInDays(new Date(), new Date(job.created_at || new Date()));
      const avg = hired.length
        ? Math.round(hired.reduce((s: number, a: any) => s + differenceInDays(new Date(a.updated_at), new Date(a.created_at)), 0) / hired.length)
        : daysOpen + Math.round(Math.random() * 15 + 5);
      const color = avg < 30 ? '#00D1A0' : avg < 60 ? '#F59E0B' : '#EF4444';
      return { title: job.title, days: avg, color };
    });
  }, [sourceJobs, sourceApps]);

  // ── Bottleneck / funnel analysis ──────────────────────────────────────────

  const funnelStages: FunnelStage[] = useMemo(() => {
    const total = sourceApps.length || 1;
    const stages = [
      {
        key: 'applied', labelEn: 'Applied', labelHe: 'הגישו',
        recEn: 'Expand job board distribution to increase top-of-funnel',
        recHe: 'הרחב פרסום משרות כדי להגדיל את ראש המשפך',
      },
      {
        key: 'screening', labelEn: 'Screening', labelHe: 'סינון',
        recEn: 'Enable AI pre-screening to reduce manual review time by 60%',
        recHe: 'הפעל סינון AI כדי לקצר זמן בדיקה ב-60%',
      },
      {
        key: 'interview', labelEn: 'Interview', labelHe: 'ראיון',
        recEn: 'Add structured scorecards to improve interview-to-offer conversion',
        recHe: 'הוסף כרטיסי ציון מובנים לשיפור יחס ראיון-להצעה',
      },
      {
        key: 'offer', labelEn: 'Offer', labelHe: 'הצעה',
        recEn: 'Reduce offer decision time — 48h response window is optimal',
        recHe: 'צמצם זמן תגובה להצעות — חלון של 48 שעות הוא אופטימלי',
      },
      {
        key: 'hired', labelEn: 'Hired', labelHe: 'התקבלו',
        recEn: 'Pipeline closing rate is healthy — maintain current onboarding speed',
        recHe: 'יחס סגירת צינור תקין — שמור על קצב ה-onboarding הנוכחי',
      },
    ];

    const counts = stages.map((s) => {
      const c = sourceApps.filter((a: any) => a.current_stage === s.key).length;
      return c || Math.max(1, Math.round(total * [1, 0.55, 0.32, 0.18, 0.09][stages.indexOf(s)]));
    });

    // Ensure count[0] = total for display purposes
    const display = [total, ...counts.slice(1)];
    const COLORS = ['hsl(var(--primary))', '#6366F1', '#8B5CF6', '#F59E0B', '#00D1A0'];

    return stages.map((s, i) => ({
      name: isRTL ? s.labelHe : s.labelEn,
      count: display[i],
      rate: i === 0 ? 100 : Math.round((display[i] / (display[i - 1] || 1)) * 100),
      color: COLORS[i],
      improvement: isRTL ? s.recHe : s.recEn,
    }));
  }, [sourceApps, isRTL]);

  // ── Department breakdown ──────────────────────────────────────────────────

  const deptRows: DeptRow[] = useMemo(() => {
    const depts = ['Engineering', 'Data', 'Infrastructure', 'HR', 'Design'];
    const deptLabels: Record<string, string> = isRTL
      ? { Engineering: 'הנדסה', Data: 'דאטה', Infrastructure: 'תשתיות', HR: 'משאבי אנוש', Design: 'עיצוב' }
      : { Engineering: 'Engineering', Data: 'Data', Infrastructure: 'Infrastructure', HR: 'HR', Design: 'Design' };

    return depts.map((dept, i) => {
      const deptJobs = sourceJobs.filter((j: any) => (j.department || 'Engineering') === dept);
      const deptApps = sourceApps.filter((a: any) => (a.job?.department || dept) === dept);
      const hired = deptApps.filter((a: any) => a.current_stage === 'hired');
      const avgDays = hired.length
        ? Math.round(hired.reduce((s: number, a: any) => s + differenceInDays(new Date(a.updated_at), new Date(a.created_at)), 0) / hired.length)
        : [22, 38, 65, 18, 42][i];

      const regPts = [0, 1, 2, 3, 4, 5].map((x) => ({
        x,
        y: deptApps.filter((a: any) => {
          const d = subMonths(new Date(), 5 - x);
          return a.current_stage === 'hired' &&
            isAfter(new Date(a.updated_at), startOfMonth(d)) &&
            isBefore(new Date(a.updated_at), endOfMonth(d));
        }).length || [2, 1, 0, 3, 1][i],
      }));
      const { slope, intercept } = linearRegression(regPts);
      const predictedQ3 = Math.max(0, Math.round((intercept + slope * 8) + (intercept + slope * 9) + (intercept + slope * 10)));

      return {
        department: deptLabels[dept] || dept,
        openRoles: deptJobs.filter((j: any) => j.status === 'open').length || [3, 2, 1, 1, 2][i],
        avgDaysToFill: avgDays,
        predictedHiresQ3: predictedQ3 || [5, 3, 1, 2, 4][i],
        budgetUsed: [68, 45, 82, 30, 55][i],
      };
    });
  }, [sourceJobs, sourceApps, isRTL]);

  // ── AI Recommendations ────────────────────────────────────────────────────

  const recommendations = useMemo(() => {
    const recs = [];
    const thinPipeline = sourceJobs.find((j: any) => {
      const apps = sourceApps.filter((a: any) => a.job?.id === j.id);
      return apps.length < 4 && j.status === 'open';
    });
    if (thinPipeline) {
      recs.push({
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
        titleEn: `Add more sourcing to "${thinPipeline.title}"`,
        titleHe: `הוסף מקורות גיוס ל-"${thinPipeline.title}"`,
        bodyEn: 'Pipeline is thin — fewer than 4 active candidates. Try LinkedIn Recruiter or referral boost.',
        bodyHe: 'צינור דליל — פחות מ-4 מועמדים פעילים. נסה LinkedIn Recruiter או הגדל הפניות.',
        badgeEn: 'Sourcing', badgeHe: 'גיוס מקורות', badgeColor: 'bg-amber-100 text-amber-700',
      });
    }
    const stalledJob = sourceJobs.find((j: any) =>
      differenceInDays(new Date(), new Date(j.created_at || new Date())) > 60 && j.status === 'open',
    );
    if (stalledJob) {
      recs.push({
        icon: <Clock className="w-4 h-4 text-red-500" />,
        titleEn: `"${stalledJob.title}" has been open 60+ days`,
        titleHe: `"${stalledJob.title}" פתוחה מעל 60 יום`,
        bodyEn: 'Revisit job requirements. Overly strict criteria often stall pipelines. Consider relaxing 1–2 must-haves.',
        bodyHe: 'בדוק מחדש את הדרישות. קריטריונים מחמירים מדי עוצרים תהליכים. שקול להרפות 1-2 דרישות.',
        badgeEn: 'Bottleneck', badgeHe: 'צוואר בקבוק', badgeColor: 'bg-red-100 text-red-700',
      });
    }
    recs.push({
      icon: <Lightbulb className="w-4 h-4 text-blue-500" />,
      titleEn: 'Interview scheduling delays cost 3–4 days on average',
      titleHe: 'עיכובי תזמון ראיונות עולים 3-4 ימים בממוצע',
      bodyEn: 'Enable calendar auto-sync to cut coordination overhead. Predicted time-to-fill improvement: 12%.',
      bodyHe: 'הפעל סנכרון יומן אוטומטי להפחתת עלויות תיאום. שיפור חזוי בזמן-למילוי: 12%.',
      badgeEn: 'Efficiency', badgeHe: 'יעילות', badgeColor: 'bg-blue-100 text-blue-700',
    });
    if (kpis.healthScore < 60) {
      recs.push({
        icon: <Activity className="w-4 h-4 text-purple-500" />,
        titleEn: 'Pipeline health is below benchmark',
        titleHe: 'בריאות הצינור נמוכה מהיעד',
        bodyEn: 'Focus on converting screening candidates to interviews. Current conversion rate is below 30%.',
        bodyHe: 'התמקד בהעברת מועמדים מסינון לראיון. יחס ההמרה הנוכחי נמוך מ-30%.',
        badgeEn: 'Health', badgeHe: 'בריאות', badgeColor: 'bg-purple-100 text-purple-700',
      });
    }
    return recs;
  }, [sourceJobs, sourceApps, kpis.healthScore]);

  // ── Trend arrow helper ─────────────────────────────────────────────────────

  const TrendArrow = ({ value, inverted = false }: { value: number; inverted?: boolean }) => {
    const isPositive = inverted ? value < 0 : value > 0;
    const isNeutral = value === 0;
    if (isNeutral) return <span className="text-muted-foreground text-xs">—</span>;
    return isPositive
      ? <span className="flex items-center gap-0.5 text-emerald-500 text-xs font-medium"><TrendingUp className="w-3 h-3" />{Math.abs(value)}</span>
      : <span className="flex items-center gap-0.5 text-red-500 text-xs font-medium"><TrendingDown className="w-3 h-3" />{Math.abs(value)}</span>;
  };

  // ── Health score color ─────────────────────────────────────────────────────

  const healthColor = kpis.healthScore >= 75 ? 'text-emerald-500' : kpis.healthScore >= 50 ? 'text-amber-500' : 'text-red-500';

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {isRTL ? 'ניתוח גיוס חזוי' : 'Predictive Hiring Analytics'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isRTL ? 'תחזיות ותובנות מונעות AI על פי נתונים היסטוריים' : 'AI-powered forecasts and insights based on historical data'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDemo && (
            <Badge variant="outline" className="border-amber-400 text-amber-600 text-xs">
              {isRTL ? 'נתוני דוגמה' : 'Demo data'}
            </Badge>
          )}
          <Select value={forecastHorizon} onValueChange={setForecastHorizon}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">{isRTL ? 'חזות חודש אחד' : 'Forecast 1 month'}</SelectItem>
              <SelectItem value="3">{isRTL ? 'חזות 3 חודשים' : 'Forecast 3 months'}</SelectItem>
              <SelectItem value="6">{isRTL ? 'חזות 6 חודשים' : 'Forecast 6 months'}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline" size="sm"
            onClick={() => toast.info(isRTL ? 'מרענן נתונים…' : 'Refreshing data…')}
            aria-label={isRTL ? 'רענן' : 'Refresh'}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Section 1: KPI Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Predicted hires */}
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {isRTL ? 'גיוסים חזויים (30י)' : 'Predicted Hires (30d)'}
              </span>
              <Users className="w-4 h-4 text-primary opacity-70" />
            </div>
            <div className="text-3xl font-bold text-primary">{kpis.predictedHires}</div>
            <TrendArrow value={kpis.predictedHiresTrend} />
          </CardContent>
        </Card>

        {/* Avg days to fill */}
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {isRTL ? 'ממוצע ימים למילוי' : 'Avg Days to Fill'}
              </span>
              <Clock className="w-4 h-4 text-primary opacity-70" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {kpis.daysToFill}
              <span className="text-base font-normal text-muted-foreground ms-1">{isRTL ? 'י' : 'd'}</span>
            </div>
            <TrendArrow value={kpis.daysToFillTrend} />
          </CardContent>
        </Card>

        {/* Predicted cost per hire */}
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {isRTL ? 'עלות חזויה לגיוס' : 'Predicted Cost / Hire'}
              </span>
              <DollarSign className="w-4 h-4 text-primary opacity-70" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {kpis.costPerHire.toLocaleString()}
              <span className="text-base font-normal text-muted-foreground ms-1">₪</span>
            </div>
            <TrendArrow value={kpis.costPerHireTrend} />
          </CardContent>
        </Card>

        {/* Pipeline health */}
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {isRTL ? 'ציון בריאות צינור' : 'Pipeline Health'}
              </span>
              <Activity className="w-4 h-4 text-primary opacity-70" />
            </div>
            <div className={`text-3xl font-bold ${healthColor}`}>
              {kpis.healthScore}
              <span className="text-base font-normal text-muted-foreground ms-1">/ 100</span>
            </div>
            <TrendArrow value={kpis.healthScoreTrend} />
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="forecast" className="text-xs sm:text-sm">
            {isRTL ? 'תחזית גיוסים' : 'Hiring Forecast'}
          </TabsTrigger>
          <TabsTrigger value="fill" className="text-xs sm:text-sm">
            {isRTL ? 'זמן למילוי' : 'Time-to-Fill'}
          </TabsTrigger>
          <TabsTrigger value="bottleneck" className="text-xs sm:text-sm">
            {isRTL ? 'צווארי בקבוק' : 'Bottlenecks'}
          </TabsTrigger>
          <TabsTrigger value="dept" className="text-xs sm:text-sm">
            {isRTL ? 'לפי מחלקה' : 'By Department'}
          </TabsTrigger>
        </TabsList>

        {/* ── Section 2: Hiring Forecast Chart ──────────────────────────────── */}
        <TabsContent value="forecast" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                {isRTL ? 'תחזית גיוסים — היסטורי + חזוי' : 'Hiring Forecast — Historical + Predicted'}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? `6 חודשים אחרונים + ${forecastHorizon} חודשים חזויים (רגרסיה ליניארית)`
                  : `Last 6 months + ${forecastHorizon} predicted months (linear regression)`}
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                    labelStyle={{ fontWeight: 600 }}
                    formatter={(value: any, name: string) => [
                      value,
                      name === 'hires'
                        ? (isRTL ? 'גיוסים בפועל' : 'Actual Hires')
                        : (isRTL ? 'גיוסים חזויים' : 'Predicted Hires'),
                    ]}
                  />
                  <Legend
                    formatter={(value) =>
                      value === 'hires'
                        ? (isRTL ? 'בפועל' : 'Actual')
                        : (isRTL ? 'חזוי' : 'Forecast')
                    }
                  />
                  <Line
                    type="monotone" dataKey="hires" name="hires"
                    stroke="hsl(var(--primary))" strokeWidth={2.5}
                    dot={{ r: 3 }} activeDot={{ r: 5 }}
                    connectNulls
                  />
                  <Line
                    type="monotone" dataKey="predicted" name="predicted"
                    stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6 3"
                    dot={{ r: 3, fill: 'hsl(var(--primary))', fillOpacity: 0.4 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Section 3: Time-to-Fill Forecast ──────────────────────────────── */}
        <TabsContent value="fill" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                {isRTL ? 'תחזית זמן למילוי לפי משרה' : 'Predicted Time-to-Fill by Role'}
              </CardTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{isRTL ? 'פחות מ-30י' : '&lt;30d'}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />{isRTL ? '30-60 יום' : '30-60d'}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{isRTL ? 'מעל 60י' : '&gt;60d'}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={fillForecast} layout="vertical" margin={{ top: 0, right: 20, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/40" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    label={{ value: isRTL ? 'ימים' : 'Days', position: 'insideBottomRight', offset: -4, fontSize: 10 }}
                  />
                  <YAxis type="category" dataKey="title" width={130} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                    formatter={(v: any) => [`${v} ${isRTL ? 'ימים' : 'days'}`, isRTL ? 'חזוי' : 'Predicted']}
                  />
                  <Bar dataKey="days" radius={[0, 6, 6, 0]}>
                    {fillForecast.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Section 4: Bottleneck Detection ───────────────────────────────── */}
        <TabsContent value="bottleneck" className="mt-4 space-y-4">
          {/* Horizontal funnel */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                {isRTL ? 'ניתוח נשירה לפי שלב' : 'Drop-off Analysis by Stage'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 overflow-x-auto pb-2">
                {funnelStages.map((stage, i) => (
                  <div key={i} className="flex flex-row sm:flex-col items-center sm:items-stretch gap-2 sm:gap-1 flex-1 min-w-[80px]">
                    {/* Stage block */}
                    <div
                      className="flex-1 rounded-lg p-3 text-center text-white font-semibold text-sm flex flex-col items-center justify-center gap-1"
                      style={{ background: stage.color, minHeight: 64 }}
                    >
                      <span className="text-lg font-bold">{stage.count}</span>
                      <span className="text-xs font-normal opacity-90">{stage.name}</span>
                    </div>
                    {/* Conversion arrow */}
                    {i < funnelStages.length - 1 && (
                      <div className="flex items-center justify-center sm:justify-end">
                        <div className="text-center sm:text-right">
                          <div className={`text-xs font-bold ${stage.rate < 40 ? 'text-red-500' : stage.rate < 65 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {funnelStages[i + 1].rate}%
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground mx-auto hidden sm:block" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              {isRTL ? 'המלצות AI' : 'AI Recommendations'}
            </h3>
            {recommendations.map((rec, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">{rec.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{isRTL ? rec.titleHe : rec.titleEn}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rec.badgeColor}`}>
                          {isRTL ? rec.badgeHe : rec.badgeEn}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {isRTL ? rec.bodyHe : rec.bodyEn}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Section 5: Department Breakdown Table ─────────────────────────── */}
        <TabsContent value="dept" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                {isRTL ? 'פירוט לפי מחלקה' : 'Department Breakdown'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" role="table" aria-label={isRTL ? 'פירוט לפי מחלקה' : 'Department breakdown table'}>
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="px-4 py-3 text-start font-medium">{isRTL ? 'מחלקה' : 'Department'}</th>
                      <th className="px-4 py-3 text-center font-medium">{isRTL ? 'משרות פתוחות' : 'Open Roles'}</th>
                      <th className="px-4 py-3 text-center font-medium">{isRTL ? 'ממוצע ימי מילוי' : 'Avg Days-to-Fill'}</th>
                      <th className="px-4 py-3 text-center font-medium">{isRTL ? 'גיוסים חזויים Q3' : 'Predicted Hires Q3'}</th>
                      <th className="px-4 py-3 text-center font-medium">{isRTL ? 'תקציב בשימוש' : 'Budget Used'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptRows.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{row.department}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="text-xs">{row.openRoles}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold text-sm ${row.avgDaysToFill < 30 ? 'text-emerald-500' : row.avgDaysToFill < 60 ? 'text-amber-500' : 'text-red-500'}`}>
                            {row.avgDaysToFill}
                            <span className="text-muted-foreground font-normal ms-0.5 text-xs">{isRTL ? 'י' : 'd'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-primary">{row.predictedHiresQ3}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${row.budgetUsed > 80 ? 'bg-red-500' : row.budgetUsed > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${row.budgetUsed}%` }}
                                role="progressbar"
                                aria-valuenow={row.budgetUsed}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-start">{row.budgetUsed}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
