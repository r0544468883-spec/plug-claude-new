import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { BenchmarkBadge } from '../BenchmarkBadge';
import { Card, CardContent } from '@/components/ui/card';
import { subDays } from 'date-fns';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface Application {
  id: string;
  current_stage: string;
  status: string;
  match_score: number | null;
  job: {
    title: string;
    company: { name: string; industry: string | null } | null;
  } | null;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#6366f1', '#8b5cf6', '#ec4899',
];

// Extract normalized role name from job title
function normalizeRole(title: string): string {
  if (!title) return 'Other';
  const t = title.toLowerCase();
  if (t.includes('frontend') || t.includes('front-end') || t.includes('ui developer'))     return 'Frontend';
  if (t.includes('backend') || t.includes('back-end') || t.includes('server-side'))        return 'Backend';
  if (t.includes('fullstack') || t.includes('full-stack') || t.includes('full stack'))     return 'Full Stack';
  if (t.includes('devops') || t.includes('sre') || t.includes('infrastructure'))           return 'DevOps/Infra';
  if (t.includes('data science') || t.includes('machine learning') || t.includes('ml '))   return 'Data Science / ML';
  if (t.includes('data engineer') || t.includes('data analyst') || t.includes('analytics')) return 'Data / Analytics';
  if (t.includes('product manager') || t.includes('product owner') || t.includes(' pm '))  return 'Product';
  if (t.includes('designer') || t.includes('ux') || t.includes('ui/ux'))                   return 'Design / UX';
  if (t.includes('qa') || t.includes('quality') || t.includes('test'))                     return 'QA / Testing';
  if (t.includes('security') || t.includes('cyber') || t.includes('סייבר'))               return 'Security';
  if (t.includes('mobile') || t.includes('ios') || t.includes('android'))                  return 'Mobile';
  if (t.includes('manager') || t.includes('מנהל'))                                        return 'Management';
  if (t.includes('marketing') || t.includes('שיווק'))                                      return 'Marketing';
  if (t.includes('sales') || t.includes('מכירות'))                                         return 'Sales';
  return 'Other';
}

export function ReportRolesFields() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHe = language === 'he';
  const [data, setData] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(subDays(new Date(), 90));
  const [marketBenchmarks, setMarketBenchmarks] = useState<{ avg_response_rate: number; avg_match_score: number } | null>(null);

  useEffect(() => { fetchData(); }, [dateFrom]);

  useEffect(() => {
    supabase.rpc('get_market_benchmarks').then(({ data }) => {
      if (data) setMarketBenchmarks(data as any);
    });
  }, []);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data: apps } = await supabase
      .from('applications')
      .select(`
        id, current_stage, status, match_score,
        job:jobs(title, company:companies(name, industry))
      `)
      .eq('candidate_id', user.id)
      .gte('created_at', dateFrom.toISOString());
    setData((apps as unknown as Application[]) || []);
    setIsLoading(false);
  };

  // Role distribution
  const roleCounts: Record<string, { count: number; responded: number; matchSum: number; matchCount: number }> = {};
  data.forEach(a => {
    const role = normalizeRole(a.job?.title || '');
    if (!roleCounts[role]) roleCounts[role] = { count: 0, responded: 0, matchSum: 0, matchCount: 0 };
    roleCounts[role].count++;
    if (a.current_stage !== 'applied') roleCounts[role].responded++;
    if (a.match_score) { roleCounts[role].matchSum += a.match_score; roleCounts[role].matchCount++; }
  });

  const roleData = Object.entries(roleCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([role, s]) => ({
      role,
      count: s.count,
      responseRate: s.count > 0 ? Math.round((s.responded / s.count) * 100) : 0,
      avgMatch: s.matchCount > 0 ? Math.round(s.matchSum / s.matchCount) : 0,
    }));

  // Industry distribution (from company.industry)
  const industryCounts: Record<string, number> = {};
  data.forEach(a => {
    const ind = a.job?.company?.industry || (isHe ? 'לא ידוע' : 'Unknown');
    industryCounts[ind] = (industryCounts[ind] || 0) + 1;
  });
  const industryData = Object.entries(industryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const total = data.length;
  const uniqueRoles = roleData.length;
  const uniqueIndustries = industryData.length;
  const topRole = roleData[0]?.role || '—';

  return (
    <ReportShell
      title={isHe ? 'לפי תפקיד ותחום' : 'By Role & Field'}
      description={isHe ? 'פילוח הגשות לפי תפקיד ותחום עיסוק' : 'Breakdown of applications by job role and industry'}
      data={data}
      isLoading={isLoading}
      onDateRangeChange={(r) => setDateFrom(r.from)}
    >
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: isHe ? 'סה"כ הגשות' : 'Total Applied',    value: total },
          { label: isHe ? 'תפקידים שונים' : 'Unique Roles',  value: uniqueRoles },
          { label: isHe ? 'תחומים שונים' : 'Industries',     value: uniqueIndustries },
          { label: isHe ? 'תפקיד מוביל' : 'Top Role',        value: topRole },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary truncate">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Market benchmarks row */}
      {marketBenchmarks && total > 0 && (() => {
        const myResponseRate = roleData.length > 0
          ? Math.round(roleData.reduce((s, r) => s + r.responseRate * r.count, 0) / total)
          : 0;
        return (
          <div className="flex flex-wrap gap-2 items-center p-3 bg-muted/10 rounded-lg border border-border/50">
            <span className="text-xs text-muted-foreground font-medium">{isHe ? 'ממוצע שוק:' : 'Market avg:'}</span>
            <BenchmarkBadge value={myResponseRate} marketAvg={marketBenchmarks.avg_response_rate} />
          </div>
        );
      })()}

      {/* Top roles bar chart */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-4">{isHe ? 'הגשות לפי תפקיד' : 'Applications by Role'}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={roleData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis dataKey="role" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(val, name) => [val, name === 'count' ? (isHe ? 'הגשות' : 'Apps') : name]} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Industry pie + response rate by role */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {industryData.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">{isHe ? 'לפי תחום/ענף' : 'By Industry'}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={industryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    labelLine={false}
                  >
                    {industryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Response rate by role */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-4">{isHe ? 'שיעור תגובה לפי תפקיד' : 'Response Rate by Role'}</h3>
            <div className="space-y-2">
              {roleData.map((r, i) => (
                <div key={r.role} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-sm flex-1 truncate">{r.role}</span>
                  <span className="text-sm text-muted-foreground">{r.count} {isHe ? 'הגשות' : 'apps'}</span>
                  <span className="text-sm font-semibold text-primary w-12 text-end">{r.responseRate}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match score by role */}
      {roleData.some(r => r.avgMatch > 0) && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-4">{isHe ? 'ממוצע התאמה לפי תפקיד' : 'Avg Match Score by Role'}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={roleData.filter(r => r.avgMatch > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="role" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(val) => [`${val}%`, isHe ? 'ממוצע התאמה' : 'Avg Match']} />
                <Bar dataKey="avgMatch" radius={[4, 4, 0, 0]}>
                  {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </ReportShell>
  );
}
