import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SLAMonitor() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';

  const { data: companies = [] } = useQuery({
    queryKey: ['sla-monitor', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // Get jobs posted by this user with their companies
      const { data: jobs } = await supabase
        .from('jobs')
        .select('company_id, companies(id, name, logo_url, avg_hiring_speed_days)')
        .or(`created_by.eq.${user.id},shared_by_user_id.eq.${user.id}`)
        .not('company_id', 'is', null);

      if (!jobs) return [];

      const seen = new Set<string>();
      return jobs
        .filter((j: any) => {
          if (!j.companies?.id || seen.has(j.companies.id)) return false;
          seen.add(j.companies.id);
          return true;
        })
        .map((j: any) => j.companies)
        .filter(Boolean);
    },
    enabled: !!user?.id,
  });

  if (companies.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          {isHebrew ? 'מהירות תגובה - חברות' : 'Company Response SLA'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {companies.slice(0, 5).map((company: any) => {
          const days = company.avg_hiring_speed_days;
          let slaColor = 'border-muted text-muted-foreground';
          let slaLabel = isHebrew ? 'לא ידוע' : 'Unknown';
          
          if (days) {
            if (days <= 7) {
              slaColor = 'border-green-500/20 text-green-500';
              slaLabel = isHebrew ? `${Math.round(days)} ימים` : `${Math.round(days)} days`;
            } else if (days <= 21) {
              slaColor = 'border-yellow-500/20 text-yellow-500';
              slaLabel = isHebrew ? `${Math.round(days)} ימים` : `${Math.round(days)} days`;
            } else {
              slaColor = 'border-destructive/20 text-destructive';
              slaLabel = isHebrew ? `${Math.round(days)} ימים` : `${Math.round(days)} days`;
            }
          }

          return (
            <div key={company.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate">{company.name}</span>
              </div>
              <Badge variant="outline" className={cn('text-xs', slaColor)}>
                {slaLabel}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
