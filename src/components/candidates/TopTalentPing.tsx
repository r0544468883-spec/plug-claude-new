import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SendMessageDialog } from '@/components/messaging/SendMessageDialog';
import { Sparkles, Bell, MessageSquare, Heart } from 'lucide-react';
import { toast } from 'sonner';

export function TopTalentPing() {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const { data: topTalent = [] } = useQuery({
    queryKey: ['top-talent-ping'],
    queryFn: async () => {
      // Get profiles with high vouch counts
      const { data: profiles, error } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url, personal_tagline, visible_to_hr, bio')
        .limit(50);
      if (error || !profiles) return [];

      // Get vouch counts
      const results = await Promise.all(
        profiles.map(async (p) => {
          const { count } = await supabase
            .from('vouches')
            .select('*', { count: 'exact', head: true })
            .eq('to_user_id', p.user_id)
            .eq('is_public', true);
          return { ...p, vouchCount: count || 0 };
        })
      );

      return results
        .filter((r) => r.vouchCount >= 2)
        .sort((a, b) => b.vouchCount - a.vouchCount)
        .slice(0, 10);
    },
  });

  const handlePing = async (userId: string, name: string) => {
    // Send anonymous interest notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'talent_ping',
      title: isHebrew ? 'מגייס מעוניין בך!' : 'A recruiter is interested in you!',
      message: isHebrew
        ? 'מגייס ראה את הפרופיל שלך וגילה עניין. הפעל "גלוי למגייסים" כדי לקבל הודעות.'
        : 'A recruiter viewed your profile and expressed interest. Enable "Visible to HR" to receive messages.',
    });
    toast.success(isHebrew ? `פינג נשלח ל-${name}` : `Ping sent to ${name}`);
  };

  if (topTalent.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {isHebrew ? 'טאלנטים מובילים' : 'Top Talent'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topTalent.map((talent) => (
          <div key={talent.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <Avatar className="w-10 h-10">
              <AvatarImage src={talent.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {talent.full_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{talent.full_name}</p>
              {talent.personal_tagline && (
                <p className="text-xs text-muted-foreground truncate">{talent.personal_tagline}</p>
              )}
            </div>
            <Badge variant="outline" className="gap-1 border-pink-500/20 text-pink-500 shrink-0">
              <Heart className="w-3 h-3" />
              {talent.vouchCount}
            </Badge>
            {talent.visible_to_hr ? (
              <SendMessageDialog
                toUserId={talent.user_id}
                toUserName={talent.full_name || ''}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1 shrink-0">
                    <MessageSquare className="w-3 h-3" />
                    {isHebrew ? 'הודעה' : 'Message'}
                  </Button>
                }
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 shrink-0"
                onClick={() => handlePing(talent.user_id, talent.full_name || '')}
              >
                <Bell className="w-3 h-3" />
                Ping
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
