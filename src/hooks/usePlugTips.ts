import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface TipConfig {
  id: string;
  type: 'info' | 'encouragement' | 'action' | 'celebration';
  titleHe: string;
  titleEn: string;
  messageHe: string;
  messageEn: string;
  actionLabel?: { he: string; en: string };
  condition?: () => boolean;
  priority: number;
}

// Predefined contextual tips
const contextualTips: Record<string, TipConfig> = {
  // Profile completion tips
  incomplete_profile: {
    id: 'incomplete_profile',
    type: 'encouragement',
    titleHe: '🔌 Plug רוצה לעזור יותר!',
    titleEn: '🔌 Plug wants to help more!',
    messageHe: 'השלמת פרופיל מלא תעזור לי למצוא לך משרות מדויקות יותר. בוא נשלים את הפרטים ביחד!',
    messageEn: 'Completing your full profile will help me find more accurate jobs for you. Let\'s complete the details together!',
    actionLabel: { he: 'השלם פרופיל', en: 'Complete Profile' },
    priority: 10,
  },
  missing_cv: {
    id: 'missing_cv',
    type: 'action',
    titleHe: '📄 קורות חיים = יותר הזדמנויות',
    titleEn: '📄 Resume = More Opportunities',
    messageHe: 'העלאת קורות חיים תאפשר לי לנתח את הניסיון שלך ולהתאים משרות בדיוק בשבילך!',
    messageEn: 'Uploading your resume will let me analyze your experience and match jobs perfectly for you!',
    actionLabel: { he: 'העלה קו״ח', en: 'Upload Resume' },
    priority: 9,
  },
  missing_preferences: {
    id: 'missing_preferences',
    type: 'info',
    titleHe: '🎯 הגדר את המטרות שלך',
    titleEn: '🎯 Set Your Goals',
    messageHe: 'ספר לי איזה תחומים ותפקידים מעניינים אותך, ואני אמצא משרות מותאמות אישית!',
    messageEn: 'Tell me which fields and roles interest you, and I\'ll find personalized job matches!',
    actionLabel: { he: 'הגדר העדפות', en: 'Set Preferences' },
    priority: 8,
  },
  
  // Activity-based tips
  job_search_tip: {
    id: 'job_search_tip',
    type: 'info',
    titleHe: '💡 טיפ לחיפוש יעיל',
    titleEn: '💡 Efficient Search Tip',
    messageHe: 'השתמש בפילטרים כדי למקד את החיפוש - תחום, תפקיד ורמת ניסיון יעזרו למצוא את המשרה המושלמת!',
    messageEn: 'Use filters to focus your search - field, role, and experience level will help find the perfect job!',
    priority: 5,
  },
  first_application: {
    id: 'first_application',
    type: 'celebration',
    titleHe: '🎉 כל הכבוד על ההגשה הראשונה!',
    titleEn: '🎉 Congrats on your first application!',
    messageHe: 'אני גאה בך! המשך להגיש מועמדויות - סטטיסטית, כל הגשה מקרבת אותך להצלחה.',
    messageEn: 'I\'m proud of you! Keep applying - statistically, every application brings you closer to success.',
    priority: 10,
  },
  cv_uploaded: {
    id: 'cv_uploaded',
    type: 'celebration',
    titleHe: '✨ קורות החיים נטענו בהצלחה!',
    titleEn: '✨ Resume uploaded successfully!',
    messageHe: 'עכשיו אני יכול לנתח את הניסיון שלך ולמצוא התאמות מדויקות יותר. בוא נחפש משרות!',
    messageEn: 'Now I can analyze your experience and find more accurate matches. Let\'s search for jobs!',
    actionLabel: { he: 'חפש משרות', en: 'Search Jobs' },
    priority: 10,
  },
  
  // Encouragement tips
  keep_going: {
    id: 'keep_going',
    type: 'encouragement',
    titleHe: '💪 אל תוותר!',
    titleEn: '💪 Don\'t give up!',
    messageHe: 'חיפוש עבודה זה מרתון, לא ספרינט. אני כאן לתמוך בך בכל צעד!',
    messageEn: 'Job hunting is a marathon, not a sprint. I\'m here to support you every step!',
    priority: 3,
  },
  save_jobs_tip: {
    id: 'save_jobs_tip',
    type: 'info',
    titleHe: '⭐ שמור משרות מעניינות',
    titleEn: '⭐ Save interesting jobs',
    messageHe: 'ראית משרה שמעניינת אותך? שמור אותה ללחצן הלב ותחזור אליה מאוחר יותר!',
    messageEn: 'Found an interesting job? Save it with the heart button and come back to it later!',
    priority: 4,
  },
};

export function usePlugTips() {
  const { user } = useAuth();
  const [activeTips, setActiveTips] = useState<TipConfig[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [hasCV, setHasCV] = useState(false);
  const [hasApplications, setHasApplications] = useState(false);

  // Fetch user data for determining which tips to show
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      // Fetch profile (use profiles_secure for consistent security)
      const { data: profile } = await supabase
        .from('profiles_secure')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setProfileData(profile);

      // Check for CV
      const { data: documents } = await supabase
        .from('documents')
        .select('id')
        .eq('owner_id', user.id)
        .eq('doc_type', 'cv')
        .limit(1);
      
      setHasCV((documents?.length || 0) > 0);

      // Check for applications
      const { data: applications } = await supabase
        .from('applications')
        .select('id')
        .eq('candidate_id', user.id)
        .limit(1);
      
      setHasApplications((applications?.length || 0) > 0);
    };

    fetchUserData();
  }, [user]);

  // Get contextual tips based on current state
  const getContextualTips = useCallback((context: string): TipConfig[] => {
    const tips: TipConfig[] = [];
    const dismissedTips = JSON.parse(localStorage.getItem('dismissedPlugTips') || '[]');

    // Profile completion tips
    if (profileData && context === 'dashboard') {
      if (!profileData.phone || !profileData.bio) {
        if (!dismissedTips.includes('incomplete_profile')) {
          tips.push(contextualTips.incomplete_profile);
        }
      }
      if (!hasCV && !dismissedTips.includes('missing_cv')) {
        tips.push(contextualTips.missing_cv);
      }
      if ((!profileData.preferred_fields || profileData.preferred_fields.length === 0) && 
          !dismissedTips.includes('missing_preferences')) {
        tips.push(contextualTips.missing_preferences);
      }
    }

    // Job search tips
    if (context === 'job_search' && !dismissedTips.includes('job_search_tip')) {
      tips.push(contextualTips.job_search_tip);
    }

    // Save jobs tip
    if (context === 'job_card' && !dismissedTips.includes('save_jobs_tip')) {
      tips.push(contextualTips.save_jobs_tip);
    }

    // Sort by priority and return top tips
    return tips.sort((a, b) => b.priority - a.priority).slice(0, 2);
  }, [profileData, hasCV]);

  // Trigger a specific tip
  const triggerTip = useCallback((tipId: string): TipConfig | null => {
    const dismissedTips = JSON.parse(localStorage.getItem('dismissedPlugTips') || '[]');
    if (dismissedTips.includes(tipId)) return null;
    
    const tip = contextualTips[tipId];
    if (tip) {
      setActiveTips(prev => {
        if (prev.find(t => t.id === tipId)) return prev;
        return [...prev, tip];
      });
      return tip;
    }
    return null;
  }, []);

  // Dismiss a tip
  const dismissTip = useCallback((tipId: string) => {
    setActiveTips(prev => prev.filter(t => t.id !== tipId));
  }, []);

  // Clear a tip from dismissed list (for resetting)
  const resetTip = useCallback((tipId: string) => {
    const dismissed = JSON.parse(localStorage.getItem('dismissedPlugTips') || '[]');
    const updated = dismissed.filter((id: string) => id !== tipId);
    localStorage.setItem('dismissedPlugTips', JSON.stringify(updated));
  }, []);

  // Reset all tips
  const resetAllTips = useCallback(() => {
    localStorage.removeItem('dismissedPlugTips');
    setActiveTips([]);
  }, []);

  return {
    activeTips,
    getContextualTips,
    triggerTip,
    dismissTip,
    resetTip,
    resetAllTips,
    profileData,
    hasCV,
    hasApplications,
  };
}

export default usePlugTips;
