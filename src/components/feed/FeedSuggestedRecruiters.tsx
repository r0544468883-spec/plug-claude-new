import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FollowButton } from './FollowButton';
import { QuickPingButton } from '@/components/messaging/QuickPingButton';
import { UserPlus } from 'lucide-react';

interface SuggestedRecruiter {
  user_id: string;
  full_name: string;
  title: string | null;
  avatar_url: string | null;
}

export function FeedSuggestedRecruiters() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'he';

  const { data: recruiters } = useQuery({
    queryKey: ['suggested-recruiters', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get IDs user already follows
      const { data: followedData } = await supabase
        .from('follows')
        .select('followed_user_id')
        .eq('follower_id', user.id);
      const followedIds = new Set(followedData?.map((f: any) => f.followed_user_id).filter(Boolean) || []);

      // Find recruiters (freelance_hr / inhouse_hr) user isn't following yet
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['freelance_hr', 'inhouse_hr'])
        .limit(30) as any;

      if (!roles?.length) return [];

      const recruiterIds = roles
        .map((r: any) => r.user_id)
        .filter((id: string) => id !== user.id && !followedIds.has(id));

      if (!recruiterIds.length) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, title, avatar_url')
        .in('user_id', recruiterIds.slice(0, 8));

      return (profiles || []).slice(0, 5) as SuggestedRecruiter[];
    },
    enabled: !!user?.id,
  });

  if (!recruiters?.length) return null;

  return (
    <Card className="bg-card shadow-sm border border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            {isRTL ? 'הוסיפו לפיד שלכם' : 'Add to your feed'}
          </h3>
        </div>

        <div className="space-y-3">
          {recruiters.map((recruiter) => {
            const initials = recruiter.full_name
              ?.split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'R';

            return (
              <div key={recruiter.user_id} className="flex items-start gap-3">
                <Avatar
                  className="h-10 w-10 flex-shrink-0 cursor-pointer"
                  onClick={() => navigate(`/p/${recruiter.user_id}`)}
                >
                  {recruiter.avatar_url && (
                    <AvatarImage src={recruiter.avatar_url} alt={recruiter.full_name} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium text-foreground truncate cursor-pointer hover:underline"
                    onClick={() => navigate(`/p/${recruiter.user_id}`)}
                  >
                    {recruiter.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {recruiter.title || (isRTL ? 'מגייס/ת' : 'Recruiter')}
                  </p>
                  <div className="flex gap-1.5 mt-1.5">
                    <QuickPingButton
                      toUserId={recruiter.user_id}
                      toUserName={recruiter.full_name}
                      context="suggested"
                      size="sm"
                      className="h-7 rounded-full text-xs"
                    />
                    <FollowButton
                      targetUserId={recruiter.user_id}
                      size="sm"
                      className="h-7 rounded-full border-border text-xs"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
