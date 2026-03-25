import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Updates the current user's last_seen_at timestamp every 60 seconds.
 * A user is considered "online" if last_seen_at is within 5 minutes.
 */
export function usePresenceTracker() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const update = () => {
      supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() } as any)
        .eq('user_id', user.id)
        .then(() => {});
    };

    update();
    const interval = setInterval(update, 60_000);

    return () => clearInterval(interval);
  }, [user?.id]);
}
