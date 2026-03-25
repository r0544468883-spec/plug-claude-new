import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { Bell, Calendar, Briefcase, Heart, CheckCircle, AlertCircle, Newspaper, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string | null;
    is_read: boolean | null;
    created_at: string;
    metadata?: unknown;
  };
  onClick: (id: string) => void;
}

const notificationIcons: Record<string, typeof Bell> = {
  interview_reminder: Calendar,
  application_update: Briefcase,
  new_vouch: Heart,
  success: CheckCircle,
  alert: AlertCircle,
  new_content: Newspaper,
  webinar_reminder: Video,
};

const notificationColors: Record<string, string> = {
  new_content: 'bg-purple-500/10 text-purple-500',
  webinar_reminder: 'bg-emerald-400/10 text-emerald-400',
};

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  
  const Icon = notificationIcons[notification.type] || Bell;
  
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: isHebrew ? he : enUS,
  });

  return (
    <button
      onClick={() => onClick(notification.id)}
      className={cn(
        "w-full text-start p-3 rounded-lg transition-colors hover:bg-accent/10",
        !notification.is_read && "bg-primary/5 border-s-2 border-primary"
      )}
    >
      <div className="flex gap-3">
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          notificationColors[notification.type] || (notification.is_read ? "bg-muted" : "bg-primary/10")
        )}>
          <Icon className={cn(
            "w-4 h-4",
            notificationColors[notification.type] ? '' : (notification.is_read ? "text-muted-foreground" : "text-primary")
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm truncate",
            !notification.is_read && "font-medium"
          )}>
            {notification.title}
          </p>
          {notification.message && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {notification.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {timeAgo}
          </p>
        </div>
        {!notification.is_read && (
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
        )}
      </div>
    </button>
  );
}
