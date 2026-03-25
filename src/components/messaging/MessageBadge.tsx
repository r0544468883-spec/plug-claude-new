import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBadgeProps {
  onClick?: () => void;
  className?: string;
}

export function MessageBadge({ onClick, className }: MessageBadgeProps) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('to_user_id', user.id)
        .eq('is_read', false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    };

    fetchUnreadCount();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('messages-badge')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `to_user_id=eq.${user.id}`,
        },
        (payload) => {
          // New message received
          if (!payload.new.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `to_user_id=eq.${user.id}`,
        },
        (payload) => {
          // Message read status changed
          if (payload.new.is_read && !payload.old?.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors",
        className
      )}
    >
      <MessageSquare className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge 
          className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 text-xs bg-primary text-primary-foreground"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </button>
  );
}
