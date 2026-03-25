import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardSection } from '@/components/dashboard/DashboardLayout';
import { TourOverlay } from './TourOverlay';
import { TourTooltip } from './TourTooltip';
import { TransitionScreen } from './TransitionScreen';
import { 
  Sparkles, Users, Briefcase, Building2, Target, MessageSquare,
  Heart, Newspaper, Globe, User, Settings, BarChart3, Zap, FileEdit, LayoutGrid
} from 'lucide-react';

interface TourStep {
  section: DashboardSection;
  targetSelector: string;
  titleHe: string;
  titleEn: string;
  descriptionHe: string;
  descriptionEn: string;
  icon: React.ElementType;
}

// Steps for FREELANCE HR (Hunters)
const FREELANCE_HR_STEPS: TourStep[] = [
  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'ברוכים הבאים ל-PLUG! 👋',
    titleEn: 'Welcome to PLUG! 👋',
    descriptionHe: 'Plug הוא העוזר האישי שלך לגיוס. שאל אותו על מועמדים, בקש עזרה בניסוח משרות, או קבל טיפים לשיפור תהליכי הגיוס.',
    descriptionEn: 'Plug is your personal recruiting assistant. Ask about candidates, get help writing job descriptions, or receive tips.',
    icon: Sparkles,
  },
  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'סטטיסטיקות בזמן אמת 📊',
    titleEn: 'Real-time Statistics 📊',
    descriptionHe: 'כאן תראה סיכום פעילות: מועמדים, משרות פתוחות וראיונות. הנתונים מתעדכנים אוטומטית.',
    descriptionEn: 'See your activity summary: candidates, open positions, and interviews. Data updates automatically.',
    icon: BarChart3,
  },
  {
    section: 'clients',
    targetSelector: '[data-tour="clients-list"]',
    titleHe: 'ניהול לקוחות (CRM) 🏢',
    titleEn: 'Client Management (CRM) 🏢',
    descriptionHe: 'נהל את כל החברות המגייסות שלך! הוסף לקוחות, עקוב אחרי SLA, וצפה בהיסטוריית הגיוס.',
    descriptionEn: 'Manage all your hiring companies! Add clients, track SLA, and view recruitment history.',
    icon: Building2,
  },
  {
    section: 'candidates',
    targetSelector: '[data-tour="candidates-section"]',
    titleHe: 'ניהול מועמדים 👥',
    titleEn: 'Candidate Management 👥',
    descriptionHe: 'צפה בכל המועמדים למשרות שפרסמת. סנן, מיין, וקבל סיכומי AI למועמדים.',
    descriptionEn: 'View all candidates for your posted jobs. Filter, sort, and get AI candidate summaries.',
    icon: Users,
  },
  {
    section: 'post-job',
    targetSelector: '[data-tour="post-job-form"]',
    titleHe: 'פרסום משרה 📋',
    titleEn: 'Post a Job 📋',
    descriptionHe: 'פרסם משרות חדשות עם כל הפרטים: תיאור, דרישות, שכר, מיקום ועוד. אפשר גם לייבא מלינק.',
    descriptionEn: 'Post new jobs with full details: description, requirements, salary, location & more. Import from link too.',
    icon: Briefcase,
  },
  {
    section: 'hr-tools',
    targetSelector: '[data-tour="hr-tools-hub"]',
    titleHe: 'כלי HR מתקדמים 🛠️',
    titleEn: 'HR Power Tools 🛠️',
    descriptionHe: 'Pipeline Analytics, Talent Pool, אישורים, התראות וסקרי מועמדים — כל כלי HR המתקדמים שלך במקום אחד!',
    descriptionEn: 'Pipeline Analytics, Talent Pool, approvals, alerts & surveys — all your advanced HR tools in one place!',
    icon: LayoutGrid,
  },
  {
    section: 'missions',
    targetSelector: '[data-tour="billboard-stats"]',
    titleHe: 'לוח פרויקטים (Billboard) 🎯',
    titleEn: 'Hunters Billboard 🎯',
    descriptionHe: 'שוק התחרותי! צפה בפרויקטי גיוס, הגש הצעות, ועקוב אחרי הסטטיסטיקות שלך.',
    descriptionEn: 'The competitive marketplace! View recruitment projects, submit bids, and track your stats.',
    icon: Target,
  },
  {
    section: 'content-hub',
    targetSelector: '[data-tour="content-hub"]',
    titleHe: 'תוכן וקהילה 📰',
    titleEn: 'Content & Community 📰',
    descriptionHe: 'צור תוכן, נהל וובינרים, ובנה קהילות מקצועיות. שתף ידע ובנה מוניטין.',
    descriptionEn: 'Create content, manage webinars, and build professional communities. Share knowledge and build reputation.',
    icon: Newspaper,
  },
  {
    section: 'messages',
    targetSelector: '[data-tour="message-inbox"]',
    titleHe: 'הודעות ותקשורת 💬',
    titleEn: 'Messages & Communication 💬',
    descriptionHe: 'תקשורת ישירה עם מועמדים ולקוחות. שלח הודעות, צרף קבצים, ונהל שיחות.',
    descriptionEn: 'Direct communication with candidates and clients. Send messages, attach files, manage conversations.',
    icon: MessageSquare,
  },
  {
    section: 'recruiter-profile',
    targetSelector: '[data-tour="recruiter-profile"]',
    titleHe: 'הפרופיל המקצועי שלך 👤',
    titleEn: 'Your Professional Profile 👤',
    descriptionHe: 'ערוך את הפרופיל שלך: תמונה, ביו, תחומי התמחות, והרקע המקצועי. פרופיל מלא = יותר אמון.',
    descriptionEn: 'Edit your profile: photo, bio, specializations, and professional background. Complete profile = more trust.',
    icon: User,
  },
  {
    section: 'overview',
    targetSelector: '[data-tour="vouch-widget"]',
    titleHe: 'המלצות (Vouches) ❤️',
    titleEn: 'Vouches & Recommendations ❤️',
    descriptionHe: 'קבל ותן המלצות! Vouches מחזקים את המוניטין שלך ומגדילים את הסיכוי שלקוחות יבחרו בך.',
    descriptionEn: 'Give and receive recommendations! Vouches strengthen your reputation and increase client trust.',
    icon: Heart,
  },
];

// Steps for IN-HOUSE HR
const INHOUSE_HR_STEPS: TourStep[] = [
  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'ברוכים הבאים ל-PLUG! 👋',
    titleEn: 'Welcome to PLUG! 👋',
    descriptionHe: 'Plug הוא העוזר האישי שלך לגיוס פנימי. שאל אותו על מועמדים, קבל טיפים, או בקש עזרה בניסוח משרות.',
    descriptionEn: 'Plug is your in-house recruiting assistant. Ask about candidates, get tips, or request help writing job posts.',
    icon: Sparkles,
  },
  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'סטטיסטיקות הגיוס שלך 📊',
    titleEn: 'Your Recruiting Stats 📊',
    descriptionHe: 'מבט כללי על הפעילות: מועמדים פעילים, משרות פתוחות, וראיונות קרובים.',
    descriptionEn: 'Activity overview: active candidates, open positions, and upcoming interviews.',
    icon: BarChart3,
  },
  {
    section: 'clients',
    targetSelector: '[data-tour="clients-list"]',
    titleHe: 'ניהול לקוחות (CRM) 🏢',
    titleEn: 'Client Management (CRM) 🏢',
    descriptionHe: 'נהל את חברות הגיוס שלך. הוסף לקוחות, עקוב אחרי ביצועים, וצפה בכל הפרויקטים.',
    descriptionEn: 'Manage your hiring companies. Add clients, track performance, and view all projects.',
    icon: Building2,
  },
  {
    section: 'candidates',
    targetSelector: '[data-tour="candidates-section"]',
    titleHe: 'ניהול מועמדים 👥',
    titleEn: 'Candidate Management 👥',
    descriptionHe: 'צפה ונהל מועמדים: סיכומי AI, ציוני התאמה, ומעקב שלבי גיוס. ייבא מועמדים מ-LinkedIn בלחיצה.',
    descriptionEn: 'View and manage candidates: AI summaries, match scores, and stage tracking. Import from LinkedIn in one click.',
    icon: Users,
  },
  {
    section: 'post-job',
    targetSelector: '[data-tour="post-job-form"]',
    titleHe: 'פרסום משרות 📋',
    titleEn: 'Post Jobs 📋',
    descriptionHe: 'פרסם משרות חדשות לחברה שלך. הגדר שאלות Knockout לסינון אוטומטי של מועמדים לא מתאימים.',
    descriptionEn: 'Post new jobs for your company. Set Knockout questions to auto-filter unfit candidates.',
    icon: Briefcase,
  },
  {
    section: 'hr-tools',
    targetSelector: '[data-tour="hr-tools-hub"]',
    titleHe: 'כלי HR מתקדמים 🛠️',
    titleEn: 'HR Power Tools 🛠️',
    descriptionHe: 'Pipeline Analytics, Talent Pool, אישורים, התראות וסקרי מועמדים — כל כלי HR המתקדמים שלך במקום אחד!',
    descriptionEn: 'Pipeline Analytics, Talent Pool, approvals, alerts & surveys — all your advanced HR tools in one place!',
    icon: LayoutGrid,
  },
  {
    section: 'missions',
    targetSelector: '[data-tour="billboard-stats"]',
    titleHe: 'לוח פרויקטים (Billboard) 🎯',
    titleEn: 'Hunters Billboard 🎯',
    descriptionHe: 'פרסם פרויקטי גיוס! הגדר עמלה, דחיפות, ובחר Hunters שיעבדו עבורך.',
    descriptionEn: 'Post recruitment projects! Set commission, urgency, and choose Hunters to work for you.',
    icon: Target,
  },
  {
    section: 'content-hub',
    targetSelector: '[data-tour="content-hub"]',
    titleHe: 'תוכן וקהילה 📰',
    titleEn: 'Content & Community 📰',
    descriptionHe: 'בנה נוכחות מקצועית! צור פוסטים, נהל קהילות, ושתף תובנות מעולם הגיוס.',
    descriptionEn: 'Build professional presence! Create posts, manage communities, and share recruiting insights.',
    icon: Newspaper,
  },
  {
    section: 'messages',
    targetSelector: '[data-tour="message-inbox"]',
    titleHe: 'הודעות 💬',
    titleEn: 'Messages 💬',
    descriptionHe: 'תקשורת עם מועמדים, Hunters, ואנשי קשר. הכל במקום אחד.',
    descriptionEn: 'Communicate with candidates, Hunters, and contacts. All in one place.',
    icon: MessageSquare,
  },
  {
    section: 'recruiter-profile',
    targetSelector: '[data-tour="recruiter-profile"]',
    titleHe: 'הפרופיל שלך 👤',
    titleEn: 'Your Profile 👤',
    descriptionHe: 'ערוך את הפרופיל המקצועי: תמונה, ביו, והתמחויות. פרופיל מלא בונה אמון.',
    descriptionEn: 'Edit your professional profile: photo, bio, and specializations. Complete profiles build trust.',
    icon: User,
  },
  {
    section: 'settings',
    targetSelector: '[data-tour="preferences"]',
    titleHe: 'הגדרות ⚙️',
    titleEn: 'Settings ⚙️',
    descriptionHe: 'התאם את חווית השימוש: שפה, התראות, Webhooks, ופרטיות.',
    descriptionEn: 'Customize your experience: language, notifications, Webhooks, and privacy.',
    icon: Settings,
  },
];

export const RECRUITER_TOUR_STORAGE_KEY = 'plug_onboarding_recruiter_completed';

interface RecruiterTourProps {
  currentSection: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
}

export function RecruiterTour({ currentSection, onNavigate }: RecruiterTourProps) {
  const { user, role } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionTip, setTransitionTip] = useState('');
  const [pendingStep, setPendingStep] = useState<number | null>(null);
  const [isElementFound, setIsElementFound] = useState(true);

  const isRecruiter = role === 'freelance_hr' || role === 'inhouse_hr';
  const steps = role === 'inhouse_hr' ? INHOUSE_HR_STEPS : FREELANCE_HR_STEPS;

  const startTour = useCallback(() => {
    if (!isRecruiter) return;
    setCurrentStep(0);
    setIsActive(true);
    setShowTransition(false);
    setPendingStep(null);
    localStorage.removeItem(RECRUITER_TOUR_STORAGE_KEY);
  }, [isRecruiter]);

  // Auto-start disabled to prevent blocking overlays on initial load.
  // Users can still start the tour from Tour Guide.
  useEffect(() => {
    if (!user) return;
    return;
  }, [user, isRecruiter]);

  // Navigate to correct section
  useEffect(() => {
    if (!isActive || showTransition) return;
    const step = steps[currentStep];
    if (step && step.section !== currentSection) {
      onNavigate(step.section);
    }
  }, [currentStep, isActive, currentSection, onNavigate, showTransition, steps]);

  // Expose globally
  useEffect(() => {
    const handler = () => {
      setCurrentStep(0);
      setIsActive(true);
      setShowTransition(false);
      setPendingStep(null);
      localStorage.removeItem(RECRUITER_TOUR_STORAGE_KEY);
    };
    (window as any).__startRecruiterTour = handler;
    window.addEventListener('plug:start-recruiter-tour', handler);
    return () => {
      window.removeEventListener('plug:start-recruiter-tour', handler);
      delete (window as any).__startRecruiterTour;
    };
  }, []);

  const handleTransitionComplete = useCallback(() => {
    setShowTransition(false);
    if (pendingStep !== null) {
      setCurrentStep(pendingStep);
      setPendingStep(null);
    }
  }, [pendingStep]);

  const handleElementFound = useCallback((found: boolean) => {
    setIsElementFound(found);
  }, []);

  if (!isActive || !isRecruiter) return null;

  const getTransitionTip = (from: DashboardSection, to: DashboardSection): string => {
    const tips: Record<string, string> = {
      'overview->clients': isHebrew ? '🏢 בוא נכיר את מערכת ניהול הלקוחות!' : '🏢 Let\'s explore the client management system!',
      'clients->candidates': isHebrew ? '👥 עכשיו נראה לך איך לנהל מועמדים' : '👥 Now let\'s see how to manage candidates',
      'candidates->post-job': isHebrew ? '📋 בוא נלמד לפרסם משרה' : '📋 Let\'s learn how to post a job',
      'post-job->missions': isHebrew ? '🎯 הנה לוח הפרויקטים!' : '🎯 Here\'s the project billboard!',
      'missions->content-hub': isHebrew ? '📰 עכשיו התוכן והקהילה' : '📰 Now content & community',
      'content-hub->messages': isHebrew ? '💬 נראה לך את מערכת ההודעות' : '💬 Let\'s check out messaging',
      'messages->recruiter-profile': isHebrew ? '👤 כמעט סיימנו! בוא נערוך את הפרופיל' : '👤 Almost done! Let\'s edit your profile',
      'recruiter-profile->overview': isHebrew ? '❤️ אחרון - מערכת ההמלצות' : '❤️ Last one - the recommendations system',
      'recruiter-profile->settings': isHebrew ? '⚙️ לסיום - ההגדרות' : '⚙️ Finally - settings',
    };
    return tips[`${from}->${to}`] || (isHebrew ? '✨ ממשיכים!' : '✨ Let\'s continue!');
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      const curSection = steps[currentStep].section;
      const nextSection = steps[nextStep].section;
      if (curSection !== nextSection) {
        setTransitionTip(getTransitionTip(curSection, nextSection));
        setShowTransition(true);
        setPendingStep(nextStep);
        onNavigate(nextSection);
      } else {
        setCurrentStep(nextStep);
      }
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      const curSection = steps[currentStep].section;
      const prevSection = steps[prevStep].section;
      if (curSection !== prevSection) {
        setTransitionTip(getTransitionTip(curSection, prevSection));
        setShowTransition(true);
        setPendingStep(prevStep);
        onNavigate(prevSection);
      } else {
        setCurrentStep(prevStep);
      }
    }
  };

  const handleComplete = () => {
    localStorage.setItem(RECRUITER_TOUR_STORAGE_KEY, 'true');
    setIsActive(false);
    setShowTransition(false);
    onNavigate('overview');
  };

  const step = steps[currentStep];

  return (
    <>
      <TransitionScreen
        tip={transitionTip}
        isActive={showTransition}
        onComplete={handleTransitionComplete}
        duration={2000}
      />
      {!showTransition && (
        <>
          <TourOverlay
            targetSelector={step.targetSelector}
            isActive={isActive}
            onElementFound={handleElementFound}
          />
          <TourTooltip
            targetSelector={step.targetSelector}
            title={isHebrew ? step.titleHe : step.titleEn}
            description={isHebrew ? step.descriptionHe : step.descriptionEn}
            currentStep={currentStep}
            totalSteps={steps.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleComplete}
            isFirst={currentStep === 0}
            isLast={currentStep === steps.length - 1}
            icon={step.icon}
            isElementFound={isElementFound}
          />
        </>
      )}
    </>
  );
}
