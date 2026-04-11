import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Subscribes to realtime vouches table.
 * When the current user receives a new vouch, shows a toast with
 * an option to return the vouch (reciprocal flow).
 */
export function VouchNotifications() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  // Keep latest language in ref so the realtime callback always reads the current value
  const langRef = useRef(isHebrew);
  langRef.current = isHebrew;

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('vouch-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vouches',
          filter: `to_user_id=eq.${user.id}`,
        },
        async (payload) => {
          const vouch = payload.new as any;
          if (!vouch) return;

          // Fetch the voucher's name
          const { data: fromProfile } = await supabase
            .from('profiles_secure')
            .select('full_name, avatar_url')
            .eq('user_id', vouch.from_user_id)
            .maybeSingle();

          const name = fromProfile?.full_name || (langRef.current ? 'מישהו' : 'Someone');
          const he = langRef.current;

          toast(
            he ? `${name} נתן/ה לך Vouch!` : `${name} vouched for you!`,
            {
              duration: 10000,
              icon: <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />,
              description: vouch.message
                ? vouch.message.length > 80
                  ? vouch.message.slice(0, 80) + '…'
                  : vouch.message
                : undefined,
              action: {
                label: he ? 'החזר Vouch' : 'Vouch Back',
                onClick: () => {
                  // Navigate to give-vouch with pre-selected user
                  window.dispatchEvent(
                    new CustomEvent('open-give-vouch', {
                      detail: {
                        userId: vouch.from_user_id,
                        userName: name,
                        avatarUrl: fromProfile?.avatar_url,
                      },
                    })
                  );
                },
              },
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return null;
}
