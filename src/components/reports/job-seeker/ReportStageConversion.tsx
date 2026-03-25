import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { BenchmarkBadge } from '../BenchmarkBadge';
import { Card, CardContent } from '@/components/ui/card';
import { subDays, differenceInDays } from 'date-fns';

interface Application {
  id: string;
  current_stage: string;
  status: string;
  created_at: string;
  last_interaction: string | null;
}

const STAGES = ['applied', 'screening', 'interview', 'task', 'offer', 'hired'];

const STAGE_META: Record<string, { he: string; en: string; color: string; bg: string }> = {
  applied:   { he: 'הגשה',      en: 'Applied',    color: 'text-blue-400',    bg: 'bg-blue-500' },
  screening: { he: 'סינון',     en: 'Screening',  color: 'text-purple-400',  bg: 'bg-purple-500' },
  interview: { he: 'ראיון',     en: 'Interview',  color: 'text-green-400',   bg: 'bg-green-500' },
  task:      { he: 'מטלה',      en: 'Task',       color: 'text-orange-400',  bg: 'bg-orange-500' },
  offer:     { he: 'הצעה',      en: 'Offer',      color: 'text-yellow-400',  bg: 'bg-yellow-500' },
  hired:     { he: 'התקבלתי',   en: 'Hired',      color: 'text-emerald-400', bg: 'bg-emerald-500' },
};

export function ReportStageConversion() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHe = language === 'he';
  const [data, setData] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(subDays(new Date(), 90));
  const [marketBenchmarks, setMarketBenchmarks] = useState<{ avg_response_rate: number; avg_interview_rate: number } | null>(null);

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
      .select('id, current_stage, status, created_at, last_interaction')
      .eq('candidate_id', user.id)
      .gte('created_at', dateFrom.toISOString());
    setData((apps as Application[]) || []);
    setIsLoading(false);
  };

  const total = data.length;

  // Count per stage (apps that reached at least that stage)
  const stageCounts = STAGES.map(stage => {
    const stageIdx = STAGES.indexOf(stage);
    const count = data.filter(a => {
      const appStageIdx = STAGES.indexOf(a.current_stage);
      return appStageIdx >= stageIdx;
    }).length;
    return { stage, count };
  });

  // Pass rates between consecutive stages
  const passRates = STAGES.slice(1).map((stage, i) => {
    const prev = stageCounts[i].count;
    const curr = stageCounts[i + 1].count;
    return prev > 0 ? Math.round((curr / prev) * 100) : 0;
  });

  // Avg time from created_at to last_interaction (per app)
  const appsWithTime = data.filter(a => a.last_interaction);
  const avgResponseDays = appsWithTime.length
    ? Math.round(
        appsWithTime.reduce((s, a) => s + differenceInDays(new Date(a.last_interaction!), new Date(a.created_at)), 0)
        / appsWithTime.length
      )
    : null;

  const rejected = data.filter(a => a.current_stage === 'rejected' || a.status === 'rejected').length;
  const noResponse = data.filter(a => a.current_stage === 'applied' && !a.last_interaction).length;

  const summaryStats = [
    { label: isHe ? 'סה"כ הגשות' : 'Total Applied',        value: total },
    { label: isHe ? 'עברו ראיון'  : 'Reached Interview',   value: stageCounts.find(s => s.stage === 'interview')?.count || 0 },
    { label: isHe ? 'נדחו'        : 'Rejected',            value: rejected },
    { label: isHe ? 'ימים ממוצע לתגובה' : 'Avg Response Days', value: avgResponseDays !== null ? avgResponseDays : '—' },
  ];

  const maxCount = Math.max(...stageCounts.map(s => s.count), 1);

  return (
    <ReportShell
      title={isHe ? 'המרת שלבים' : 'Stage Conversion'}
      description={isHe ? 'כמה מהגשות עברו כל שלב בתהליך' : 'How many applications progressed through each stage'}
      data={data}
      isLoading={isLoading}
      onDateRangeChange={(r) => setDateFrom(r.from)}
    >
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryStats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              {/* Benchmark badges for response/interview rates */}
              {i === 0 && marketBenchmarks && total > 0 && (
                <div className="mt-2 flex justify-center">
                  <BenchmarkBadge value={Math.round((data.filter(a => a.current_stage !== 'applied').length / total) * 100)} marketAvg={marketBenchmarks.avg_response_rate} />
                </div>
              )}
              {i === 1 && marketBenchmarks && total > 0 && (
                <div className="mt-2 flex justify-center">
                  <BenchmarkBadge value={Math.round(((stageCounts.find(s => s.stage === 'interview')?.count || 0) / total) * 100)} marketAvg={marketBenchmarks.avg_interview_rate} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funnel */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-medium mb-6">{isHe ? 'פאנל שלבים' : 'Stage Funnel'}</h3>
          <div className="space-y-3">
            {stageCounts.map(({ stage, count }, i) => {
              const meta = STAGE_META[stage];
              const width = total > 0 ? Math.round((count / maxCount) * 100) : 0;
              const pct   = total > 0 ? Math.round((count / total) * 100) : 0;

              return (
                <div key={stage}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={`font-medium ${meta.color}`}>
                      {isHe ? meta.he : meta.en}
                    </span>
                    <span className="text-muted-foreground">
                      {count} {isHe ? 'הגשות' : 'apps'} ({pct}%)
                    </span>
                  </div>
                  <div className="h-7 bg-muted rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${meta.bg} opacity-80 rounded-lg transition-all duration-500 flex items-center px-2`}
                      style={{ width: `${width}%`, minWidth: count > 0 ? '2rem' : '0' }}
                    >
                      {count > 0 && <span className="text-white text-xs font-bold">{count}</span>}
                    </div>
                  </div>
                  {/* Pass rate arrow between stages */}
                  {i < STAGES.length - 1 && (
                    <div className="flex items-center gap-1 mt-1 ms-2 text-xs text-muted-foreground">
                      <span>↓</span>
                      <span>
                        {isHe
                          ? `${passRates[i]}% עברו לשלב הבא`
                          : `${passRates[i]}% moved to next stage`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stage breakdown table */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-4">{isHe ? 'פירוט לפי שלב' : 'Stage Breakdown'}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2 text-start">{isHe ? 'שלב' : 'Stage'}</th>
                  <th className="pb-2 text-center">{isHe ? 'כמות' : 'Count'}</th>
                  <th className="pb-2 text-center">{isHe ? '% מסה"כ' : '% of Total'}</th>
                  <th className="pb-2 text-center">{isHe ? 'שיעור מעבר' : 'Pass Rate'}</th>
                </tr>
              </thead>
              <tbody>
                {stageCounts.map(({ stage, count }, i) => {
                  const meta = STAGE_META[stage];
                  return (
                    <tr key={stage} className="border-b border-border/50">
                      <td className="py-2">
                        <span className={`font-medium ${meta.color}`}>
                          {isHe ? meta.he : meta.en}
                        </span>
                      </td>
                      <td className="py-2 text-center font-semibold">{count}</td>
                      <td className="py-2 text-center text-muted-foreground">
                        {total > 0 ? `${Math.round((count / total) * 100)}%` : '—'}
                      </td>
                      <td className="py-2 text-center">
                        {i < STAGES.length - 1
                          ? <span className="text-primary font-medium">{passRates[i]}%</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-b border-border/50">
                  <td className="py-2">
                    <span className="font-medium text-red-400">{isHe ? 'נדחיתי' : 'Rejected'}</span>
                  </td>
                  <td className="py-2 text-center font-semibold">{rejected}</td>
                  <td className="py-2 text-center text-muted-foreground">
                    {total > 0 ? `${Math.round((rejected / total) * 100)}%` : '—'}
                  </td>
                  <td className="py-2 text-center text-muted-foreground">—</td>
                </tr>
                <tr>
                  <td className="py-2">
                    <span className="font-medium text-muted-foreground">{isHe ? 'ללא תגובה' : 'No Response'}</span>
                  </td>
                  <td className="py-2 text-center font-semibold">{noResponse}</td>
                  <td className="py-2 text-center text-muted-foreground">
                    {total > 0 ? `${Math.round((noResponse / total) * 100)}%` : '—'}
                  </td>
                  <td className="py-2 text-center text-muted-foreground">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </ReportShell>
  );
}
