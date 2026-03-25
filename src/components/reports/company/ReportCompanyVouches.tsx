import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function ReportCompanyVouches() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [given, setGiven] = useState<any[]>([]);
  const [received, setReceived] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      const [givenRes, receivedRes] = await Promise.all([
        supabase.from('vouches').select('*').eq('from_user_id', user.id),
        supabase.from('company_vouches').select('*').eq('company_id', user.id),
      ]);
      setGiven(givenRes.data || []);
      setReceived(receivedRes.data || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const skillCounts: Record<string, number> = {};
  given.forEach(v => (v.skill_names || []).forEach((s: string) => { skillCounts[s] = (skillCounts[s] || 0) + 1; }));
  const barData = Object.entries(skillCounts).slice(0, 10).map(([name, count]) => ({ name, count }));

  return (
    <ReportShell
      title={isHebrew ? 'דוח Vouches' : 'Vouches Report'}
      description={isHebrew ? 'vouches שניתנו והתקבלו' : 'Vouches given and received'}
      data={[...given, ...received]}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: isHebrew ? 'Vouches שניתנו' : 'Vouches Given', value: given.length },
          { label: isHebrew ? 'Vouches שהתקבלו' : 'Vouches Received', value: received.length },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>
      {barData.length > 0 && (
        <Card><CardContent className="p-4">
          <h3 className="font-medium mb-4">{isHebrew ? 'Vouches לפי Skill' : 'Vouches by Skill'}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart layout="vertical" data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
      )}
    </ReportShell>
  );
}
