import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, subMonths } from 'date-fns';

export function ReportMonthlyHiring() {
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
        .select('status, current_stage, created_at, jobs!inner(created_by)')
        .eq('jobs.created_by', user.id)
        .gte('created_at', subMonths(new Date(), 6).toISOString());
      setData(apps || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const funnel = [
    { stage: 'Applied', count: data.length },
    { stage: 'Screened', count: data.filter(a => !['applied'].includes(a.status || '')).length },
    { stage: 'Interview', count: data.filter(a => ['interview', 'offer', 'hired'].includes(a.status || '')).length },
    { stage: 'Offer', count: data.filter(a => ['offer', 'hired'].includes(a.status || '')).length },
    { stage: 'Hired', count: data.filter(a => a.status === 'hired').length },
  ];

  return (
    <ReportShell
      title={isHebrew ? 'דוח גיוס חודשי' : 'Monthly Hiring Report'}
      description={isHebrew ? 'funnel גיוס ו-time-to-hire' : 'Hiring funnel and time-to-hire'}
      data={data}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {funnel.map((f, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{f.count}</div>
            <div className="text-xs text-muted-foreground mt-1">{f.stage}</div>
          </CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-4">
        <h3 className="font-medium mb-4">{isHebrew ? 'Funnel גיוס' : 'Hiring Funnel'}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={funnel}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent></Card>
    </ReportShell>
  );
}
