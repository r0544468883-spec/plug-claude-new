import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase, TrendingUp, Target, Clock, BarChart3, Activity,
  ArrowUp, ArrowDown, Minus, Info, HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Personal charts
import { ReportWeeklyActivity } from '@/components/reports/job-seeker/ReportWeeklyActivity';
import { ReportStageConversion } from '@/components/reports/job-seeker/ReportStageConversion';
import { ReportApplications } from '@/components/reports/job-seeker/ReportApplications';
import { ReportChannels } from '@/components/reports/job-seeker/ReportChannels';
import { ReportAIMatch } from '@/components/reports/job-seeker/ReportAIMatch';
import { ReportVouches } from '@/components/reports/job-seeker/ReportVouches';

// Market intelligence
import { ReportSalary } from '@/components/reports/job-seeker/ReportSalary';
import { ReportSkillsVsMarket } from '@/components/reports/job-seeker/ReportSkillsVsMarket';
import { ReportMarketFit } from '@/components/reports/job-seeker/ReportMarketFit';
import { ReportCareerLevel } from '@/components/reports/job-seeker/ReportCareerLevel';
import { ReportRolesFields } from '@/components/reports/job-seeker/ReportRolesFields';

// Credits
import { ReportCredits } from '@/components/reports/job-seeker/ReportCredits';

// ── Benchmark thresholds for "good vs bad" ──────────────────
// Based on typical job search market data
const BENCHMARKS = {
  total:         { good: 20, great: 50 },
  responseRate:  { good: 20, great: 40 },
  interviewRate: { good: 10, great: 25 },
  avgScore:      { good: 60, great: 80 },
  daysActive:    { info: true }, // neutral — no good/bad
};

type RatingLevel = 'great' | 'good' | 'needs_work' | 'neutral';

function getRating(key: string, value: number): RatingLevel {
  if (key === 'daysActive') return 'neutral';
  const bench = BENCHMARKS[key as keyof typeof BENCHMARKS] as { good: number; great: number };
  if (!bench) return 'neutral';
  if (value >= bench.great) return 'great';
  if (value >= bench.good) return 'good';
  return 'needs_work';
}

const ratingConfig: Record<RatingLevel, { icon: any; color: string; label: { he: string; en: string } }> = {
  great:      { icon: ArrowUp,   color: 'text-emerald-500', label: { he: 'מעולה', en: 'Great' } },
  good:       { icon: ArrowUp,   color: 'text-blue-500',    label: { he: 'טוב', en: 'Good' } },
  needs_work: { icon: ArrowDown, color: 'text-amber-500',   label: { he: 'צריך שיפור', en: 'Needs work' } },
  neutral:    { icon: Minus,     color: 'text-muted-foreground', label: { he: 'מידע', en: 'Info' } },
};

// ── Tooltip explanations for each KPI ──────────────────
const kpiTooltips: Record<string, { he: string; en: string }> = {
  total: {
    he: 'מספר ההגשות הכולל שלך. מומלץ להגיש ל-20+ משרות כדי להגדיל את הסיכויים.',
    en: 'Your total applications. Apply to 20+ jobs to maximize your chances.',
  },
  responseRate: {
    he: 'אחוז ההגשות שקיבלת עליהן תגובה (לא כולל "הוגש"). ממוצע בשוק: 20-30%. מעל 40% = מצוין.',
    en: 'Percentage of applications that got a response (excluding "applied"). Market avg: 20-30%. Above 40% = excellent.',
  },
  interviewRate: {
    he: 'אחוז ההגשות שהובילו לראיון. ממוצע בשוק: 10-15%. מעל 25% = מצוין.',
    en: 'Percentage of applications that led to an interview. Market avg: 10-15%. Above 25% = excellent.',
  },
  avgScore: {
    he: 'ציון התאמה ממוצע מה-AI. מעל 80 = התאמה גבוהה. מתחת ל-60 = שקול לדייק את החיפוש.',
    en: 'Average AI match score. Above 80 = strong fit. Below 60 = consider refining your search.',
  },
  daysActive: {
    he: 'מספר הימים מאז ההגשה הראשונה שלך. חיפוש עבודה ממוצע נמשך 2-4 חודשים.',
    en: 'Days since your first application. Average job search lasts 2-4 months.',
  },
};

// ── Section tooltips for report groups ──────────────────
const sectionTooltips = {
  activity: {
    he: 'כמה אתה פעיל בחיפוש? קצב הגשות, מגמות שבועיות, וערוצי הגשה.',
    en: 'How active is your search? Application pace, weekly trends, and submission channels.',
  },
  funnel: {
    he: 'איפה אתה מאבד מועמדויות? מעקב אחר ההמרה מהגשה עד הצעה.',
    en: 'Where are you losing candidacies? Track conversion from application to offer.',
  },
  matching: {
    he: 'כמה המשרות שאתה מגיש אליהן מתאימות לך? ציוני AI ואישורים.',
    en: 'How well do the jobs you apply to match you? AI scores and endorsements.',
  },
};

export function MyStatsPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  // Personal KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['my-stats-kpis', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const { data: apps } = await supabase
        .from('applications')
        .select('id, status, match_score, created_at, interview_date')
        .eq('user_id', profile.id) as any;

      const allApps = apps || [];
      const total = allApps.length;
      const withResponse = allApps.filter((a: any) => a.status && a.status !== 'applied' && a.status !== 'pending').length;
      const withInterview = allApps.filter((a: any) => a.interview_date || a.status === 'interview').length;
      const scores = allApps.filter((a: any) => a.match_score != null).map((a: any) => a.match_score);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length) : 0;

      const firstApp = allApps.length > 0
        ? new Date(allApps.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0].created_at)
        : new Date();
      const daysActive = Math.max(1, Math.ceil((Date.now() - firstApp.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        total,
        responseRate: total > 0 ? Math.round((withResponse / total) * 100) : 0,
        interviewRate: total > 0 ? Math.round((withInterview / total) * 100) : 0,
        avgScore,
        daysActive,
      };
    },
    enabled: !!profile?.id,
  });

  // Market benchmarks (from RPC)
  const { data: marketBench } = useQuery({
    queryKey: ['my-stats-market-bench'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_market_benchmarks' as any);
      if (error) return null;
      return data as { avg_response_rate: number; avg_interview_rate: number; avg_match_score: number } | null;
    },
    enabled: !!profile?.id,
  });

  const kpiCardsData = [
    {
      key: 'total',
      icon: Briefcase,
      label: isRTL ? 'סה"כ הגשות' : 'Total Applications',
      value: kpis?.total ?? 0,
      display: kpis?.total ?? '—',
      color: 'text-blue-500 bg-blue-500/10',
      marketAvg: null as number | null,
    },
    {
      key: 'responseRate',
      icon: TrendingUp,
      label: isRTL ? 'אחוז מענה' : 'Response Rate',
      value: kpis?.responseRate ?? 0,
      display: kpis ? `${kpis.responseRate}%` : '—',
      color: 'text-emerald-500 bg-emerald-500/10',
      marketAvg: marketBench?.avg_response_rate ?? null,
    },
    {
      key: 'interviewRate',
      icon: Target,
      label: isRTL ? 'אחוז ראיונות' : 'Interview Rate',
      value: kpis?.interviewRate ?? 0,
      display: kpis ? `${kpis.interviewRate}%` : '—',
      color: 'text-violet-500 bg-violet-500/10',
      marketAvg: marketBench?.avg_interview_rate ?? null,
    },
    {
      key: 'avgScore',
      icon: Activity,
      label: isRTL ? 'ציון התאמה ממוצע' : 'Avg Match Score',
      value: kpis?.avgScore ?? 0,
      display: kpis?.avgScore ?? '—',
      color: 'text-amber-500 bg-amber-500/10',
      marketAvg: marketBench?.avg_match_score ?? null,
    },
    {
      key: 'daysActive',
      icon: Clock,
      label: isRTL ? 'ימים פעילים' : 'Days Active',
      value: kpis?.daysActive ?? 0,
      display: kpis?.daysActive ?? '—',
      color: 'text-rose-500 bg-rose-500/10',
      marketAvg: null,
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-full max-w-7xl mx-auto space-y-6 p-4 md:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isRTL ? 'נתוני החיפוש שלי' : 'My Stats'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL ? 'סטטיסטיקות אישיות ונתוני שוק העבודה' : 'Personal statistics & job market data'}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpisLoading ? (
            // Skeleton loading
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            kpiCardsData.map((kpi) => {
              const rating = kpis ? getRating(kpi.key, kpi.value) : 'neutral';
              const rCfg = ratingConfig[rating];
              const RatingIcon = rCfg.icon;
              const tooltip = kpiTooltips[kpi.key];
              const hasMarketAvg = kpi.marketAvg != null;
              const aboveMarket = hasMarketAvg && kpi.value > kpi.marketAvg!;

              return (
                <Tooltip key={kpi.key}>
                  <TooltipTrigger asChild>
                    <Card className="bg-card border-border cursor-help hover:border-primary/30 transition-colors group">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${kpi.color}`}>
                            <kpi.icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              {kpi.label}
                              <HelpCircle className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                            </p>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xl font-bold text-foreground">{kpi.display}</p>
                              {kpis && rating !== 'neutral' && (
                                <RatingIcon className={cn('w-4 h-4', rCfg.color)} />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Rating badge + market comparison */}
                        {kpis && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {rating !== 'neutral' && (
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', rCfg.color)}>
                                {isRTL ? rCfg.label.he : rCfg.label.en}
                              </Badge>
                            )}
                            {hasMarketAvg && (
                              <Badge variant="outline" className={cn(
                                'text-[10px] px-1.5 py-0',
                                aboveMarket ? 'text-emerald-500 border-emerald-500/30' : 'text-amber-500 border-amber-500/30'
                              )}>
                                {aboveMarket
                                  ? (isRTL ? `מעל הממוצע (${kpi.marketAvg}%)` : `Above avg (${kpi.marketAvg}%)`)
                                  : (isRTL ? `מתחת לממוצע (${kpi.marketAvg}%)` : `Below avg (${kpi.marketAvg}%)`)}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs" dir={isRTL ? 'rtl' : 'ltr'}>
                    <p>{isRTL ? tooltip.he : tooltip.en}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="w-full justify-start bg-muted/50 rounded-lg p-1">
            <TabsTrigger value="personal" className="rounded-md">
              <BarChart3 className="w-4 h-4 me-1.5" />
              {isRTL ? 'נתונים אישיים' : 'Personal'}
            </TabsTrigger>
            <TabsTrigger value="market" className="rounded-md">
              <TrendingUp className="w-4 h-4 me-1.5" />
              {isRTL ? 'נתוני שוק' : 'Market'}
            </TabsTrigger>
            <TabsTrigger value="credits" className="rounded-md">
              {isRTL ? 'קרדיטים' : 'Credits'}
            </TabsTrigger>
          </TabsList>

          {/* Personal Charts */}
          <TabsContent value="personal" className="mt-4 space-y-6">
            {/* Activity section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {isRTL ? 'פעילות' : 'Activity'}
                </h3>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs" dir={isRTL ? 'rtl' : 'ltr'}>
                    <p>{isRTL ? sectionTooltips.activity.he : sectionTooltips.activity.en}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ReportWeeklyActivity />
                <ReportApplications />
                <ReportChannels />
              </div>
            </div>

            {/* Funnel section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {isRTL ? 'משפך גיוס' : 'Recruitment Funnel'}
                </h3>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs" dir={isRTL ? 'rtl' : 'ltr'}>
                    <p>{isRTL ? sectionTooltips.funnel.he : sectionTooltips.funnel.en}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ReportStageConversion />
              </div>
            </div>

            {/* Matching section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {isRTL ? 'התאמה ואישורים' : 'Matching & Endorsements'}
                </h3>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs" dir={isRTL ? 'rtl' : 'ltr'}>
                    <p>{isRTL ? sectionTooltips.matching.he : sectionTooltips.matching.en}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ReportAIMatch />
                <ReportVouches />
              </div>
            </div>
          </TabsContent>

          {/* Market Intelligence */}
          <TabsContent value="market" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ReportSalary />
              <ReportSkillsVsMarket />
              <ReportMarketFit />
              <ReportCareerLevel />
              <ReportRolesFields />
            </div>
          </TabsContent>

          {/* Credits Usage */}
          <TabsContent value="credits" className="mt-4">
            <div className="max-w-3xl">
              <ReportCredits />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
