import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, TrendingUp } from 'lucide-react';

interface PlacementRevenueProps {
  feePercent?: number;
  avgSalary?: number;
}

export function PlacementRevenue({ feePercent = 15, avgSalary = 240000 }: PlacementRevenueProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';

  const { data } = useQuery({
    queryKey: ['placement-revenue', user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0 };
      // Get jobs posted by this user
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .or(`created_by.eq.${user.id},shared_by_user_id.eq.${user.id}`);
      if (!jobs || jobs.length === 0) return { total: 0 };

      const jobIds = jobs.map((j) => j.id);
      const { count } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('job_id', jobIds)
        .eq('current_stage', 'hired');

      return { total: count || 0 };
    },
    enabled: !!user?.id,
  });

  const placements = data?.total || 0;
  const estimatedRevenue = Math.round(placements * avgSalary * (feePercent / 100));

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          {isHebrew ? 'הכנסות מגיוסים' : 'Placement Revenue'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-3xl font-bold text-foreground">{placements}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              {isHebrew ? 'גיוסים מוצלחים' : 'Placements'}
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary">₪{(estimatedRevenue / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {isHebrew ? `הכנסה מוערכת (${feePercent}%)` : `Est. Revenue (${feePercent}%)`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
