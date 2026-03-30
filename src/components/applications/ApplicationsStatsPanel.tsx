import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp, TrendingDown, Minus,
  Users, BarChart3, MapPin, Briefcase, Trophy,
} from 'lucide-react';
import { differenceInDays, format, subDays } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Application {
  id: string;
  status: string;
  current_stage: string;
  match_score: number | null;
  created_at: string;
  last_interaction: string | null;
  source: string | null;
  job: { location: string | null; job_type: string | null } | null;
}

interface MarketBenchmarks {
  total_active_users: number;
  avg_response_rate: number;
  avg_interview_rate: number;
  avg_match_score: number;
  top_cities: { city: string; count: number }[];
  top_job_types: { job_type: string; count: number }[];
}

interface PercentileStats {
  insufficient_data?: boolean;
  app_count: number;
  user_response_rate: number;
  user_interview_rate: number;
  user_avg_match: number;
  market_avg_response: number;
  market_avg_interview: number;
  market_avg_match: number;
  response_percentile: number;
  interview_percentile: number;
  match_percentile: number;
}

interface Props {
  applications: Application[];
  userId: string;
}

type Tab = 'personal' | 'benchmark' | 'market';

const STAGE_ORDER  = ['applied', 'screening', 'interview', 'task', 'offer', 'hired'];
const STAGE_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f97316', '#f59e0b', '#06b6d4'];
const STAGE_HE     = ['הגשה', 'סינון', 'ראיון', 'מטלה', 'הצעה', 'התקבלתי'];
const STAGE_EN     = ['Applied', 'Screening', 'Interview', 'Task', 'Offer', 'Hired'];

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f97316', '#f59e0b', '#06b6d4', '#ec4899'];

// ── PercentileBadge ──────────────────────────────────────────
function PercentileBadge({ percentile, label, isHe }: { percentile: number; label: string; isHe: boolean }) {
  const isTop = percentile >= 65;
  const isLow = percentile <= 35;
  const color = isTop ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : isLow ? 'text-red-400 bg-red-500/10 border-red-500/20'
                              : 'text-muted-foreground bg-muted/30 border-border';
  const Icon = isTop ? TrendingUp : isLow ? TrendingDown : Minus;
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      <span>
        {isHe
          ? `${isTop ? 'בטופ' : isLow ? 'מתחת ל-' : 'כ-'}${100 - percentile}% ${label}`
          : `Top ${100 - percentile}% ${label}`}
      </span>
    </div>
  );
}

// ── Percentile Gauge ──────────────────────────────────────────
function PercentileGauge({ percentile, label, value, unit = '%', isHe }: {
  percentile: number; label: string; value: number; unit?: string; isHe: boolean;
}) {
  const isTop  = percentile >= 65;
  const isLow  = percentile <= 35;
  const color  = isTop ? '#10b981' : isLow ? '#ef4444' : '#6b7280';
  const topPct = 100 - percentile;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold" style={{ color }}>
          {value}{unit} · {isHe ? `טופ ${topPct}%` : `Top ${topPct}%`}
        </span>
      </div>
      <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${percentile}%`, background: `${color}bb` }}
        />
        {/* Median reference */}
        <div className="absolute inset-y-0 w-px bg-white/30" style={{ left: '50%' }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground/50">
        <span>0%</span>
        <span>{isHe ? 'חציון' : 'Median'}</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// ── CompareRow ───────────────────────────────────────────────
function CompareRow({ label, userVal, marketVal, unit = '%', isHe }: {
  label: string; userVal: number; marketVal: number; unit?: string; isHe: boolean;
}) {
  const diff    = userVal - marketVal;
  const isAbove = diff > 1;
  const isEqual = Math.abs(diff) <= 1;
  const color   = isAbove ? 'text-emerald-400' : isEqual ? 'text-muted-foreground' : 'text-red-400';
  const Icon    = isAbove ? TrendingUp : isEqual ? Minus : TrendingDown;
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{userVal}{unit}</span>
        <div className={`flex items-center gap-1 text-xs ${color}`}>
          <Icon className="w-3 h-3" />
          <span>
            {isEqual
              ? (isHe ? 'כממוצע' : 'avg')
              : `${isAbove ? '+' : ''}${diff}${unit} vs ${isHe ? 'ממוצע' : 'avg'} (${marketVal}${unit})`}
          </span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
export function ApplicationsStatsPanel({ applications, userId }: Props) {
  const { language } = useLanguage();
  const isHe = language === 'he';
  const [activeTab, setActiveTab]           = useState<Tab>('personal');
  const [benchmarks, setBenchmarks]         = useState<MarketBenchmarks | null>(null);
  const [percentile, setPercentile]         = useState<PercentileStats | null>(null);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);
  const [loadingPercentile, setLoadingPercentile] = useState(false);

  // ── Personal stats ───────────────────────────────────────
  const personal = useMemo(() => {
    const total        = applications.length;
    const active       = applications.filter(a => a.status === 'active').length;
    const interviews   = applications.filter(a => ['interview', 'technical'].includes(a.current_stage)).length;
    const rejected     = applications.filter(a => a.current_stage === 'rejected' || a.status === 'rejected').length;
    const responded    = applications.filter(a => a.current_stage !== 'applied').length;
    const responseRate  = total > 0 ? Math.round((responded / total) * 100) : 0;
    const interviewRate = total > 0 ? Math.round((interviews / total) * 100) : 0;
    const withMatch    = applications.filter(a => a.match_score);
    const avgMatch     = withMatch.length
      ? Math.round(withMatch.reduce((s, a) => s + (a.match_score || 0), 0) / withMatch.length)
      : 0;
    const withTime     = applications.filter(a => a.last_interaction);
    const avgDays      = withTime.length
      ? Math.round(withTime.reduce((s, a) => s + differenceInDays(new Date(a.last_interaction!), new Date(a.created_at)), 0) / withTime.length)
      : null;
    return { total, active, interviews, rejected, responded, responseRate, interviewRate, avgMatch, avgDays };
  }, [applications]);

  // ── Weekly chart (last 8 weeks) ─────────────────────────
  const weeklyData = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => {
      const end   = subDays(new Date(), (7 - i) * 7);
      const start = subDays(end, 7);
      return {
        week: format(start, 'dd/MM'),
        count: applications.filter(a => {
          const d = new Date(a.created_at);
          return d >= start && d < end;
        }).length,
      };
    })
  , [applications]);

  // ── Stage funnel ─────────────────────────────────────────
  const stageFunnel = useMemo(() =>
    STAGE_ORDER.map((stage, idx) => ({
      stage,
      count: applications.filter(a => STAGE_ORDER.indexOf(a.current_stage) >= idx).length,
    }))
  , [applications]);

  // ── Source donut (Tab 1 extra) ───────────────────────────
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach(a => {
      const src = a.source || 'web';
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [applications]);

  const [benchmarkError, setBenchmarkError]   = useState(false);
  const [percentileError, setPercentileError] = useState(false);

  // ── Fetch effects ────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'market' && !benchmarks && !loadingBenchmark && !benchmarkError) {
      setLoadingBenchmark(true);
      supabase.rpc('get_market_benchmarks').then(({ data, error }) => {
        if (error || !data) {
          console.warn('[StatsPanel] get_market_benchmarks failed:', error?.message || 'no data');
          setBenchmarkError(true);
        } else {
          setBenchmarks(data as MarketBenchmarks);
        }
        setLoadingBenchmark(false);
      });
    }
    if (activeTab === 'benchmark' && !percentile && !loadingPercentile && !percentileError) {
      setLoadingPercentile(true);
      supabase.rpc('get_user_percentile_stats', { p_user_id: userId }).then(({ data, error }) => {
        if (error || !data) {
          console.warn('[StatsPanel] get_user_percentile_stats failed:', error?.message || 'no data');
          setPercentileError(true);
        } else {
          setPercentile(data as PercentileStats);
        }
        setLoadingPercentile(false);
      });
    }
  }, [activeTab]);

  const TABS: { id: Tab; he: string; en: string }[] = [
    { id: 'personal',  he: 'שלי',    en: 'Mine' },
    { id: 'benchmark', he: 'השוואה', en: 'Benchmark' },
    { id: 'market',    he: 'שוק',    en: 'Market' },
  ];

  const maxStage = stageFunnel[0]?.count || 1;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">

        {/* Tab switcher */}
        <div className="flex gap-1 mb-4 bg-muted/30 p-1 rounded-lg w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isHe ? tab.he : tab.en}
            </button>
          ))}
        </div>

        {/* ══ TAB 1: PERSONAL ══════════════════════════════════ */}
        {activeTab === 'personal' && (
          <div className="space-y-4">

            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: isHe ? 'סה"כ הגשות'  : 'Total Applied',   value: personal.total,                         color: 'text-foreground' },
                { label: isHe ? 'שיעור תגובה' : 'Response Rate',   value: `${personal.responseRate}%`,            color: 'text-emerald-400' },
                { label: isHe ? 'שיעור ראיון' : 'Interview Rate',  value: `${personal.interviewRate}%`,           color: 'text-blue-400' },
                { label: isHe ? 'ממוצע התאמה' : 'Avg Match',       value: personal.avgMatch ? `${personal.avgMatch}%` : '—', color: 'text-primary' },
                { label: isHe ? 'בתהליך'      : 'Active',          value: personal.active,                        color: 'text-primary' },
                { label: isHe ? 'ראיונות'     : 'Interviews',      value: personal.interviews,                    color: 'text-amber-400' },
                { label: isHe ? 'נדחו'        : 'Rejected',        value: personal.rejected,                      color: 'text-red-400' },
                { label: isHe ? 'ימים לתגובה' : 'Avg Response Days', value: personal.avgDays !== null ? personal.avgDays : '—', color: 'text-muted-foreground' },
              ].map((s, i) => (
                <div key={i} className="bg-muted/20 rounded-lg p-3 text-center border border-border/50">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Applications over time */}
            {personal.total > 0 && (
              <div className="bg-muted/10 rounded-lg p-3 border border-border/50">
                <h4 className="text-sm font-medium mb-3">{isHe ? 'הגשות לפי שבוע' : 'Applications Per Week'}</h4>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={20} />
                    <Tooltip formatter={(v) => [v, isHe ? 'הגשות' : 'Apps']} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary)/0.15)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Stage funnel */}
            {personal.total > 0 && (
              <div className="bg-muted/10 rounded-lg p-3 border border-border/50">
                <h4 className="text-sm font-medium mb-3">{isHe ? 'פאנל שלבים' : 'Stage Funnel'}</h4>
                <div className="space-y-2">
                  {stageFunnel.map(({ stage, count }, i) => {
                    const pct   = personal.total > 0 ? Math.round((count / personal.total) * 100) : 0;
                    const width = maxStage > 0 ? Math.round((count / maxStage) * 100) : 0;
                    return (
                      <div key={stage}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span style={{ color: STAGE_COLORS[i] }} className="font-medium">
                            {isHe ? STAGE_HE[i] : STAGE_EN[i]}
                          </span>
                          <span className="text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="h-5 bg-muted rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md flex items-center px-2 transition-all duration-500"
                            style={{ width: `${width}%`, minWidth: count > 0 ? '2rem' : 0, background: STAGE_COLORS[i], opacity: 0.8 }}
                          >
                            {count > 0 && <span className="text-white text-xs font-bold">{count}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Source donut */}
            {sourceData.length > 1 && (
              <div className="bg-muted/10 rounded-lg p-3 border border-border/50">
                <h4 className="text-sm font-medium mb-2">{isHe ? 'לפי מקור הגשה' : 'By Application Source'}</h4>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                      labelLine={false}
                    >
                      {sourceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB 2: BENCHMARK ═════════════════════════════════ */}
        {activeTab === 'benchmark' && (
          <div>
            {loadingPercentile ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !percentile ? (
              <div className="py-6 text-center text-muted-foreground">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {isHe ? 'נתוני השוואה עדיין לא זמינים' : 'Benchmark data not available yet'}
                </p>
                <p className="text-xs mt-1 text-muted-foreground/60">
                  {isHe ? 'הנתונים ייווצרו כשיצטברו מספיק משתמשים' : 'Data will be generated once enough users accumulate'}
                </p>
              </div>
            ) : percentile.insufficient_data ? (
              <div className="py-6 text-center text-muted-foreground">
                <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {isHe
                    ? `נדרשות לפחות 3 הגשות להשוואה (יש לך ${percentile.app_count})`
                    : `Need at least 3 applications for comparison (you have ${percentile.app_count})`}
                </p>
              </div>
            ) : (
              <div className="space-y-5">

                {/* Percentile badges */}
                <div className="flex flex-wrap gap-2">
                  <PercentileBadge percentile={percentile.response_percentile}  label={isHe ? 'שיעור תגובה' : 'response rate'}  isHe={isHe} />
                  <PercentileBadge percentile={percentile.interview_percentile} label={isHe ? 'שיעור ראיון' : 'interview rate'} isHe={isHe} />
                  {percentile.user_avg_match > 0 && (
                    <PercentileBadge percentile={percentile.match_percentile} label={isHe ? 'ציון התאמה' : 'match score'} isHe={isHe} />
                  )}
                </div>

                {/* Percentile gauges */}
                <div className="bg-muted/10 rounded-lg p-4 border border-border/50 space-y-4">
                  <PercentileGauge
                    percentile={percentile.response_percentile}
                    label={isHe ? 'שיעור תגובה' : 'Response Rate'}
                    value={percentile.user_response_rate}
                    isHe={isHe}
                  />
                  <PercentileGauge
                    percentile={percentile.interview_percentile}
                    label={isHe ? 'שיעור ראיון' : 'Interview Rate'}
                    value={percentile.user_interview_rate}
                    isHe={isHe}
                  />
                  {percentile.user_avg_match > 0 && (
                    <PercentileGauge
                      percentile={percentile.match_percentile}
                      label={isHe ? 'ממוצע ציון התאמה' : 'Avg Match Score'}
                      value={percentile.user_avg_match}
                      isHe={isHe}
                    />
                  )}
                </div>

                {/* vs market avg bar chart */}
                <div className="bg-muted/10 rounded-lg p-4 border border-border/50">
                  <h4 className="text-sm font-medium mb-3">{isHe ? 'אני vs ממוצע שוק' : 'Me vs Market Average'}</h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={[
                        {
                          name: isHe ? 'תגובה' : 'Response',
                          [isHe ? 'שלי' : 'Mine']: percentile.user_response_rate,
                          [isHe ? 'שוק' : 'Market']: percentile.market_avg_response,
                        },
                        {
                          name: isHe ? 'ראיון' : 'Interview',
                          [isHe ? 'שלי' : 'Mine']: percentile.user_interview_rate,
                          [isHe ? 'שוק' : 'Market']: percentile.market_avg_interview,
                        },
                        ...(percentile.user_avg_match > 0 ? [{
                          name: isHe ? 'התאמה' : 'Match',
                          [isHe ? 'שלי' : 'Mine']: percentile.user_avg_match,
                          [isHe ? 'שוק' : 'Market']: percentile.market_avg_match,
                        }] : []),
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <Tooltip formatter={(v) => [`${v}%`]} />
                      <Bar dataKey={isHe ? 'שלי' : 'Mine'}   fill="#6366f1" radius={[4,4,0,0]} />
                      <Bar dataKey={isHe ? 'שוק' : 'Market'} fill="#4b5563" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 justify-center mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-3 h-3 rounded-sm bg-[#6366f1]" />
                      {isHe ? 'שלי' : 'Mine'}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-3 h-3 rounded-sm bg-[#4b5563]" />
                      {isHe ? 'ממוצע שוק' : 'Market avg'}
                    </div>
                  </div>
                </div>

                {/* Detailed comparison rows */}
                <div className="bg-muted/10 rounded-lg p-3 border border-border/50">
                  <CompareRow label={isHe ? 'שיעור תגובה' : 'Response Rate'}      userVal={percentile.user_response_rate}  marketVal={percentile.market_avg_response}  isHe={isHe} />
                  <CompareRow label={isHe ? 'שיעור ראיון' : 'Interview Rate'}      userVal={percentile.user_interview_rate} marketVal={percentile.market_avg_interview} isHe={isHe} />
                  {percentile.user_avg_match > 0 && (
                    <CompareRow label={isHe ? 'ממוצע ציון התאמה' : 'Avg Match Score'} userVal={percentile.user_avg_match} marketVal={percentile.market_avg_match} isHe={isHe} />
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {isHe ? '* השוואה מבוססת על משתמשים עם לפחות 3 הגשות' : '* Comparison based on users with at least 3 applications'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB 3: MARKET ════════════════════════════════════ */}
        {activeTab === 'market' && (
          <div>
            {loadingBenchmark ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !benchmarks ? (
              <div className="py-6 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {isHe ? 'נתוני שוק עדיין לא זמינים' : 'Market data not available yet'}
                </p>
                <p className="text-xs mt-1 text-muted-foreground/60">
                  {isHe ? 'הנתונים ייווצרו כשיצטברו מספיק משתמשים במערכת' : 'Data will be generated once enough users join the platform'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">

                {/* Market KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: Users,     label: isHe ? 'משתמשים פעילים'    : 'Active Users',       value: benchmarks.total_active_users },
                    { icon: BarChart3, label: isHe ? 'ממוצע שיעור תגובה' : 'Avg Response Rate',  value: `${benchmarks.avg_response_rate}%` },
                    { icon: BarChart3, label: isHe ? 'ממוצע שיעור ראיון' : 'Avg Interview Rate', value: `${benchmarks.avg_interview_rate}%` },
                    { icon: TrendingUp,label: isHe ? 'ממוצע ציון התאמה'  : 'Avg Match Score',    value: benchmarks.avg_match_score > 0 ? `${benchmarks.avg_match_score}%` : '—' },
                  ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <div key={i} className="bg-muted/20 rounded-lg p-3 text-center border border-border/50">
                        <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
                        <div className="text-xl font-bold text-primary">{s.value}</div>
                        <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Top cities bar chart */}
                {benchmarks.top_cities.length > 0 && (
                  <div className="bg-muted/10 rounded-lg p-3 border border-border/50">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      {isHe ? 'ערים מובילות בשוק' : 'Top Hiring Cities'}
                    </h4>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={benchmarks.top_cities} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                        <YAxis dataKey="city" type="category" tick={{ fontSize: 11 }} width={70} />
                        <Tooltip formatter={(v) => [v, isHe ? 'הגשות' : 'Apps']} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {benchmarks.top_cities.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Job types pie chart */}
                {benchmarks.top_job_types.length > 0 && (
                  <div className="bg-muted/10 rounded-lg p-3 border border-border/50">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-primary" />
                      {isHe ? 'סוגי משרות מובילים' : 'Top Job Types'}
                    </h4>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={benchmarks.top_job_types.map(jt => ({ name: jt.job_type, value: jt.count }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                          labelLine={false}
                        >
                          {benchmarks.top_job_types.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
