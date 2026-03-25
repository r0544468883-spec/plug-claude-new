import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { differenceInDays } from 'date-fns';

export function ReportCompanyJobs() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      const { data } = await supabase
        .from('jobs')
        .select('*, applications(id, status, current_stage)')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      setJobs(data || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const open = jobs.filter(j => j.status === 'open').length;
  const closed = jobs.filter(j => j.status !== 'open').length;
  const avgApps = jobs.length ? Math.round(jobs.reduce((s, j) => s + ((j.applications as any[])?.length || 0), 0) / jobs.length) : 0;

  return (
    <ReportShell
      title={isHebrew ? 'דוח משרות' : 'Jobs Report'}
      description={isHebrew ? 'כל המשרות ומצבן' : 'All jobs and their status'}
      data={jobs}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: isHebrew ? 'פתוחות' : 'Open', value: open },
          { label: isHebrew ? 'נסגרו' : 'Closed', value: closed },
          { label: isHebrew ? 'ממוצע הגשות' : 'Avg Apps', value: avgApps },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground text-right">
              <th className="pb-2 pe-3">{isHebrew ? 'משרה' : 'Job'}</th>
              <th className="pb-2 pe-3">{isHebrew ? 'סטטוס' : 'Status'}</th>
              <th className="pb-2 pe-3">{isHebrew ? 'ימים פתוחה' : 'Days Open'}</th>
              <th className="pb-2">{isHebrew ? 'הגשות' : 'Apps'}</th>
            </tr></thead>
            <tbody>
              {jobs.slice(0, 20).map((j) => {
                const days = j.status === 'open' ? differenceInDays(new Date(), new Date(j.created_at)) : 0;
                const getBadge = (d: number) => {
                  if (d < 14) return <Badge className="bg-green-500/20 text-green-400">{d}d</Badge>;
                  if (d < 30) return <Badge className="bg-yellow-500/20 text-yellow-400">{d}d</Badge>;
                  return <Badge className="bg-destructive/20 text-destructive">{d}d</Badge>;
                };
                return (
                  <tr key={j.id} className="border-b border-border/50">
                    <td className="py-2 pe-3 font-medium">{j.title}</td>
                    <td className="py-2 pe-3"><Badge variant="outline">{j.status}</Badge></td>
                    <td className="py-2 pe-3">{j.status === 'open' ? getBadge(days) : '—'}</td>
                    <td className="py-2 text-muted-foreground">{(j.applications as any[])?.length || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </ReportShell>
  );
}
