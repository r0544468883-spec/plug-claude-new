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
  Zap, Share2, Brain, MessageSquare, Heart, FileEdit,
  Link, SlidersHorizontal, Target,
  Mic, Newspaper, Globe, BarChart3, Chrome, DollarSign,
  ClipboardList, Users, Bell, CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
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

// Tour steps — each step moves to a DIFFERENT section so the screen changes.
// Descriptions are action-oriented: WHERE to click, HOW it works, WHY it matters.
const TOUR_STEPS: TourStep[] = [
  // 1. Dashboard overview — stats row (first thing you see)
  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'ברוכים הבאים ל-PLUG! 👋',
    titleEn: 'Welcome to PLUG! 👋',
    descriptionHe: 'זה הדשבורד שלך. המספרים כאן מראים כמה מועמדויות הגשת, ראיונות קרובים ומועמדויות פעילות — הכל בזמן אמת.',
    descriptionEn: 'This is your dashboard. These numbers show your submitted applications, upcoming interviews, and active applications — all in real time.',
    icon: BarChart3,
  },
  // 2. Profile & Documents — upload resume (most important first action)
  {
    section: 'profile-docs',
    targetSelector: '[data-tour="resume-upload"]',
    titleHe: 'שלב 1: העלה קורות חיים 📄',
    titleEn: 'Step 1: Upload Your Resume 📄',
    descriptionHe: 'לחץ כאן כדי להעלות קו"ח. ה-AI ינתח אותו ויזהה מיומנויות, ניסיון ותפקידים מתאימים — וכך מגייסים ימצאו אותך מהר יותר.',
    descriptionEn: 'Click here to upload your resume. AI will analyze it and identify skills, experience, and matching roles — so recruiters find you faster.',
    icon: Brain,
  },
  // 3. CV Builder
  {
    section: 'cv-builder',
    targetSelector: '[data-tour="cv-builder"]',
    titleHe: 'בנה קורות חיים מקצועיים 📝',
    titleEn: 'Build a Professional CV 📝',
    descriptionHe: 'אין לך קו"ח מוכן? בחר תבנית מעוצבת, מלא את הפרטים, ולחץ "הורד PDF". תוך דקות יש לך מסמך מקצועי.',
    descriptionEn: 'No CV yet? Pick a designed template, fill in your details, and click "Download PDF". You\'ll have a professional document in minutes.',
    icon: FileEdit,
    customImage: onboardingNotesImage,
  },
  // 4. Job Search — filters
  {
    section: 'job-search',
    targetSelector: '[data-tour="job-filters"]',
    titleHe: 'חפש משרות לפי הקריטריונים שלך 🔍',
    titleEn: 'Search Jobs by Your Criteria 🔍',
    descriptionHe: 'השתמש בפילטרים האלה כדי לסנן לפי מיקום, קטגוריה, סוג משרה ושכר. לחץ "מתאים לי" לסינון אוטומטי לפי הפרופיל שלך.',
    descriptionEn: 'Use these filters to narrow by location, category, job type, and salary. Click "Match Me" for auto-filtering based on your profile.',
    icon: Search,
  },
  // 5. Job Search — Match Me button
  {
    section: 'job-search',
    targetSelector: '[data-tour="company-recommendations"]',
    titleHe: 'לחץ "מתאים לי" — AI בוחר בשבילך 🎯',
    titleEn: 'Click "Match Me" — AI picks for you 🎯',
    descriptionHe: 'הכפתור הזה מסנן את כל המשרות ומציג רק את אלו שמתאימות לכישורים שלך. ציון התאמה 80%+ = כדאי מאוד להגיש.',
    descriptionEn: 'This button filters all jobs and shows only those matching your skills. Match score 80%+ = definitely worth applying.',
    icon: Target,
  },
  // 6. Applications — add application
  {
    section: 'applications',
    targetSelector: '[data-tour="add-application"]',
    titleHe: 'הגשת מועמדות — הדבק לינק וזהו 📋',
    titleEn: 'Apply — Just Paste a Link 📋',
    descriptionHe: 'מצאת משרה באתר אחר? הדבק את הלינק כאן — AI ישלוף את כל הפרטים אוטומטית (שם חברה, תפקיד, דרישות). אפשר גם להוסיף ידנית.',
    descriptionEn: 'Found a job on another site? Paste the link here — AI will extract all details automatically (company, role, requirements). You can also add manually.',
    icon: FileText,
  },
  // 7. Interview Prep
  {
    section: 'interview-prep',
    targetSelector: '[data-tour="interview-prep"]',
    titleHe: 'תרגל ראיון עם AI 🎙️',
    titleEn: 'Practice Interviews with AI 🎙️',
    descriptionHe: 'לחץ "התחל תרגול" כדי להתחיל סימולציית ראיון. ה-AI שואל שאלות מותאמות לתפקיד שלך, ואתה עונה בקול או בטקסט.',
    descriptionEn: 'Click "Start Practice" to begin an interview simulation. AI asks role-specific questions, and you answer by voice or text.',
    icon: Mic,
  },
  // 8. Settings — preferences (what kind of job you want)
  {
    section: 'settings',
    targetSelector: '[data-tour="preferences"]',
    titleHe: 'הגדר מה אתה מחפש ⚙️',
    titleEn: 'Set What You\'re Looking For ⚙️',
    descriptionHe: 'הגדר כאן תחומים, סוג משרה (מלאה/חלקית/פרילנס), ומיקום. ככל שתהיה מדויק יותר — כך המשרות שתקבל יהיו רלוונטיות יותר.',
    descriptionEn: 'Set your preferred fields, job type (full/part-time/freelance), and location. The more specific you are, the more relevant your job matches.',
    icon: SlidersHorizontal,
  },
  // 9. Messages
  {
    section: 'messages',
    targetSelector: '[data-tour="message-inbox"]',
    titleHe: 'הודעות ממגייסים 💬',
    titleEn: 'Messages from Recruiters 💬',
    descriptionHe: 'כשמגייס מתעניין בך — ההודעה תגיע לכאן. תוכל לענות, לצרף קבצים, ולנהל את כל התקשורת במקום אחד.',
    descriptionEn: 'When a recruiter is interested — the message arrives here. You can reply, attach files, and manage all communication in one place.',
    icon: MessageSquare,
  },
  // 10. Vouches
  {
    section: 'overview',
    targetSelector: '[data-tour="vouch-widget"]',
    titleHe: 'בקש המלצות מאנשים שעבדת איתם ❤️',
    titleEn: 'Request Recommendations from Colleagues ❤️',
    descriptionHe: 'לחץ "בקש" כדי ליצור לינק ולשלוח למנהל או עמית. המלצה (Vouch) מחזקת את הפרופיל שלך ומגייסים רואים אותה.',
    descriptionEn: 'Click "Request" to create a link and send to a manager or colleague. A Vouch strengthens your profile and recruiters can see it.',
    icon: Heart,
  },
  // 11. Credits & Ambassador (HUD is in header, visible from any section)
  {
    section: 'overview',
    targetSelector: '[data-tour="credit-hud"]',
    titleHe: 'דלק ומערכת שגרירים ⚡',
    titleEn: 'Fuel & Ambassador System ⚡',
    descriptionHe: 'יש לך 15 דלק יומי שמתחדש כל בוקר. צבור XP ממשימות כדי לעלות דרגה ולקבל יותר דלק. הזמן חברים = עוד דלק בונוס!',
    descriptionEn: 'You get 15 daily fuel that renews every morning. Earn XP from tasks to level up and get more fuel. Invite friends = bonus fuel!',
    icon: DollarSign,
  },
  // 12. Community Feed
  {
    section: 'feed',
    targetSelector: '[data-tour="feed-content"]',
    titleHe: 'פיד הקהילה המקצועי',
    titleEn: 'Professional Community Feed',
    descriptionHe: 'כאן מגייסים ואנשי מקצוע משתפים משרות, טיפים, ותובנות בזמן אמת. תוכל לפרסם, להגיב, ולהצטרף לדיונים — ולבנות נוכחות מקצועית.',
    descriptionEn: 'Recruiters and professionals share jobs, tips, and insights in real time. Post, comment, and join discussions — build your professional presence.',
    icon: Users,
  },
  // 13. Home Assignments
  {
    section: 'overview',
    targetSelector: '[data-tour="onboarding-checklist"]',
    titleHe: 'מבחני בית — הוכח את הכישורים שלך',
    titleEn: 'Home Assignments — Prove Your Skills',
    descriptionHe: 'לוח המטלות מאפשר לך לפתור אתגרים אמיתיים מחברות טכנולוגיה — ולהציג אותם בפרופיל שלך. כנס מהתפריט "לוח המטלות" כדי לגלות ולהגיש.',
    descriptionEn: 'The Assignments board lets you solve real challenges from tech companies — and showcase them in your profile. Open "Assignments Board" from the menu to explore and submit.',
    icon: ClipboardList,
  },
  // 14. Personal Card
  {
    section: 'profile-docs',
    targetSelector: '[data-tour="resume-upload"]',
    titleHe: 'הכרטיס האישי שלך',
    titleEn: 'Your Personal Card',
    descriptionHe: 'PLUG יוצר עבורך כרטיס אישי עם קישור ייחודי — שתף אותו עם מגייסים ישירות. לחץ "הפרופיל שלי" בתפריט ובחר "כרטיס אישי".',
    descriptionEn: 'PLUG creates a personal card with a unique link — share it directly with recruiters. Click "My Profile" in the menu and choose "Personal Card".',
    icon: CreditCard,
  },
  // 15. Nudge Tips — the popup system
  {
    section: 'overview',
    targetSelector: '[data-tour="credit-hud"]',
    titleHe: 'PLUG ישלח לך טיפים בזמן שתשתמש',
    titleEn: 'PLUG will send you tips as you use the app',
    descriptionHe: 'מדי פעם יצוץ פופאפ קטן עם פיצ\'ר שטרם ניסית, הצטרפות לקהילת הוואטסאפ שלנו, או הטבת קרדיטים. תוכל לסגור אותו בכל רגע.',
    descriptionEn: 'Occasionally a small popup will appear with a feature you haven\'t tried, an invite to our WhatsApp community, or a credit bonus. You can close it at any time.',
    icon: Bell,
  },
  // 16. PLUG Extension
  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'טיפ: התקן את תוסף PLUG לכרום',
    titleEn: 'Tip: Install the PLUG Chrome Extension',
    descriptionHe: 'עם התוסף, PLUG עובד ישירות באתרי דרושים (LinkedIn, AllJobs ועוד). הוא ממלא טפסי הגשה אוטומטית, מנתח משרות בזמן אמת, ושומר הכל לדשבורד שלך.',
    descriptionEn: 'With the extension, PLUG works directly on job boards (LinkedIn, AllJobs, etc.). It auto-fills application forms, analyzes jobs in real time, and saves everything to your dashboard.',
    icon: Chrome,
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
    // Celebration toast
    toast.success(
      isHebrew ? '🎉 כל הכבוד! סיימת את הסיור המודרך!' : '🎉 Great job! You completed the guided tour!',
      {
        duration: 5000,
        description: isHebrew
          ? 'עכשיו אתה מכיר את כל הכלים. בהצלחה!'
          : 'Now you know all the tools. Good luck!',
      }
    );
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
