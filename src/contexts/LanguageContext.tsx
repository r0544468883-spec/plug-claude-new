import React, { createContext, useContext, useState, useEffect, useLayoutEffect, ReactNode } from 'react';
import { DirectionProvider } from '@radix-ui/react-direction';

type Language = 'en' | 'he';
type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // General
    'app.name': 'PLUG',
    'app.tagline': 'The AI-Driven HR Operating System',
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.continue': 'Continue',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.submit': 'Submit',
    'common.or': 'or',
    
    // Identity Selection
    'identity.title': 'How do you want to use PLUG?',
    'identity.subtitle': 'Choose your role to get a personalized experience',
    'identity.job_seeker': 'Job Seeker',
    'identity.job_seeker_desc': 'Find your dream job with AI-powered matching and interview prep',
    'identity.freelance_hr': 'Freelance HR',
    'identity.freelance_hr_desc': 'Manage multiple clients and candidates with smart automation',
    'identity.inhouse_hr': 'In-house HR',
    'identity.inhouse_hr_desc': 'Streamline your company\'s hiring pipeline and employee management',
    'identity.company_employee': 'Company Employee',
    'identity.company_employee_desc': 'Access documents, policies, and communicate with HR seamlessly',
    
    // Auth
    'auth.login': 'Sign In',
    'auth.register': 'Create Account',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.full_name': 'Full Name',
    'auth.phone': 'Phone Number',
    'auth.confirm_password': 'Confirm Password',
    'auth.forgot_password': 'Forgot password?',
    'auth.no_account': 'Don\'t have an account?',
    'auth.have_account': 'Already have an account?',
    'auth.sign_up': 'Sign up',
    'auth.sign_in': 'Sign in',
    'auth.logout': 'Sign Out',
    'auth.welcome_back': 'Welcome back to PLUG',
    'auth.create_account_title': 'Join PLUG',
    'auth.create_account_subtitle': 'Create your account to get started',
    
    // Dashboard
    'dashboard.welcome': 'Welcome',
    'dashboard.overview': 'Main Screen',
    'dashboard.jobSearch': 'Job Search',
    'dashboard.recent_activity': 'Recent Activity',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.aiInsights': 'AI Insights',
    'dashboard.applications': 'Jobs I Applied To',
    'dashboard.interviews': 'Interviews',
    'dashboard.matches': 'AI Matches',
    'dashboard.candidates': 'Candidates',
    'dashboard.openPositions': 'Open Positions',
    'dashboard.referrals': 'Referrals',
    'dashboard.bonus': 'Bonus',
    
    // Actions
    'actions.uploadCV': 'Upload CV',
    'actions.searchJobs': 'Search Jobs',
    'actions.viewMatches': 'View AI Matches',
    'actions.postJob': 'Post New Job',
    'actions.searchCandidates': 'Search Candidates',
    'actions.viewPipeline': 'View Pipeline',
    'actions.referCandidate': 'Refer a Candidate',
    'actions.viewOpenings': 'View Openings',
    'actions.trackReferrals': 'Track Referrals',
    
    // Insights
    'insights.jobSeeker': 'Based on your profile, I found 5 new positions that match your skills.',
    'insights.hr': 'You have 12 candidates waiting for review. 3 are highly matched.',
    'insights.employee': 'There are 4 open positions in your company that match your network.',
    'insights.tip': 'Pro Tip',
    'insights.tipText': 'Complete your profile to get better AI recommendations.',
    
    // Applications
    'applications.total': 'Total Applications',
    'applications.active': 'Active',
    'applications.interviews': 'Interviews',
    'applications.rejected': 'Rejected',
    'applications.searchPlaceholder': 'Search by job or company...',
    'applications.noApplications': 'No applications yet',
    'applications.noResults': 'No matching applications',
    'applications.startSearching': 'Start searching for jobs to apply',
    'applications.tryDifferentFilters': 'Try adjusting your filters',
    'applications.view': 'View',
    'applications.note': 'Note',
    'applications.withdraw': 'Withdraw',
    'applications.myNote': 'Note',
    
    // Plug AI
    'plug.greeting': 'Hey there! I\'m Plug, your AI HR assistant.',
    'plug.placeholder': 'Ask me anything...',
    'plug.thinking': 'Analyzing...',
  },
  he: {
    // General
    'app.name': 'PLUG',
    'app.tagline': 'מערכת ההפעלה המונעת ב-AI למשאבי אנוש',
    'common.loading': 'טוען...',
    'common.error': 'משהו השתבש',
    'common.save': 'שמור',
    'common.cancel': 'ביטול',
    'common.continue': 'המשך',
    'common.back': 'חזור',
    'common.next': 'הבא',
    'common.submit': 'שלח',
    'common.or': 'או',
    
    // Identity Selection
    'identity.title': 'איך אתה רוצה להשתמש ב-PLUG?',
    'identity.subtitle': 'בחר את התפקיד שלך לחוויה מותאמת אישית',
    'identity.job_seeker': 'מחפש עבודה',
    'identity.job_seeker_desc': 'מצא את עבודת החלומות שלך עם התאמה מונעת AI והכנה לראיונות',
    'identity.freelance_hr': 'HR פרילנס',
    'identity.freelance_hr_desc': 'נהל מספר לקוחות ומועמדים עם אוטומציה חכמה',
    'identity.inhouse_hr': 'HR פנים-ארגוני',
    'identity.inhouse_hr_desc': 'ייעל את תהליך הגיוס ואת ניהול העובדים בחברה שלך',
    'identity.company_employee': 'עובד חברה',
    'identity.company_employee_desc': 'גישה למסמכים, מדיניות ותקשורת עם HR בצורה חלקה',
    
    // Auth
    'auth.login': 'התחברות',
    'auth.register': 'צור חשבון',
    'auth.email': 'אימייל',
    'auth.password': 'סיסמה',
    'auth.full_name': 'שם מלא',
    'auth.phone': 'מספר טלפון',
    'auth.confirm_password': 'אישור סיסמה',
    'auth.forgot_password': 'שכחת סיסמה?',
    'auth.no_account': 'אין לך חשבון?',
    'auth.have_account': 'כבר יש לך חשבון?',
    'auth.sign_up': 'הירשם',
    'auth.sign_in': 'התחבר',
    'auth.logout': 'התנתק',
    'auth.welcome_back': 'ברוך הבא חזרה ל-PLUG',
    'auth.create_account_title': 'הצטרף ל-PLUG',
    'auth.create_account_subtitle': 'צור את החשבון שלך כדי להתחיל',
    
    // Dashboard
    'dashboard.welcome': 'ברוך הבא',
    'dashboard.overview': 'מסך ראשי',
    'dashboard.jobSearch': 'חיפוש עבודה',
    'dashboard.recent_activity': 'פעילות אחרונה',
    'dashboard.quickActions': 'פעולות מהירות',
    'dashboard.aiInsights': 'תובנות AI',
    'dashboard.applications': 'משרות שהגשתי',
    'dashboard.interviews': 'ראיונות',
    'dashboard.matches': 'התאמות AI',
    'dashboard.candidates': 'מועמדים',
    'dashboard.openPositions': 'משרות פתוחות',
    'dashboard.referrals': 'הפניות',
    'dashboard.bonus': 'בונוס',
    
    // Actions
    'actions.uploadCV': 'העלה קו"ח',
    'actions.searchJobs': 'חפש משרות',
    'actions.viewMatches': 'צפה בהתאמות AI',
    'actions.postJob': 'פרסם משרה',
    'actions.searchCandidates': 'חפש מועמדים',
    'actions.viewPipeline': 'צפה בצינור',
    'actions.referCandidate': 'הפנה מועמד',
    'actions.viewOpenings': 'צפה במשרות',
    'actions.trackReferrals': 'עקוב אחר הפניות',
    
    // Insights
    'insights.jobSeeker': 'בהתבסס על הפרופיל שלך, מצאתי 5 משרות שמתאימות לכישורים שלך.',
    'insights.hr': 'יש לך 12 מועמדים שממתינים לבדיקה. 3 מתאימים מאוד.',
    'insights.employee': 'יש 4 משרות פתוחות בחברה שלך שמתאימות לרשת שלך.',
    'insights.tip': 'טיפ מקצועי',
    'insights.tipText': 'השלם את הפרופיל שלך לקבלת המלצות AI טובות יותר.',
    
    // Applications
    'applications.total': 'סה"כ מועמדויות',
    'applications.active': 'פעיל',
    'applications.interviews': 'ראיונות',
    'applications.rejected': 'נדחו',
    'applications.searchPlaceholder': 'חפש לפי משרה או חברה...',
    'applications.noApplications': 'אין מועמדויות עדיין',
    'applications.noResults': 'לא נמצאו מועמדויות תואמות',
    'applications.startSearching': 'התחל לחפש משרות כדי להגיש מועמדות',
    'applications.tryDifferentFilters': 'נסה לשנות את הסינון',
    'applications.view': 'צפה',
    'applications.note': 'הערה',
    'applications.withdraw': 'בטל',
    'applications.myNote': 'הערה',
    
    // Plug AI
    'plug.greeting': 'היי! אני Plug, עוזר ה-AI שלך למשאבי אנוש.',
    'plug.placeholder': 'שאל אותי כל דבר...',
    'plug.thinking': 'מנתח...',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('plug-language') as Language;
    return (stored === 'en' || stored === 'he') ? stored : 'he';
  });

  const direction: Direction = language === 'he' ? 'rtl' : 'ltr';

  useLayoutEffect(() => {
    // Update document direction synchronously before paint
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    localStorage.setItem('plug-language', language);
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <DirectionProvider dir={direction}>
      <LanguageContext.Provider value={{ language, direction, setLanguage, t }}>
        {children}
      </LanguageContext.Provider>
    </DirectionProvider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
