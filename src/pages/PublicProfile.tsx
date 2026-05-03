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
import { Heart, User, Shield, FileText, Download, Eye, Building2, ExternalLink, Briefcase, GraduationCap, Code2, Languages, ClipboardCheck, MessageSquare, Phone, EyeOff, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConnectButton } from '@/components/connections/ConnectButton';
import { useConnections } from '@/hooks/useConnections';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getCompanyLogoUrl } from '@/lib/company-logo';

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
  const navigate = useNavigate();

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

  // Fetch cv_data, visible_to_hr, phone for extended profile sections
  const { data: profileExtra } = useQuery({
    queryKey: ['public-profile-extra', userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('cv_data, visible_to_hr, phone')
        .eq('user_id', userId!)
        .maybeSingle();
      return data as { cv_data: any; visible_to_hr: boolean | null; phone: string | null } | null;
    },
    enabled: !!userId,
  });

  const cvData = profileExtra?.cv_data || null;
  const isVisible = profileExtra?.visible_to_hr !== false; // default true if null
  const profilePhone = profileExtra?.phone;

  // Fetch completed public assignments
  const { data: completedAssignments = [] } = useQuery({
    queryKey: ['public-assignments', userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('assignment_submissions')
        .select('id, file_url, notes, created_at, is_public, assignment_templates!template_id(title, category)')
        .eq('user_id', userId!)
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  // Fetch role + recruiter_company_ids for HR profiles
  const { data: recruiterMeta } = useQuery({
    queryKey: ['public-profile-recruiter-meta', userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('role, recruiter_company_ids')
        .eq('user_id', userId!)
        .maybeSingle();
      return data as { role: string; recruiter_company_ids: string[] } | null;
    },
    enabled: !!userId,
  });

  const isHRProfile = recruiterMeta?.role === 'freelance_hr' || recruiterMeta?.role === 'inhouse_hr';

  // Fetch linked company records
  const { data: recruiterLinkedCompanies = [] } = useQuery({
    queryKey: ['public-recruiter-companies', userId, recruiterMeta?.recruiter_company_ids],
    queryFn: async () => {
      const ids = recruiterMeta?.recruiter_company_ids;
      if (!ids || ids.length === 0) return [];
      const { data } = await (supabase as any)
        .from('companies')
        .select('id, name, website, logo_url')
        .in('id', ids);
      return (data || []) as { id: string; name: string; website?: string | null; logo_url?: string | null }[];
    },
    enabled: isHRProfile && (recruiterMeta?.recruiter_company_ids?.length ?? 0) > 0,
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

  // View count + recent viewers for own profile
  const { data: viewsData } = useQuery({
    queryKey: ['profile-views-detailed', userId],
    queryFn: async () => {
      // Total count
      const { count } = await (supabase as any)
        .from('profile_views')
        .select('id', { count: 'exact', head: true })
        .eq('profile_user_id', userId)
        .eq('action', 'view');

      // Recent identified viewers (have viewer_id)
      const { data: recentViews } = await (supabase as any)
        .from('profile_views')
        .select('viewer_id, created_at')
        .eq('profile_user_id', userId)
        .eq('action', 'view')
        .not('viewer_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      // Dedupe by viewer_id, keep latest
      const uniqueViewerIds = [...new Set((recentViews || []).map((v: any) => v.viewer_id))] as string[];

      // Fetch their profiles
      let viewers: { user_id: string; full_name: string | null; avatar_url: string | null }[] = [];
      if (uniqueViewerIds.length > 0) {
        const { data: viewerProfiles } = await supabase
          .from('profiles_secure')
          .select('user_id, full_name, avatar_url')
          .in('user_id', uniqueViewerIds.slice(0, 10));
        viewers = viewerProfiles || [];
      }

      return { totalViews: count || 0, viewers };
    },
    enabled: !!userId && isOwnProfile,
  });

  const viewCount = viewsData?.totalViews || 0;

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

  // If profile is not visible (anonymous mode) and viewer is not the owner
  if (!isVisible && !isOwnProfile) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir={isHebrew ? 'rtl' : 'ltr'}>
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
            <Link to="/"><PlugLogo size="sm" /></Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <EyeOff className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                {isHebrew ? 'המשתמש במצב אנונימי' : 'This user is anonymous'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {isHebrew
                  ? 'המשתמש בחר שלא להציג את הפרופיל שלו באופן ציבורי'
                  : 'This user has chosen not to display their profile publicly'}
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="w-3.5 h-3.5" />
                {isHebrew ? 'פרופיל פרטי' : 'Private profile'}
              </div>
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
            {isOwnProfile && !isVisible && (
              <div className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full">
                <EyeOff className="w-3.5 h-3.5" />
                {isHebrew ? 'מצב אנונימי' : 'Anonymous mode'}
              </div>
            )}
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
            custom_links: profile.custom_links as any,
            phone: null, // Hidden in public view
            email: profile.email,
            allow_recruiter_contact: profile.allow_recruiter_contact ?? true,
          }}
          showActions={!isOwnProfile && !!user}
          showVideo={true}
        />

        {/* Companies I work with — HR profiles only */}
        {isHRProfile && recruiterLinkedCompanies.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                {isHebrew ? 'חברות שאני עובד/ת איתן' : 'Companies I work with'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {recruiterLinkedCompanies.map(company => {
                  const logo = getCompanyLogoUrl(company);
                  return (
                    <button
                      key={company.id}
                      onClick={() => navigate(`/company/${company.id}`)}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border hover:bg-accent transition-colors text-start"
                    >
                      <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {logo ? (
                          <img src={logo} alt={company.name} className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-sm font-medium leading-tight line-clamp-2">{company.name}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connection + Contact + Resume Actions */}
        {!isOwnProfile && (
          <div className="flex items-center gap-3 flex-wrap">
            {user && userId && <ConnectButton targetUserId={userId} />}
            {/* WhatsApp — only if visible and has phone */}
            {isVisible && profilePhone && (
              <Button
                variant="outline"
                className="gap-2"
                asChild
              >
                <a
                  href={`https://wa.me/${profilePhone.replace(/[^0-9+]/g, '').replace(/^0/, '972')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => userId && trackProfileAction(userId, 'link_click', user?.id)}
                >
                  <Phone className="w-4 h-4" />
                  WhatsApp
                </a>
              </Button>
            )}
            {/* In-app message — if viewer has PLUG account */}
            {user && userId && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('plug:navigate-to-messages', { detail: { userId } }));
                  navigate('/');
                }}
              >
                <MessageSquare className="w-4 h-4" />
                {isHebrew ? 'שלח הודעה' : 'Message'}
              </Button>
            )}
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

        {/* Profile viewers — own profile only */}
        {isOwnProfile && viewsData && viewsData.totalViews > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="h-5 w-5 text-primary" />
                {isHebrew ? 'מי צפה בפרופיל שלך' : 'Who viewed your profile'}
                <Badge variant="secondary" className="text-xs ms-auto">{viewsData.totalViews}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {viewsData.viewers.length > 0 ? (
                <div className="space-y-2">
                  {viewsData.viewers.map((viewer) => {
                    const initials = (viewer.full_name || '??').split(' ').map((n: string) => n[0]).join('').toUpperCase();
                    return (
                      <button
                        key={viewer.user_id}
                        onClick={() => navigate(`/p/${viewer.user_id}`)}
                        className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-start"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={viewer.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{viewer.full_name || (isHebrew ? 'משתמש PLUG' : 'PLUG User')}</span>
                      </button>
                    );
                  })}
                  {viewsData.totalViews > viewsData.viewers.length && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      {isHebrew
                        ? `+ ${viewsData.totalViews - viewsData.viewers.length} צפיות אנונימיות`
                        : `+ ${viewsData.totalViews - viewsData.viewers.length} anonymous views`}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-3">
                  {isHebrew ? 'כל הצפיות היו אנונימיות' : 'All views were anonymous'}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Skills */}
        {cvData?.skills?.technical?.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Code2 className="h-5 w-5 text-primary" />
                {isHebrew ? 'כישורים' : 'Skills'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cvData.skills.technical.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{isHebrew ? 'טכניים' : 'Technical'}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cvData.skills.technical.map((skill: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {cvData.skills.soft?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{isHebrew ? 'רכים' : 'Soft Skills'}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cvData.skills.soft.map((skill: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Experience */}
        {cvData?.experience?.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5 text-primary" />
                {isHebrew ? 'ניסיון תעסוקתי' : 'Work Experience'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cvData.experience.map((exp: any, i: number) => (
                <div key={i} className={i > 0 ? 'pt-4 border-t border-border' : ''}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{exp.role || exp.position}</p>
                      <p className="text-sm text-muted-foreground">{exp.company}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {exp.startDate} – {exp.current ? (isHebrew ? 'היום' : 'Present') : exp.endDate || ''}
                    </span>
                  </div>
                  {exp.bullets?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {exp.bullets.filter((b: string) => b.trim()).map((bullet: string, j: number) => (
                        <li key={j} className="text-xs text-foreground/80 flex gap-2">
                          <span className="text-primary shrink-0">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Education */}
        {cvData?.education?.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
                {isHebrew ? 'השכלה' : 'Education'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cvData.education.map((edu: any, i: number) => (
                <div key={i} className={i > 0 ? 'pt-3 border-t border-border' : ''}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{edu.degree}{edu.field ? `, ${edu.field}` : ''}</p>
                      <p className="text-sm text-muted-foreground">{edu.institution}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {edu.startDate} – {edu.endDate || ''}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Languages */}
        {cvData?.skills?.languages?.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Languages className="h-5 w-5 text-primary" />
                {isHebrew ? 'שפות' : 'Languages'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {cvData.skills.languages.map((lang: any, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs gap-1.5 py-1">
                    {lang.name}
                    <span className="text-muted-foreground">({lang.level})</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Assignments */}
        {completedAssignments.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                {isHebrew ? 'מטלות בית שהושלמו' : 'Completed Assignments'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {completedAssignments.map((sub: any) => {
                const template = sub.assignment_templates;
                return (
                  <div key={sub.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{template?.title || (isHebrew ? 'מטלה' : 'Assignment')}</p>
                      {template?.category && (
                        <Badge variant="outline" className="text-[10px] mt-0.5">{template.category}</Badge>
                      )}
                    </div>
                    {sub.file_url && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" asChild>
                        <a href={sub.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                );
              })}
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
