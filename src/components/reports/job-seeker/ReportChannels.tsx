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
  source: string | null;
  apply_method: string | null;
  match_score: number | null;
}

const SOURCE_META: Record<string, { he: string; en: string; color: string }> = {
  web:         { he: 'אתר PLUG',      en: 'PLUG Web',      color: '#6366f1' },
  extension:   { he: 'תוסף PLUG',    en: 'PLUG Extension', color: '#8b5cf6' },
  manual:      { he: 'ידני',          en: 'Manual',         color: '#3b82f6' },
};

const METHOD_META: Record<string, { he: string; en: string; color: string }> = {
  manual:      { he: 'הגשה ידנית',   en: 'Manual Apply',   color: '#3b82f6' },
  easy_apply:  { he: 'Easy Apply',   en: 'Easy Apply',     color: '#10b981' },
  plug_ai:     { he: 'PLUG AI',      en: 'PLUG AI',        color: '#8b5cf6' },
};

function getSourceLabel(source: string | null, isHe: boolean) {
  const meta = SOURCE_META[source || 'web'];
  return isHe ? (meta?.he || source || 'אחר') : (meta?.en || source || 'Other');
}

function getMethodLabel(method: string | null, isHe: boolean) {
  const meta = METHOD_META[method || 'manual'];
  return isHe ? (meta?.he || method || 'אחר') : (meta?.en || method || 'Other');
}

export function ReportChannels() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHe = language === 'he';
  const [data, setData] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(subDays(new Date(), 90));
  const [marketBenchmarks, setMarketBenchmarks] = useState<{ avg_response_rate: number } | null>(null);

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
      .select('id, current_stage, status, source, apply_method, match_score')
      .eq('candidate_id', user.id)
      .gte('created_at', dateFrom.toISOString());
    setData((apps as Application[]) || []);
    setIsLoading(false);
  };

  // Source stats
  const sourceStats: Record<string, { count: number; responded: number }> = {};
  data.forEach(a => {
    const src = a.source || 'web';
    if (!sourceStats[src]) sourceStats[src] = { count: 0, responded: 0 };
    sourceStats[src].count++;
    if (a.current_stage !== 'applied') sourceStats[src].responded++;
  });

  const sourcePieData = Object.entries(sourceStats).map(([src, s]) => ({
    name: getSourceLabel(src, isHe),
    value: s.count,
    color: SOURCE_META[src]?.color || '#94a3b8',
  }));

  const sourceBarData = Object.entries(sourceStats).map(([src, s]) => ({
    source: getSourceLabel(src, isHe),
    responseRate: s.count > 0 ? Math.round((s.responded / s.count) * 100) : 0,
    count: s.count,
    color: SOURCE_META[src]?.color || '#94a3b8',
  }));

  // Apply method stats
  const methodStats: Record<string, { count: number; responded: number }> = {};
  data.forEach(a => {
    const m = a.apply_method || 'manual';
    if (!methodStats[m]) methodStats[m] = { count: 0, responded: 0 };
    methodStats[m].count++;
    if (a.current_stage !== 'applied') methodStats[m].responded++;
  });

  const methodPieData = Object.entries(methodStats).map(([m, s]) => ({
    name: getMethodLabel(m, isHe),
    value: s.count,
    color: METHOD_META[m]?.color || '#94a3b8',
  }));

  const total = data.length;
  const extensionCount = sourceStats['extension']?.count || 0;
  const bestSource = sourceBarData.sort((a, b) => b.responseRate - a.responseRate)[0];
  const plugAiCount = methodStats['plug_ai']?.count || 0;

  return (
    <ReportShell
      title={isHe ? 'ערוצי הגשה' : 'Application Channels'}
      description={isHe ? 'מאיפה הגשת ואיזה ערוץ מביא הכי הרבה תגובות' : 'Where you applied and which channel drives the most responses'}
      data={data}
      isLoading={isLoading}
      onDateRangeChange={(r) => setDateFrom(r.from)}
    >
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: isHe ? 'סה"כ הגשות'    : 'Total Applied',       value: total },
          { label: isHe ? 'דרך התוסף'      : 'Via Extension',       value: extensionCount },
          { label: isHe ? 'PLUG AI'         : 'PLUG AI',             value: plugAiCount },
          { label: isHe ? 'ערוץ מוביל'      : 'Best Channel',        value: bestSource?.source || '—' },
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
        const myResponseRate = data.length > 0
          ? Math.round((data.filter(a => a.current_stage !== 'applied').length / total) * 100)
          : 0;
        return (
          <div className="flex flex-wrap gap-2 items-center p-3 bg-muted/10 rounded-lg border border-border/50">
            <span className="text-xs text-muted-foreground font-medium">{isHe ? 'ממוצע שוק:' : 'Market avg:'}</span>
            <BenchmarkBadge value={myResponseRate} marketAvg={marketBenchmarks.avg_response_rate} />
          </div>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source pie */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-4">{isHe ? 'לפי מקור' : 'By Source'}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={sourcePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                  labelLine={false}
                >
                  {sourcePieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Method pie */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-4">{isHe ? 'לפי שיטת הגשה' : 'By Apply Method'}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={methodPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                  labelLine={false}
                >
                  {methodPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Response rate by source (bar chart) */}
      {sourceBarData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-4">{isHe ? 'שיעור תגובה לפי ערוץ' : 'Response Rate by Channel'}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sourceBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="source" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(val) => [`${val}%`, isHe ? 'שיעור תגובה' : 'Response Rate']} />
                <Bar dataKey="responseRate" radius={[4, 4, 0, 0]}>
                  {sourceBarData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Channel breakdown table */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-4">{isHe ? 'פירוט לפי ערוץ' : 'Channel Breakdown'}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2 text-start">{isHe ? 'ערוץ' : 'Channel'}</th>
                  <th className="pb-2 text-center">{isHe ? 'הגשות' : 'Applied'}</th>
                  <th className="pb-2 text-center">{isHe ? '% מסה"כ' : '% of Total'}</th>
                  <th className="pb-2 text-center">{isHe ? 'שיעור תגובה' : 'Response Rate'}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(sourceStats).map(([src, s]) => (
                  <tr key={src} className="border-b border-border/50">
                    <td className="py-2">
                      <span className="font-medium" style={{ color: SOURCE_META[src]?.color || '#94a3b8' }}>
                        {getSourceLabel(src, isHe)}
                      </span>
                    </td>
                    <td className="py-2 text-center font-semibold">{s.count}</td>
                    <td className="py-2 text-center text-muted-foreground">
                      {total > 0 ? `${Math.round((s.count / total) * 100)}%` : '—'}
                    </td>
                    <td className="py-2 text-center text-primary font-medium">
                      {s.count > 0 ? `${Math.round((s.responded / s.count) * 100)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </ReportShell>
  );
}
