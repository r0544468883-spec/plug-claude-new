import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Globe, 
  Linkedin, 
  Github, 
  MessageSquare,
  Phone,
  ExternalLink,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonalCardPreviewProps {
  profile: {
    full_name: string;
    avatar_url: string | null;
    personal_tagline: string | null;
    about_me: string | null;
    intro_video_url: string | null;
    portfolio_url: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    phone: string | null;
    email: string | null;
  };
  showActions?: boolean;
  compact?: boolean;
}

export function PersonalCardPreview({ 
  profile, 
  showActions = false,
  compact = false 
}: PersonalCardPreviewProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const hasLinks = profile.portfolio_url || profile.linkedin_url || profile.github_url;

  return (
    <Card className={cn(
      'bg-gradient-to-br from-card to-accent/5 border-border overflow-hidden',
      compact ? 'p-4' : ''
    )}>
      <CardContent className={compact ? 'p-0' : 'p-6'}>
        <div className={cn(
          'flex gap-6',
          compact ? 'flex-row items-start' : 'flex-col sm:flex-row items-center sm:items-start'
        )}>
          {/* Avatar */}
          <Avatar className={cn(
            'border-4 border-primary/20 flex-shrink-0',
            compact ? 'w-20 h-20' : 'w-28 h-28'
          )}>
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
              {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className={cn(
            'flex-1 min-w-0',
            compact ? '' : 'text-center sm:text-start'
          )}>
            {/* Name */}
            <h2 className={cn(
              'font-bold truncate',
              compact ? 'text-lg' : 'text-2xl'
            )}>
              {profile.full_name || (isHebrew ? 'משתמש' : 'User')}
            </h2>

            {/* Personal Tagline */}
            {profile.personal_tagline && (
              <p className={cn(
                'text-muted-foreground mt-1',
                compact ? 'text-sm line-clamp-1' : 'text-base'
              )}>
                "{profile.personal_tagline}"
              </p>
            )}

            {/* About Me */}
            {profile.about_me && !compact && (
              <p className="text-sm text-foreground/80 mt-3 whitespace-pre-wrap">
                {profile.about_me}
              </p>
            )}

            {/* Video indicator for compact mode */}
            {profile.intro_video_url && compact && (
              <Badge variant="secondary" className="mt-2 gap-1">
                <Play className="w-3 h-3" />
                {isHebrew ? 'סרטון היכרות' : 'Intro Video'}
              </Badge>
            )}

            {/* Professional Links */}
            {hasLinks && (
              <div className={cn(
                'flex items-center gap-2 flex-wrap',
                compact ? 'mt-2' : 'mt-4 justify-center sm:justify-start'
              )}>
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
              </div>
            )}

            {/* Action Buttons */}
            {showActions && (
              <div className={cn(
                'flex items-center gap-2 flex-wrap',
                compact ? 'mt-3' : 'mt-4 justify-center sm:justify-start'
              )}>
                <Button variant="outline" size="sm" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {isHebrew ? 'הודעה' : 'Message'}
                </Button>
                
                {profile.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                  >
                    <Phone className="w-4 h-4" />
                    WhatsApp
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Video Section - Full mode only */}
        {profile.intro_video_url && !compact && (
          <div className="mt-6">
            <video
              src={profile.intro_video_url}
              controls
              className="w-full max-h-[300px] rounded-lg bg-muted/30"
              preload="metadata"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
