import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Heart, HandHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Subscribes to realtime vouches + vouch_requests tables.
 * Shows toasts for: new vouches received, vouch requests received.
 */
export function VouchNotifications() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const langRef = useRef(isHebrew);
  langRef.current = isHebrew;

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('vouch-notifications')
      // --- New vouch received ---
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
      // --- Vouch request received (internal) ---
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vouch_requests',
          filter: `to_user_id=eq.${user.id}`,
        },
        async (payload) => {
          const req = payload.new as any;
          if (!req?.from_user_id) return;

          const { data: fromProfile } = await supabase
            .from('profiles_secure')
            .select('full_name, avatar_url')
            .eq('user_id', req.from_user_id)
            .maybeSingle();

          const name = fromProfile?.full_name || (langRef.current ? 'מישהו' : 'Someone');
          const he = langRef.current;

          toast(
            he ? `${name} מבקש/ת ממך המלצה` : `${name} requested a vouch from you`,
            {
              duration: 12000,
              icon: <HandHeart className="w-5 h-5 text-primary" />,
              description: req.message
                ? req.message.length > 80
                  ? req.message.slice(0, 80) + '…'
                  : req.message
                : undefined,
              action: {
                label: he ? 'כתוב המלצה' : 'Write Vouch',
                onClick: () => {
                  window.dispatchEvent(
                    new CustomEvent('open-give-vouch', {
                      detail: {
                        userId: req.from_user_id,
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
