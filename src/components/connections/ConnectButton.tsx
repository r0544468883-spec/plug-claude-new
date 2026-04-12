import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConnections } from '@/hooks/useConnections';
import { UserPlus, UserCheck, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectButtonProps {
  targetUserId: string;
  circle?: 'colleague' | 'recruiter';
  size?: 'sm' | 'default';
  className?: string;
}

export function ConnectButton({
  targetUserId,
  circle = 'colleague',
  size = 'default',
  className,
}: ConnectButtonProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const { connectionStatus, findConnection, sendRequest, acceptRequest, removeConnection } = useConnections();
  const [isHovered, setIsHovered] = useState(false);

  if (!user || user.id === targetUserId) return null;

  const status = connectionStatus(targetUserId);
  const conn = findConnection(targetUserId);

  const handleConnect = async () => {
    try {
      await sendRequest.mutateAsync({ targetUserId, circle });
      toast.success(
        circle === 'recruiter'
          ? (isHebrew ? 'התחברת בהצלחה!' : 'Connected!')
          : (isHebrew ? 'בקשת חיבור נשלחה' : 'Connection request sent')
      );
    } catch {
      toast.error(isHebrew ? 'שגיאה בשליחת הבקשה' : 'Error sending request');
    }
  };

  const handleAccept = async () => {
    if (!conn) return;
    try {
      await acceptRequest.mutateAsync(conn.id);
      toast.success(isHebrew ? 'החיבור אושר!' : 'Connection accepted!');
    } catch {
      toast.error(isHebrew ? 'שגיאה באישור' : 'Error accepting');
    }
  };

  const handleRemove = async () => {
    if (!conn) return;
    try {
      await removeConnection.mutateAsync(conn.id);
      toast.success(isHebrew ? 'החיבור הוסר' : 'Connection removed');
    } catch {
      toast.error(isHebrew ? 'שגיאה בהסרה' : 'Error removing');
    }
  };

  const isPending = sendRequest.isPending || acceptRequest.isPending || removeConnection.isPending;

  if (status === 'connected') {
    return (
      <Button
        variant="outline"
        size={size}
        disabled={isPending}
        className={cn(
          'gap-1.5 border-green-500/30 text-green-600 hover:border-red-500/30 hover:text-red-500 transition-all',
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleRemove}
      >
        {isHovered ? (
          <>
            <X className="w-4 h-4" />
            {isHebrew ? 'נתק' : 'Disconnect'}
          </>
        ) : (
          <>
            <UserCheck className="w-4 h-4" />
            {isHebrew ? 'מחובר' : 'Connected'}
          </>
        )}
      </Button>
    );
  }

  if (status === 'pending_sent') {
    return (
      <Button
        variant="outline"
        size={size}
        disabled={isPending}
        className={cn('gap-1.5 text-muted-foreground', className)}
        onClick={handleRemove}
      >
        <Clock className="w-4 h-4" />
        {isHebrew ? 'ממתין' : 'Pending'}
      </Button>
    );
  }

  if (status === 'pending_received') {
    return (
      <Button
        variant="default"
        size={size}
        disabled={isPending}
        className={cn('gap-1.5', className)}
        onClick={handleAccept}
      >
        <UserPlus className="w-4 h-4" />
        {isHebrew ? 'אשר חיבור' : 'Accept'}
      </Button>
    );
  }

  // status === 'none'
  return (
    <Button
      variant="outline"
      size={size}
      disabled={isPending}
      className={cn('gap-1.5 hover:border-primary hover:text-primary transition-all', className)}
      onClick={handleConnect}
    >
      <UserPlus className="w-4 h-4" />
      {isHebrew ? 'התחבר' : 'Connect'}
    </Button>
  );
}
