import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';

export function ReportMarketFit() {
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
        .select('match_score, jobs(title, company_name)')
        .eq('candidate_id', user.id)
        .not('match_score', 'is', null);
      setData(apps || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const avgMatch = data.length ? Math.round(data.reduce((s, a) => s + (a.match_score || 0), 0) / data.length) : 0;
  const highMatch = data.filter(a => (a.match_score || 0) >= 80).length;

  const distribution = [
    { range: '0-50%', count: data.filter(a => a.match_score < 50).length },
    { range: '50-70%', count: data.filter(a => a.match_score >= 50 && a.match_score < 70).length },
    { range: '70-85%', count: data.filter(a => a.match_score >= 70 && a.match_score < 85).length },
    { range: '85-100%', count: data.filter(a => a.match_score >= 85).length },
  ];

  return (
    <ReportShell
      title={isHebrew ? 'דוח התאמה לשוק' : 'Market Fit Report'}
      description={isHebrew ? 'כמה משרות מתאימות לפרופיל שלך' : 'How well your profile fits the market'}
      data={data}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: isHebrew ? 'Match ממוצע' : 'Avg Match', value: `${avgMatch}%` },
          { label: isHebrew ? 'התאמה 80%+' : '80%+ Match', value: highMatch },
          { label: isHebrew ? 'הגשות עם Match' : 'With Match', value: data.length },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-4">{isHebrew ? 'התפלגות ציוני Match' : 'Match Score Distribution'}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </ReportShell>
  );
}
