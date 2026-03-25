import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Hash } from 'lucide-react';

interface EngagementHeatmapProps {
  hubId: string;
}

export function EngagementHeatmap({ hubId }: EngagementHeatmapProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const { data } = useQuery({
    queryKey: ['engagement-heatmap', hubId],
    queryFn: async () => {
      const { data: channels } = await supabase
        .from('community_channels')
        .select('id, name_en, name_he')
        .eq('hub_id', hubId);
      if (!channels) return [];

      const results = await Promise.all(
        channels.map(async (ch) => {
          const { count } = await supabase
            .from('community_messages')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', ch.id);
          return {
            id: ch.id,
            name: isHebrew ? ch.name_he : ch.name_en,
            messageCount: count || 0,
          };
        })
      );

      return results.sort((a, b) => b.messageCount - a.messageCount);
    },
  });

  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map((d) => d.messageCount), 1);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          {isHebrew ? 'ערוצים פעילים' : 'Trending Channels'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.slice(0, 5).map((ch) => {
          const intensity = ch.messageCount / maxCount;
          const bgClass = intensity > 0.7
            ? 'bg-primary/30'
            : intensity > 0.3
            ? 'bg-primary/15'
            : 'bg-muted';

          return (
            <div key={ch.id} className="flex items-center gap-2">
              <div className={`flex-1 rounded-md px-3 py-1.5 ${bgClass} transition-colors`}>
                <span className="text-sm flex items-center gap-1.5">
                  <Hash className="w-3 h-3 text-muted-foreground" />
                  {ch.name}
                </span>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">
                {ch.messageCount}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
