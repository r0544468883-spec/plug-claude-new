import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Users, Clock, ArrowLeft, ArrowRight } from 'lucide-react';

interface MyMissionsProps {
  onBack: () => void;
}

export function MyMissions({ onBack }: MyMissionsProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const BackIcon = isHebrew ? ArrowRight : ArrowLeft;

  const { data: missions } = useQuery({
    queryKey: ['my-missions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('missions')
        .select('*')
        .eq('created_by', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: bidCounts } = useQuery({
    queryKey: ['my-mission-bid-counts', user?.id],
    queryFn: async () => {
      if (!missions?.length) return {};
      const ids = missions.map(m => m.id);
      const { data } = await supabase.from('mission_bids').select('mission_id').in('mission_id', ids);
      const counts: Record<string, number> = {};
      data?.forEach((b: any) => { counts[b.mission_id] = (counts[b.mission_id] || 0) + 1; });
      return counts;
    },
    enabled: !!missions?.length,
  });

  const statusConfig: Record<string, { color: string; label: string }> = {
    open: { color: 'bg-green-500/10 text-green-600', label: isHebrew ? 'פתוח' : 'Open' },
    in_progress: { color: 'bg-blue-500/10 text-blue-600', label: isHebrew ? 'בביצוע' : 'In Progress' },
    completed: { color: 'bg-primary/10 text-primary', label: isHebrew ? 'הושלם' : 'Completed' },
    cancelled: { color: 'bg-muted text-muted-foreground', label: isHebrew ? 'בוטל' : 'Cancelled' },
  };

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <BackIcon className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          {isHebrew ? 'הפרויקטים שלי' : 'My Projects'}
        </h2>
      </div>

      {(!missions || missions.length === 0) ? (
        <div className="text-center py-16">
          <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{isHebrew ? 'עדיין לא פרסמת פרויקטים' : "You haven't posted any projects yet"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {missions.map(mission => {
            const s = statusConfig[mission.status] || statusConfig.open;
            return (
              <Card key={mission.id} className="border-border">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{mission.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {bidCounts?.[mission.id] || 0} {isHebrew ? 'הצעות' : 'bids'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(mission.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className={s.color}>{s.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
