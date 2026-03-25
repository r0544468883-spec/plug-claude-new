import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';

export function ReportCandidateExperience() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      const { data: surveys } = await supabase
        .from('candidate_surveys')
        .select('*, jobs!inner(created_by)')
        .eq('jobs.created_by', user.id)
        .order('submitted_at', { ascending: false });
      setData(surveys || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const avgOverall = data.length ? (data.reduce((s, d) => s + (d.overall_rating || 0), 0) / data.length).toFixed(1) : '—';
  const avgComm = data.length ? (data.reduce((s, d) => s + (d.communication_rating || 0), 0) / data.length).toFixed(1) : '—';
  const nps = data.length ? Math.round((data.filter(d => d.would_recommend).length / data.length) * 100) : 0;

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const monthStr = format(startOfMonth(month), 'yyyy-MM');
    const monthSurveys = data.filter(d => d.submitted_at?.startsWith(monthStr));
    const avg = monthSurveys.length ? (monthSurveys.reduce((s, d) => s + (d.overall_rating || 0), 0) / monthSurveys.length).toFixed(1) : null;
    return { month: format(month, 'MM/yy'), nps: avg ? parseFloat(avg) : 0 };
  });

  return (
    <ReportShell
      title={isHebrew ? 'דוח חוויית מועמדים' : 'Candidate Experience Report'}
      description={isHebrew ? 'NPS, דירוגים, משוב' : 'NPS, ratings, feedback'}
      data={data}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'NPS', value: `${nps}%` },
          { label: isHebrew ? 'ציון כללי' : 'Avg Overall', value: avgOverall },
          { label: isHebrew ? 'תקשורת' : 'Communication', value: avgComm },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-4">
        <h3 className="font-medium mb-4">{isHebrew ? 'מגמת NPS' : 'NPS Trend'}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="nps" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name={isHebrew ? 'ציון ממוצע' : 'Avg Score'} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent></Card>
      {data.length > 0 && (
        <Card><CardContent className="p-4">
          <h3 className="font-medium mb-3">{isHebrew ? 'הערות אחרונות' : 'Recent Feedback'}</h3>
          <div className="space-y-2">
            {data.slice(0, 5).map((d) => d.feedback_text && (
              <div key={d.id} className="p-3 rounded-lg bg-muted/30 text-sm">
                <p className="text-foreground">"{d.feedback_text}"</p>
                <p className="text-xs text-muted-foreground mt-1">— {isHebrew ? 'מועמד/ת' : 'Candidate'} | {d.overall_rating}/5 ⭐</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
    </ReportShell>
  );
}
