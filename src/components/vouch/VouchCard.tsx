import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

interface VouchCardProps {
  vouch: {
    id: string;
    from_user_id: string;
    vouch_type: string;
    relationship: string | null;
    message: string;
    skills: string[] | null;
    created_at: string;
    from_profile?: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

const vouchTypeLabels: Record<string, { en: string; he: string; icon: string }> = {
  colleague: { en: 'Colleague', he: 'עמית', icon: '👥' },
  manager: { en: 'Manager', he: 'מנהל', icon: '👔' },
  recruiter: { en: 'Recruiter', he: 'מגייס', icon: '🎯' },
  friend: { en: 'Friend', he: 'חבר', icon: '🤝' },
  mentor: { en: 'Mentor', he: 'מנטור', icon: '🌟' },
};

export function VouchCard({ vouch }: VouchCardProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  
  const typeInfo = vouchTypeLabels[vouch.vouch_type] || vouchTypeLabels.colleague;
  const initials = vouch.from_profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '??';

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={vouch.from_profile?.avatar_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">
                  {vouch.from_profile?.full_name || 'Anonymous'}
                </span>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {typeInfo.icon} {isHebrew ? typeInfo.he : typeInfo.en}
                </Badge>
              </div>
            </div>
            
            {vouch.relationship && (
              <p className="text-xs text-muted-foreground mb-2">
                {vouch.relationship}
              </p>
            )}
            
            <p className="text-sm text-foreground/90 leading-relaxed mb-3">
              "{vouch.message}"
            </p>
            
            {vouch.skills && vouch.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {vouch.skills.map((skill, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-xs bg-primary/5 border-primary/20"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(vouch.created_at), {
                addSuffix: true,
                locale: isHebrew ? he : undefined,
              })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
