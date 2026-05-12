import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell, BellOff, Check, CheckCheck, GraduationCap, Calendar,
  MessageSquare, Award, HelpCircle, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface NotificationsPanelProps {
  hubId?: string;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  course_new: GraduationCap,
  course_enrolled: GraduationCap,
  event_upcoming: Calendar,
  event_reminder: Calendar,
  qa_answer: HelpCircle,
  qa_accepted: HelpCircle,
  badge_earned: Award,
  message_mention: MessageSquare,
};

const TYPE_COLORS: Record<string, string> = {
  course_new: 'text-blue-500',
  course_enrolled: 'text-green-500',
  event_upcoming: 'text-orange-500',
  event_reminder: 'text-red-500',
  qa_answer: 'text-purple-500',
  qa_accepted: 'text-green-500',
  badge_earned: 'text-amber-500',
  message_mention: 'text-primary',
};

export function NotificationsPanel({ hubId }: NotificationsPanelProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['community-notifications', user?.id, hubId],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = (supabase as any)
        .from('community_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (hubId) query = query.eq('hub_id', hubId);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 30_000,
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any)
        .from('community_notifications')
        .update({ is_read: true })
        .eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-notifications'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      let query = (supabase as any)
        .from('community_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (hubId) query = query.eq('hub_id', hubId);
      await query;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-notifications'] });
    },
  });

  const displayed = showAll ? notifications : notifications.slice(0, 8);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Bell className="w-4 h-4" />
            {isRTL ? 'התראות' : 'Notifications'}
            {unreadCount > 0 && (
              <Badge className="text-[10px] px-1.5 py-0 bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 h-7"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {isRTL ? 'סמן הכל כנקרא' : 'Mark all read'}
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-6">
            <BellOff className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'אין התראות' : 'No notifications'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {displayed.map((notif: any) => {
                const Icon = TYPE_ICONS[notif.type] || Bell;
                const color = TYPE_COLORS[notif.type] || 'text-muted-foreground';

                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'flex items-start gap-2.5 p-2 rounded-lg transition-colors cursor-pointer',
                      notif.is_read ? 'opacity-60' : 'bg-primary/5 hover:bg-primary/10'
                    )}
                    onClick={() => { if (!notif.is_read) markRead.mutate(notif.id); }}
                  >
                    <div className={cn('mt-0.5 shrink-0', color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', !notif.is_read && 'font-medium')}>
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {notif.body}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(notif.created_at), {
                          addSuffix: true,
                          locale: isRTL ? he : enUS,
                        })}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })}
            </div>

            {notifications.length > 8 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll
                  ? (isRTL ? 'הצג פחות' : 'Show less')
                  : (isRTL ? `הצג הכל (${notifications.length})` : `Show all (${notifications.length})`)}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
