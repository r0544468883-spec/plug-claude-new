import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--primary)/0.6)', 'hsl(var(--primary)/0.3)', '#88d4ab', '#f7c59f'];

export function ReportVouches() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      const { data: vouches } = await supabase
        .from('vouches')
        .select('*, from_user:profiles!vouches_from_user_id_fkey(full_name)')
        .eq('to_user_id', user.id)
        .order('created_at', { ascending: false });
      setData(vouches || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  // Aggregate by skill
  const skillCounts: Record<string, number> = {};
  data.forEach(v => {
    (v.skill_names || []).forEach((s: string) => {
      skillCounts[s] = (skillCounts[s] || 0) + 1;
    });
  });
  const pieData = Object.entries(skillCounts).map(([name, value]) => ({ name, value }));
  const topSkill = pieData.sort((a, b) => b.value - a.value)[0]?.name || '—';

  return (
    <ReportShell
      title={isHebrew ? 'דוח Vouches' : 'Vouches Report'}
      description={isHebrew ? 'ההמלצות שקיבלת' : 'Your endorsements'}
      data={data}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: isHebrew ? 'סה"כ Vouches' : 'Total Vouches', value: data.length },
          { label: isHebrew ? 'ממ-כמה אנשים' : 'From People', value: new Set(data.map(v => v.from_user_id)).size },
          { label: isHebrew ? 'Top Skill' : 'Top Skill', value: topSkill },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>
      {pieData.length > 0 && (
        <Card><CardContent className="p-4">
          <h3 className="font-medium mb-4">{isHebrew ? 'Vouches לפי Skill' : 'Vouches by Skill'}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData.slice(0, 5)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {pieData.slice(0, 5).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent></Card>
      )}
      <Card><CardContent className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground text-right">
              <th className="pb-2 pe-3">{isHebrew ? 'ממי' : 'From'}</th>
              <th className="pb-2 pe-3">{isHebrew ? 'Skill' : 'Skill'}</th>
              <th className="pb-2">{isHebrew ? 'תאריך' : 'Date'}</th>
            </tr></thead>
            <tbody>
              {data.slice(0, 10).map((v) => (
                <tr key={v.id} className="border-b border-border/50">
                  <td className="py-2 pe-3 font-medium">{(v.from_user as any)?.full_name || '—'}</td>
                  <td className="py-2 pe-3">{(v.skill_names || []).join(', ') || '—'}</td>
                  <td className="py-2 text-muted-foreground">{format(new Date(v.created_at), 'dd/MM/yy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </ReportShell>
  );
}
