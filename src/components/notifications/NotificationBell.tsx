import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationItem } from './NotificationItem';
import { Bell, CheckCheck, AlertCircle, Briefcase, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  icon: 'cv' | 'applications' | 'client';
  created_at: string;
  is_read: boolean;
}

const SMART_SEEN_KEY = 'smart_notifications_seen';

function getSeenIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SMART_SEEN_KEY) || '[]');
  } catch { return []; }
}

function markSeen(id: string) {
  const seen = getSeenIds();
  if (!seen.includes(id)) {
    seen.push(id);
    localStorage.setItem(SMART_SEEN_KEY, JSON.stringify(seen));
  }
}

export function NotificationBell() {
  const { user, role } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [smartNotifs, setSmartNotifs] = useState<SmartNotification[]>([]);

  // Fetch DB notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Generate smart trigger notifications (run once)
  useEffect(() => {
    if (!user) return;

    const generate = async () => {
      const results: SmartNotification[] = [];
      const seenIds = getSeenIds();

      if (role === 'job_seeker') {
        // CV freshness check
        const { data: profile } = await supabase
          .from('profiles')
          .select('updated_at, cv_data')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          const cvData = profile.cv_data as any;
          const hasCV = cvData && Object.keys(cvData).length > 0;
          if (hasCV) {
            const daysSince = Math.floor((Date.now() - new Date(profile.updated_at).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSince >= 14) {
              const id = `cv_stale_${Math.floor(Date.now() / (1000 * 60 * 60 * 24))}`;
              if (!seenIds.includes(id)) {
                results.push({
                  id,
                  title: isHebrew ? 'עדכן קורות חיים' : 'Update your CV',
                  message: isHebrew
                    ? 'קו"ח שלך לא עודכנו שבועיים. מעסיקים מעדיפים עדכני'
                    : "Your CV hasn't been updated in 2 weeks. Employers prefer fresh CVs",
                  type: 'warning',
                  icon: 'cv',
                  created_at: new Date().toISOString(),
                  is_read: false,
                });
              }
            }
          }
        }

        // Application milestone
        const { count } = await supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('candidate_id', user.id);

        if (count === 5) {
          const id = 'app_milestone_5';
          if (!seenIds.includes(id)) {
            results.push({
              id,
              title: isHebrew ? 'אבן דרך!' : 'Milestone!',
              message: isHebrew
                ? 'מדהים! 5 הגשות. נסה לעדכן קו"ח לאחוזי התאמה גבוהים יותר'
                : 'Amazing! 5 applications. Try updating your CV for higher match rates',
              type: 'success',
              icon: 'applications',
              created_at: new Date().toISOString(),
              is_read: false,
            });
          }
        }
      }

      if (role === 'freelance_hr' || role === 'inhouse_hr') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: staleClients } = await supabase
          .from('companies')
          .select('name')
          .eq('created_by', user.id)
          .lt('updated_at', weekAgo)
          .limit(1);

        if (staleClients && staleClients.length > 0) {
          const id = `client_stale_${staleClients[0].name}_${Math.floor(Date.now() / (1000 * 60 * 60 * 24))}`;
          if (!seenIds.includes(id)) {
            results.push({
              id,
              title: isHebrew ? 'לקוח לא עודכן' : 'Client needs update',
              message: isHebrew
                ? `הלקוח ${staleClients[0].name} לא עודכן שבוע`
                : `Client ${staleClients[0].name} hasn't been updated in a week`,
              type: 'info',
              icon: 'client',
              created_at: new Date().toISOString(),
              is_read: false,
            });
          }
        }
      }

      setSmartNotifs(results);
    };

    generate().catch(console.error);
  }, [user, role, isHebrew]);

  const unreadCount = notifications.filter(n => !n.is_read).length + smartNotifs.length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      // Also dismiss all smart notifications
      smartNotifs.forEach(n => markSeen(n.id));
      setSmartNotifs([]);
    },
  });

  const handleNotificationClick = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleSmartNotifDismiss = (id: string) => {
    markSeen(id);
    setSmartNotifs(prev => prev.filter(n => n.id !== id));
  };

  const getSmartIcon = (icon: string) => {
    switch (icon) {
      case 'cv': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'applications': return <Briefcase className="w-4 h-4 text-accent" />;
      case 'client': return <Building2 className="w-4 h-4 text-primary" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center px-1 font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        className="w-80 p-0"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold">
            {isHebrew ? 'התראות' : 'Notifications'}
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {isHebrew ? 'סמן הכל כנקרא' : 'Mark all read'}
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {/* Smart trigger notifications */}
          {smartNotifs.length > 0 && (
            <div className="p-2 space-y-1 border-b border-border">
              {smartNotifs.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleSmartNotifDismiss(notif.id)}
                  className="w-full flex items-start gap-3 p-2.5 rounded-lg bg-accent/5 hover:bg-accent/10 transition-colors text-start"
                >
                  <div className="mt-0.5 shrink-0">
                    {getSmartIcon(notif.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* DB notifications */}
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {isHebrew ? 'טוען...' : 'Loading...'}
            </div>
          ) : notifications.length === 0 && smartNotifs.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {isHebrew ? 'אין התראות חדשות' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={handleNotificationClick}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
