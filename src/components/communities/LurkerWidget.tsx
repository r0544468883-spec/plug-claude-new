import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EyeOff, BarChart2 } from 'lucide-react';

interface LurkerWidgetProps {
  hubId: string;
}

export function LurkerWidget({ hubId }: LurkerWidgetProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const { data } = useQuery({
    queryKey: ['lurker-stats', hubId],
    queryFn: async () => {
      // Get all members
      const { data: members } = await supabase
        .from('community_members')
        .select('user_id')
        .eq('hub_id', hubId);
      if (!members) return { total: 0, lurkers: 0 };

      // Get channels for this hub
      const { data: channels } = await supabase
        .from('community_channels')
        .select('id')
        .eq('hub_id', hubId);
      if (!channels || channels.length === 0) return { total: members.length, lurkers: members.length };

      const channelIds = channels.map((c) => c.id);

      // Get unique authors in those channels
      const { data: messages } = await supabase
        .from('community_messages')
        .select('author_id')
        .in('channel_id', channelIds);

      const activeUserIds = new Set(messages?.map((m) => m.author_id) || []);
      const lurkerCount = members.filter((m) => !activeUserIds.has(m.user_id)).length;

      return { total: members.length, lurkers: lurkerCount };
    },
  });

  if (!data || data.lurkers === 0) return null;

  const pct = data.total > 0 ? Math.round((data.lurkers / data.total) * 100) : 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-muted-foreground" />
          {isHebrew ? 'חברים שקטים' : 'Silent Members'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold text-foreground">{data.lurkers}</div>
          <div className="text-xs text-muted-foreground">
            <p>{isHebrew ? `מתוך ${data.total} חברים` : `of ${data.total} members`}</p>
            <p>{pct}% {isHebrew ? 'צופים בשקט' : 'lurking'}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full mt-3 gap-2">
          <BarChart2 className="w-3 h-3" />
          {isHebrew ? 'צור סקר להפעלתם' : 'Create poll to engage'}
        </Button>
      </CardContent>
    </Card>
  );
}
