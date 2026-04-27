import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardSection } from '@/components/dashboard/DashboardLayout';
import { TourOverlay } from './TourOverlay';
import { TourTooltip } from './TourTooltip';
import { TransitionScreen } from './TransitionScreen';
import { useTourTips } from './useTourTips';
import {
  BarChart3, Brain, FileEdit, SlidersHorizontal, Search,
  Zap, Mic, MessageSquare, Heart, Users, ClipboardList,
  CreditCard, Eye, Lightbulb, Bell, MessageCircle,
  CalendarDays, Building2, Bot, Clock, Sparkles, LayoutDashboard,
} from 'lucide-react';
import { toast } from 'sonner';
import onboardingNotesImage from '@/assets/onboarding-notes-new.png';

export interface TourStep {
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
// TOUR STEPS - ordered to minimize section jumps.
// Hebrew text uses plural form (בואו, הגישו, etc.)
// ═══════════════════════════════════════════════════════════
export const TOUR_STEPS: TourStep[] = [

  // ── שלב 1: ברוכים הבאים (overview) ─────────────────────

  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'ברוכים הבאים לפלאג! 🎉',
    titleEn: 'Welcome to PLUG! 🎉',
    descriptionHe: 'פלאג הוא המרכז שממנו מנהלים את כל חיפוש העבודה - מהגשה ועד הצעת עבודה. המספרים כאן מתעדכנים בזמן אמת. בואו נסביר הכל.',
    descriptionEn: 'PLUG is your command center for the entire job search - from first application to job offer. Numbers update in real time. Let\'s walk you through everything.',
    icon: BarChart3,
    sectionLabelHe: 'שלב 1: ברוכים הבאים',
    sectionLabelEn: 'Step 1: Welcome',
  },

  // ── שלבים 2-3: פרופיל (profile-docs) ───────────────────

  {
    section: 'profile-docs',
    targetSelector: '[data-tour="resume-upload"]',
    titleHe: 'העלאת קורות חיים - פלאג לומד אתכם',
    titleEn: 'Upload Your CV - PLUG Learns You',
    descriptionHe: 'העלו קו"ח פה. פלאג ינתח כישורים, ניסיון ותחומים - וישתמש בזה כדי להתאים משרות, לשפר את הפרופיל ולעזור בצ\'אט. שניות ספורות.',
    descriptionEn: 'Upload your CV here. PLUG analyzes your skills, experience, and interests - and uses that to match jobs, improve your profile, and help in chat. Takes seconds.',
    icon: Brain,
    sectionLabelHe: 'שלב 2: פרופיל',
    sectionLabelEn: 'Step 2: Profile',
  },

  {
    section: 'profile-docs',
    targetSelector: '[data-tour="resume-upload"]',
    titleHe: 'כרטיס אישי - לינק אחד שמספר הכל',
    titleEn: 'Personal Card - One Link That Says It All',
    descriptionHe: 'פלאג יוצר כרטיס עם לינק ייחודי - תמונה, כישורים, ניסיון וקו"ח. שלחו אותו למגייסים ישירות. כניסה דרך "הפרופיל שלי" ← "כרטיס אישי".',
    descriptionEn: 'PLUG creates a card with a unique link - photo, skills, experience, and CV. Send it directly to recruiters. Access via "My Profile" ← "Personal Card".',
    icon: CreditCard,
    sectionLabelHe: 'שלב 3: כרטיס אישי',
    sectionLabelEn: 'Step 3: Personal Card',
  },

  // ── שלבים 4-5: בניית קו"ח (cv-builder) ─────────────────

  {
    section: 'cv-builder',
    targetSelector: '[data-tour="cv-builder"]',
    titleHe: 'בונה קו"ח - 10 תבניות או כתיבה מאפס',
    titleEn: 'CV Builder - 10 Templates or Start Fresh',
    descriptionHe: 'בחרו תבנית או כתבו מאפס, מלאו פרטים ולחצו "הורד PDF". פלאג מציע bullet rewrites ומבנה STAR לסיפורים. ✨',
    descriptionEn: 'Pick a template or start from scratch, fill in details, hit "Download PDF". PLUG suggests bullet rewrites and STAR story structure. ✨',
    icon: FileEdit,
    customImage: onboardingNotesImage,
    sectionLabelHe: 'שלב 4: בניית קו"ח',
    sectionLabelEn: 'Step 4: CV Builder',
  },

  {
    section: 'cv-builder',
    targetSelector: '[data-tour="cv-builder"]',
    titleHe: 'משפר קו"ח חכם - מותאם לכל משרה',
    titleEn: 'Smart CV Enhancer - Tailored to Each Job',
    descriptionHe: 'הדביקו תיאור משרה ופלאג יתאים את הקו"ח שלכם לתפקיד הספציפי - מנסח מחדש bullet points, מוסיף מילות מפתח לATS, ומוציא ציון התאמה. כניסה דרך "שפר קו"ח" בבונה.',
    descriptionEn: 'Paste a job description and PLUG tailors your CV to that specific role - rewrites bullet points, adds ATS keywords, and gives a match score. Access via "Enhance CV" in the builder.',
    icon: Sparkles,
    sectionLabelHe: 'שלב 5: שיפור קו"ח',
    sectionLabelEn: 'Step 5: CV Enhancer',
  },

  // ── שלב 6: הגדרות (settings) ────────────────────────────

  {
    section: 'settings',
    targetSelector: '[data-tour="preferences"]',
    titleHe: 'הגדרות - תגידו לפלאג מה אתם מחפשים',
    titleEn: 'Settings - Tell PLUG What You\'re Looking For',
    descriptionHe: 'הגדירו סוג משרה, מיקום, תחום ושכר מצופה. כאן גם שולטים על נראות הפרופיל למגייסים ומחברים Gmail לסנכרון אוטומטי של תקשורת.',
    descriptionEn: 'Set job type, location, field, and expected salary. Also control profile visibility to recruiters and connect Gmail for automatic communication sync.',
    icon: SlidersHorizontal,
    sectionLabelHe: 'שלב 6: הגדרות',
    sectionLabelEn: 'Step 6: Settings',
  },

  // ── שלב 7: חיפוש משרות (job-search) ────────────────────

  {
    section: 'job-search',
    targetSelector: '[data-tour="job-filters"]',
    titleHe: 'חיפוש משרות - מיקוד + ציון התאמה',
    titleEn: 'Job Search - Focus + Match Score',
    descriptionHe: 'סננו לפי מיקום, קטגוריה ושכר. לחצו "מתאים לי" לסינון פלאג. כפתור המפה מציג איפה המשרות מרוכזות - שלא תחמיצו כלום בעיר שלכם. ציון 80%+ = תגישו עכשיו.',
    descriptionEn: 'Filter by location, category, and salary. Click "Match Me" for PLUG filtering. The map button shows where jobs cluster - so you don\'t miss anything in your city. 80%+ score = apply now.',
    icon: Search,
    sectionLabelHe: 'שלב 7: חיפוש משרות',
    sectionLabelEn: 'Step 7: Job Search',
  },

  // ── שלב 8: ספריית חברות (companies) ────────────────────

  {
    section: 'companies',
    targetSelector: '[data-tour="companies-grid"]',
    titleHe: 'ספריית חברות - מצאו את ה-vibe שלכם',
    titleEn: 'Company Directory - Find Your Vibe',
    descriptionHe: 'גלריית חברות עם פילטר לפי tech stack, גודל, תחום ומדיניות remote. לחיצה על חברה מציגה משרות פתוחות, אנשי קשר ותרבות ארגונית. כניסה דרך "חברות" בתפריט.',
    descriptionEn: 'Company gallery with filters by tech stack, size, industry, and remote policy. Click a company to see open roles, contacts, and culture. Access via "Companies" in the menu.',
    icon: Building2,
    sectionLabelHe: 'שלב 8: ספריית חברות',
    sectionLabelEn: 'Step 8: Company Directory',
  },

  // ── שלבים 9-10: overview ────────────────────────────────

  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'ספרינט - סוויפ על משרות כמו Tinder 👆',
    titleEn: 'Sprint - Swipe Jobs Like Tinder 👆',
    descriptionHe: 'ממשק מהיר - שמאל לדחיה, ימין לשמירה. מושלם ל-5 דקות בתור לקפה.',
    descriptionEn: 'Fast swipe interface - left to skip, right to save. Perfect for 5 minutes in line for coffee.',
    icon: Zap,
    sectionLabelHe: 'שלב 9: ספרינט',
    sectionLabelEn: 'Step 9: Sprint',
  },

  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'Plug Chat - 25 פרומפטים + 4 מומחי פלאג',
    titleEn: 'Plug Chat - 25 Prompts + 4 PLUG Specialists',
    descriptionHe: 'פלאג יודע את כל ההגשות שלכם. יש 25 פרומפטים מוכנים - לחצו על הכוכב בצ\'אט. ויש 4 מומחי פלאג: Resume Tailor, Interview Coach, Salary Negotiator, Recruiter Outreach. פשוט לשאול.',
    descriptionEn: 'PLUG knows all your applications. There are 25 ready prompts - click the star in chat. And 4 PLUG specialists: Resume Tailor, Interview Coach, Salary Negotiator, Recruiter Outreach. Just ask.',
    icon: MessageCircle,
    sectionLabelHe: 'שלב 10: Plug Chat',
    sectionLabelEn: 'Step 10: Plug Chat',
  },

  // ── שלב 11: מועמדויות (applications) ───────────────────

  {
    section: 'applications',
    targetSelector: '[data-tour="add-application"]',
    titleHe: 'מועמדויות - Kanban, לוח זמנים ופידבק',
    titleEn: 'Applications - Kanban, Schedule & Feedback',
    descriptionHe: 'הדביקו לינק למשרה - פלאג שולף את כל הפרטים. הציגו את המועמדויות כ-Kanban (גררו קלפים בין שלבים) או כקלנדר. נדחתם? סמנו את הסיבה - פלאג לומד ועוזר לשפר.',
    descriptionEn: 'Paste a job link - PLUG extracts all details. View your applications as a Kanban board (drag cards between stages) or as a calendar. Rejected? Tag the reason - PLUG learns and helps improve.',
    icon: LayoutDashboard,
    sectionLabelHe: 'שלב 11: מועמדויות',
    sectionLabelEn: 'Step 11: Applications',
  },

  // ── שלב 12: יומן (schedule) ─────────────────────────────

  {
    section: 'schedule',
    targetSelector: '[data-tour="schedule-calendar"]',
    titleHe: 'יומן החיפוש - כל הראיונות במקום אחד',
    titleEn: 'Search Journal - All Interviews in One Place',
    descriptionHe: 'יומן שמרכז ראיונות, follow-ups, תזכורות ומשימות. רואים את כל מה שתוכנן לשבוע הקרוב, מסמנים משימות כבוצעו ועוקבים אחרי תשובות מחברות. אפשר לחבר ל-Google Calendar.',
    descriptionEn: 'Journal that centralizes interviews, follow-ups, reminders, and tasks. See everything planned for the coming week, mark tasks done, and track responses from companies. Connect to Google Calendar.',
    icon: CalendarDays,
    sectionLabelHe: 'שלב 12: יומן החיפוש',
    sectionLabelEn: 'Step 12: Search Journal',
  },

  // ── שלב 13: סימולציות (interview-prep) ──────────────────

  {
    section: 'interview-prep',
    targetSelector: '[data-tour="interview-prep"]',
    titleHe: 'סימולציות',
    titleEn: 'Simulations',
    descriptionHe: 'לחצו "התחל תרגול" לסימולציית ראיון עם פלאג. השאלות מותאמות לחברה ולתפקיד הספציפי. עונים בקול או בטקסט ומקבלים פידבק מיידי.',
    descriptionEn: 'Click "Start Practice" for an interview simulation with PLUG. Questions are tailored to the specific company and role. Answer by voice or text and get instant feedback.',
    icon: Mic,
    sectionLabelHe: 'שלב 13: סימולציות',
    sectionLabelEn: 'Step 13: Simulations',
  },

  // ── שלב 14: הודעות (messages) ───────────────────────────

  {
    section: 'messages',
    targetSelector: '[data-tour="message-inbox"]',
    titleHe: 'הודעות ממגייסים - הכל כאן',
    titleEn: 'Messages from Recruiters - All Here',
    descriptionHe: 'מגייס מתעניין? ההודעה מגיעה לכאן. עונים, מצרפים קבצים ומנהלים את כל התקשורת במקום אחד - בלי לחפש ב-Gmail.',
    descriptionEn: 'Recruiter interested? The message lands here. Reply, attach files, manage all communication in one place - no digging through Gmail.',
    icon: MessageSquare,
    sectionLabelHe: 'שלב 14: הודעות',
    sectionLabelEn: 'Step 14: Messages',
  },

  // ── שלב 15: פיד (feed) ──────────────────────────────────

  {
    section: 'feed',
    targetSelector: '[data-tour="feed-content"]',
    titleHe: 'פיד הקהילה - להיות בלופ',
    titleEn: 'Community Feed - Stay in the Loop',
    descriptionHe: 'מגייסים ואנשי מקצוע משתפים משרות, טיפים ותובנות. פרסמו, הגיבו, הצטרפו לדיונים - ובנו נוכחות מקצועית שמגייסים מבחינים בה.',
    descriptionEn: 'Recruiters and pros share jobs, tips, and insights. Post, comment, join discussions - build a professional presence recruiters actually notice.',
    icon: Users,
    sectionLabelHe: 'שלב 15: קהילה',
    sectionLabelEn: 'Step 15: Community',
  },

  // ── שלבים 16-24: פיצ\'רים (overview) ────────────────────

  {
    section: 'overview',
    targetSelector: '[data-tour="connections-widget"]',
    titleHe: 'קשרים-הזדמנויות',
    titleEn: 'Connections = Opportunities',
    descriptionHe: 'כאן מוצגים הקשרים שלכם - מגייסים, קולגות וחברות. לחיצה על "הרשת שלי" בתפריט מאפשרת לנהל, לחפש ולהתחבר לאנשי מקצוע רלוונטיים. רוב ההצעות מגיעות דרך קשרים - לא דרך מודעות.',
    descriptionEn: 'Your connections live here - recruiters, colleagues, and companies. Click "My Network" to manage and connect with the right people. Most offers come through connections - not job ads.',
    icon: Users,
    sectionLabelHe: 'פיצ\'רים: קשרים',
    sectionLabelEn: 'Features: Connections',
  },

  {
    section: 'overview',
    targetSelector: '[data-tour="vouch-widget"]',
    titleHe: 'Vouches - קשרים שמדברים בשבילכם',
    titleEn: 'Vouches - Connections That Speak For You',
    descriptionHe: 'לחצו "בקש" ושלחו לינק למנהל שעבדתם איתו. ה-Vouch מוצג על הפרופיל ומגייסים רואים אותו - אחד הגורמים הכי משפיעים על קבלה לעבודה.',
    descriptionEn: 'Click "Request" and send a link to a manager you worked with. The Vouch shows on your profile and recruiters see it - one of the biggest hiring factors.',
    icon: Heart,
    sectionLabelHe: 'פיצ\'רים: Vouches',
    sectionLabelEn: 'Features: Vouches',
  },

  {
    section: 'overview',
    targetSelector: '[data-tour="onboarding-checklist"]',
    titleHe: 'מבחני בית - הוכחת יכולות אמיתיות',
    titleEn: 'Home Assignments - Real Proof of Ability',
    descriptionHe: 'פתרו אתגרים אמיתיים מחברות טכנולוגיה והציגו אותם בפרופיל. מגייסים מעריכים הוכחת יכולת מעבר לקו"ח. כניסה דרך "לוח המטלות" בתפריט.',
    descriptionEn: 'Solve real challenges from tech companies and showcase them in your profile. Recruiters value proof of ability beyond a CV. Access via "Assignments Board" in the menu.',
    icon: ClipboardList,
    sectionLabelHe: 'פיצ\'רים: מבחני בית',
    sectionLabelEn: 'Features: Assignments',
  },

  {
    section: 'my-stats',
    targetSelector: '[data-tour="my-stats-page"]',
    titleHe: 'סטטיסטיקות החיפוש שלי',
    titleEn: 'My Search Stats',
    descriptionHe: 'עוקבים אחרי ביצועי החיפוש - הגשות, שיעור תגובות, ראיונות. בנוסף: כמה שעות השקעתם בחיפוש עבודה השבוע? פלאג סופר בשבילכם. כניסה דרך "נתוני החיפוש שלי".',
    descriptionEn: 'Track search performance - applications, response rates, interviews. Plus: how many hours did you spend job searching this week? PLUG counts for you. Access via "My Stats".',
    icon: Clock,
    sectionLabelHe: 'פיצ\'רים: סטטיסטיקות',
    sectionLabelEn: 'Features: My Stats',
  },

  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'נראות ו"הסודות שלי"',
    titleEn: 'Visibility & "My Secrets"',
    descriptionHe: '• "גלוי למגייסים" - הגדרה שמאפשרת למגייסים למצוא אתכם\n• "הסודות שלי" - תובנות פלאג על חברות מ-LinkedIn: מה הן עושות, אנשי קשר, ורמת ההתאמה שלכם',
    descriptionEn: '• "Visible to Recruiters" - a setting that lets recruiters find you\n• "My Secrets" - PLUG insights on companies from LinkedIn: what they do, who to contact, and your fit',
    icon: Eye,
    sectionLabelHe: 'פיצ\'רים: נראות',
    sectionLabelEn: 'Features: Visibility',
  },

  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'לוח הרעיונות - עצבו את פלאג',
    titleEn: 'Ideas Board - Shape PLUG',
    descriptionHe: 'יש רעיון לפיצ\'ר? פרסמו בלוח הרעיונות, הצביעו על רעיונות של אחרים, ויחד נבנה את עתיד הפלטפורמה. כניסה דרך "לוח הרעיונות" בתפריט.',
    descriptionEn: 'Got a feature idea? Post on the Ideas Board, vote on others\' ideas, and together we\'ll build the platform\'s future. Access via "Ideas Board" in the menu.',
    icon: Lightbulb,
    sectionLabelHe: 'פיצ\'רים: רעיונות',
    sectionLabelEn: 'Features: Ideas Board',
  },

  {
    section: 'overview',
    targetSelector: '[data-tour="credit-hud"]',
    titleHe: 'קרדיטים - 15 ביום, כל בוקר מחדש',
    titleEn: 'Credits - 15 Per Day, Every Morning',
    descriptionHe: 'קרדיטים מניעים את פלאג - 15 מתחדשים כל בוקר. השלימו משימות לעלייה ברמה ועוד קרדיטים. הזמנת חבר = בונוס מיידי. אל תשאירו אותם לפקוע!',
    descriptionEn: 'Credits power PLUG - 15 renew every morning. Complete missions to level up and earn more. Invite a friend = instant bonus. Don\'t let them expire!',
    icon: Zap,
    sectionLabelHe: 'פיצ\'רים: קרדיטים',
    sectionLabelEn: 'Features: Credits',
  },

  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'פלאג שולח טיפים - תמיד בזמן הנכון',
    titleEn: 'PLUG Sends Tips - Always at the Right Time',
    descriptionHe: 'מדי פעם יצוץ פופאפ עם פיצ\'ר שעוד לא ניסתם, הזמנה לקהילת הווטסאפ שלנו, או קרדיטים בונוס. אפשר לסגור בכל רגע.',
    descriptionEn: 'Occasionally a popup appears with a feature you haven\'t tried yet, a WhatsApp community invite, or bonus credits. Close it any time.',
    icon: Bell,
    sectionLabelHe: 'פיצ\'רים: טיפים',
    sectionLabelEn: 'Features: Tips',
  },

  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'תוסף כרום + AI Agent - פלאג עובד בכל מקום 🤖',
    titleEn: 'Chrome Extension + AI Agent - PLUG Works Everywhere 🤖',
    descriptionHe: 'הורידו את התוסף מהסייד-פאנל. עם התוסף, פלאג עובד ישירות ב-LinkedIn ו-AllJobs - מנתח משרות בזמן גלישה, ממלא טפסים ושומר הכל לדשבורד. הפעילו את ה-AI Agent - הוא סורק, מנתח ומגיש מועמדויות. עם HITL: הסוכן מציג לכם כל משרה ומחכה לאישורכם לפני הגשה.',
    descriptionEn: 'Download the extension from the side panel. With it, PLUG works directly on LinkedIn & AllJobs - analyzes jobs while browsing, fills forms, saves everything to the dashboard. Activate the AI Agent - it scans, analyzes fit, and submits applications. With HITL: the agent shows you each job and waits for your approval before applying.',
    icon: Bot,
    sectionLabelHe: 'פיצ\'רים: תוסף וAgent',
    sectionLabelEn: 'Features: Extension and Agent',
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

    // Start tour at a specific step index (from "By Screens" view)
    const handlerAtStep = (e: Event) => {
      const idx = (e as CustomEvent<{ stepIndex: number }>).detail?.stepIndex ?? 0;
      setCurrentStep(idx);
      setIsActive(true);
      setShowTransition(false);
      setPendingStep(null);
    };
    window.addEventListener('plug:start-tour-at-step', handlerAtStep);

    return () => {
      window.removeEventListener('plug:start-job-seeker-tour', handler);
      window.removeEventListener('plug:start-tour-at-step', handlerAtStep);
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
        duration={800}
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
