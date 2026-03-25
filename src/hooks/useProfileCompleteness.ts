import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProfileCompleteness {
  percentage: number;
  missing: string[];
  isComplete: boolean;
}

export function useProfileCompleteness(): ProfileCompleteness {
  const { user } = useAuth();
  const [result, setResult] = useState<ProfileCompleteness>({ percentage: 0, missing: [], isComplete: false });

  useEffect(() => {
    if (!user) return;
    const compute = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, bio, experience_years, avatar_url, phone, cv_data, portfolio_url')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const missing: string[] = [];
      let pct = 0;

      if (profile.full_name?.trim()) pct += 15; else missing.push('שם מלא');

      const cvData = profile.cv_data as any;
      const hasBio = profile.bio?.trim() || cvData?.personalInfo?.title?.trim();
      if (hasBio) pct += 15; else missing.push('כותרת מקצועית');

      const experience = cvData?.experience || [];
      if (experience.length >= 1) pct += 20; else missing.push('ניסיון עבודה');

      const education = cvData?.education || [];
      if (education.length >= 1) pct += 10; else missing.push('השכלה');

      const skills = cvData?.skills || [];
      if (skills.length >= 3) pct += 15; else missing.push('לפחות 3 מיומנויות');

      // Resume: check if any document uploaded (simplification via portfolio)
      if (profile.portfolio_url?.trim()) pct += 15; else missing.push('קורות חיים');

      if (profile.avatar_url?.trim()) pct += 5; else missing.push('תמונת פרופיל');
      if (profile.phone?.trim()) pct += 5; else missing.push('מספר טלפון');

      setResult({ percentage: pct, missing, isComplete: pct >= 70 });
    };
    compute();
  }, [user]);

  return result;
}
