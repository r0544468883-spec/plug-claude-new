import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function ReportInterviews() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      const { data: interviews } = await supabase
        .from('interviews')
        .select('*, jobs(title, company_name)')
        .eq('candidate_id', user.id)
        .order('interview_date', { ascending: false });
      setData(interviews || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const pending = data.filter(i => i.status === 'scheduled').length;
  const completed = data.filter(i => i.status === 'completed').length;

  return (
    <ReportShell
      title={isHebrew ? 'דוח ראיונות' : 'Interviews Report'}
      description={isHebrew ? 'ראיונות, ציונים וסטטוסים' : 'Interviews, scores, and statuses'}
      data={data}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: isHebrew ? 'סה"כ' : 'Total', value: data.length },
          { label: isHebrew ? 'ממתינים' : 'Pending', value: pending },
          { label: isHebrew ? 'הושלמו' : 'Completed', value: completed },
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
              <th className="pb-2 pe-3">{isHebrew ? 'תאריך' : 'Date'}</th>
              <th className="pb-2 pe-3">{isHebrew ? 'חברה' : 'Company'}</th>
              <th className="pb-2 pe-3">{isHebrew ? 'משרה' : 'Job'}</th>
              <th className="pb-2 pe-3">{isHebrew ? 'סוג' : 'Type'}</th>
              <th className="pb-2">{isHebrew ? 'סטטוס' : 'Status'}</th>
            </tr></thead>
            <tbody>
              {data.slice(0, 20).map((i) => (
                <tr key={i.id} className="border-b border-border/50">
                  <td className="py-2 pe-3 text-muted-foreground">{i.interview_date ? format(new Date(i.interview_date), 'dd/MM/yy') : '—'}</td>
                  <td className="py-2 pe-3">{i.jobs?.company_name || '—'}</td>
                  <td className="py-2 pe-3">{i.jobs?.title || '—'}</td>
                  <td className="py-2 pe-3 text-muted-foreground">{i.interview_type || '—'}</td>
                  <td className="py-2"><Badge variant="outline">{i.status || 'scheduled'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </ReportShell>
  );
}
