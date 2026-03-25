import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { BenchmarkBadge } from '../BenchmarkBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { subDays, format } from 'date-fns';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Brain, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface JobAnalysis {
  id: string;
  title: string;
  company: string | null;
  score: number | null;
  recommendation: 'apply' | 'skip' | 'maybe' | null;
  reasons: string[] | null;
  missing_skills: string[] | null;
  analyzed_at: string;
}

const REC_META = {
  apply: { he: 'להגיש',    en: 'Apply',  color: '#10b981', bg: 'bg-emerald-500/20 text-emerald-400' },
  maybe: { he: 'אולי',     en: 'Maybe',  color: '#f59e0b', bg: 'bg-yellow-500/20 text-yellow-400' },
  skip:  { he: 'לדלג',    en: 'Skip',   color: '#ef4444', bg: 'bg-red-500/20 text-red-400' },
};

// Score buckets for histogram
const SCORE_BUCKETS = [
  { label: '0–20',  min: 0,   max: 20  },
  { label: '21–40', min: 21,  max: 40  },
  { label: '41–60', min: 41,  max: 60  },
  { label: '61–80', min: 61,  max: 80  },
  { label: '81–100',min: 81,  max: 100 },
];

export function ReportAIMatch() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHe = language === 'he';
  const [data, setData] = useState<JobAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(subDays(new Date(), 90));
  const [marketBenchmarks, setMarketBenchmarks] = useState<{ avg_match_score: number } | null>(null);

  useEffect(() => { fetchData(); }, [dateFrom]);

  useEffect(() => {
    supabase.rpc('get_market_benchmarks').then(({ data }) => {
      if (data) setMarketBenchmarks(data as any);
    });
  }, []);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data: analyses } = await supabase
      .from('job_analyses')
      .select('id, title, company, score, recommendation, reasons, missing_skills, analyzed_at')
      .eq('user_id', user.id)
      .gte('analyzed_at', dateFrom.toISOString())
      .order('analyzed_at', { ascending: false });
    setData((analyses as JobAnalysis[]) || []);
    setIsLoading(false);
  };

  const total = data.length;
  const withScore = data.filter(a => a.score !== null);
  const avgScore = withScore.length
    ? Math.round(withScore.reduce((s, a) => s + (a.score || 0), 0) / withScore.length)
    : 0;

  // Recommendation distribution
  const recCounts = { apply: 0, maybe: 0, skip: 0 };
  data.forEach(a => { if (a.recommendation) recCounts[a.recommendation]++; });

  const pieDdata = (['apply', 'maybe', 'skip'] as const)
    .filter(r => recCounts[r] > 0)
    .map(r => ({
      name: isHe ? REC_META[r].he : REC_META[r].en,
      value: recCounts[r],
      color: REC_META[r].color,
    }));

  // Score histogram
  const histData = SCORE_BUCKETS.map(bucket => ({
    label: bucket.label,
    count: withScore.filter(a => (a.score || 0) >= bucket.min && (a.score || 0) <= bucket.max).length,
  }));

  // Top missing skills
  const skillCounts: Record<string, number> = {};
  data.forEach(a => {
    (a.missing_skills || []).forEach(skill => {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    });
  });
  const topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const applyRate = total > 0 ? Math.round((recCounts.apply / total) * 100) : 0;
  const highScoreCount = withScore.filter(a => (a.score || 0) >= 70).length;

  return (
    <ReportShell
      title={isHe ? 'ניתוחי AI מהתוסף' : 'AI Match Analyses'}
      description={isHe ? 'ניתוחי ההתאמה שבוצעו ע"י התוסף PLUG' : 'Match analyses performed by the PLUG extension'}
      data={data}
      isLoading={isLoading}
      onDateRangeChange={(r) => setDateFrom(r.from)}
    >
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: isHe ? 'נותחו'          : 'Analyzed',       value: total,          icon: Brain },
          { label: isHe ? 'ממוצע ציון'     : 'Avg Score',      value: avgScore ? `${avgScore}%` : '—', icon: TrendingUp },
          { label: isHe ? 'המלצה להגיש'    : 'Apply Recs',     value: `${recCounts.apply} (${applyRate}%)`, icon: CheckCircle },
          { label: isHe ? 'ציון 70%+'       : 'Score 70%+',    value: highScoreCount, icon: AlertCircle },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <Icon className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-2xl font-bold text-primary">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Market benchmark row */}
      {marketBenchmarks && avgScore > 0 && (
        <div className="flex flex-wrap gap-2 items-center p-3 bg-muted/10 rounded-lg border border-border/50">
          <span className="text-xs text-muted-foreground font-medium">{isHe ? 'ממוצע שוק:' : 'Market avg:'}</span>
          <BenchmarkBadge value={avgScore} marketAvg={marketBenchmarks.avg_match_score} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recommendation pie */}
        {pieDdata.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">{isHe ? 'המלצות AI' : 'AI Recommendations'}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieDdata}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    labelLine={false}
                  >
                    {pieDdata.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Score histogram */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-4">{isHe ? 'התפלגות ציונים' : 'Score Distribution'}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={histData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => [val, isHe ? 'משרות' : 'Jobs']} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top missing skills */}
      {topSkills.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-400" />
              {isHe ? 'כישורים חסרים נפוצים' : 'Top Missing Skills'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {topSkills.map(([skill, count]) => (
                <div key={skill} className="flex items-center gap-1">
                  <Badge variant="outline" className="text-sm">
                    {skill}
                  </Badge>
                  <span className="text-xs text-muted-foreground">×{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent analyses list */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-4">{isHe ? 'ניתוחים אחרונים' : 'Recent Analyses'}</h3>
          <div className="space-y-2">
            {data.slice(0, 15).map(a => {
              const rec = a.recommendation ? REC_META[a.recommendation] : null;
              return (
                <div key={a.id} className="flex items-center justify-between p-2 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.company || '—'} · {format(new Date(a.analyzed_at), 'dd/MM/yy')}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.score !== null && (
                      <span className="text-sm font-bold text-primary">{a.score}%</span>
                    )}
                    {rec && (
                      <Badge className={rec.bg}>{isHe ? rec.he : rec.en}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </ReportShell>
  );
}
