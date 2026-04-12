import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConnections } from '@/hooks/useConnections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConnectButton } from './ConnectButton';
import { Users, User, Sparkles } from 'lucide-react';

export function PeopleYouMayKnow() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const { allConnections } = useConnections();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['people-you-may-know', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all user IDs already connected or pending
      const existingIds = new Set<string>();
      existingIds.add(user.id);
      allConnections.forEach((c: any) => {
        existingIds.add(c.requester_id);
        existingIds.add(c.addressee_id);
      });

      // Strategy 1: People who vouched for you or you vouched for
      const { data: vouchUsers } = await supabase
        .from('vouches')
        .select('from_user_id, to_user_id')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .limit(20);

      const vouchRelated = new Set<string>();
      (vouchUsers || []).forEach(v => {
        if (v.from_user_id !== user.id && !existingIds.has(v.from_user_id)) {
          vouchRelated.add(v.from_user_id);
        }
        if (v.to_user_id !== user.id && !existingIds.has(v.to_user_id)) {
          vouchRelated.add(v.to_user_id);
        }
      });

      // Strategy 2: People in same communities
      const { data: myHubs } = await (supabase as any)
        .from('community_members')
        .select('hub_id')
        .eq('user_id', user.id);

      const hubIds = (myHubs || []).map((h: any) => h.hub_id);
      let communityRelated = new Set<string>();

      if (hubIds.length > 0) {
        const { data: hubMembers } = await (supabase as any)
          .from('community_members')
          .select('user_id')
          .in('hub_id', hubIds)
          .neq('user_id', user.id)
          .limit(20);

        (hubMembers || []).forEach((m: any) => {
          if (!existingIds.has(m.user_id)) {
            communityRelated.add(m.user_id);
          }
        });
      }

      // Combine and fetch profiles (up to 8)
      const candidateIds = [...new Set([...vouchRelated, ...communityRelated])].slice(0, 8);

      if (candidateIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url')
        .in('user_id', candidateIds);

      return (profiles || []).map(p => ({
        userId: p.user_id,
        name: p.full_name || (isHebrew ? 'משתמש' : 'User'),
        avatar: p.avatar_url,
        reason: vouchRelated.has(p.user_id)
          ? (isHebrew ? 'קשר דרך Vouch' : 'Vouch connection')
          : (isHebrew ? 'קהילה משותפת' : 'Shared community'),
      }));
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });

  if (isLoading || suggestions.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          {isHebrew ? 'אנשים שאולי מכירים' : 'People You May Know'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.map(s => (
          <div
            key={s.userId}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={s.avatar || ''} />
              <AvatarFallback className="bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.reason}</p>
            </div>
            <ConnectButton targetUserId={s.userId} size="sm" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
