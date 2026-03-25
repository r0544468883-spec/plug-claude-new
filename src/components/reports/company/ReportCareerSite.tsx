import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays } from 'date-fns';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--primary)/0.6)', 'hsl(var(--primary)/0.3)', '#88d4ab'];

export function ReportCareerSite() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      const { data: stats } = await supabase
        .from('career_site_stats')
        .select('*')
        .gte('date', subDays(new Date(), 30).toISOString().split('T')[0])
        .order('date', { ascending: true });
      setData(stats || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const totalViews = data.reduce((s, d) => s + (d.page_views || 0), 0);
  const totalApps = data.reduce((s, d) => s + (d.applications || 0), 0);
  const conversion = totalViews > 0 ? ((totalApps / totalViews) * 100).toFixed(1) : '0';

  const sourceMap: Record<string, number> = {};
  data.forEach(d => { sourceMap[d.source || 'Direct'] = (sourceMap[d.source || 'Direct'] || 0) + (d.page_views || 0); });
  const pieData = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));

  return (
    <ReportShell
      title={isHebrew ? 'דוח Career Site' : 'Career Site Report'}
      description={isHebrew ? 'צפיות, מקורות, conversion' : 'Views, sources, conversion'}
      data={data}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: isHebrew ? 'צפיות' : 'Views', value: totalViews },
          { label: isHebrew ? 'הגשות' : 'Applications', value: totalApps },
          { label: 'Conversion', value: `${conversion}%` },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-4">
        <h3 className="font-medium mb-4">{isHebrew ? 'צפיות לפי יום' : 'Views by Day'}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="page_views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name={isHebrew ? 'צפיות' : 'Views'} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent></Card>
      {pieData.length > 0 && (
        <Card><CardContent className="p-4">
          <h3 className="font-medium mb-4">{isHebrew ? 'מקורות תנועה' : 'Traffic Sources'}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent></Card>
      )}
    </ReportShell>
  );
}
