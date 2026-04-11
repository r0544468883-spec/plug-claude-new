import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, User, Users } from 'lucide-react';
import { GiveVouchDialog } from './GiveVouchDialog';

/**
 * Suggests people the user might want to vouch for:
 * 1. People who vouched for you (reciprocal)
 * 2. People with mutual vouchers (network proximity)
 */
export function VouchDiscovery() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['vouch-discovery', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get people who vouched for me
      const { data: incomingVouches } = await supabase
        .from('vouches')
        .select('from_user_id')
        .eq('to_user_id', user.id);

      // Get people I already vouched for
      const { data: outgoingVouches } = await supabase
        .from('vouches')
        .select('to_user_id')
        .eq('from_user_id', user.id);

      const incomingIds = (incomingVouches || []).map(v => v.from_user_id);
      const outgoingIds = new Set((outgoingVouches || []).map(v => v.to_user_id));

      // People who vouched for me but I haven't vouched back
      const reciprocalCandidates = incomingIds.filter(id => !outgoingIds.has(id));

      if (reciprocalCandidates.length === 0) return [];

      // Fetch their profiles
      const { data: profiles } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url')
        .in('user_id', reciprocalCandidates.slice(0, 5));

      return (profiles || []).map(p => ({
        userId: p.user_id,
        name: p.full_name || (isHebrew ? 'משתמש' : 'User'),
        avatar: p.avatar_url,
        reason: isHebrew ? 'נתן/ה לך Vouch' : 'Vouched for you',
      }));
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !suggestions || suggestions.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4 text-pink-500" />
          {isHebrew ? 'החזר Vouch' : 'Return the Vouch'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.map((s) => (
          <div key={s.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarImage src={s.avatar || ''} />
              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.reason}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-pink-500 hover:text-pink-600 hover:bg-pink-500/10"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('open-give-vouch', {
                    detail: { userId: s.userId, userName: s.name, avatarUrl: s.avatar },
                  })
                );
              }}
            >
              <Heart className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
