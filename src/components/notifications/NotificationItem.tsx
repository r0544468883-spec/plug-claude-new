import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { Bell, Calendar, Briefcase, Heart, CheckCircle, AlertCircle, Newspaper, Video, Mail, ExternalLink, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationMetadata {
  application_id?: string;
  email_id?: string;
  gmail_link?: string | null;
  classification?: string;
  confidence?: number;
  previous_stage?: string;
  new_stage?: string;
  company_name?: string;
  job_title?: string;
}

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string | null;
    is_read: boolean | null;
    created_at: string;
    metadata?: NotificationMetadata | unknown;
  };
  onClick: (id: string) => void;
  onRevert?: (applicationId: string, previousStage: string, emailId?: string) => void;
}

const notificationIcons: Record<string, typeof Bell> = {
  interview_reminder: Calendar,
  application_update: Briefcase,
  rejection_detected: Mail,
  new_vouch: Heart,
  success: CheckCircle,
  alert: AlertCircle,
  new_content: Newspaper,
  webinar_reminder: Video,
};

const notificationColors: Record<string, string> = {
  rejection_detected: 'bg-amber-500/10 text-amber-600',
  new_content: 'bg-purple-500/10 text-purple-500',
  webinar_reminder: 'bg-emerald-400/10 text-emerald-400',
};

export function NotificationItem({ notification, onClick, onRevert }: NotificationItemProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const Icon = notificationIcons[notification.type] || Bell;
  const metadata = notification.metadata as NotificationMetadata | undefined;
  const isRejection = notification.type === 'rejection_detected';

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: isHebrew ? he : enUS,
  });

  return (
    <button
      onClick={() => onClick(notification.id)}
      className={cn(
        "w-full text-start p-3 rounded-lg transition-colors hover:bg-accent/10",
        !notification.is_read && "bg-primary/5 border-s-2 border-primary",
        isRejection && !notification.is_read && "bg-amber-500/5 border-s-2 border-amber-500"
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

          {/* Rejection-specific actions */}
          {isRejection && metadata && (
            <div className="flex items-center gap-2 mt-1.5">
              {metadata.gmail_link && (
                <a
                  href={metadata.gmail_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {isHebrew ? 'צפה במייל' : 'View email'}
                </a>
              )}
              {onRevert && metadata.previous_stage && metadata.application_id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRevert(metadata.application_id!, metadata.previous_stage!, metadata.email_id);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Undo2 className="w-3 h-3" />
                  {isHebrew ? 'לא דחייה? בטל' : 'Not a rejection? Undo'}
                </button>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-1">
            {timeAgo}
          </p>
        </div>
        {!notification.is_read && (
          <div className={cn(
            "flex-shrink-0 w-2 h-2 rounded-full mt-1.5",
            isRejection ? "bg-amber-500" : "bg-primary"
          )} />
        )}
      </div>
    </button>
  );
}
