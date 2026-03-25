import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--primary)/0.6)', 'hsl(var(--destructive)/0.7)', '#88d4ab'];

export function ReportOffers() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      const { data: offers } = await supabase
        .from('offers')
        .select('*, jobs!inner(title, created_by)')
        .eq('jobs.created_by', user.id)
        .order('created_at', { ascending: false });
      setData(offers || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const sent = data.length;
  const accepted = data.filter(o => o.status === 'accepted').length;
  const declined = data.filter(o => o.status === 'declined').length;
  const acceptance = sent > 0 ? Math.round((accepted / sent) * 100) : 0;

  const pieData = [
    { name: isHebrew ? 'נשלחו' : 'Sent', value: sent - accepted - declined },
    { name: isHebrew ? 'התקבלו' : 'Accepted', value: accepted },
    { name: isHebrew ? 'נדחו' : 'Declined', value: declined },
  ].filter(d => d.value > 0);

  return (
    <ReportShell
      title={isHebrew ? 'דוח הצעות עבודה' : 'Offers Report'}
      description={isHebrew ? 'הצעות שנשלחו, התקבלו, נדחו' : 'Offers sent, accepted, declined'}
      data={data}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: isHebrew ? 'נשלחו' : 'Sent', value: sent },
          { label: isHebrew ? 'התקבלו' : 'Accepted', value: accepted },
          { label: isHebrew ? 'נדחו' : 'Declined', value: declined },
          { label: 'Acceptance Rate', value: `${acceptance}%` },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>
      {pieData.length > 0 && (
        <Card><CardContent className="p-4">
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
