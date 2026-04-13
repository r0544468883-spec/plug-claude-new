import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { VouchCard } from '@/components/vouch/VouchCard';
import { PlugLogo } from '@/components/PlugLogo';
import { PersonalCard } from '@/components/profile/PersonalCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, User, Shield, FileText, Download, Eye } from 'lucide-react';
import { ConnectButton } from '@/components/connections/ConnectButton';
import { useConnections } from '@/hooks/useConnections';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

/** Record a profile view/action */
async function trackProfileAction(
  profileUserId: string,
  action: 'view' | 'resume_download' | 'video_play' | 'link_click',
  viewerId?: string,
) {
  try {
    await (supabase as any).from('profile_views').insert({
      profile_user_id: profileUserId,
      viewer_id: viewerId || null,
      referrer: document.referrer || null,
      viewer_user_agent: navigator.userAgent,
      action,
    });
  } catch {
    // Silent — tracking should never block UX
  }
}

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';
  const isOwnProfile = user?.id === userId;
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const viewTracked = useRef(false);

  // Fetch profile with professional links and new personal fields
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url, bio, portfolio_url, linkedin_url, github_url, allow_recruiter_contact, email, personal_tagline, about_me, intro_video_url, custom_links')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch resume for download button
  const { data: resumeData } = useQuery({
    queryKey: ['public-resume', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, file_name, file_path')
        .eq('owner_id', userId!)
        .eq('doc_type', 'resume')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Track profile view (once per page load, not for own profile)
  useEffect(() => {
    if (userId && !isOwnProfile && profile && !viewTracked.current) {
      viewTracked.current = true;
      trackProfileAction(userId, 'view', user?.id);
    }
  }, [userId, isOwnProfile, profile, user?.id]);

  // Fetch video signed URL if needed
  useEffect(() => {
    const fetchVideoUrl = async () => {
      const videoPath = profile?.intro_video_url;
      if (!videoPath) return;

      if (videoPath.startsWith('profile-videos/')) {
        const filePath = videoPath.replace('profile-videos/', '');
        const { data } = await supabase.storage
          .from('profile-videos')
          .createSignedUrl(filePath, 60 * 60);

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
      const { data: vouchesData, error: vouchesError } = await supabase
        .from('vouches')
        .select('*')
        .eq('to_user_id', userId!)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (vouchesError) throw vouchesError;

      const fromUserIds = vouchesData.map(v => v.from_user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url')
        .in('user_id', fromUserIds);

      if (profilesError) throw profilesError;

      return vouchesData.map(vouch => ({
        ...vouch,
        from_profile: profiles.find(p => p.user_id === vouch.from_user_id),
      }));
    },
    enabled: !!userId,
  });

  // View count for own profile
  const { data: viewCount } = useQuery({
    queryKey: ['profile-view-count', userId],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from('profile_views')
        .select('id', { count: 'exact', head: true })
        .eq('profile_user_id', userId)
        .eq('action', 'view');

      if (error) return 0;
      return count || 0;
    },
    enabled: !!userId && isOwnProfile,
  });

  const handleResumeDownload = async () => {
    if (!resumeData?.file_path || !userId) return;

    // Track download
    trackProfileAction(userId, 'resume_download', user?.id);

    // Get signed URL and download
    const { data } = await supabase.storage
      .from('resumes')
      .createSignedUrl(resumeData.file_path, 60 * 5); // 5 minutes

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      toast.error(isHebrew ? 'שגיאה בהורדת קורות החיים' : 'Error downloading resume');
    }
  };

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
          <div className="flex items-center gap-3">
            {isOwnProfile && typeof viewCount === 'number' && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                <Eye className="w-3.5 h-3.5" />
                {viewCount} {isHebrew ? 'צפיות' : 'views'}
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              {isHebrew ? 'פרופיל מאומת' : 'Verified Profile'}
            </div>
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

        {/* Connection + Resume Actions */}
        {!isOwnProfile && (
          <div className="flex items-center gap-3 flex-wrap">
            {user && userId && <ConnectButton targetUserId={userId} />}
            {resumeData && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleResumeDownload}
              >
                <Download className="w-4 h-4" />
                {isHebrew ? 'הורד קורות חיים' : 'Download Resume'}
              </Button>
            )}
          </div>
        )}

        {/* Own profile: show resume status */}
        {isOwnProfile && (
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {resumeData
                      ? (isHebrew ? 'קורות חיים מצורפים לפרופיל' : 'Resume attached to profile')
                      : (isHebrew ? 'לא צורפו קורות חיים' : 'No resume attached')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {resumeData
                      ? resumeData.file_name
                      : (isHebrew ? 'העלה קו"ח כדי שמגייסים יוכלו להוריד אותם מהפרופיל שלך' : 'Upload a resume so recruiters can download it from your profile')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
