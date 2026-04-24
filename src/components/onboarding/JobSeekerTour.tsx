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
// then features. Each step has a sectionLabel so users
// always know which area they're currently viewing.
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
    sectionLabelHe: 'שלב 1 — ברוך הבא',
    sectionLabelEn: 'Step 1 — Welcome',
  },

  // 2. Upload Resume
  {
    section: 'profile-docs',
    targetSelector: '[data-tour="resume-upload"]',
    titleHe: 'שלב 2: העלה קורות חיים',
    titleEn: 'Step 2: Upload Your Resume',
    descriptionHe: 'לחץ כאן כדי להעלות קו"ח. ה-AI ינתח אותו, יזהה מיומנויות וניסיון, ויתאים לך משרות אוטומטית.',
    descriptionEn: 'Click here to upload your resume. AI will analyze it, identify skills and experience, and automatically match you with jobs.',
    icon: Brain,
    sectionLabelHe: 'שלב 2 — פרופיל',
    sectionLabelEn: 'Step 2 — Profile',
  },

  // 3. CV Builder — with AI, templates, prompts, mobile warning
  {
    section: 'cv-builder',
    targetSelector: '[data-tour="cv-builder"]',
    titleHe: 'שלב 3: בנה ושפר קורות חיים עם AI',
    titleEn: 'Step 3: Build & Improve Your CV with AI',
    descriptionHe: 'בחר תבנית מעוצבת, מלא פרטים, ולחץ "הורד PDF". תוך כדי כתיבה — AI ישפר כל סעיף, יציע ניסוח מחדש, ויתאים לתפקיד לפי פרומפט. שים לב: הכלי מומלץ לשימוש במחשב בלבד.',
    descriptionEn: 'Choose a designed template, fill in details, click "Download PDF". As you write — AI improves each section, suggests rewrites, and tailors to the role by prompt. Note: best used on desktop only.',
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
    descriptionHe: 'הגדר כאן את סוג המשרה, מיקום ותחומים שאתה מחפש. בנוסף — שלוט אם הפרופיל שלך גלוי למגייסים, וחבר את חשבון Gmail לסנכרון אוטומטי של תקשורת.',
    descriptionEn: 'Set your preferred job type, location, and fields. Also — control whether your profile is visible to recruiters, and connect Gmail for automatic communication sync.',
    icon: SlidersHorizontal,
    sectionLabelHe: 'שלב 4 — הגדרות',
    sectionLabelEn: 'Step 4 — Settings',
  },

  // 5. Job Search Filters
  {
    section: 'job-search',
    targetSelector: '[data-tour="job-filters"]',
    titleHe: 'שלב 5: חפש משרות לפי הקריטריונים שלך',
    titleEn: 'Step 5: Search Jobs by Your Criteria',
    descriptionHe: 'סנן לפי מיקום, קטגוריה, סוג משרה ושכר. ככל שתסנן מדויק יותר — כך המשרות שתראה יהיו רלוונטיות יותר.',
    descriptionEn: 'Filter by location, category, job type, and salary. The more precise your filters, the more relevant jobs you\'ll see.',
    icon: Search,
    sectionLabelHe: 'שלב 5 — חיפוש משרות',
    sectionLabelEn: 'Step 5 — Job Search',
  },

  // 6. Match Me (AI)
  {
    section: 'job-search',
    targetSelector: '[data-tour="company-recommendations"]',
    titleHe: 'שלב 6: AI בוחר בשבילך — Match Me',
    titleEn: 'Step 6: AI Picks for You — Match Me',
    descriptionHe: 'לחץ "מתאים לי" כדי שה-AI יסנן את כל המשרות ויציג רק את אלו שמתאימות לכישורים שלך. ציון 80%+ = כדאי מאוד להגיש.',
    descriptionEn: 'Click "Match Me" so AI filters all jobs and shows only those matching your skills. 80%+ score = definitely worth applying.',
    icon: Target,
    sectionLabelHe: 'שלב 6 — חיפוש משרות',
    sectionLabelEn: 'Step 6 — Job Search',
  },

  // 7. Sprint (Job Swipe)
  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'שלב 7: ספרינט — סוויפ על משרות מותאמות',
    titleEn: 'Step 7: Sprint — Swipe Through Matched Jobs',
    descriptionHe: 'מצא "ספרינט" בתפריט הצד. ממשק סוויפ מהיר — שמאל להדחה, ימין לשמירה. מושלם כשיש לך 5 דקות פנויות.',
    descriptionEn: 'Find "Sprint" in the side menu. Fast swipe interface — left to skip, right to save. Perfect when you have 5 spare minutes.',
    icon: Zap,
    sectionLabelHe: 'שלב 7 — ספרינט',
    sectionLabelEn: 'Step 7 — Sprint',
  },

  // 8. Apply — paste link
  {
    section: 'applications',
    targetSelector: '[data-tour="add-application"]',
    titleHe: 'שלב 8: הגש מועמדות — הדבק לינק וזהו',
    titleEn: 'Step 8: Apply — Just Paste a Link',
    descriptionHe: 'מצאת משרה באתר אחר? הדבק את הלינק כאן — AI ישלוף את כל הפרטים אוטומטית. כל המועמדויות שלך מנוהלות כאן במקום אחד.',
    descriptionEn: 'Found a job on another site? Paste the link here — AI extracts all details automatically. All your applications are managed here in one place.',
    icon: FileText,
    sectionLabelHe: 'שלב 8 — הגשת מועמדות',
    sectionLabelEn: 'Step 8 — Applications',
  },

  // 9. Interview Prep
  {
    section: 'interview-prep',
    targetSelector: '[data-tour="interview-prep"]',
    titleHe: 'שלב 9: תרגל ראיון עם AI',
    titleEn: 'Step 9: Practice Interviews with AI',
    descriptionHe: 'לחץ "התחל תרגול" לסימולציית ראיון. ה-AI שואל שאלות מותאמות לתפקיד שלך — אתה עונה בקול או בטקסט, ומקבל פידבק.',
    descriptionEn: 'Click "Start Practice" for an interview simulation. AI asks role-specific questions — answer by voice or text, and get feedback.',
    icon: Mic,
    sectionLabelHe: 'שלב 9 — הכנה לראיון',
    sectionLabelEn: 'Step 9 — Interview Prep',
  },

  // 10. Messages
  {
    section: 'messages',
    targetSelector: '[data-tour="message-inbox"]',
    titleHe: 'שלב 10: הודעות ממגייסים',
    titleEn: 'Step 10: Messages from Recruiters',
    descriptionHe: 'כשמגייס מתעניין בך — ההודעה מגיעה לכאן. ענה, צרף קבצים, ונהל את כל התקשורת במקום אחד.',
    descriptionEn: 'When a recruiter is interested — the message arrives here. Reply, attach files, manage all communication in one place.',
    icon: MessageSquare,
    sectionLabelHe: 'שלב 10 — הודעות',
    sectionLabelEn: 'Step 10 — Messages',
  },

  // ── PHASE 2: FEATURES ────────────────────────────────────

  // 11. PLUG AI Chat
  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'PLUG AI — העוזר האישי שלך',
    titleEn: 'PLUG AI — Your Personal Assistant',
    descriptionHe: 'PLUG מכיר את כל ההגשות שלך ויכול לעזור עם אסטרטגיה, כיסויי מכתב, הכנה לראיון, וניתוח שוק. פשוט שאל.',
    descriptionEn: 'PLUG knows all your applications and can help with strategy, cover letters, interview prep, and market analysis. Just ask.',
    icon: MessageCircle,
    sectionLabelHe: 'פיצ\'רים — PLUG AI',
    sectionLabelEn: 'Features — PLUG AI',
  },

  // 12. Community Feed
  {
    section: 'feed',
    targetSelector: '[data-tour="feed-content"]',
    titleHe: 'פיד הקהילה המקצועי',
    titleEn: 'Professional Community Feed',
    descriptionHe: 'מגייסים ואנשי מקצוע משתפים משרות, טיפים ותובנות בזמן אמת. פרסם, הגב, והצטרף לדיונים — ובנה נוכחות מקצועית.',
    descriptionEn: 'Recruiters and professionals share jobs, tips, and insights in real time. Post, comment, join discussions — build your professional presence.',
    icon: Users,
    sectionLabelHe: 'פיצ\'רים — קהילה',
    sectionLabelEn: 'Features — Community',
  },

  // 13. My Network
  {
    section: 'overview',
    targetSelector: '[data-tour="connections-widget"]',
    titleHe: 'הרשת שלי',
    titleEn: 'My Network',
    descriptionHe: 'כאן תראה את הקשרים שלך — מגייסים, קולגות וחברות. לחץ "הרשת שלי" בתפריט כדי לנהל, לחפש ולהתחבר לאנשי מקצוע רלוונטיים.',
    descriptionEn: 'Here you see your connections — recruiters, colleagues, and companies. Click "My Network" in the menu to manage, search, and connect with relevant professionals.',
    icon: Users,
    sectionLabelHe: 'פיצ\'רים — הרשת שלי',
    sectionLabelEn: 'Features — My Network',
  },

  // 14. Vouches
  {
    section: 'overview',
    targetSelector: '[data-tour="vouch-widget"]',
    titleHe: 'Vouches — המלצות מאנשים שעבדת איתם',
    titleEn: 'Vouches — Recommendations from Colleagues',
    descriptionHe: 'לחץ "בקש" כדי לשלוח לינק למנהל או עמית. המלצה (Vouch) מוצגת על הפרופיל ומגייסים רואים אותה. זה אחד הגורמים הכי משפיעים על קבלה.',
    descriptionEn: 'Click "Request" to send a link to a manager or colleague. A Vouch appears on your profile and recruiters see it. It\'s one of the biggest factors in getting hired.',
    icon: Heart,
    sectionLabelHe: 'פיצ\'רים — Vouches',
    sectionLabelEn: 'Features — Vouches',
  },

  // 15. Personal Card
  {
    section: 'profile-docs',
    targetSelector: '[data-tour="resume-upload"]',
    titleHe: 'הכרטיס האישי שלך',
    titleEn: 'Your Personal Card',
    descriptionHe: 'PLUG יוצר עבורך כרטיס אישי עם קישור ייחודי — תמונה, כישורים, ניסיון וקורות חיים. שתף אותו עם מגייסים ישירות. כנס לפרופיל שלי ← כרטיס אישי.',
    descriptionEn: 'PLUG creates a personal card with a unique link — photo, skills, experience, and resume. Share it directly with recruiters. Go to My Profile ← Personal Card.',
    icon: CreditCard,
    sectionLabelHe: 'פיצ\'רים — כרטיס אישי',
    sectionLabelEn: 'Features — Personal Card',
  },

  // 16. Home Assignments
  {
    section: 'overview',
    targetSelector: '[data-tour="onboarding-checklist"]',
    titleHe: 'מבחני בית — הוכח את הכישורים שלך',
    titleEn: 'Home Assignments — Prove Your Skills',
    descriptionHe: 'פתור אתגרים אמיתיים מחברות טכנולוגיה והצג אותם בפרופיל. מגייסים מעריכים ראיות של יכולת. כנס מ"לוח המטלות" בתפריט.',
    descriptionEn: 'Solve real challenges from tech companies and showcase them in your profile. Recruiters value proof of ability. Access via "Assignments Board" in the menu.',
    icon: ClipboardList,
    sectionLabelHe: 'פיצ\'רים — מבחני בית',
    sectionLabelEn: 'Features — Assignments',
  },

  // 17. My Stats & Search Journal
  {
    section: 'my-stats',
    targetSelector: '[data-tour="my-stats-page"]',
    titleHe: 'נתוני החיפוש ויומן החיפוש שלי',
    titleEn: 'My Stats & Search Journal',
    descriptionHe: 'עקוב אחר ביצועי החיפוש שלך — כמה הגשות, שיעור תגובות, ראיונות שעברת, ויומן כרונולוגי של כל הפעילות. כנס מ"נתוני החיפוש שלי" בתפריט.',
    descriptionEn: 'Track your search performance — applications, response rates, interviews, and a chronological journal of all activity. Access via "My Stats" in the menu.',
    icon: TrendingUp,
    sectionLabelHe: 'פיצ\'רים — הסטטיסטיקות',
    sectionLabelEn: 'Features — My Stats',
  },

  // 18. Visible to Recruiters + My Secrets
  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'גלוי למגייסים ו"הסודות שלי"',
    titleEn: 'Visible to Recruiters & "My Secrets"',
    descriptionHe: '"גלוי למגייסים" — הגדרה בפרופיל שמאפשרת למגייסים למצוא אותך. "הסודות שלי" — תובנות AI על חברות מ-LinkedIn: מה החברה עושה, אנשי קשר, ורמת ההתאמה לך.',
    descriptionEn: '"Visible to Recruiters" — a profile setting that lets recruiters find you. "My Secrets" — AI insights about companies from LinkedIn: what they do, contacts, and how well they fit you.',
    icon: Eye,
    sectionLabelHe: 'פיצ\'רים — נראות',
    sectionLabelEn: 'Features — Visibility',
  },

  // 19. Ideas Board
  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'לוח הרעיונות',
    titleEn: 'Ideas Board',
    descriptionHe: 'יש לך רעיון לפיצ\'ר חדש ב-PLUG? פרסם אותו בלוח הרעיונות, הצבע על רעיונות של אחרים, וצור את עתיד הפלטפורמה. כנס מ"לוח הרעיונות" בתפריט.',
    descriptionEn: 'Have an idea for a new PLUG feature? Post it on the Ideas Board, vote on others\' ideas, and shape the platform\'s future. Access via "Ideas Board" in the menu.',
    icon: Lightbulb,
    sectionLabelHe: 'פיצ\'רים — רעיונות',
    sectionLabelEn: 'Features — Ideas Board',
  },

  // 20. Credits & Ambassador
  {
    section: 'overview',
    targetSelector: '[data-tour="credit-hud"]',
    titleHe: 'דלק ומערכת שגרירים',
    titleEn: 'Fuel & Ambassador System',
    descriptionHe: 'הדלק מניע את ה-AI — יש לך דלק יומי שמתחדש כל בוקר. צבור XP ממשימות שגריר כדי לעלות דרגה ולקבל יותר דלק. הזמן חברים = בונוס מיידי.',
    descriptionEn: 'Fuel powers the AI — you get daily fuel that renews every morning. Earn XP from ambassador missions to level up and get more fuel. Invite friends = instant bonus.',
    icon: Zap,
    sectionLabelHe: 'פיצ\'רים — דלק',
    sectionLabelEn: 'Features — Fuel',
  },

  // 21. Nudge Tips
  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'PLUG ישלח לך טיפים תוך כדי שימוש',
    titleEn: 'PLUG will send you tips as you use the app',
    descriptionHe: 'מדי פעם יצוץ פופאפ עם פיצ\'ר שלא ניסית, הזמנה לקהילת הוואטסאפ שלנו, או הטבת קרדיטים. תוכל לסגור אותו בכל רגע.',
    descriptionEn: 'Occasionally a popup will appear with a feature you haven\'t tried, an invite to our WhatsApp community, or a credit bonus. Close it any time.',
    icon: Bell,
    sectionLabelHe: 'פיצ\'רים — טיפים',
    sectionLabelEn: 'Features — Tips',
  },

  // 22. Chrome Extension (last — biggest power-up)
  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'תוסף PLUG לכרום — הסיום המושלם',
    titleEn: 'PLUG Chrome Extension — The Ultimate Power-Up',
    descriptionHe: 'עם התוסף, PLUG עובד ישירות ב-LinkedIn ו-AllJobs — מנתח משרות בזמן גלישה, ממלא טפסים אוטומטית, ושומר הכל לדשבורד. חינמי לחלוטין.',
    descriptionEn: 'With the extension, PLUG works directly on LinkedIn & AllJobs — analyzes jobs while you browse, auto-fills forms, and saves everything to your dashboard. Completely free.',
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
