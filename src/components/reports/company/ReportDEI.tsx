import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function ReportDEI() {
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
        .select('blind_mode, status, current_stage, jobs!inner(created_by)')
        .eq('jobs.created_by', user.id);
      setData(apps || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const blindApps = data.filter(a => a.blind_mode).length;
  const regularApps = data.filter(a => !a.blind_mode).length;
  const blindPct = data.length > 0 ? Math.round((blindApps / data.length) * 100) : 0;

  const blindInterview = data.filter(a => a.blind_mode && ['interview', 'offer', 'hired'].includes(a.status || '')).length;
  const regularInterview = data.filter(a => !a.blind_mode && ['interview', 'offer', 'hired'].includes(a.status || '')).length;

  const barData = [
    { label: isHebrew ? 'הגשות' : 'Applications', blind: blindApps, regular: regularApps },
    { label: isHebrew ? 'ראיונות' : 'Interviews', blind: blindInterview, regular: regularInterview },
  ];

  return (
    <ReportShell
      title={isHebrew ? 'דוח גיוון והכלה' : 'DEI Report'}
      description={isHebrew ? 'Blind Hiring ויעדי גיוון' : 'Blind Hiring and diversity goals'}
      data={data}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: isHebrew ? 'Blind Mode' : 'Blind Mode', value: blindApps },
          { label: isHebrew ? 'רגיל' : 'Regular', value: regularApps },
          { label: isHebrew ? '% Blind' : '% Blind', value: `${blindPct}%` },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-4">
        <h3 className="font-medium mb-4">{isHebrew ? 'Blind vs רגיל' : 'Blind vs Regular'}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="blind" name="Blind" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="regular" name={isHebrew ? 'רגיל' : 'Regular'} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent></Card>
    </ReportShell>
  );
}
