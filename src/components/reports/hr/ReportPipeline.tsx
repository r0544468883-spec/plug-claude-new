import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function ReportPipeline() {
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
        .select('current_stage, status, jobs!inner(created_by)')
        .eq('jobs.created_by', user.id);
      setData(apps || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const stages = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
  const stageData = stages.map(s => ({
    stage: s,
    count: data.filter(a => (a.current_stage || a.status) === s).length,
  }));

  return (
    <ReportShell
      title={isHebrew ? 'דוח Pipeline' : 'Pipeline Report'}
      description={isHebrew ? 'מועמדים לפי שלב' : 'Candidates by stage'}
      data={stageData}
      isLoading={isLoading}
    >
      <Card><CardContent className="p-4">
        <h3 className="font-medium mb-4">{isHebrew ? 'מועמדים לפי שלב' : 'Candidates by Stage'}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={stageData}>
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
