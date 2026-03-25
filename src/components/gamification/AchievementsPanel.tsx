import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AchievementBadge } from './AchievementBadge';
import { Trophy } from 'lucide-react';

interface AchievementDef {
  key: string;
  icon: string;
  name_he: string;
  name_en: string;
  fuel: number;
}

const JOB_SEEKER_ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_apply', icon: '🚀', name_he: 'צעד ראשון', name_en: 'First Step', fuel: 10 },
  { key: 'perfect_cv', icon: '📄', name_he: 'קו"ח מושלם', name_en: 'Perfect CV', fuel: 20 },
  { key: 'interview_expert', icon: '🎤', name_he: 'מומחה ראיונות', name_en: 'Interview Expert', fuel: 15 },
  { key: 'networker', icon: '🌐', name_he: 'נטוורקר', name_en: 'Networker', fuel: 10 },
  { key: 'vouched', icon: '⭐', name_he: 'מבוקש', name_en: 'In Demand', fuel: 25 },
  { key: 'streak_7', icon: '🔥', name_he: 'מתמיד', name_en: 'Persistent', fuel: 30 },
  { key: 'apply_20', icon: '🏆', name_he: 'חותם עסקאות', name_en: 'Deal Maker', fuel: 20 },
];

const HR_ACHIEVEMENTS: AchievementDef[] = [
  { key: 'scout_10', icon: '🔍', name_he: 'סקאוט', name_en: 'Scout', fuel: 15 },
  { key: 'master_match', icon: '🎯', name_he: 'מאסטר Match', name_en: 'Master Match', fuel: 20 },
  { key: 'mission_3', icon: '🚀', name_he: 'קפטן Mission', name_en: 'Mission Captain', fuel: 15 },
  { key: 'crm_5', icon: '💼', name_he: 'מנהל לקוחות', name_en: 'Client Manager', fuel: 25 },
];

const COMPANY_ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_job', icon: '📝', name_he: 'מגייס ראשון', name_en: 'First Hire', fuel: 10 },
  { key: 'employer_brand', icon: '⭐', name_he: 'מותג מעסיק', name_en: 'Employer Brand', fuel: 20 },
  { key: 'fast_hire', icon: '⚡', name_he: 'גיוס מהיר', name_en: 'Fast Hire', fuel: 30 },
];

export function AchievementsPanel() {
  const { user, role } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const { data: unlockedKeys = [] } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('achievements')
        .select('achievement_key')
        .eq('user_id', user.id);
      return (data || []).map(a => a.achievement_key);
    },
    enabled: !!user?.id,
  });

  const defs = role === 'job_seeker'
    ? JOB_SEEKER_ACHIEVEMENTS
    : (role === 'freelance_hr' || role === 'inhouse_hr')
    ? HR_ACHIEVEMENTS
    : COMPANY_ACHIEVEMENTS;

  const unlockedCount = defs.filter(d => unlockedKeys.includes(d.key)).length;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          {isRTL ? 'הישגים' : 'Achievements'}
          <span className="text-sm text-muted-foreground font-normal ms-auto">
            {unlockedCount}/{defs.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 justify-center">
          {defs.map((def) => (
            <AchievementBadge
              key={def.key}
              icon={def.icon}
              name={isRTL ? def.name_he : def.name_en}
              unlocked={unlockedKeys.includes(def.key)}
              size="sm"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
