import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { differenceInDays, format } from 'date-fns';

export function ReportCRM() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      const { data: companies } = await supabase
        .from('companies')
        .select('*, jobs(id, status)')
        .eq('created_by', user.id);
      setData(companies || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const stale = data.filter(c => c.last_contact_at && differenceInDays(new Date(), new Date(c.last_contact_at)) >= 7).length;

  return (
    <ReportShell
      title={isHebrew ? 'דוח CRM לקוחות' : 'CRM Clients Report'}
      description={isHebrew ? 'לקוחות, משרות ועדכונים' : 'Clients, jobs, and updates'}
      data={data}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: isHebrew ? 'לקוחות' : 'Clients', value: data.length },
          { label: isHebrew ? 'ללא עדכון 7+ ימים' : 'Stale 7+ days', value: stale },
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
              <th className="pb-2 pe-3">{isHebrew ? 'לקוח' : 'Client'}</th>
              <th className="pb-2 pe-3">{isHebrew ? 'משרות פתוחות' : 'Open Jobs'}</th>
              <th className="pb-2">{isHebrew ? 'עדכון אחרון' : 'Last Contact'}</th>
            </tr></thead>
            <tbody>
              {data.map((c) => {
                const openJobs = (c.jobs as any[])?.filter((j: any) => j.status === 'open').length || 0;
                const daysSince = c.last_contact_at ? differenceInDays(new Date(), new Date(c.last_contact_at)) : null;
                return (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2 pe-3 font-medium">{c.name}</td>
                    <td className="py-2 pe-3">{openJobs}</td>
                    <td className="py-2">
                      {daysSince !== null ? (
                        daysSince >= 7 ? <Badge className="bg-red-500/20 text-red-400">{daysSince}d</Badge> : <Badge className="bg-green-500/20 text-green-400">{daysSince}d</Badge>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
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
