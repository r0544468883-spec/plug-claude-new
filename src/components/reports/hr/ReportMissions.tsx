import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function ReportMissions() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      const { data: missions } = await supabase
        .from('missions')
        .select('*, mission_bids(id)')
        .eq('created_by', user.id);
      setData(missions || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const open = data.filter(m => m.status === 'open').length;
  const closed = data.filter(m => m.status === 'closed').length;
  const avgBids = data.length ? Math.round(data.reduce((s, m) => s + ((m.mission_bids as any[])?.length || 0), 0) / data.length) : 0;

  return (
    <ReportShell
      title={isHebrew ? 'דוח Missions' : 'Missions Report'}
      description={isHebrew ? 'פרויקטי גיוס ו-bids' : 'Recruitment projects and bids'}
      data={data}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: isHebrew ? 'פתוחים' : 'Open', value: open },
          { label: isHebrew ? 'נסגרו' : 'Closed', value: closed },
          { label: isHebrew ? 'ממוצע Bids' : 'Avg Bids', value: avgBids },
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
              <th className="pb-2 pe-3">{isHebrew ? 'Mission' : 'Mission'}</th>
              <th className="pb-2 pe-3">{isHebrew ? 'Bids' : 'Bids'}</th>
              <th className="pb-2">{isHebrew ? 'סטטוס' : 'Status'}</th>
            </tr></thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.id} className="border-b border-border/50">
                  <td className="py-2 pe-3 font-medium">{m.title}</td>
                  <td className="py-2 pe-3">{(m.mission_bids as any[])?.length || 0}</td>
                  <td className="py-2"><Badge variant="outline">{m.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </ReportShell>
  );
}
