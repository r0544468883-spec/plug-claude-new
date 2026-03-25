import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { BenchmarkBadge } from '../BenchmarkBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Users, TrendingUp, MapPin } from 'lucide-react';
import { subDays, format, eachDayOfInterval } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface Application {
  id: string;
  current_stage: string;
  status: string;
  match_score: number | null;
  source: string;
  job_url: string | null;
  created_at: string;
  last_interaction: string | null;
  job: {
    id: string;
    title: string;
    location: string | null;
    job_type: string | null;
    company: { name: string; industry: string | null } | null;
  } | null;
}

interface MarketStats {
  total_applicants: number;
  avg_match_score: number;
  stages: Record<string, number>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface GlobalBenchmarks {
  avg_response_rate: number;
  avg_interview_rate: number;
  avg_match_score: number;
}

export function ReportProcessStats() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHe = language === 'he';
  const [data, setData] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(subDays(new Date(), 30));
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [marketCache, setMarketCache] = useState<Record<string, MarketStats>>({});
  const [globalBenchmarks, setGlobalBenchmarks] = useState<GlobalBenchmarks | null>(null);

  useEffect(() => { fetchData(); }, [dateFrom]);

  useEffect(() => {
    supabase.rpc('get_market_benchmarks').then(({ data }) => {
      if (data) setGlobalBenchmarks(data as GlobalBenchmarks);
    });
  }, []);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data: apps } = await supabase
      .from('applications')
      .select(`
        id, current_stage, status, match_score, source, job_url, created_at, last_interaction,
        job:jobs(id, title, location, job_type, company:companies(name, industry))
      `)
      .eq('candidate_id', user.id)
      .gte('created_at', dateFrom.toISOString())
      .order('created_at', { ascending: false });
    setData((apps as unknown as Application[]) || []);
    setIsLoading(false);
  };

  const fetchMarketStats = async (jobId: string) => {
    if (marketCache[jobId]) return;
    const { data } = await supabase.rpc('get_job_market_stats', { p_job_id: jobId });
    if (data) setMarketCache(prev => ({ ...prev, [jobId]: data as MarketStats }));
  };

  const handleExpand = (appId: string, jobId: string | undefined) => {
    if (expandedJob === appId) {
      setExpandedJob(null);
    } else {
      setExpandedJob(appId);
      if (jobId) fetchMarketStats(jobId);
    }
  };

  // Stats
  const total       = data.length;
  const responded   = data.filter(a => !['applied'].includes(a.current_stage)).length;
  const responseRate = total ? Math.round((responded / total) * 100) : 0;
  const avgMatch    = data.filter(a => a.match_score).length
    ? Math.round(data.filter(a => a.match_score).reduce((s, a) => s + (a.match_score || 0), 0) / data.filter(a => a.match_score).length)
    : 0;

  // Area chart — apps per day
  const days = eachDayOfInterval({ start: dateFrom, end: new Date() });
  const timelineData = days.map(day => ({
    date: format(day, 'dd/MM'),
    count: data.filter(a => format(new Date(a.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length,
  }));

  // Bar chart — by city
  const cityCounts: Record<string, number> = {};
  data.forEach(a => {
    const loc = a.job?.location || (isHe ? 'לא ידוע' : 'Unknown');
    cityCounts[loc] = (cityCounts[loc] || 0) + 1;
  });
  const cityData = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([city, count]) => ({ city, count }));

  const stats = [
    { label: isHe ? 'סה"כ הגשות' : 'Total Applied',    value: total },
    { label: isHe ? 'שיעור תגובה' : 'Response Rate',   value: `${responseRate}%` },
    { label: isHe ? 'ממוצע התאמה' : 'Avg Match Score', value: avgMatch ? `${avgMatch}%` : '—' },
    { label: isHe ? 'הגיבו עליי'  : 'Responded',       value: responded },
  ];

  const STAGE_LABELS: Record<string, { he: string; en: string; color: string }> = {
    applied:   { he: 'הגשה',      en: 'Applied',   color: 'bg-blue-500/20 text-blue-400' },
    screening: { he: 'סינון',     en: 'Screening', color: 'bg-purple-500/20 text-purple-400' },
    interview: { he: 'ראיון',     en: 'Interview', color: 'bg-green-500/20 text-green-400' },
    task:      { he: 'מטלה',      en: 'Task',      color: 'bg-orange-500/20 text-orange-400' },
    offer:     { he: 'הצעה',      en: 'Offer',     color: 'bg-yellow-500/20 text-yellow-400' },
    hired:     { he: 'התקבלתי',   en: 'Hired',     color: 'bg-emerald-500/20 text-emerald-400' },
    rejected:  { he: 'נדחיתי',    en: 'Rejected',  color: 'bg-red-500/20 text-red-400' },
  };

  return (
    <ReportShell
      title={isHe ? 'סטטיסטיקות תהליך חיפוש' : 'Job Search Process Stats'}
      description={isHe ? 'ניתוח כולל של תהליך חיפוש העבודה שלך' : 'Full analysis of your job search process'}
      data={data}
      isLoading={isLoading}
      onDateRangeChange={(r) => setDateFrom(r.from)}
    >
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Market benchmarks row */}
      {globalBenchmarks && (
        <div className="flex flex-wrap gap-2 items-center p-3 bg-muted/10 rounded-lg border border-border/50">
          <span className="text-xs text-muted-foreground font-medium">{isHe ? 'ממוצע שוק:' : 'Market avg:'}</span>
          <BenchmarkBadge value={responseRate} marketAvg={globalBenchmarks.avg_response_rate} />
          {avgMatch > 0 && <BenchmarkBadge value={avgMatch} marketAvg={globalBenchmarks.avg_match_score} />}
        </div>
      )}

      {/* Timeline chart */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-4">{isHe ? 'הגשות לפי יום' : 'Applications Over Time'}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* City distribution */}
      {cityData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              {isHe ? 'הגשות לפי עיר' : 'Applications by City'}
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis dataKey="city" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {cityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Per-job list with market data */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            {isHe ? 'פר משרה — נתונים אישיים ושוק' : 'Per Job — Personal & Market Data'}
          </h3>
          <div className="space-y-2">
            {data.slice(0, 20).map((app) => {
              const jobId   = app.job?.id;
              const market  = jobId ? marketCache[jobId] : null;
              const isOpen  = expandedJob === app.id;
              const stage   = STAGE_LABELS[app.current_stage] || STAGE_LABELS.applied;

              return (
                <div key={app.id} className="border border-border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-start"
                    onClick={() => handleExpand(app.id, jobId)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {app.job?.title || (isHe ? 'משרה חיצונית' : 'External Job')}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {app.job?.company?.name || '—'} · {app.job?.location || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={stage.color}>{isHe ? stage.he : stage.en}</Badge>
                      {app.match_score && <span className="text-xs font-semibold text-primary">{app.match_score}%</span>}
                      {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border bg-muted/10 p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">{isHe ? 'הוגש' : 'Applied'}</p>
                        <p className="font-medium">{format(new Date(app.created_at), 'dd/MM/yy')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{isHe ? 'ציון התאמה שלי' : 'My Match Score'}</p>
                        <p className="font-medium text-primary">{app.match_score ? `${app.match_score}%` : '—'}</p>
                      </div>
                      {market && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" /> {isHe ? 'מועמדים בשוק' : 'Market Applicants'}
                            </p>
                            <p className="font-medium">{market.total_applicants}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{isHe ? 'ממוצע שוק' : 'Market Avg Score'}</p>
                            <p className="font-medium">{market.avg_match_score ? `${market.avg_match_score}%` : '—'}</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </ReportShell>
  );
}
