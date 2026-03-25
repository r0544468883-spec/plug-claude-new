import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function ReportSkillsVsMarket() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [skills, setSkills] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      const { data: profile } = await supabase.from('profiles').select('skill_tags').eq('user_id', user.id).single();
      setSkills((profile as any)?.skill_tags || []);
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const marketDemand: Record<string, number> = {
    'React': 92, 'Node.js': 85, 'TypeScript': 88, 'Python': 90,
    'AWS': 78, 'Docker': 75, 'SQL': 80, 'Git': 95,
  };

  const chartData = Object.entries(marketDemand).map(([skill, demand]) => ({
    skill,
    demand,
    hasSkill: skills.includes(skill),
    fill: skills.includes(skill) ? 'hsl(var(--primary))' : 'hsl(var(--destructive))',
  }));

  return (
    <ReportShell
      title={isHebrew ? 'מיומנויות מול שוק' : 'Skills vs Market'}
      description={isHebrew ? 'הסקילים שלך מול ביקוש השוק' : 'Your skills vs market demand'}
      data={chartData}
      isLoading={isLoading}
    >
      <Card><CardContent className="p-4">
        <h3 className="font-medium mb-4">{isHebrew ? 'ביקוש לפי skill' : 'Demand by Skill'}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart layout="vertical" data={chartData.slice(0, 8)}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
            <YAxis dataKey="skill" type="category" width={80} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Bar dataKey="demand" radius={[0, 4, 4, 0]}>
              {chartData.slice(0, 8).map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary inline-block" />{isHebrew ? 'יש לך' : 'You have it'}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-destructive inline-block" />{isHebrew ? 'חסר' : 'Missing'}</span>
        </div>
      </CardContent></Card>
    </ReportShell>
  );
}
