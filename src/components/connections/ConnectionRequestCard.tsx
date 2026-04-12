import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConnections } from '@/hooks/useConnections';
import { getCircleLabel, type ConnectionCircle } from '@/lib/connection-utils';
import { Check, X, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface ConnectionRequestCardProps {
  connection: {
    id: string;
    circle: 'colleague' | 'recruiter';
    source: string;
    message: string | null;
    created_at: string;
    profile?: {
      user_id: string;
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export function ConnectionRequestCard({ connection }: ConnectionRequestCardProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const { acceptRequest, declineRequest } = useConnections();

  const profile = connection.profile;
  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '??';

  const handleAccept = async () => {
    try {
      await acceptRequest.mutateAsync(connection.id);
      toast.success(isHebrew ? 'החיבור אושר!' : 'Connection accepted!');
    } catch {
      toast.error(isHebrew ? 'שגיאה' : 'Error');
    }
  };

  const handleDecline = async () => {
    try {
      await declineRequest.mutateAsync(connection.id);
    } catch {
      toast.error(isHebrew ? 'שגיאה' : 'Error');
    }
  };

  const isPending = acceptRequest.isPending || declineRequest.isPending;

  return (
    <Card className="bg-card border-border hover:border-primary/20 transition-colors">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-medium text-sm truncate">
                {profile?.full_name || (isHebrew ? 'משתמש' : 'User')}
              </span>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {getCircleLabel(connection.circle as ConnectionCircle, language)}
              </Badge>
            </div>

            {connection.message && (
              <p className="text-xs text-muted-foreground truncate">
                "{connection.message}"
              </p>
            )}

            {connection.source === 'vouch' && (
              <p className="text-xs text-pink-500">
                {isHebrew ? 'נתן/ה לך Vouch' : 'Vouched for you'}
              </p>
            )}

            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(connection.created_at), {
                addSuffix: true,
                locale: isHebrew ? he : undefined,
              })}
            </p>
          </div>

          <div className="flex gap-1.5 shrink-0">
            <Button
              variant="default"
              size="sm"
              className="h-8 px-3 gap-1"
              disabled={isPending}
              onClick={handleAccept}
            >
              <Check className="w-3.5 h-3.5" />
              {isHebrew ? 'אשר' : 'Accept'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground"
              disabled={isPending}
              onClick={handleDecline}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
