import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardSection } from '@/components/dashboard/DashboardLayout';
import { TourOverlay } from './TourOverlay';
import { TourTooltip } from './TourTooltip';
import { TransitionScreen } from './TransitionScreen';
import { useTourTips } from './useTourTips';
import { 
  Sparkles, Search, FileText, 
  Zap, Share2, Brain, MessageSquare, Heart, FileEdit, FolderOpen, Settings,
  Link, SlidersHorizontal, Building2, Lightbulb, CheckCircle, Target, Trash2,
  Mic, Newspaper, Globe, BarChart3, DollarSign
} from 'lucide-react';
import onboardingNotesImage from '@/assets/onboarding-notes-new.png';

interface TourStep {
  section: DashboardSection;
  targetSelector: string;
  titleHe: string;
  titleEn: string;
  descriptionHe: string;
  descriptionEn: string;
  icon: React.ElementType;
  customImage?: string;
}

const TOUR_STEPS: TourStep[] = [
  // Step 1: Welcome - Plug Chat
  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'היי! אני Plug 👋',
    titleEn: 'Hey! I\'m Plug 👋',
    descriptionHe: 'אני ה-AI שלך לחיפוש עבודה! שאל אותי על משרות, קבל עזרה בהכנה לראיונות, או בקש טיפים לשיפור קורות החיים שלך.',
    descriptionEn: 'I\'m your AI job search assistant! Ask me about positions, get help preparing for interviews, or request tips to improve your resume.',
    icon: Sparkles,
  },
  // Step 2: Onboarding Checklist - NEW!
  {
    section: 'overview',
    targetSelector: '[data-tour="onboarding-checklist"]',
    titleHe: 'רשימת משימות חכמה ✅',
    titleEn: 'Smart Onboarding Checklist ✅',
    descriptionHe: 'עקוב אחרי ההתקדמות שלך! הרשימה מראה לך בדיוק מה צריך לעשות כדי להשלים את הפרופיל ולהתחיל לקבל הצעות מותאמות.',
    descriptionEn: 'Track your progress! This list shows you exactly what to do to complete your profile and start getting personalized offers.',
    icon: CheckCircle,
  },
  // Step 3: Plug Tips - NEW!
  {
    section: 'overview',
    targetSelector: '[data-tour="plug-tip"]',
    titleHe: 'טיפים קונטקסטואליים 💡',
    titleEn: 'Contextual Tips 💡',
    descriptionHe: 'Plug נותן לך טיפים חכמים לפי הפעילות שלך! הטיפים יעזרו לך למקסם את הסיכויים למצוא עבודה.',
    descriptionEn: 'Plug gives you smart tips based on your activity! These tips help maximize your chances of finding a job.',
    icon: Lightbulb,
  },
  // Step 2: Applications - Add Application
  {
    section: 'applications',
    targetSelector: '[data-tour="add-application"]',
    titleHe: 'הוסף מועמדות בקלות 📋',
    titleEn: 'Add Applications Easily 📋',
    descriptionHe: 'הדבק לינק למשרה מכל אתר - AI ישלוף את כל הפרטים אוטומטית! אפשר גם להוסיף ידנית.',
    descriptionEn: 'Paste a job link from any site - AI will extract all details automatically! You can also add manually.',
    icon: FileText,
  },
  // Step 3: Job Search - Filters
  {
    section: 'job-search',
    targetSelector: '[data-tour="job-filters"]',
    titleHe: 'חיפוש משרות חכם 🔍',
    titleEn: 'Smart Job Search 🔍',
    descriptionHe: 'סנן משרות לפי מיקום, קטגוריה, סוג משרה ושכר. הפעל GPS כדי למצוא משרות קרובות אליך!',
    descriptionEn: 'Filter jobs by location, category, job type, and salary. Enable GPS to find jobs near you!',
    icon: Search,
  },
  // Step 4: Job Search - Share Job
  {
    section: 'job-search',
    targetSelector: '[data-tour="share-job"]',
    titleHe: 'שתף עם הקהילה 🤝',
    titleEn: 'Share with Community 🤝',
    descriptionHe: 'מצאת משרה מעניינת? שתף אותה עם הקהילה! עזור לאחרים למצוא עבודה ובנה רשת קשרים מקצועית.',
    descriptionEn: 'Found an interesting job? Share it with the community! Help others find work and build your professional network.',
    icon: Share2,
  },
  // Step 5: Company Recommendations
  {
    section: 'job-search',
    targetSelector: '[data-tour="company-recommendations"]',
    titleHe: 'חברות מומלצות + התאמה 🎯',
    titleEn: 'Recommendations + Match Me 🎯',
    descriptionHe: 'לחץ על "מתאים לי" כדי לסנן משרות לפי הפרופיל שלך! ראה סטטיסטיקות וחברות מומלצות.',
    descriptionEn: 'Click "Match Me" to filter jobs by your profile! View stats and recommended companies.',
    icon: Target,
  },
  // Step 5: Documents - Resume Upload
  {
    section: 'profile-docs',
    targetSelector: '[data-tour="resume-upload"]',
    titleHe: 'ניתוח קו"ח עם AI 🧠',
    titleEn: 'AI Resume Analysis 🧠',
    descriptionHe: 'העלה את קורות החיים שלך ו-AI ינתח אותם: יזהה מיומנויות, ידרג את הפרופיל שלך, ויציע תפקידים מתאימים!',
    descriptionEn: 'Upload your resume and AI will analyze it: identify skills, rate your profile, and suggest matching roles!',
    icon: Brain,
  },
  // Step 6: CV Builder - NEW!
  {
    section: 'cv-builder',
    targetSelector: '[data-tour="cv-builder"]',
    titleHe: 'בונה קו"ח מקצועי 📄',
    titleEn: 'Professional CV Builder 📄',
    descriptionHe: 'צור קורות חיים מרשימים עם מגוון תבניות מעוצבות! בחר עיצוב, מלא פרטים, והורד PDF מוכן.',
    descriptionEn: 'Create impressive resumes with various designed templates! Choose a design, fill in details, and download a ready PDF.',
    icon: FileEdit,
    customImage: onboardingNotesImage,
  },
  // Step 7: Portfolio & Links - NEW!
  {
    section: 'profile-docs',
    targetSelector: '[data-tour="portfolio-links"]',
    titleHe: 'קישורים מקצועיים 🔗',
    titleEn: 'Professional Links 🔗',
    descriptionHe: 'הוסף קישור לתיק עבודות, LinkedIn, GitHub ועוד. מגייסים יוכלו לראות את העבודות שלך!',
    descriptionEn: 'Add links to your portfolio, LinkedIn, GitHub, and more. Recruiters can view your work!',
    icon: Link,
  },
  // Step 8: Settings - Preferences
  {
    section: 'settings',
    targetSelector: '[data-tour="preferences"]',
    titleHe: 'העדפות עבודה ⚙️',
    titleEn: 'Job Preferences ⚙️',
    descriptionHe: 'הגדר תחומים מועדפים, סוגי משרות, ומיקומים רצויים. Plug ימצא עבורך את ההתאמות הטובות ביותר!',
    descriptionEn: 'Set preferred fields, job types, and desired locations. Plug will find the best matches for you!',
    icon: SlidersHorizontal,
  },
  // Step 9: Interview Prep
  {
    section: 'interview-prep',
    targetSelector: '[data-tour="interview-prep"]',
    titleHe: 'הכנה לראיון 🎙️',
    titleEn: 'Interview Prep 🎙️',
    descriptionHe: 'התכונן לראיונות עם AI! קבל שאלות מותאמות, תרגל בקול, ושפר את הביצועים שלך.',
    descriptionEn: 'Prepare for interviews with AI! Get tailored questions, practice aloud, and improve your performance.',
    icon: Mic,
  },
  // Step 10: PLUG Feed
  {
    section: 'feed',
    targetSelector: '[data-tour="feed-content"]',
    titleHe: 'PLUG Feed 📰',
    titleEn: 'PLUG Feed 📰',
    descriptionHe: 'פיד תוכן מותאם אישית! טיפים, סקרים, וידאו ותרבות ארגונית. הרוויחו דלק מכל אינטראקציה.',
    descriptionEn: 'Personalized content feed! Tips, polls, video & culture. Earn fuel from every interaction.',
    icon: Newspaper,
  },
  // Step 11: Communities
  {
    section: 'communities',
    targetSelector: '[data-tour="communities-list"]',
    titleHe: 'קהילות מקצועיות 🌍',
    titleEn: 'Professional Communities 🌍',
    descriptionHe: 'הצטרף לקהילות מקצועיות, שתף ידע, ובנה רשת קשרים. הקהילה עוזרת למצוא הזדמנויות!',
    descriptionEn: 'Join professional communities, share knowledge, and build your network. Community helps find opportunities!',
    icon: Globe,
  },
  // Step 12: Overview - Quick Actions
  {
    section: 'overview',
    targetSelector: '[data-tour="quick-actions"]',
    titleHe: 'פעולות מהירות ⚡',
    titleEn: 'Quick Actions ⚡',
    descriptionHe: 'קיצורי דרך לפעולות נפוצות! העלה קו"ח, חפש משרות, או עבור ישר למועמדויות שלך - הכל בלחיצה אחת.',
    descriptionEn: 'Shortcuts to common actions! Upload your CV, search for jobs, or jump straight to your applications - all in one click.',
    icon: Zap,
  },
  // Step 13: Overview - Stats
  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'מעקב התקדמות 📊',
    titleEn: 'Track Your Progress 📊',
    descriptionHe: 'כאן תראה סטטיסטיקות בזמן אמת: כמה מועמדויות הגשת, ראיונות שמתקרבים, ומועמדויות פעילות.',
    descriptionEn: 'See real-time stats here: how many applications you\'ve submitted, upcoming interviews, and active applications.',
    icon: FileText,
  },
  // Step 14: Messages - Inbox
  {
    section: 'messages',
    targetSelector: '[data-tour="message-inbox"]',
    titleHe: 'תקשורת ישירה 💬',
    titleEn: 'Direct Communication 💬',
    descriptionHe: 'קבל הודעות ממגייסים, שלח הודעות, וצרף קבצים. כל התקשורת המקצועית שלך במקום אחד!',
    descriptionEn: 'Receive messages from recruiters, send messages, and attach files. All your professional communication in one place!',
    icon: MessageSquare,
  },
  // Step 15: Vouches
  {
    section: 'overview',
    targetSelector: '[data-tour="vouch-widget"]',
    titleHe: 'המלצות וערבויות ❤️',
    titleEn: 'Vouches & Recommendations ❤️',
    descriptionHe: 'קבל המלצות מעמיתים ומנהלים! ה-Vouches מחזקים את הפרופיל שלך ומגדילים את הסיכוי להתקבל.',
    descriptionEn: 'Get recommendations from colleagues and managers! Vouches strengthen your profile and increase your chances.',
    icon: Heart,
  },
];

export const TOUR_STORAGE_KEY = 'plug_onboarding_job_seeker_completed';

interface JobSeekerTourProps {
  currentSection: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
}

export function JobSeekerTour({ currentSection, onNavigate }: JobSeekerTourProps) {
  const { user, role } = useAuth();
  const { language } = useLanguage();
  const { getPersonalizedTip } = useTourTips();
  const isHebrew = language === 'he';

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionTip, setTransitionTip] = useState('');
  const [pendingStep, setPendingStep] = useState<number | null>(null);
  const [isElementFound, setIsElementFound] = useState(true);

  // Start tour function - can be called externally
  // Allow starting even while role is still loading (role can be null briefly).
  const startTour = useCallback(() => {
    if (role && role !== 'job_seeker') return;
    setCurrentStep(0);
    setIsActive(true);
    setShowTransition(false);
    setPendingStep(null);
    // Clear the completed flag to allow the tour to run
    localStorage.removeItem(TOUR_STORAGE_KEY);
  }, [role]);

  // Auto-start disabled to prevent blocking overlays on initial load.
  // Users can still start the tour from Tour Guide.
  useEffect(() => {
    if (!user) return;
    return;
  }, [user, role]);

  // Navigate to correct section when step changes (after transition)
  useEffect(() => {
    if (!isActive || showTransition) return;

    const step = TOUR_STEPS[currentStep];
    if (step && step.section !== currentSection) {
      onNavigate(step.section);
    }
  }, [currentStep, isActive, currentSection, onNavigate, showTransition]);

  // CRITICAL: Expose startTour globally BEFORE any early return!
  // This ensures the event listener is always registered even when tour is inactive
  useEffect(() => {
    const handler = () => {
      // Allow start even if role hasn't loaded yet; Dashboard already gates the button by role.
      setCurrentStep(0);
      setIsActive(true);
      setShowTransition(false);
      setPendingStep(null);
      localStorage.removeItem(TOUR_STORAGE_KEY);
    };

    (window as any).__startJobSeekerTour = handler;
    window.addEventListener('plug:start-job-seeker-tour', handler);

    return () => {
      window.removeEventListener('plug:start-job-seeker-tour', handler);
      delete (window as any).__startJobSeekerTour;
    };
  }, []);

  // These callbacks must be defined BEFORE any early return to follow hooks rules
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

  // Early return AFTER all hooks are called
  if (!isActive || role !== 'job_seeker') return null;

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      const currentSection = TOUR_STEPS[currentStep].section;
      const nextSection = TOUR_STEPS[nextStep].section;

      // Check if we're changing sections
      if (currentSection !== nextSection) {
        // Show transition screen
        const tip = getPersonalizedTip(currentSection, nextSection);
        setTransitionTip(tip);
        setShowTransition(true);
        setPendingStep(nextStep);
        // Navigate to next section
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
      const currentSection = TOUR_STEPS[currentStep].section;
      const prevSection = TOUR_STEPS[prevStep].section;

      // Check if we're changing sections
      if (currentSection !== prevSection) {
        // Show transition screen
        const tip = getPersonalizedTip(currentSection, prevSection);
        setTransitionTip(tip);
        setShowTransition(true);
        setPendingStep(prevStep);
        // Navigate to prev section
        onNavigate(prevSection);
      } else {
        setCurrentStep(prevStep);
      }
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setIsActive(false);
    setShowTransition(false);
    // Return to overview
    onNavigate('overview');
  };

  const step = TOUR_STEPS[currentStep];

  return (
    <>
      {/* Transition Screen */}
      <TransitionScreen
        tip={transitionTip}
        isActive={showTransition}
        onComplete={handleTransitionComplete}
        duration={2000}
      />

      {/* Tour Overlay & Tooltip - only show when not in transition */}
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
            totalSteps={TOUR_STEPS.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleSkip}
            isFirst={currentStep === 0}
            isLast={currentStep === TOUR_STEPS.length - 1}
            icon={step.icon}
            isElementFound={isElementFound}
            customImage={step.customImage}
          />
        </>
      )}
    </>
  );
}
