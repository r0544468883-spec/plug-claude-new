import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function ReportWeeklyActivity() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [apps, setApps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      const { data } = await supabase
        .from('applications')
        .select('created_at')
        .eq('candidate_id', user.id)
        .gte('created_at', subDays(new Date(), 14).toISOString());
      setApps(data || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
  const prevDays = eachDayOfInterval({ start: subDays(new Date(), 13), end: subDays(new Date(), 7) });

  const thisWeek = apps.filter(a => new Date(a.created_at) >= subDays(new Date(), 7)).length;
  const lastWeek = apps.filter(a => new Date(a.created_at) < subDays(new Date(), 7)).length;
  const diff = thisWeek - lastWeek;

  const chartData = days.map(day => ({
    date: format(day, 'dd/MM'),
    הגשות: apps.filter(a => format(new Date(a.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length,
  }));

  return (
    <ReportShell
      title={isHebrew ? 'פעילות שבועית' : 'Weekly Activity'}
      description={isHebrew ? 'פעילות השבוע לעומת שבוע שעבר' : 'This week vs last week'}
      data={apps}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-3xl font-bold text-primary">{thisWeek}</div>
          <div className="text-sm text-muted-foreground">{isHebrew ? 'הגשות השבוע' : 'Applications this week'}</div>
          <div className={`text-xs mt-1 flex items-center gap-1 ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {diff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(diff)} {isHebrew ? 'לעומת שבוע שעבר' : 'vs last week'}
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-3xl font-bold text-muted-foreground">{lastWeek}</div>
          <div className="text-sm text-muted-foreground">{isHebrew ? 'הגשות שבוע שעבר' : 'Last week applications'}</div>
        </CardContent></Card>
      </div>
      <Card><CardContent className="p-4">
        <h3 className="font-medium mb-4">{isHebrew ? '7 ימים אחרונים' : 'Last 7 days'}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="הגשות" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent></Card>
    </ReportShell>
  );
}
