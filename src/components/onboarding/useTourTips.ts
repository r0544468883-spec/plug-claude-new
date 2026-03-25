import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardSection } from '@/components/dashboard/DashboardLayout';

interface TourTipsData {
  hasResume: boolean;
  resumeAnalyzed: boolean;
  applicationsCount: number;
  activeApplicationsCount: number;
  upcomingInterviewsCount: number;
  vouchesCount: number;
  rejectedCount: number;
}

interface TipContent {
  he: string;
  en: string;
}

const TRANSITION_TIPS: Record<string, TipContent[]> = {
  'overview->job-search': [
    {
      he: '💡 הידעת? אפשר להפעיל GPS כדי למצוא משרות קרובות אליך!',
      en: '💡 Did you know? You can enable GPS to find jobs near you!',
    },
    {
      he: '🔍 השתמש בפילטרים כדי למצוא את המשרה המושלמת',
      en: '🔍 Use filters to find the perfect job',
    },
  ],
  'job-search->applications': [
    {
      he: '📋 טיפ: הדבק לינק מכל אתר משרות ו-AI יעשה את השאר!',
      en: '📋 Tip: Paste a link from any job site and AI will do the rest!',
    },
    {
      he: '⚡ אפשר לעקוב אחרי כל המועמדויות במקום אחד',
      en: '⚡ Track all your applications in one place',
    },
  ],
  'applications->documents': [
    {
      he: '🧠 קו"ח מנותח = התאמה טובה יותר למשרות',
      en: '🧠 Analyzed resume = better job matches',
    },
    {
      he: '📄 AI ינתח את הכישורים שלך ויציע תפקידים מתאימים',
      en: '📄 AI will analyze your skills and suggest matching roles',
    },
  ],
  'documents->messages': [
    {
      he: '💬 מגייסים יכולים לשלוח לך הודעות ישירות!',
      en: '💬 Recruiters can send you messages directly!',
    },
    {
      he: '📩 כל התקשורת המקצועית שלך במקום אחד',
      en: '📩 All your professional communication in one place',
    },
  ],
  'messages->overview': [
    {
      he: '❤️ כמעט סיימנו! בוא נראה לך את מערכת ההמלצות',
      en: '❤️ Almost done! Let\'s show you the recommendation system',
    },
  ],
};

export function useTourTips() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  // Fetch user data for personalized tips
  const { data: tipsData } = useQuery({
    queryKey: ['tour-tips-data', user?.id],
    queryFn: async (): Promise<TourTipsData> => {
      if (!user?.id) {
        return {
          hasResume: false,
          resumeAnalyzed: false,
          applicationsCount: 0,
          activeApplicationsCount: 0,
          upcomingInterviewsCount: 0,
          vouchesCount: 0,
          rejectedCount: 0,
        };
      }

      // Fetch documents (resume)
      const { data: docs } = await supabase
        .from('documents')
        .select('ai_summary, doc_type')
        .eq('owner_id', user.id)
        .eq('doc_type', 'resume');

      // Fetch applications
      const { data: applications } = await supabase
        .from('applications')
        .select('status')
        .eq('candidate_id', user.id);

      // Fetch upcoming interviews
      const { data: interviews } = await supabase
        .from('interview_reminders')
        .select('id')
        .gte('interview_date', new Date().toISOString());

      // Fetch vouches
      const { data: vouches } = await supabase
        .from('vouches')
        .select('id')
        .eq('to_user_id', user.id);

      const hasResume = (docs?.length ?? 0) > 0;
      const resumeAnalyzed = docs?.some(d => d.ai_summary) ?? false;
      const applicationsCount = applications?.length ?? 0;
      const activeApplicationsCount = applications?.filter(a => 
        a.status && !['rejected', 'withdrawn'].includes(a.status)
      ).length ?? 0;
      const rejectedCount = applications?.filter(a => a.status === 'rejected').length ?? 0;

      return {
        hasResume,
        resumeAnalyzed,
        applicationsCount,
        activeApplicationsCount,
        upcomingInterviewsCount: interviews?.length ?? 0,
        vouchesCount: vouches?.length ?? 0,
        rejectedCount,
      };
    },
    enabled: !!user?.id,
    staleTime: 60000, // Cache for 1 minute
  });

  const getPersonalizedTip = (fromSection: DashboardSection, toSection: DashboardSection): string => {
    const data = tipsData;
    const key = `${fromSection}->${toSection}`;

    // Personalized tips based on user data
    if (data) {
      // Resume-related tips
      if (toSection === 'profile-docs') {
        if (!data.hasResume) {
          return isHebrew 
            ? '📄 טיפ: העלה קו"ח כדי ש-AI יתאים לך משרות אוטומטית!'
            : '📄 Tip: Upload your resume so AI can match you with jobs automatically!';
        }
        if (data.hasResume && !data.resumeAnalyzed) {
          return isHebrew
            ? '🔄 הקו"ח שלך מחכה לניתוח - זה יעזור למצוא התאמות טובות יותר'
            : '🔄 Your resume is waiting to be analyzed - this will help find better matches';
        }
      }
      // Applications tips
      if (toSection === 'applications' && data.applicationsCount > 0) {
        return isHebrew
          ? `📊 יש לך ${data.activeApplicationsCount} מועמדויות פעילות - המשך כך!`
          : `📊 You have ${data.activeApplicationsCount} active applications - keep it up!`;
      }

      // Interview tips
      if (data.upcomingInterviewsCount > 0) {
        return isHebrew
          ? `📅 יש לך ${data.upcomingInterviewsCount} ראיונות בקרוב! רוצה שאעזור לך להתכונן?`
          : `📅 You have ${data.upcomingInterviewsCount} upcoming interviews! Want help preparing?`;
      }

      // Vouch tips
      if (toSection === 'overview' && data.vouchesCount === 0) {
        return isHebrew
          ? '❤️ בקש המלצות מעמיתים - זה מחזק את הפרופיל שלך!'
          : '❤️ Ask for recommendations from colleagues - it strengthens your profile!';
      }

      // Encouragement after rejections
      if (data.rejectedCount > 2) {
        return isHebrew
          ? '💪 לא נורא! כל דחייה מקרבת אותך לעבודה הנכונה'
          : '💪 Don\'t worry! Every rejection brings you closer to the right job';
      }
    }

    // Fallback to generic tips
    const tips = TRANSITION_TIPS[key];
    if (tips && tips.length > 0) {
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      return isHebrew ? randomTip.he : randomTip.en;
    }

    // Default tip
    return isHebrew 
      ? '✨ בוא נמשיך לגלות את הפלטפורמה!'
      : '✨ Let\'s continue exploring the platform!';
  };

  return { getPersonalizedTip, tipsData };
}
