import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { VouchCard } from './VouchCard';
import { GiveVouchForm } from './GiveVouchForm';
import { WeightedSkillHeatmap } from './WeightedSkillHeatmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Heart, Users, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface VouchSectionProps {
  userId: string;
  userName: string;
  showGiveVouch?: boolean;
}

export function VouchSection({ userId, userName, showGiveVouch = true }: VouchSectionProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';

  const { data: vouches, isLoading } = useQuery({
    queryKey: ['vouches', userId],
    queryFn: async () => {
      // Get vouches with from_user profiles
      const { data: vouchesData, error: vouchesError } = await supabase
        .from('vouches')
        .select('*')
        .eq('to_user_id', userId)
        .order('created_at', { ascending: false });

      if (vouchesError) throw vouchesError;

      // Get profiles for from_user_ids (use profiles_secure for safety)
      const fromUserIds = vouchesData.map(v => v.from_user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url')
        .in('user_id', fromUserIds);

      if (profilesError) throw profilesError;

      // Merge profiles into vouches
      return vouchesData.map(vouch => ({
        ...vouch,
        from_profile: profiles.find(p => p.user_id === vouch.from_user_id),
      }));
    },
  });

  const canVouch = user && user.id !== userId;

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="h-5 w-5 text-primary" />
          {isHebrew ? 'Vouches' : 'Vouches'}
          {vouches && vouches.length > 0 && (
            <span className="text-sm text-muted-foreground font-normal">
              ({vouches.length})
            </span>
          )}
        </CardTitle>
        {showGiveVouch && canVouch && (
          <GiveVouchForm toUserId={userId} toUserName={userName} />
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weighted Skills Heatmap */}
        {vouches && vouches.length > 0 && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                {isHebrew ? 'מיומנויות מאומתות' : 'Verified Skills'}
              </div>
              <WeightedSkillHeatmap userId={userId} compact />
            </div>
            <Separator />
          </>
        )}

        {/* Vouch Cards */}
        {vouches && vouches.length > 0 ? (
          <div className="space-y-3">
            {vouches.map((vouch) => (
              <VouchCard key={vouch.id} vouch={vouch} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{isHebrew ? 'אין Vouches עדיין' : 'No vouches yet'}</p>
            {showGiveVouch && canVouch && (
              <p className="text-sm mt-1">
                {isHebrew ? 'היה הראשון לתת Vouch!' : 'Be the first to vouch!'}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
