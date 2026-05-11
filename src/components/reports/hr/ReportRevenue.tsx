import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const FEE_PERCENT = 15;
const AVG_SALARY = 240000; // annual ILS

export function ReportRevenue() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [data, setData] = useState<{ month: string; placements: number; revenue: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);

      // Get jobs owned by this recruiter
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .or(`created_by.eq.${user.id},shared_by_user_id.eq.${user.id}`);

      if (!jobs || jobs.length === 0) {
        setData([]);
        setIsLoading(false);
        return;
      }

      const jobIds = jobs.map(j => j.id);

      // Get hired applications in the last 12 months
      const twelveMonthsAgo = subMonths(new Date(), 11);
      const { data: hiredApps } = await supabase
        .from('applications')
        .select('created_at, updated_at')
        .in('job_id', jobIds)
        .eq('current_stage', 'hired')
        .gte('updated_at', startOfMonth(twelveMonthsAgo).toISOString());

      // Group by month
      const monthlyMap = new Map<string, number>();
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        monthlyMap.set(format(d, 'yyyy-MM'), 0);
      }

      (hiredApps || []).forEach((app: any) => {
        const key = format(new Date(app.updated_at || app.created_at), 'yyyy-MM');
        if (monthlyMap.has(key)) {
          monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
        }
      });

      const monthlyData = Array.from(monthlyMap.entries()).map(([key, placements]) => ({
        month: key.split('-').reverse().join('/'),
        placements,
        revenue: Math.round(placements * AVG_SALARY * (FEE_PERCENT / 100)),
      }));

      setData(monthlyData);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const total = data.reduce((s, m) => s + m.revenue, 0);
  const thisMonth = data[data.length - 1]?.revenue || 0;
  const totalPlacements = data.reduce((s, m) => s + m.placements, 0);

  return (
    <ReportShell
      title={isHebrew ? 'דוח הכנסות' : 'Revenue Report'}
      description={isHebrew ? 'הכנסות מוערכות לפי מיקומים מוצלחים (hired)' : 'Estimated revenue from successful placements (hired)'}
      data={data}
      isLoading={isLoading}
      columns={[
        { key: 'month', label: isHebrew ? 'חודש' : 'Month' },
        { key: 'placements', label: isHebrew ? 'מיקומים' : 'Placements' },
        { key: 'revenue', label: isHebrew ? 'הכנסה (₪)' : 'Revenue (₪)' },
      ]}
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: isHebrew ? 'סה"כ YTD' : 'Total YTD', value: `₪${total.toLocaleString()}` },
          { label: isHebrew ? 'החודש' : 'This Month', value: `₪${thisMonth.toLocaleString()}` },
          { label: isHebrew ? 'מיקומים' : 'Placements', value: String(totalPlacements) },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>

      {data.length > 0 && data.some(d => d.placements > 0) ? (
        <Card><CardContent className="p-4">
          <h3 className="font-medium mb-4">{isHebrew ? 'הכנסות לפי חודש' : 'Revenue by Month'}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={v => `₪${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => `₪${(v as number).toLocaleString()}`} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent></Card>
      ) : !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-lg font-medium">{isHebrew ? 'אין מיקומים עדיין' : 'No placements yet'}</p>
          <p className="text-sm mt-1">{isHebrew ? 'הכנסות יופיעו כאשר מועמדים יגיעו לשלב hired' : 'Revenue will appear when candidates reach the hired stage'}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {isHebrew
          ? `* הכנסות מוערכות לפי שכר ממוצע ₪${AVG_SALARY.toLocaleString()} ועמלה ${FEE_PERCENT}%`
          : `* Estimated based on avg salary ₪${AVG_SALARY.toLocaleString()} and ${FEE_PERCENT}% fee`
        }
      </p>
    </ReportShell>
  );
}
