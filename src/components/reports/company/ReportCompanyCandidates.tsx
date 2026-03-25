import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function ReportCompanyCandidates() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      const { data: apps } = await supabase
        .from('applications')
        .select('*, profiles!applications_candidate_id_fkey(full_name), jobs!inner(title, created_by)')
        .eq('jobs.created_by', user.id)
        .order('match_score', { ascending: false });
      setData(apps || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const avgMatch = data.length ? Math.round(data.reduce((s, a) => s + (a.match_score || 0), 0) / data.length) : 0;
  const topMatch = data[0]?.match_score || 0;

  return (
    <ReportShell
      title={isHebrew ? 'דוח מועמדים' : 'Candidates Report'}
      description={isHebrew ? 'כל המועמדים שהגישו' : 'All candidates who applied'}
      data={data}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: isHebrew ? 'סה"כ הגישו' : 'Total Applied', value: data.length },
          { label: isHebrew ? 'Match ממוצע' : 'Avg Match', value: `${avgMatch}%` },
          { label: isHebrew ? 'Top Match' : 'Top Match', value: `${topMatch}%` },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground text-right">
              <th className="pb-2 pe-3">{isHebrew ? 'שם' : 'Name'}</th>
              <th className="pb-2 pe-3">{isHebrew ? 'משרה' : 'Job'}</th>
              <th className="pb-2 pe-3">Match</th>
              <th className="pb-2 pe-3">{isHebrew ? 'שלב' : 'Stage'}</th>
              <th className="pb-2">{isHebrew ? 'תאריך' : 'Date'}</th>
            </tr></thead>
            <tbody>
              {data.slice(0, 20).map((a) => (
                <tr key={a.id} className="border-b border-border/50">
                  <td className="py-2 pe-3 font-medium">{(a.profiles as any)?.full_name || '—'}</td>
                  <td className="py-2 pe-3 text-muted-foreground">{(a.jobs as any)?.title || '—'}</td>
                  <td className="py-2 pe-3">{a.match_score ? <span className="text-primary font-semibold">{a.match_score}%</span> : '—'}</td>
                  <td className="py-2 pe-3"><Badge variant="outline">{a.current_stage || a.status}</Badge></td>
                  <td className="py-2 text-muted-foreground">{format(new Date(a.created_at), 'dd/MM/yy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </ReportShell>
  );
}
