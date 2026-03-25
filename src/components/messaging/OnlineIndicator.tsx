import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface OnlineIndicatorProps {
  lastSeenAt: string | null | undefined;
  size?: 'sm' | 'md';
  showText?: boolean;
  className?: string;
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function isUserOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

export function getTimeSinceActive(lastSeenAt: string | null | undefined, isHebrew: boolean): string {
  if (!lastSeenAt) return isHebrew ? 'לא מחובר/ת' : 'Offline';

  const diff = Date.now() - new Date(lastSeenAt).getTime();
  if (diff < ONLINE_THRESHOLD_MS) return isHebrew ? 'מחובר/ת' : 'Online';

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return isHebrew ? `פעיל/ה לפני ${minutes} דק׳` : `Active ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isHebrew ? `פעיל/ה לפני ${hours} שע׳` : `Active ${hours}h ago`;

  return isHebrew ? 'לא מחובר/ת' : 'Offline';
}

export function OnlineIndicator({ lastSeenAt, size = 'sm', showText, className }: OnlineIndicatorProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const online = isUserOnline(lastSeenAt);
  const dotSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className={cn(
        'rounded-full border-2 border-card shrink-0',
        dotSize,
        online ? 'bg-green-500' : 'bg-muted-foreground/30'
      )} />
      {showText && (
        <span className="text-[11px] text-muted-foreground">
          {getTimeSinceActive(lastSeenAt, isHebrew)}
        </span>
      )}
    </div>
  );
}
