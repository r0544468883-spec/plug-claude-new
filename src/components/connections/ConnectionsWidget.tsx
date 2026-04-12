import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConnections } from '@/hooks/useConnections';
import { Users, ArrowRight, User } from 'lucide-react';

export function ConnectionsWidget() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isHebrew = language === 'he';
  const { connectionCount, pendingCount, connections } = useConnections();

  // Show up to 5 recent connection avatars
  const recentAvatars = connections
    .slice(0, 5)
    .map((c: any) => c.profile)
    .filter(Boolean);

  return (
    <Card className="bg-card border-border plug-card-hover" data-tour="connections-widget">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <span className="font-medium text-sm">
              {isHebrew ? 'הרשת שלי' : 'My Network'}
            </span>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {pendingCount}
              </Badge>
            )}
          </div>
          <button
            onClick={() => navigate('/network')}
            className="text-2xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            {connectionCount}
          </button>
        </div>

        {/* Recent connection avatars */}
        {recentAvatars.length > 0 && (
          <div className="flex -space-x-2 rtl:space-x-reverse mb-3">
            {recentAvatars.map((p: any, i: number) => (
              <Avatar key={i} className="h-7 w-7 border-2 border-background">
                <AvatarImage src={p.avatar_url || ''} />
                <AvatarFallback className="text-[10px] bg-muted">
                  {p.full_name?.[0]?.toUpperCase() || <User className="h-3 w-3" />}
                </AvatarFallback>
              </Avatar>
            ))}
            {connectionCount > 5 && (
              <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                <span className="text-[9px] text-muted-foreground font-medium">
                  +{connectionCount - 5}
                </span>
              </div>
            )}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => navigate('/network')}
        >
          <Users className="w-3.5 h-3.5" />
          {isHebrew ? 'צפה ברשת' : 'View Network'}
          <ArrowRight className="w-3 h-3 rtl:rotate-180" />
        </Button>
      </CardContent>
    </Card>
  );
}
