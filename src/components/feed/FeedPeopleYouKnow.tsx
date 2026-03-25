import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCredits } from '@/contexts/CreditsContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SendMessageDialog } from '@/components/messaging/SendMessageDialog';
import { Users, HandHeart, UserPlus, Sparkles, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface SuggestedPerson {
  user_id: string;
  full_name: string;
  title: string | null;
  avatar_url: string | null;
  city: string | null;
  mutual_count: number;
  reason: string;
}

export function FeedPeopleYouKnow() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { awardCredits } = useCredits();
  const isRTL = language === 'he';
  const navigate = useNavigate();
  const [vouchRequested, setVouchRequested] = useState<Set<string>>(new Set());

  const { data: people } = useQuery({
    queryKey: ['people-you-know', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's applied companies to find people who applied to same companies
      const { data: myApps } = await supabase
        .from('applications')
        .select('job_id')
        .eq('candidate_id', user.id)
        .limit(20);

      const myJobIds = myApps?.map((a: any) => a.job_id).filter(Boolean) || [];

      // Get IDs user already follows
      const { data: followedData } = await supabase
        .from('follows')
        .select('followed_user_id')
        .eq('follower_id', user.id);
      const followedIds = new Set(followedData?.map((f: any) => f.followed_user_id).filter(Boolean) || []);

      // Find other candidates who applied to same jobs
      let candidateScores: Record<string, number> = {};
      if (myJobIds.length > 0) {
        const { data: otherApps } = await supabase
          .from('applications')
          .select('candidate_id')
          .in('job_id', myJobIds)
          .neq('candidate_id', user.id)
          .limit(100);

        for (const app of (otherApps || [])) {
          if (app.candidate_id && !followedIds.has(app.candidate_id)) {
            candidateScores[app.candidate_id] = (candidateScores[app.candidate_id] || 0) + 1;
          }
        }
      }

      // Also get people from same city
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('city')
        .eq('user_id', user.id)
        .single();

      if (myProfile?.city) {
        const { data: sameCityProfiles } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('city', myProfile.city)
          .neq('user_id', user.id)
          .limit(20);

        for (const p of (sameCityProfiles || [])) {
          if (p.user_id && !followedIds.has(p.user_id)) {
            candidateScores[p.user_id] = (candidateScores[p.user_id] || 0) + 0.5;
          }
        }
      }

      // Get top scored candidates
      const topIds = Object.entries(candidateScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

      if (!topIds.length) {
        // Fallback: random active users
        const { data: randomProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, title, avatar_url, city')
          .neq('user_id', user.id)
          .limit(5);
        return (randomProfiles || []).map((p: any) => ({
          ...p,
          mutual_count: 0,
          reason: isRTL ? 'חבר/ת קהילה' : 'Community member',
        }));
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, title, avatar_url, city')
        .in('user_id', topIds);

      return (profiles || []).map((p: any): SuggestedPerson => {
        const score = candidateScores[p.user_id] || 0;
        const mutualJobs = Math.floor(score);
        return {
          ...p,
          mutual_count: mutualJobs,
          reason: mutualJobs > 0
            ? (isRTL ? `${mutualJobs} משרות משותפות` : `${mutualJobs} mutual jobs`)
            : (isRTL ? 'מאותה העיר' : 'Same city'),
        };
      }).slice(0, 4);
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  const handleVouch = async (personId: string, personName: string) => {
    const result = await awardCredits('vouch_request');
    if (result.success) {
      setVouchRequested(prev => new Set(prev).add(personId));
      toast.success(
        isRTL
          ? `בקשת VOUCH נשלחה ל-${personName}! ⚡ -2 קרדיטים`
          : `VOUCH request sent to ${personName}! ⚡ -2 credits`,
        { duration: 3000 }
      );
    } else {
      toast.error(isRTL ? 'אין מספיק קרדיטים' : 'Not enough credits');
    }
  };

  if (!people?.length) return null;

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-900">
            {isRTL ? 'אנשים שאולי את/ה מכיר/ה' : 'People you may know'}
          </h3>
        </div>

        <div className="space-y-3">
          {people.map((person) => {
            const initials = person.full_name
              ?.split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || '?';
            const isVouched = vouchRequested.has(person.user_id);

            return (
              <div key={person.user_id} className="flex items-start gap-2.5">
                <Avatar
                  className="h-10 w-10 flex-shrink-0 cursor-pointer"
                  onClick={() => navigate(`/p/${person.user_id}`)}
                >
                  {person.avatar_url && <AvatarImage src={person.avatar_url} alt={person.full_name} />}
                  <AvatarFallback className="bg-blue-50 text-blue-600 text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:underline"
                    onClick={() => navigate(`/p/${person.user_id}`)}
                  >
                    {person.full_name}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {person.title || (isRTL ? 'מחפש/ת עבודה' : 'Job Seeker')}
                  </p>
                  <p className="text-[10px] text-primary/70 mt-0.5">{person.reason}</p>

                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    <SendMessageDialog
                      toUserId={person.user_id}
                      toUserName={person.full_name}
                      defaultMessage={isRTL
                        ? `היי ${person.full_name},\nראיתי שאנחנו בתחומים דומים ורציתי ליצור קשר.\n\nבברכה`
                        : `Hi ${person.full_name},\nI noticed we're in similar fields and wanted to connect.\n\nBest`}
                      trigger={
                        <Button variant="outline" size="sm" className="h-6 px-2 text-[11px] rounded-full border-blue-300 text-blue-600 hover:bg-blue-50 gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {isRTL ? 'הודעה' : 'Message'}
                        </Button>
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[11px] rounded-full border-gray-300 gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      {isRTL ? 'עקוב' : 'Follow'}
                    </Button>
                    <Button
                      variant={isVouched ? 'secondary' : 'outline'}
                      size="sm"
                      className="h-6 px-2 text-[11px] rounded-full border-amber-300 text-amber-700 hover:bg-amber-50 gap-1"
                      onClick={() => handleVouch(person.user_id, person.full_name)}
                      disabled={isVouched}
                    >
                      <HandHeart className="w-3 h-3" />
                      {isVouched
                        ? (isRTL ? 'נשלח' : 'Sent')
                        : (isRTL ? 'בקש VOUCH' : 'Ask VOUCH')}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-gray-400 mt-3 text-center">
          {isRTL ? '⚡ בקשת VOUCH עולה 2 קרדיטים' : '⚡ VOUCH request costs 2 credits'}
        </p>
      </CardContent>
    </Card>
  );
}
