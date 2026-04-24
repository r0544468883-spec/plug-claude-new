import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardSection } from '@/components/dashboard/DashboardLayout';
import { TourOverlay } from './TourOverlay';
import { TourTooltip } from './TourTooltip';
import { TransitionScreen } from './TransitionScreen';
import { useTourTips } from './useTourTips';
import {
  BarChart3, Brain, FileEdit, SlidersHorizontal, Search, Target,
  Zap, FileText, Mic, MessageSquare, Heart, Users, ClipboardList,
  CreditCard, TrendingUp, Eye, Lightbulb, Bell, Chrome, MessageCircle,
  CalendarDays,
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
  /** Badge shown in tooltip — tells users which area they're in */
  sectionLabelHe: string;
  sectionLabelEn: string;
}

// ═══════════════════════════════════════════════════════════
// TOUR STEPS — ordered by the real job-search workflow,
// then features. Hebrew text uses gender-neutral /י form.
// ═══════════════════════════════════════════════════════════
const TOUR_STEPS: TourStep[] = [

  // ── PHASE 1: WORKFLOW ───────────────────────────────────

  // 1. Welcome
  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'ברוכים הבאים ל-PLUG!',
    titleEn: 'Welcome to PLUG!',
    descriptionHe: 'PLUG הוא הדשבורד המרכזי לניהול חיפוש העבודה שלך — מהגשה ועד ראיון. המספרים כאן מתעדכנים בזמן אמת.',
    descriptionEn: 'PLUG is your central hub for managing your job search — from application to interview. The numbers update in real time.',
    icon: BarChart3,
    sectionLabelHe: 'שלב 1 — ברוכים הבאים',
    sectionLabelEn: 'Step 1 — Welcome',
  },

  // 2. Upload Resume
  {
    section: 'profile-docs',
    targetSelector: '[data-tour="resume-upload"]',
    titleHe: 'שלב 2: העלאת קורות חיים',
    titleEn: 'Step 2: Upload Your Resume',
    descriptionHe: 'לחצ/י כאן כדי להעלות קו"ח. ה-AI ינתח אותו, יזהה מיומנויות וניסיון, ויתאים לך משרות אוטומטית.',
    descriptionEn: 'Click here to upload your resume. AI will analyze it, identify skills and experience, and automatically match you with jobs.',
    icon: Brain,
    sectionLabelHe: 'שלב 2 — פרופיל',
    sectionLabelEn: 'Step 2 — Profile',
  },

  // 3. CV Builder — AI, templates, prompts, mobile warning
  {
    section: 'cv-builder',
    targetSelector: '[data-tour="cv-builder"]',
    titleHe: 'שלב 3: בניית קורות חיים עם AI',
    titleEn: 'Step 3: Build & Improve Your CV with AI',
    descriptionHe: 'בחר/י תבנית, מלא/י פרטים ולחצ/י "הורד PDF". תוך כדי כתיבה — AI ישפר כל סעיף, יציע ניסוח מחדש, ויתאים לתפקיד לפי פרומפט אישי. מומלץ לשימוש במחשב בלבד.',
    descriptionEn: 'Choose a template, fill in details and click "Download PDF". As you write — AI improves each section, suggests rewrites, and tailors to the role by personal prompt. Recommended for desktop only.',
    icon: FileEdit,
    customImage: onboardingNotesImage,
    sectionLabelHe: 'שלב 3 — בניית קו"ח',
    sectionLabelEn: 'Step 3 — CV Builder',
  },

  // 4. Preferences, Visibility & Integrations
  {
    section: 'settings',
    targetSelector: '[data-tour="preferences"]',
    titleHe: 'שלב 4: הגדרות, חשיפה ואינטגרציות',
    titleEn: 'Step 4: Preferences, Visibility & Integrations',
    descriptionHe: 'הגדר/י כאן סוג משרה, מיקום ותחומים מועדפים. כאן גם שולטים אם הפרופיל גלוי למגייסים, ומחברים את חשבון Gmail לסנכרון אוטומטי של תקשורת.',
    descriptionEn: 'Set your preferred job type, location, and fields here. Also control profile visibility to recruiters and connect Gmail for automatic communication sync.',
    icon: SlidersHorizontal,
    sectionLabelHe: 'שלב 4 — הגדרות',
    sectionLabelEn: 'Step 4 — Settings',
  },

  // 5. Job Search Filters
  {
    section: 'job-search',
    targetSelector: '[data-tour="job-filters"]',
    titleHe: 'שלב 5: חיפוש משרות לפי קריטריונים',
    titleEn: 'Step 5: Search Jobs by Your Criteria',
    descriptionHe: 'סנן/י לפי מיקום, קטגוריה, סוג משרה ושכר. ככל שהסינון מדויק יותר — המשרות שיופיעו יהיו רלוונטיות יותר.',
    descriptionEn: 'Filter by location, category, job type, and salary. The more precise the filter, the more relevant jobs you\'ll see.',
    icon: Search,
    sectionLabelHe: 'שלב 5 — חיפוש משרות',
    sectionLabelEn: 'Step 5 — Job Search',
  },

  // 6. Match Me (AI)
  {
    section: 'job-search',
    targetSelector: '[data-tour="company-recommendations"]',
    titleHe: 'שלב 6: AI בוחר — Match Me',
    titleEn: 'Step 6: AI Picks for You — Match Me',
    descriptionHe: 'לחצ/י "מתאים לי" כדי שה-AI יסנן את כל המשרות ויציג רק את המתאימות לכישורים שלך. ציון 80%+ = כדאי מאוד להגיש.',
    descriptionEn: 'Click "Match Me" so AI filters all jobs and shows only those matching your skills. 80%+ score = definitely worth applying.',
    icon: Target,
    sectionLabelHe: 'שלב 6 — חיפוש משרות',
    sectionLabelEn: 'Step 6 — Job Search',
  },

  // 7. Sprint (Job Swipe)
  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'שלב 7: ספרינט — סוויפ על משרות',
    titleEn: 'Step 7: Sprint — Swipe Through Matched Jobs',
    descriptionHe: 'מצא/י "ספרינט" בתפריט הצד. ממשק סוויפ מהיר — שמאל להדחה, ימין לשמירה. מושלם כשיש 5 דקות פנויות.',
    descriptionEn: 'Find "Sprint" in the side menu. Fast swipe interface — left to skip, right to save. Perfect when you have 5 spare minutes.',
    icon: Zap,
    sectionLabelHe: 'שלב 7 — ספרינט',
    sectionLabelEn: 'Step 7 — Sprint',
  },

  // 8. Apply — paste link
  {
    section: 'applications',
    targetSelector: '[data-tour="add-application"]',
    titleHe: 'שלב 8: הגשת מועמדות — הדבק/י לינק וזהו',
    titleEn: 'Step 8: Apply — Just Paste a Link',
    descriptionHe: 'מצאת/מצאתם משרה באתר אחר? הדביק/י את הלינק כאן — AI ישלוף את כל הפרטים אוטומטית. כל המועמדויות מנוהלות כאן במקום אחד.',
    descriptionEn: 'Found a job elsewhere? Paste the link here — AI extracts all details automatically. All your applications are managed here in one place.',
    icon: FileText,
    sectionLabelHe: 'שלב 8 — הגשת מועמדות',
    sectionLabelEn: 'Step 8 — Applications',
  },

  // 9. Search Journal / Schedule
  {
    section: 'schedule',
    targetSelector: '[data-tour="schedule-calendar"]',
    titleHe: 'שלב 9: יומן החיפוש שלי',
    titleEn: 'Step 9: My Search Journal',
    descriptionHe: 'יומן החיפוש מרכז את כל הראיונות, המעקבים והתזכורות שלך. אפשר לחבר ל-Google Calendar ולקבל תזכורות אוטומטיות. מצא/י תחת "יומן החיפוש שלי" בתפריט.',
    descriptionEn: 'The search journal centralizes all your interviews, follow-ups, and reminders. Connect to Google Calendar for automatic reminders. Find it under "My Applications Schedule" in the menu.',
    icon: CalendarDays,
    sectionLabelHe: 'שלב 9 — יומן החיפוש',
    sectionLabelEn: 'Step 9 — Search Journal',
  },

  // 10. Interview Prep
  {
    section: 'interview-prep',
    targetSelector: '[data-tour="interview-prep"]',
    titleHe: 'שלב 10: תרגול ראיון עם AI',
    titleEn: 'Step 10: Practice Interviews with AI',
    descriptionHe: 'לחצ/י "התחל תרגול" לסימולציית ראיון. ה-AI שואל שאלות מותאמות לתפקיד — עונים בקול או בטקסט ומקבלים פידבק.',
    descriptionEn: 'Click "Start Practice" for an interview simulation. AI asks role-specific questions — answer by voice or text and get feedback.',
    icon: Mic,
    sectionLabelHe: 'שלב 10 — הכנה לראיון',
    sectionLabelEn: 'Step 10 — Interview Prep',
  },

  // 11. Messages
  {
    section: 'messages',
    targetSelector: '[data-tour="message-inbox"]',
    titleHe: 'שלב 11: הודעות ממגייסים',
    titleEn: 'Step 11: Messages from Recruiters',
    descriptionHe: 'כשמגייס/ת מתעניינ/ת — ההודעה מגיעה לכאן. אפשר לענות, לצרף קבצים, ולנהל את כל התקשורת במקום אחד.',
    descriptionEn: 'When a recruiter is interested — the message arrives here. Reply, attach files, manage all communication in one place.',
    icon: MessageSquare,
    sectionLabelHe: 'שלב 11 — הודעות',
    sectionLabelEn: 'Step 11 — Messages',
  },

  // ── PHASE 2: FEATURES ────────────────────────────────────

  // 12. PLUG AI Chat
  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'PLUG AI — העוזר האישי',
    titleEn: 'PLUG AI — Your Personal Assistant',
    descriptionHe: 'PLUG מכיר את כל ההגשות ויכול לעזור עם אסטרטגיה, כיסויי מכתב, הכנה לראיון, וניתוח שוק. פשוט לשאול.',
    descriptionEn: 'PLUG knows all your applications and can help with strategy, cover letters, interview prep, and market analysis. Just ask.',
    icon: MessageCircle,
    sectionLabelHe: 'פיצ\'רים — PLUG AI',
    sectionLabelEn: 'Features — PLUG AI',
  },

  // 13. Community Feed
  {
    section: 'feed',
    targetSelector: '[data-tour="feed-content"]',
    titleHe: 'פיד הקהילה המקצועי',
    titleEn: 'Professional Community Feed',
    descriptionHe: 'מגייסים ואנשי מקצוע משתפים משרות, טיפים ותובנות בזמן אמת. אפשר לפרסם, להגיב, ולהצטרף לדיונים — ולבנות נוכחות מקצועית.',
    descriptionEn: 'Recruiters and professionals share jobs, tips, and insights in real time. Post, comment, join discussions — build your professional presence.',
    icon: Users,
    sectionLabelHe: 'פיצ\'רים — קהילה',
    sectionLabelEn: 'Features — Community',
  },

  // 14. My Network
  {
    section: 'overview',
    targetSelector: '[data-tour="connections-widget"]',
    titleHe: 'הרשת שלי',
    titleEn: 'My Network',
    descriptionHe: 'כאן מוצגים הקשרים שלך — מגייסים, קולגות וחברות. לחיצה על "הרשת שלי" בתפריט מאפשרת לנהל, לחפש ולהתחבר לאנשי מקצוע רלוונטיים.',
    descriptionEn: 'Your connections are shown here — recruiters, colleagues, and companies. Click "My Network" in the menu to manage, search, and connect with relevant professionals.',
    icon: Users,
    sectionLabelHe: 'פיצ\'רים — הרשת שלי',
    sectionLabelEn: 'Features — My Network',
  },

  // 15. Vouches
  {
    section: 'overview',
    targetSelector: '[data-tour="vouch-widget"]',
    titleHe: 'Vouches — המלצות מאנשים שעבדתם איתם',
    titleEn: 'Vouches — Recommendations from Colleagues',
    descriptionHe: 'לוחצים על "בקש" כדי לשלוח לינק למנהל/ת או עמית/ה. המלצה (Vouch) מוצגת על הפרופיל ומגייסים רואים אותה. זהו אחד הגורמים הכי משפיעים על קבלה.',
    descriptionEn: 'Click "Request" to send a link to a manager or colleague. A Vouch appears on your profile and recruiters see it — one of the biggest factors in getting hired.',
    icon: Heart,
    sectionLabelHe: 'פיצ\'רים — Vouches',
    sectionLabelEn: 'Features — Vouches',
  },

  // 16. Personal Card
  {
    section: 'profile-docs',
    targetSelector: '[data-tour="resume-upload"]',
    titleHe: 'הכרטיס האישי',
    titleEn: 'Your Personal Card',
    descriptionHe: 'PLUG יוצר כרטיס אישי עם קישור ייחודי — תמונה, כישורים, ניסיון וקורות חיים. ניתן לשתף אותו עם מגייסים ישירות. כניסה דרך "הפרופיל שלי" ← "כרטיס אישי".',
    descriptionEn: 'PLUG creates a personal card with a unique link — photo, skills, experience, and resume. Share it directly with recruiters. Access via "My Profile" ← "Personal Card".',
    icon: CreditCard,
    sectionLabelHe: 'פיצ\'רים — כרטיס אישי',
    sectionLabelEn: 'Features — Personal Card',
  },

  // 17. Home Assignments
  {
    section: 'overview',
    targetSelector: '[data-tour="onboarding-checklist"]',
    titleHe: 'מבחני בית — הוכחת כישורים',
    titleEn: 'Home Assignments — Prove Your Skills',
    descriptionHe: 'פותרים אתגרים אמיתיים מחברות טכנולוגיה ומציגים אותם בפרופיל. מגייסים מעריכים ראיות של יכולת מעבר לקו"ח. כניסה דרך "לוח המטלות" בתפריט.',
    descriptionEn: 'Solve real challenges from tech companies and showcase them in your profile. Recruiters value proof of ability beyond a resume. Access via "Assignments Board" in the menu.',
    icon: ClipboardList,
    sectionLabelHe: 'פיצ\'רים — מבחני בית',
    sectionLabelEn: 'Features — Assignments',
  },

  // 18. My Stats
  {
    section: 'my-stats',
    targetSelector: '[data-tour="my-stats-page"]',
    titleHe: 'נתוני החיפוש שלי',
    titleEn: 'My Search Stats',
    descriptionHe: 'עוקבים אחר ביצועי החיפוש — כמה הגשות, שיעור תגובות, ראיונות, ותצוגה כרונולוגית של כל הפעילות. כניסה דרך "נתוני החיפוש שלי" בתפריט.',
    descriptionEn: 'Track search performance — applications, response rates, interviews, and a chronological view of all activity. Access via "My Stats" in the menu.',
    icon: TrendingUp,
    sectionLabelHe: 'פיצ\'רים — סטטיסטיקות',
    sectionLabelEn: 'Features — My Stats',
  },

  // 19. Visible to Recruiters + My Secrets
  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'גלוי/ה למגייסים ו"הסודות שלי"',
    titleEn: 'Visible to Recruiters & "My Secrets"',
    descriptionHe: '"גלוי למגייסים" — הגדרה בפרופיל שמאפשרת למגייסים למצוא אתכן/ם. "הסודות שלי" — תובנות AI על חברות מ-LinkedIn: מה החברה עושה, אנשי קשר, ורמת ההתאמה האישית.',
    descriptionEn: '"Visible to Recruiters" — a profile setting that lets recruiters find you. "My Secrets" — AI insights on companies from LinkedIn: what they do, contacts, and your personal fit.',
    icon: Eye,
    sectionLabelHe: 'פיצ\'רים — נראות',
    sectionLabelEn: 'Features — Visibility',
  },

  // 20. Ideas Board
  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'לוח הרעיונות',
    titleEn: 'Ideas Board',
    descriptionHe: 'יש רעיון לפיצ\'ר חדש ב-PLUG? מפרסמים אותו בלוח הרעיונות, מצביעים על רעיונות של אחרים, ויוצרים יחד את עתיד הפלטפורמה. כניסה דרך "לוח הרעיונות" בתפריט.',
    descriptionEn: 'Have an idea for a new PLUG feature? Post it on the Ideas Board, vote on others\' ideas, and shape the platform\'s future together. Access via "Ideas Board" in the menu.',
    icon: Lightbulb,
    sectionLabelHe: 'פיצ\'רים — רעיונות',
    sectionLabelEn: 'Features — Ideas Board',
  },

  // 21. Credits & Ambassador
  {
    section: 'overview',
    targetSelector: '[data-tour="credit-hud"]',
    titleHe: 'דלק ומערכת השגרירים',
    titleEn: 'Fuel & Ambassador System',
    descriptionHe: 'הדלק מניע את ה-AI — יש דלק יומי שמתחדש כל בוקר. צוברים XP ממשימות שגריר כדי לעלות דרגה ולקבל יותר דלק. הזמנת חברים = בונוס מיידי.',
    descriptionEn: 'Fuel powers the AI — you get daily fuel that renews every morning. Earn XP from ambassador missions to level up and get more fuel. Invite friends = instant bonus.',
    icon: Zap,
    sectionLabelHe: 'פיצ\'רים — דלק',
    sectionLabelEn: 'Features — Fuel',
  },

  // 22. Nudge Tips
  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'PLUG ישלח טיפים תוך כדי שימוש',
    titleEn: 'PLUG sends tips as you use the app',
    descriptionHe: 'מדי פעם יצוץ פופאפ עם פיצ\'ר שעוד לא נוסה, הזמנה לקהילת הוואטסאפ שלנו, או הטבת קרדיטים. ניתן לסגור אותו בכל רגע.',
    descriptionEn: 'Occasionally a popup will appear with a feature you haven\'t tried, an invite to our WhatsApp community, or a credit bonus. Close it any time.',
    icon: Bell,
    sectionLabelHe: 'פיצ\'רים — טיפים',
    sectionLabelEn: 'Features — Tips',
  },

  // 23. Chrome Extension (last)
  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'תוסף PLUG לכרום — הכלי הכי חזק',
    titleEn: 'PLUG Chrome Extension — The Ultimate Power-Up',
    descriptionHe: 'עם התוסף, PLUG עובד ישירות ב-LinkedIn ו-AllJobs — מנתח משרות בזמן גלישה, ממלא טפסים אוטומטית, ושומר הכל לדשבורד. חינמי לחלוטין.',
    descriptionEn: 'With the extension, PLUG works directly on LinkedIn & AllJobs — analyzes jobs while browsing, auto-fills forms, and saves everything to the dashboard. Completely free.',
    icon: Chrome,
    sectionLabelHe: 'פיצ\'רים — תוסף כרום',
    sectionLabelEn: 'Features — Chrome Extension',
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

  const startTour = useCallback(() => {
    if (role && role !== 'job_seeker') return;
    setCurrentStep(0);
    setIsActive(true);
    setShowTransition(false);
    setPendingStep(null);
    localStorage.removeItem(TOUR_STORAGE_KEY);
  }, [role]);

  useEffect(() => {
    if (!user) return;
    return;
  }, [user, role]);

  useEffect(() => {
    if (!isActive || showTransition) return;
    const step = TOUR_STEPS[currentStep];
    if (step && step.section !== currentSection) {
      onNavigate(step.section);
    }
  }, [currentStep, isActive, currentSection, onNavigate, showTransition]);

  useEffect(() => {
    const handler = () => {
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

  if (!isActive || role !== 'job_seeker') return null;

  const navigateStep = (nextStep: number) => {
    const curSection  = TOUR_STEPS[currentStep].section;
    const nextSection = TOUR_STEPS[nextStep].section;

    if (curSection !== nextSection) {
      const tip = getPersonalizedTip(curSection, nextSection);
      setTransitionTip(tip);
      setShowTransition(true);
      setPendingStep(nextStep);
      onNavigate(nextSection);
    } else {
      setCurrentStep(nextStep);
    }
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      navigateStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      navigateStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setIsActive(false);
    setShowTransition(false);
    onNavigate('overview');
    toast.success(
      isHebrew ? 'כל הכבוד! סיימת את הסיור המודרך!' : 'Great job! You completed the guided tour!',
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
            totalSteps={TOUR_STEPS.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleComplete}
            isFirst={currentStep === 0}
            isLast={currentStep === TOUR_STEPS.length - 1}
            icon={step.icon}
            isElementFound={isElementFound}
            customImage={step.customImage}
            sectionLabel={isHebrew ? step.sectionLabelHe : step.sectionLabelEn}
          />
        </>
      )}
    </>
  );
}
