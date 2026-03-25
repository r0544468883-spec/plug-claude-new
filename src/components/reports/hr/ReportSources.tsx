import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--primary)/0.7)', 'hsl(var(--primary)/0.4)', '#88d4ab', '#f7c59f'];

export function ReportSources() {
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
        .select('apply_method, status, jobs!inner(created_by)')
        .eq('jobs.created_by', user.id);
      setData(apps || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const sourceMap: Record<string, number> = {};
  data.forEach(a => {
    const src = a.apply_method || 'direct';
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  });
  const pieData = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));
  const topSource = pieData.sort((a, b) => b.value - a.value)[0];

  return (
    <ReportShell
      title={isHebrew ? 'דוח מקורות מועמדים' : 'Candidate Sources Report'}
      description={isHebrew ? 'מאיפה מגיעים המועמדים שלך' : 'Where your candidates come from'}
      data={data}
      isLoading={isLoading}
    >
      {topSource && (
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            💡 {isHebrew ? `המקור הכי אפקטיבי: ` : `Most effective source: `}
            <span className="text-primary font-semibold">{topSource.name}</span>
            {isHebrew ? ` — ${topSource.value} מועמדים` : ` — ${topSource.value} candidates`}
          </p>
        </CardContent></Card>
      )}
      <Card><CardContent className="p-4">
        <h3 className="font-medium mb-4">{isHebrew ? 'מקורות מועמדים' : 'Candidate Sources'}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent></Card>
    </ReportShell>
  );
}
