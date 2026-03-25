import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { VouchCard } from '@/components/vouch/VouchCard';
import { PlugLogo } from '@/components/PlugLogo';
import { PersonalCard } from '@/components/profile/PersonalCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, User, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';
  const isOwnProfile = user?.id === userId;
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Fetch profile with professional links and new personal fields
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      // Use profiles_secure view for public profile to protect contact details
      const { data, error } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url, bio, portfolio_url, linkedin_url, github_url, allow_recruiter_contact, email, personal_tagline, about_me, intro_video_url')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch video signed URL if needed
  useEffect(() => {
    const fetchVideoUrl = async () => {
      const videoPath = profile?.intro_video_url;
      if (!videoPath) return;

      if (videoPath.startsWith('profile-videos/')) {
        const filePath = videoPath.replace('profile-videos/', '');
        const { data } = await supabase.storage
          .from('profile-videos')
          .createSignedUrl(filePath, 60 * 60); // 1 hour
        
        if (data?.signedUrl) {
          setVideoUrl(data.signedUrl);
        }
      } else if (videoPath.startsWith('http')) {
        setVideoUrl(videoPath);
      }
    };

    fetchVideoUrl();
  }, [profile?.intro_video_url]);

  // Fetch public vouches
  const { data: vouches = [], isLoading: vouchesLoading } = useQuery({
    queryKey: ['public-vouches', userId],
    queryFn: async () => {
      // Get vouches
      const { data: vouchesData, error: vouchesError } = await supabase
        .from('vouches')
        .select('*')
        .eq('to_user_id', userId!)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (vouchesError) throw vouchesError;

      // Get profiles for from_user_ids (use profiles_secure for safety)
      const fromUserIds = vouchesData.map(v => v.from_user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url')
        .in('user_id', fromUserIds);

      if (profilesError) throw profilesError;

      // Merge
      return vouchesData.map(vouch => ({
        ...vouch,
        from_profile: profiles.find(p => p.user_id === vouch.from_user_id),
      }));
    },
    enabled: !!userId,
  });

  const isLoading = profileLoading || vouchesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
            <PlugLogo size="sm" />
          </div>
        </header>
        <main className="max-w-3xl mx-auto p-4 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
            <Link to="/">
              <PlugLogo size="sm" />
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {isHebrew ? 'הפרופיל לא נמצא' : 'Profile not found'}
              </h2>
              <p className="text-muted-foreground">
                {isHebrew 
                  ? 'ייתכן שהפרופיל אינו קיים או אינו ציבורי'
                  : 'This profile may not exist or is not public'}
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/">
            <PlugLogo size="sm" />
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            {isHebrew ? 'פרופיל מאומת' : 'Verified Profile'}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Personal Card */}
        <PersonalCard
          profile={{
            user_id: profile.user_id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            personal_tagline: profile.personal_tagline,
            about_me: profile.about_me,
            intro_video_url: videoUrl,
            portfolio_url: profile.portfolio_url,
            linkedin_url: profile.linkedin_url,
            github_url: profile.github_url,
            phone: null, // Hidden in public view
            email: profile.email,
            allow_recruiter_contact: profile.allow_recruiter_contact ?? true,
          }}
          showActions={!isOwnProfile && !!user}
          showVideo={true}
        />

        {/* Endorsements */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="h-5 w-5 text-primary" />
              {isHebrew ? 'המלצות מקצועיות' : 'Professional Endorsements'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vouches.length > 0 ? (
              <div className="space-y-4">
                {vouches.map((vouch) => (
                  <VouchCard key={vouch.id} vouch={vouch} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isHebrew ? 'אין המלצות ציבוריות עדיין' : 'No public endorsements yet'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            {isHebrew 
              ? 'פרופיל זה נוצר באמצעות '
              : 'This profile is powered by '}
            <Link to="/" className="text-primary hover:underline">Plug</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
