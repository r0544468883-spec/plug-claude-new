import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Users, CheckCircle, Clock, TrendingUp, Zap } from 'lucide-react';

export function BillboardStats() {
  const { user, role } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  // Overall billboard stats
  const { data: stats } = useQuery({
    queryKey: ['billboard-stats', user?.id, role],
    queryFn: async () => {
      // Total open projects
      const { count: openProjects } = await supabase
        .from('missions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      // Total bids
      const { count: totalBids } = await supabase
        .from('mission_bids')
        .select('*', { count: 'exact', head: true });

      if (role === 'freelance_hr') {
        // Hunter stats - my bids
        const { data: myBids } = await supabase
          .from('mission_bids')
          .select('id, status')
          .eq('hunter_id', user!.id);

        const pending = myBids?.filter(b => b.status === 'pending').length || 0;
        const accepted = myBids?.filter(b => b.status === 'accepted').length || 0;
        const totalMyBids = myBids?.length || 0;
        const successRate = totalMyBids > 0 ? Math.round((accepted / totalMyBids) * 100) : 0;

        return {
          openProjects: openProjects || 0,
          totalBids: totalBids || 0,
          myBids: totalMyBids,
          pendingBids: pending,
          acceptedBids: accepted,
          successRate,
        };
      } else {
        // In-house HR stats - my projects
        const { data: myMissions } = await supabase
          .from('missions')
          .select('id, status')
          .eq('created_by', user!.id);

        const missionIds = myMissions?.map(m => m.id) || [];
        let bidsOnMyProjects = 0;
        if (missionIds.length > 0) {
          const { count } = await supabase
            .from('mission_bids')
            .select('*', { count: 'exact', head: true })
            .in('mission_id', missionIds);
          bidsOnMyProjects = count || 0;
        }

        const activeProjects = myMissions?.filter(m => m.status === 'open').length || 0;
        const completedProjects = myMissions?.filter(m => m.status === 'completed').length || 0;

        return {
          openProjects: openProjects || 0,
          totalBids: totalBids || 0,
          myProjects: myMissions?.length || 0,
          activeProjects,
          completedProjects,
          bidsOnMyProjects,
        };
      }
    },
    enabled: !!user?.id,
  });

  if (!stats) return null;

  const isHunter = role === 'freelance_hr';

  const statItems = isHunter ? [
    { label: isHebrew ? 'פרויקטים פתוחים' : 'Open Projects', value: stats.openProjects, icon: Target, color: 'text-primary' },
    { label: isHebrew ? 'ההצעות שלי' : 'My Bids', value: stats.myBids || 0, icon: Users, color: 'text-primary' },
    { label: isHebrew ? 'ממתינות' : 'Pending', value: stats.pendingBids || 0, icon: Clock, color: 'text-orange-500' },
    { label: isHebrew ? 'התקבלו' : 'Accepted', value: stats.acceptedBids || 0, icon: CheckCircle, color: 'text-green-500' },
    { label: isHebrew ? 'אחוז הצלחה' : 'Success Rate', value: `${stats.successRate || 0}%`, icon: TrendingUp, color: 'text-primary' },
  ] : [
    { label: isHebrew ? 'פרויקטים פתוחים בשוק' : 'Market Open Projects', value: stats.openProjects, icon: Target, color: 'text-primary' },
    { label: isHebrew ? 'הפרויקטים שלי' : 'My Projects', value: stats.myProjects || 0, icon: Zap, color: 'text-primary' },
    { label: isHebrew ? 'פעילים' : 'Active', value: stats.activeProjects || 0, icon: Clock, color: 'text-orange-500' },
    { label: isHebrew ? 'הושלמו' : 'Completed', value: stats.completedProjects || 0, icon: CheckCircle, color: 'text-green-500' },
    { label: isHebrew ? 'הצעות שהתקבלו' : 'Bids Received', value: stats.bidsOnMyProjects || 0, icon: Users, color: 'text-primary' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-tour="billboard-stats">
      {statItems.map((item, i) => (
        <Card key={i} className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <item.icon className={`w-5 h-5 mx-auto mb-1 ${item.color}`} />
            <p className="text-2xl font-bold text-foreground">{item.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
