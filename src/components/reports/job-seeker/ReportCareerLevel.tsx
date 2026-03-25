import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { BenchmarkBadge } from '../BenchmarkBadge';
import { Card, CardContent } from '@/components/ui/card';
import { subDays } from 'date-fns';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Application {
  id: string;
  current_stage: string;
  status: string;
  match_score: number | null;
  job: { title: string } | null;
}

type CareerLevel = 'junior' | 'mid' | 'senior' | 'manager' | 'director' | 'executive';

const LEVELS: { id: CareerLevel; he: string; en: string; color: string }[] = [
  { id: 'junior',    he: "ג'וניור",          en: 'Junior',          color: '#f97316' },
  { id: 'mid',       he: 'מיד לוול',          en: 'Mid-Level',       color: '#3b82f6' },
  { id: 'senior',    he: 'בכיר',              en: 'Senior',          color: '#8b5cf6' },
  { id: 'manager',   he: 'מנהל/ת',            en: 'Manager',         color: '#10b981' },
  { id: 'director',  he: 'מנהל מחלקה',        en: 'Director',        color: '#6366f1' },
  { id: 'executive', he: 'הנהלה בכירה',       en: 'Executive',       color: '#ec4899' },
];

function parseCareerLevel(title: string): CareerLevel {
  if (!title) return 'mid';
  const t = title.toLowerCase();
  if (/\b(ceo|cto|cfo|coo|vp\b|vice.?president|chief\s|founder|co-founder)\b/.test(t)) return 'executive';
  if (/\b(director|head.?of|ראש מחלקה|מנהל\s+(?:מחלקה|אגף))\b/.test(t))              return 'director';
  if (/\b(manager|team.?lead|מנהל\b|ריד|lead\s+\w+)\b/.test(t))                       return 'manager';
  if (/\b(senior|sr\.?\s|בכיר)\b/.test(t))                                             return 'senior';
  if (/\b(junior|jr\.?\s|entry.?level|graduate|intern|סטודנט|מתמחה|התמחות)\b/.test(t)) return 'junior';
  return 'mid';
}

export function ReportCareerLevel() {
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
      .select('id, current_stage, status, match_score, job:jobs(title)')
      .eq('candidate_id', user.id)
      .gte('created_at', dateFrom.toISOString());
    setData((apps as unknown as Application[]) || []);
    setIsLoading(false);
  };

  // Build stats per level
  const levelStats: Record<CareerLevel, { count: number; responded: number; matchSum: number; matchCount: number }> = {
    junior:    { count: 0, responded: 0, matchSum: 0, matchCount: 0 },
    mid:       { count: 0, responded: 0, matchSum: 0, matchCount: 0 },
    senior:    { count: 0, responded: 0, matchSum: 0, matchCount: 0 },
    manager:   { count: 0, responded: 0, matchSum: 0, matchCount: 0 },
    director:  { count: 0, responded: 0, matchSum: 0, matchCount: 0 },
    executive: { count: 0, responded: 0, matchSum: 0, matchCount: 0 },
  };

  data.forEach(a => {
    const level = parseCareerLevel(a.job?.title || '');
    levelStats[level].count++;
    if (a.current_stage !== 'applied') levelStats[level].responded++;
    if (a.match_score) { levelStats[level].matchSum += a.match_score; levelStats[level].matchCount++; }
  });

  const pieData = LEVELS
    .filter(l => levelStats[l.id].count > 0)
    .map(l => ({
      name: isHe ? l.he : l.en,
      value: levelStats[l.id].count,
      color: l.color,
    }));

  const barData = LEVELS
    .filter(l => levelStats[l.id].count > 0)
    .map(l => {
      const s = levelStats[l.id];
      return {
        level: isHe ? l.he : l.en,
        responseRate: s.count > 0 ? Math.round((s.responded / s.count) * 100) : 0,
        avgMatch: s.matchCount > 0 ? Math.round(s.matchSum / s.matchCount) : 0,
        count: s.count,
        color: l.color,
      };
    });

  const total = data.length;
  const dominantLevel = barData.sort((a, b) => b.count - a.count)[0];

  return (
    <ReportShell
      title={isHe ? 'לפי רמת קריירה' : 'By Career Level'}
      description={isHe ? 'התפלגות הגשות לפי Junior / Senior / Manager / Executive' : 'Distribution by Junior / Senior / Manager / Executive'}
      data={data}
      isLoading={isLoading}
      onDateRangeChange={(r) => setDateFrom(r.from)}
    >
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: isHe ? 'סה"כ הגשות' : 'Total Applied',           value: total },
          { label: isHe ? 'רמה מובילה' : 'Dominant Level',           value: dominantLevel?.level || '—' },
          { label: isHe ? 'ג\'וניור' : 'Junior',                     value: levelStats.junior.count },
          { label: isHe ? 'בכיר ומעלה' : 'Senior & Above',           value: levelStats.senior.count + levelStats.manager.count + levelStats.director.count + levelStats.executive.count },
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
        const myResponseRate = barData.length > 0
          ? Math.round(barData.reduce((s, b) => s + b.responseRate * b.count, 0) / total)
          : 0;
        const myAvgMatch = barData.length > 0
          ? Math.round(barData.reduce((s, b) => s + (b.avgMatch || 0) * b.count, 0) / total)
          : 0;
        return (
          <div className="flex flex-wrap gap-2 items-center p-3 bg-muted/10 rounded-lg border border-border/50">
            <span className="text-xs text-muted-foreground font-medium">{isHe ? 'ממוצע שוק:' : 'Market avg:'}</span>
            <BenchmarkBadge value={myResponseRate} marketAvg={marketBenchmarks.avg_response_rate} />
            {myAvgMatch > 0 && <BenchmarkBadge value={myAvgMatch} marketAvg={marketBenchmarks.avg_match_score} />}
          </div>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie chart */}
        {pieData.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">{isHe ? 'התפלגות לפי רמה' : 'Distribution by Level'}</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Response rate per level */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-4">{isHe ? 'שיעור תגובה לפי רמה' : 'Response Rate by Level'}</h3>
            <div className="space-y-3">
              {LEVELS.map(l => {
                const s = levelStats[l.id];
                if (s.count === 0) return null;
                const rate = Math.round((s.responded / s.count) * 100);
                return (
                  <div key={l.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ color: l.color }} className="font-medium">{isHe ? l.he : l.en}</span>
                      <span className="text-muted-foreground">{s.count} {isHe ? 'הגשות' : 'apps'} · {rate}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${rate}%`, background: l.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match score by level */}
      {barData.some(b => b.avgMatch > 0) && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-4">{isHe ? 'ממוצע התאמה לפי רמה' : 'Avg Match Score by Level'}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData.filter(b => b.avgMatch > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="level" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(val) => [`${val}%`, isHe ? 'ממוצע התאמה' : 'Avg Match']} />
                <Bar dataKey="avgMatch" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Level breakdown table */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-4">{isHe ? 'פירוט לפי רמה' : 'Level Breakdown'}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2 text-start">{isHe ? 'רמה' : 'Level'}</th>
                  <th className="pb-2 text-center">{isHe ? 'הגשות' : 'Applied'}</th>
                  <th className="pb-2 text-center">{isHe ? '% מסה"כ' : '% of Total'}</th>
                  <th className="pb-2 text-center">{isHe ? 'שיעור תגובה' : 'Response Rate'}</th>
                  <th className="pb-2 text-center">{isHe ? 'ממוצע התאמה' : 'Avg Match'}</th>
                </tr>
              </thead>
              <tbody>
                {LEVELS.map(l => {
                  const s = levelStats[l.id];
                  if (s.count === 0) return null;
                  return (
                    <tr key={l.id} className="border-b border-border/50">
                      <td className="py-2">
                        <span className="font-medium" style={{ color: l.color }}>{isHe ? l.he : l.en}</span>
                      </td>
                      <td className="py-2 text-center font-semibold">{s.count}</td>
                      <td className="py-2 text-center text-muted-foreground">
                        {total > 0 ? `${Math.round((s.count / total) * 100)}%` : '—'}
                      </td>
                      <td className="py-2 text-center text-primary font-medium">
                        {s.count > 0 ? `${Math.round((s.responded / s.count) * 100)}%` : '—'}
                      </td>
                      <td className="py-2 text-center">
                        {s.matchCount > 0 ? `${Math.round(s.matchSum / s.matchCount)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </ReportShell>
  );
}
