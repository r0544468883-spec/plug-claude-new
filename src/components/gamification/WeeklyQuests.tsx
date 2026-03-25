import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Flame, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WeeklyQuests() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  // Get current week start (Sunday)
  const getWeekStart = () => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  };

  const { data: quests = [] } = useQuery({
    queryKey: ['weekly-quests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const weekStart = getWeekStart();
      const { data } = await supabase
        .from('weekly_quests')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStart);
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (quests.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          {isRTL ? 'אתגרים שבועיים' : 'Weekly Quests'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {quests.map((quest) => (
          <div key={quest.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className={cn(quest.completed && 'line-through text-muted-foreground')}>
                {quest.quest_key}
              </span>
              <span className="flex items-center gap-1 text-xs">
                {quest.completed ? (
                  <Check className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <span className="text-muted-foreground">{quest.progress}/{quest.target}</span>
                )}
                <Flame className="w-3 h-3 text-orange-400" />
                <span className="text-orange-400">{quest.fuel_reward}</span>
              </span>
            </div>
            <Progress
              value={(quest.progress / quest.target) * 100}
              className="h-1.5"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
