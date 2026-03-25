import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

export function SmartTriggers() {
  const { user, role } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const triggered = useRef(false);

  useEffect(() => {
    if (!user || triggered.current) return;
    triggered.current = true;

    const checkTriggers = async () => {
      try {
        if (role === 'job_seeker') {
          // Check CV freshness
          const { data: profile } = await supabase
            .from('profiles')
            .select('updated_at, cv_data')
            .eq('user_id', user.id)
            .single();

          if (profile) {
            const cvData = profile.cv_data as any;
            const hasCV = cvData && Object.keys(cvData).length > 0;
            if (hasCV) {
              const lastUpdate = new Date(profile.updated_at);
              const daysSince = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
              if (daysSince >= 14) {
                setTimeout(() => {
                  toast.info(
                    isRTL
                      ? 'קו"ח שלך לא עודכנו שבועיים. מעסיקים מעדיפים עדכני'
                      : "Your CV hasn't been updated in 2 weeks. Employers prefer fresh CVs",
                    { duration: 8000 }
                  );
                }, 3000);
              }
            }
          }

          // Check application count milestones
          const { count } = await supabase
            .from('applications')
            .select('id', { count: 'exact', head: true })
            .eq('candidate_id', user.id);

          if (count === 5) {
            setTimeout(() => {
              toast.success(
                isRTL
                  ? 'מדהים! 5 הגשות. נסה לעדכן קו"ח לאחוזי התאמה גבוהים יותר'
                  : 'Amazing! 5 applications. Try updating your CV for higher match rates',
                { duration: 8000 }
              );
            }, 5000);
          }
        }

        if (role === 'freelance_hr' || role === 'inhouse_hr') {
          // Check for clients not updated
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { data: staleClients } = await supabase
            .from('companies')
            .select('name')
            .eq('created_by', user.id)
            .lt('updated_at', weekAgo)
            .limit(1);

          if (staleClients && staleClients.length > 0) {
            setTimeout(() => {
              toast.info(
                isRTL
                  ? `הלקוח ${staleClients[0].name} לא עודכן שבוע`
                  : `Client ${staleClients[0].name} hasn't been updated in a week`,
                { duration: 8000 }
              );
            }, 4000);
          }
        }
      } catch (err) {
        console.error('SmartTriggers error:', err);
      }
    };

    checkTriggers();
  }, [user, role, isRTL]);

  return null;
}
