import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { differenceInDays } from 'date-fns';

export function ReportOpenJobs() {
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
        .select('*, applications(id, status)')
        .eq('created_by', user.id)
        .eq('status', 'open');
      setJobs(data || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const avgDays = jobs.length ? Math.round(jobs.reduce((s, j) => s + differenceInDays(new Date(), new Date(j.created_at)), 0) / jobs.length) : 0;

  const getHealthBadge = (days: number) => {
    if (days < 14) return <Badge className="bg-green-500/20 text-green-400">{days}d</Badge>;
    if (days < 30) return <Badge className="bg-yellow-500/20 text-yellow-400">{days}d</Badge>;
    return <Badge className="bg-red-500/20 text-red-400">{days}d ⚠️</Badge>;
  };

  return (
    <ReportShell
      title={isHebrew ? 'דוח משרות פתוחות' : 'Open Jobs Report'}
      description={isHebrew ? 'משרות פתוחות ועלות vacancy' : 'Open jobs and vacancy cost'}
      data={jobs}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: isHebrew ? 'משרות פתוחות' : 'Open Jobs', value: jobs.length },
          { label: isHebrew ? 'ממוצע ימים' : 'Avg Days Open', value: avgDays },
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
              <th className="pb-2 pe-3">{isHebrew ? 'ימים פתוחה' : 'Days Open'}</th>
              <th className="pb-2 pe-3">{isHebrew ? 'הגשות' : 'Applications'}</th>
            </tr></thead>
            <tbody>
              {jobs.slice(0, 20).map((j) => {
                const days = differenceInDays(new Date(), new Date(j.created_at));
                const appsCount = (j.applications || []).length;
                return (
                  <tr key={j.id} className="border-b border-border/50">
                    <td className="py-2 pe-3 font-medium">{j.title}</td>
                    <td className="py-2 pe-3">{getHealthBadge(days)}</td>
                    <td className="py-2 text-muted-foreground">{appsCount}</td>
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
