import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SendMessageDialog } from '@/components/messaging/SendMessageDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Globe,
  Linkedin,
  Github,
  MessageSquare,
  Phone,
  Play,
  User,
  Video,
  Share2,
  Copy,
  Twitter,
  ExternalLink,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonalCardProps {
  profile: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    personal_tagline?: string | null;
    about_me?: string | null;
    intro_video_url?: string | null;
    portfolio_url: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    custom_links?: { label: string; url: string }[] | null;
    phone?: string | null;
    email?: string | null;
    allow_recruiter_contact?: boolean;
  };
  showActions?: boolean;
  showVideo?: boolean;
  compact?: boolean;
  relatedJobId?: string;
  relatedApplicationId?: string;
  className?: string;
}

export function PersonalCard({ 
  profile, 
  showActions = true,
  showVideo = true,
  compact = false,
  relatedJobId,
  relatedApplicationId,
  className
}: PersonalCardProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);
  const [completedAssignments, setCompletedAssignments] = useState<any[]>([]);

  // Fetch completed assignments (public)
  useEffect(() => {
    if (!profile.user_id) return;
    supabase
      .from('assignment_submissions' as any)
      .select('id, file_url, assignment_templates!template_id(title, category)')
      .eq('submitted_by', profile.user_id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setCompletedAssignments(data ?? []);
      });
  }, [profile.user_id]);

  const profileUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/p/${profile.user_id}`
    : `/p/${profile.user_id}`;

  const handleShare = (platform: string) => {
    const name = profile.full_name || (isHebrew ? 'משתמש' : 'User');
    const text = isHebrew
      ? `הכר/י את ${name} ב-PLUG`
      : `Meet ${name} on PLUG`;
    switch (platform) {
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + profileUrl)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(profileUrl);
        toast.success(isHebrew ? 'הקישור הועתק!' : 'Link copied!');
        break;
    }
  };

  // Fetch signed video URL if needed
  useEffect(() => {
    const fetchVideoUrl = async () => {
      const videoPath = profile.intro_video_url;
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
  }, [profile.intro_video_url]);

  const customLinks = Array.isArray(profile.custom_links) ? profile.custom_links.filter(l => l.url) : [];
  const hasLinks = profile.portfolio_url || profile.linkedin_url || profile.github_url || customLinks.length > 0;
  const hasPersonalContent = profile.personal_tagline || profile.about_me || profile.intro_video_url;

  const openWhatsApp = () => {
    if (!profile.phone) return;
    const phone = profile.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      isHebrew
        ? `שלום ${profile.full_name}, ראיתי את הפרופיל שלך ואשמח לשוחח איתך.`
        : `Hi ${profile.full_name}, I saw your profile and I'd love to chat with you.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  if (compact) {
    return (
      <div className={cn('flex items-start gap-3', className)}>
        <Avatar className="w-12 h-12">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">
            {profile.full_name || (isHebrew ? 'משתמש' : 'User')}
          </h3>
          
          {profile.personal_tagline && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              "{profile.personal_tagline}"
            </p>
          )}

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {profile.intro_video_url && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Video className="w-3 h-3" />
                {isHebrew ? 'סרטון' : 'Video'}
              </Badge>
            )}
            
            {hasLinks && (
              <div className="flex items-center gap-1">
                {profile.linkedin_url && (
                  <Linkedin className="w-3 h-3 text-muted-foreground" />
                )}
                {profile.github_url && (
                  <Github className="w-3 h-3 text-muted-foreground" />
                )}
                {profile.portfolio_url && (
                  <Globe className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      'bg-gradient-to-br from-card to-accent/5 border-border overflow-hidden',
      className
    )}>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <Avatar className="w-28 h-28 border-4 border-primary/20 flex-shrink-0">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-3xl bg-primary/10 text-primary">
              {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0 text-center sm:text-start">
            {/* Name */}
            <h2 className="text-2xl font-bold">
              {profile.full_name || (isHebrew ? 'משתמש' : 'User')}
            </h2>

            {/* Personal Tagline */}
            {profile.personal_tagline && (
              <p className="text-muted-foreground mt-1 text-lg">
                "{profile.personal_tagline}"
              </p>
            )}

            {/* About Me */}
            {profile.about_me && (
              <p className="text-sm text-foreground/80 mt-3 whitespace-pre-wrap">
                {profile.about_me}
              </p>
            )}

            {/* Video indicator */}
            {profile.intro_video_url && !showVideo && (
              <Badge variant="secondary" className="mt-3 gap-1">
                <Play className="w-3 h-3" />
                {isHebrew ? 'יש סרטון היכרות' : 'Has Intro Video'}
              </Badge>
            )}

            {/* Professional Links */}
            {hasLinks && (
              <div className="flex items-center gap-2 flex-wrap mt-4 justify-center sm:justify-start">
                {profile.portfolio_url && (
                  <a
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    title="Portfolio"
                  >
                    <Globe className="w-4 h-4 text-muted-foreground" />
                  </a>
                )}
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    title="LinkedIn"
                  >
                    <Linkedin className="w-4 h-4 text-muted-foreground" />
                  </a>
                )}
                {profile.github_url && (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    title="GitHub"
                  >
                    <Github className="w-4 h-4 text-muted-foreground" />
                  </a>
                )}
                {customLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-xs font-medium text-muted-foreground"
                    title={link.url}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {link.label || new URL(link.url).hostname.replace('www.', '')}
                  </a>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            {showActions && profile.allow_recruiter_contact !== false && (
              <div className="flex items-center gap-2 flex-wrap mt-4 justify-center sm:justify-start">
                <SendMessageDialog
                  toUserId={profile.user_id}
                  toUserName={profile.full_name || ''}
                  relatedJobId={relatedJobId}
                  relatedApplicationId={relatedApplicationId}
                  trigger={
                    <Button variant="outline" size="sm" className="gap-2">
                      <MessageSquare className="w-4 h-4" />
                      {isHebrew ? 'הודעה' : 'Message'}
                    </Button>
                  }
                />

                {profile.phone && (
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                    onClick={openWhatsApp}
                  >
                    <Phone className="w-4 h-4" />
                    WhatsApp
                  </Button>
                )}

                {/* Share Profile */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Share2 className="w-4 h-4" />
                      {isHebrew ? 'שתף' : 'Share'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handleShare('linkedin')}>
                      <Linkedin className="w-4 h-4 me-2" /> LinkedIn
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
                      <Phone className="w-4 h-4 me-2" /> WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('twitter')}>
                      <Twitter className="w-4 h-4 me-2" /> Twitter / X
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('copy')}>
                      <Copy className="w-4 h-4 me-2" />
                      {isHebrew ? 'העתק קישור' : 'Copy Link'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        {/* Completed Assignments Section */}
        {completedAssignments.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              {isHebrew ? 'לוח המטלות שהושלמו' : 'Completed Assignments'}
              <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">{completedAssignments.length}</Badge>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {completedAssignments.map((sub: any) => {
                const tmpl = sub.assignment_templates;
                return (
                  <div key={sub.id} className="border rounded-lg p-3 space-y-1.5 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <p className="text-xs font-medium line-clamp-2 leading-tight">{tmpl?.title || '—'}</p>
                    {tmpl?.category && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">{tmpl.category}</Badge>
                    )}
                    <a
                      href={sub.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {isHebrew ? 'צפה בפתרון' : 'View Solution'}
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Video Section */}
        {showVideo && videoUrl && (
          <div className="mt-6">
            <video
              src={videoUrl}
              controls
              className="w-full max-h-[350px] rounded-lg bg-muted/30"
              preload="metadata"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
