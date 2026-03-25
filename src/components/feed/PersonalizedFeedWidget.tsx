import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Globe, Hash, TrendingUp } from 'lucide-react';

interface PersonalizedFeedWidgetProps {
  onNavigateToCommunity?: (hubId: string) => void;
}

export function PersonalizedFeedWidget({ onNavigateToCommunity }: PersonalizedFeedWidgetProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';

  const { data } = useQuery({
    queryKey: ['personalized-feed', user?.id],
    queryFn: async () => {
      if (!user?.id) return { communities: [], topics: [] };

      // Get user's CV data for keyword extraction
      const { data: profile } = await supabase
        .from('profiles')
        .select('cv_data, preferred_fields')
        .eq('user_id', user.id)
        .single();

      // Get public communities
      const { data: hubs } = await supabase
        .from('community_hubs')
        .select('id, name_en, name_he, member_count, description_en, description_he')
        .eq('is_public', true)
        .order('member_count', { ascending: false })
        .limit(5);

      // Check which ones the user hasn't joined
      const { data: memberships } = await supabase
        .from('community_members')
        .select('hub_id')
        .eq('user_id', user.id);

      const joinedIds = new Set(memberships?.map((m) => m.hub_id) || []);
      const suggestedCommunities = (hubs || []).filter((h) => !joinedIds.has(h.id));

      // Extract topics from CV
      const cvData = profile?.cv_data as any;
      const skills: string[] = [];
      if (cvData?.skills) {
        if (Array.isArray(cvData.skills)) {
          skills.push(...cvData.skills.slice(0, 5));
        }
      }

      return {
        communities: suggestedCommunities.slice(0, 3),
        topics: skills.length > 0 ? skills : ['React', 'TypeScript', 'Node.js'],
      };
    },
    enabled: !!user?.id,
  });

  if (!data || (data.communities.length === 0 && data.topics.length === 0)) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          {isHebrew ? 'מומלץ עבורך' : 'Recommended for You'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Suggested Communities */}
        {data.communities.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {isHebrew ? 'קהילות' : 'Communities'}
            </p>
            {data.communities.map((hub: any) => (
              <div key={hub.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{isHebrew ? hub.name_he : hub.name_en}</p>
                  <p className="text-xs text-muted-foreground">{hub.member_count} {isHebrew ? 'חברים' : 'members'}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => onNavigateToCommunity?.(hub.id)}
                >
                  {isHebrew ? 'הצטרף' : 'Join'}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Hot Topics */}
        {data.topics.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {isHebrew ? 'נושאים חמים' : 'Hot Topics'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.topics.map((topic: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs gap-1">
                  <Hash className="w-2.5 h-2.5" />
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
