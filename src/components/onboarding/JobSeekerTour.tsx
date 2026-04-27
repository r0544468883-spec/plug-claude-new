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
  CalendarDays, Building2, Bot, MapPin, Clock, Sparkles, LayoutDashboard,
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
    titleHe: 'ברוכים הבאים ל-PLUG! 🎉',
    titleEn: 'Welcome to PLUG! 🎉',
    descriptionHe: 'PLUG הוא המרכז שממנו מנהלים את כל חיפוש העבודה — מהגשה ועד הצעת עבודה. המספרים כאן מתעדכנים בזמן אמת. בוא/י נסביר הכל.',
    descriptionEn: 'PLUG is your command center for the entire job search — from first application to job offer. Numbers update in real time. Let\'s walk you through everything.',
    icon: BarChart3,
    sectionLabelHe: 'שלב 1 — ברוכים הבאים',
    sectionLabelEn: 'Step 1 — Welcome',
  },

  // 2. Upload Resume
  {
    section: 'profile-docs',
    targetSelector: '[data-tour="resume-upload"]',
    titleHe: 'העלה/י קורות חיים — ה-AI לומד אותך',
    titleEn: 'Upload Your CV — AI Learns You',
    descriptionHe: 'העלה/י קו"ח פה. ה-AI ינתח כישורים, ניסיון ותחומים — וישתמש בזה כדי להתאים משרות, לשפר את הפרופיל ולעזור בצ\'אט. שניות ספורות.',
    descriptionEn: 'Upload your CV here. AI analyzes your skills, experience, and interests — and uses that to match jobs, improve your profile, and help in chat. Takes seconds.',
    icon: Brain,
    sectionLabelHe: 'שלב 2 — פרופיל',
    sectionLabelEn: 'Step 2 — Profile',
  },

  // 3. CV Builder
  {
    section: 'cv-builder',
    targetSelector: '[data-tour="cv-builder"]',
    titleHe: 'בונה קו"ח חכם — 10 תבניות + 20 שיפורי AI',
    titleEn: 'Smart CV Builder — 10 Templates + 20 AI Improvements',
    descriptionHe: 'בחר/י תבנית, מלא/י פרטים ולחץ "הורד PDF". ה-AI מציע bullet rewrites, מבנה STAR לסיפורים, ואפשר להדביק תיאור משרה ולקבל קו"ח מותאם לתפקיד הזה בלבד. ✨',
    descriptionEn: 'Pick a template, fill in details, hit "Download PDF". AI suggests bullet rewrites, STAR story structure, and you can paste a job description to get a CV tailored to that exact role. ✨',
    icon: FileEdit,
    customImage: onboardingNotesImage,
    sectionLabelHe: 'שלב 3 — בניית קו"ח',
    sectionLabelEn: 'Step 3 — CV Builder',
  },

  // 4. Settings
  {
    section: 'settings',
    targetSelector: '[data-tour="preferences"]',
    titleHe: 'הגדרות — תגיד/י ל-AI מה אתה/ת מחפש/ת',
    titleEn: 'Settings — Tell the AI What You\'re Looking For',
    descriptionHe: 'הגדר/י סוג משרה, מיקום, תחום ושכר מצופה. כאן גם שולטים על נראות הפרופיל למגייסים ומחברים Gmail לסנכרון אוטומטי של תקשורת.',
    descriptionEn: 'Set job type, location, field, and expected salary. Also control profile visibility to recruiters and connect Gmail for automatic communication sync.',
    icon: SlidersHorizontal,
    sectionLabelHe: 'שלב 4 — הגדרות',
    sectionLabelEn: 'Step 4 — Settings',
  },

  // 5. Job Search + Location View
  {
    section: 'job-search',
    targetSelector: '[data-tour="job-filters"]',
    titleHe: 'חיפוש משרות — AI Match + תצוגת מיקומים',
    titleEn: 'Job Search — AI Match + Location View',
    descriptionHe: 'סנן/י לפי מיקום, קטגוריה ושכר. לחצ/י "מתאים לי" לסינון AI. כפתור המפה מציג איפה המשרות מרוכזות — שלא תחמיצ/י כלום בעיר שלך. ציון 80%+ = תגיש/י עכשיו.',
    descriptionEn: 'Filter by location, category, and salary. Click "Match Me" for AI filtering. The map button shows where jobs cluster — so you don\'t miss anything in your city. 80%+ score = apply now.',
    icon: Search,
    sectionLabelHe: 'שלב 5 — חיפוש משרות',
    sectionLabelEn: 'Step 5 — Job Search',
  },

  // 6. Company Directory (NEW)
  {
    section: 'companies',
    targetSelector: '[data-tour="companies-grid"]',
    titleHe: 'ספריית חברות — מצא/י את ה-vibe שלך',
    titleEn: 'Company Directory — Find Your Vibe',
    descriptionHe: 'גלריית חברות עם פילטר לפי tech stack, גודל, תחום ומדיניות remote. לחיצה על חברה מציגה משרות פתוחות, אנשי קשר ותרבות ארגונית. כניסה דרך "חברות" בתפריט.',
    descriptionEn: 'Company gallery with filters by tech stack, size, industry, and remote policy. Click a company to see open roles, contacts, and culture. Access via "Companies" in the menu.',
    icon: Building2,
    sectionLabelHe: 'שלב 6 — ספריית חברות',
    sectionLabelEn: 'Step 6 — Company Directory',
  },

  // 7. Sprint (Job Swipe)
  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'ספרינט — סוויפ על משרות כמו Tinder 👆',
    titleEn: 'Sprint — Swipe Jobs Like Tinder 👆',
    descriptionHe: 'מצא/י "ספרינט" בתפריט הצד. ממשק סוויפ מהיר — שמאל לדחיה, ימין לשמירה. מושלם ל-5 דקות בתור לקפה.',
    descriptionEn: 'Find "Sprint" in the side menu. Fast swipe — left to skip, right to save. Perfect for 5 minutes in line for coffee.',
    icon: Zap,
    sectionLabelHe: 'שלב 7 — ספרינט',
    sectionLabelEn: 'Step 7 — Sprint',
  },

  // 8. Apply + Kanban + Rejection Feedback (UPDATED)
  {
    section: 'applications',
    targetSelector: '[data-tour="add-application"]',
    titleHe: 'מועמדויות — Kanban, לוח זמנים ופידבק',
    titleEn: 'Applications — Kanban, Schedule & Feedback',
    descriptionHe: 'הדבק/י לינק למשרה — AI שולף את כל הפרטים. הצג/י את המועמדויות כ-Kanban (גרור/י קלפים בין שלבים) או כקלנדר. נדחית? סמן/י את הסיבה — ה-AI לומד ועוזר לשפר.',
    descriptionEn: 'Paste a job link — AI extracts all details. View your applications as a Kanban board (drag cards between stages) or as a calendar. Rejected? Tag the reason — AI learns and helps improve.',
    icon: LayoutDashboard,
    sectionLabelHe: 'שלב 8 — מועמדויות',
    sectionLabelEn: 'Step 8 — Applications',
  },

  // 9. Schedule / Journal
  {
    section: 'schedule',
    targetSelector: '[data-tour="schedule-calendar"]',
    titleHe: 'יומן החיפוש — כל הראיונות במקום אחד',
    titleEn: 'Search Journal — All Interviews in One Place',
    descriptionHe: 'יומן שמרכז ראיונות, follow-ups ותזכורות. אפשר לחבר ל-Google Calendar. מצא/י תחת "יומן החיפוש שלי" בתפריט.',
    descriptionEn: 'Journal that centralizes interviews, follow-ups, and reminders. Connect to Google Calendar. Find under "My Search Journal" in the menu.',
    icon: CalendarDays,
    sectionLabelHe: 'שלב 9 — יומן החיפוש',
    sectionLabelEn: 'Step 9 — Search Journal',
  },

  // 10. Interview Prep
  {
    section: 'interview-prep',
    targetSelector: '[data-tour="interview-prep"]',
    titleHe: 'סימולטור ראיון — תתאמן/י לפני שמתאמנ/ת',
    titleEn: 'Interview Simulator — Practice Before the Real Thing',
    descriptionHe: 'לחצ/י "התחל תרגול" לסימולציית ראיון עם AI. השאלות מותאמות לחברה ולתפקיד הספציפי. עוניינ/ת בקול או בטקסט ומקבל/ת פידבק מיידי.',
    descriptionEn: 'Click "Start Practice" for an AI interview simulation. Questions are tailored to the specific company and role. Answer by voice or text and get instant feedback.',
    icon: Mic,
    sectionLabelHe: 'שלב 10 — הכנה לראיון',
    sectionLabelEn: 'Step 10 — Interview Prep',
  },

  // 11. Messages
  {
    section: 'messages',
    targetSelector: '[data-tour="message-inbox"]',
    titleHe: 'הודעות ממגייסים — הכל כאן',
    titleEn: 'Messages from Recruiters — All Here',
    descriptionHe: 'מגייס/ת מתעניינ/ת? ההודעה מגיעה לכאן. עונים, מצרפים קבצים ומנהלים את כל התקשורת במקום אחד — בלי לחפש ב-Gmail.',
    descriptionEn: 'Recruiter interested? The message lands here. Reply, attach files, manage all communication in one place — no digging through Gmail.',
    icon: MessageSquare,
    sectionLabelHe: 'שלב 11 — הודעות',
    sectionLabelEn: 'Step 11 — Messages',
  },

  // ── PHASE 2: FEATURES ────────────────────────────────────

  // 12. PLUG AI Chat — 25 prompts + 4 sub-agents (UPDATED)
  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'Plug Chat — 25 פרומפטים + 4 מומחי AI',
    titleEn: 'Plug Chat — 25 Prompts + 4 AI Specialists',
    descriptionHe: 'ה-AI יודע את כל ההגשות שלך. יש 25 פרומפטים מוכנים — לחץ על הכוכב בצ\'אט. ויש 4 מומחי AI: Resume Tailor, Interview Coach, Salary Negotiator, Recruiter Outreach. פשוט לשאול.',
    descriptionEn: 'AI knows all your applications. There are 25 ready prompts — click the star in chat. And 4 AI specialists: Resume Tailor, Interview Coach, Salary Negotiator, Recruiter Outreach. Just ask.',
    icon: MessageCircle,
    sectionLabelHe: 'פיצ\'רים — Plug Chat',
    sectionLabelEn: 'Features — Plug Chat',
  },

  // 13. Community Feed
  {
    section: 'feed',
    targetSelector: '[data-tour="feed-content"]',
    titleHe: 'פיד הקהילה — להיות בלופ',
    titleEn: 'Community Feed — Stay in the Loop',
    descriptionHe: 'מגייסים ואנשי מקצוע משתפים משרות, טיפים ותובנות בזמן אמת. פרסם, הגב, הצטרף לדיונים — ובנה נוכחות מקצועית שמגייסים מבחינים בה.',
    descriptionEn: 'Recruiters and pros share jobs, tips, and insights in real time. Post, comment, join discussions — build a professional presence recruiters actually notice.',
    icon: Users,
    sectionLabelHe: 'פיצ\'רים — קהילה',
    sectionLabelEn: 'Features — Community',
  },

  // 14. My Network
  {
    section: 'overview',
    targetSelector: '[data-tour="connections-widget"]',
    titleHe: 'הרשת שלי — קשרים = הזדמנויות',
    titleEn: 'My Network — Connections = Opportunities',
    descriptionHe: 'כאן מוצגים הקשרים שלך — מגייסים, קולגות וחברות. לחיצה על "הרשת שלי" בתפריט מאפשרת לנהל, לחפש ולהתחבר לאנשי מקצוע רלוונטיים.',
    descriptionEn: 'Your connections live here — recruiters, colleagues, and companies. Click "My Network" in the menu to manage, search, and connect with the right people.',
    icon: Users,
    sectionLabelHe: 'פיצ\'רים — הרשת שלי',
    sectionLabelEn: 'Features — My Network',
  },

  // 15. Vouches
  {
    section: 'overview',
    targetSelector: '[data-tour="vouch-widget"]',
    titleHe: 'Vouches — מכתבי המלצה שמגייסים קוראים',
    titleEn: 'Vouches — Recommendation Letters Recruiters Actually Read',
    descriptionHe: 'לוחצים "בקש" ושולחים לינק למנהל/ת שעבדת איתה. ה-Vouch מוצג על הפרופיל ומגייסים רואים אותו — אחד הגורמים הכי משפיעים על קבלה לעבודה.',
    descriptionEn: 'Click "Request" and send a link to a manager you worked with. The Vouch shows on your profile and recruiters see it — one of the biggest hiring factors.',
    icon: Heart,
    sectionLabelHe: 'פיצ\'רים — Vouches',
    sectionLabelEn: 'Features — Vouches',
  },

  // 16. Personal Card
  {
    section: 'profile-docs',
    targetSelector: '[data-tour="resume-upload"]',
    titleHe: 'כרטיס אישי — לינק אחד שמספר הכל',
    titleEn: 'Personal Card — One Link That Says It All',
    descriptionHe: 'PLUG יוצר כרטיס עם לינק ייחודי — תמונה, כישורים, ניסיון וקו"ח. שלח/י אותו למגייסים ישירות. כניסה דרך "הפרופיל שלי" ← "כרטיס אישי".',
    descriptionEn: 'PLUG creates a card with a unique link — photo, skills, experience, and CV. Send it directly to recruiters. Access via "My Profile" ← "Personal Card".',
    icon: CreditCard,
    sectionLabelHe: 'פיצ\'רים — כרטיס אישי',
    sectionLabelEn: 'Features — Personal Card',
  },

  // 17. Home Assignments
  {
    section: 'overview',
    targetSelector: '[data-tour="onboarding-checklist"]',
    titleHe: 'מבחני בית — הוכח/י מה שהקו"ח לא יכול',
    titleEn: 'Home Assignments — Prove What Your CV Can\'t',
    descriptionHe: 'פתור/י אתגרים אמיתיים מחברות טכנולוגיה והצג/י אותם בפרופיל. מגייסים מעריכים הוכחת יכולת מעבר לקו"ח. כניסה דרך "לוח המטלות" בתפריט.',
    descriptionEn: 'Solve real challenges from tech companies and showcase them in your profile. Recruiters value proof of ability beyond a CV. Access via "Assignments Board" in the menu.',
    icon: ClipboardList,
    sectionLabelHe: 'פיצ\'רים — מבחני בית',
    sectionLabelEn: 'Features — Assignments',
  },

  // 18. My Stats + Time Tracking (UPDATED)
  {
    section: 'my-stats',
    targetSelector: '[data-tour="my-stats-page"]',
    titleHe: 'נתוני החיפוש + מעקב זמן',
    titleEn: 'Search Stats + Time Tracking',
    descriptionHe: 'עוקבים אחרי ביצועי החיפוש — הגשות, שיעור תגובות, ראיונות. בנוסף: כמה שעות השקעת בחיפוש עבודה השבוע? PLUG סופר בשבילך. כניסה דרך "נתוני החיפוש שלי".',
    descriptionEn: 'Track search performance — applications, response rates, interviews. Plus: how many hours did you spend job searching this week? PLUG counts for you. Access via "My Stats".',
    icon: Clock,
    sectionLabelHe: 'פיצ\'רים — סטטיסטיקות',
    sectionLabelEn: 'Features — My Stats',
  },

  // 19. Visible to Recruiters + My Secrets
  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'גלוי/ה למגייסים ו"הסודות שלי"',
    titleEn: 'Visible to Recruiters & "My Secrets"',
    descriptionHe: '"גלוי למגייסים" — הגדרה בפרופיל שמאפשרת למגייסים למצוא אותך. "הסודות שלי" — תובנות AI על חברות מ-LinkedIn: מה הן עושות, אנשי קשר, ורמת ההתאמה שלך.',
    descriptionEn: '"Visible to Recruiters" — a setting that lets recruiters find you. "My Secrets" — AI insights on companies from LinkedIn: what they do, who to contact, and your personal fit.',
    icon: Eye,
    sectionLabelHe: 'פיצ\'רים — נראות',
    sectionLabelEn: 'Features — Visibility',
  },

  // 20. Ideas Board
  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'לוח הרעיונות — עצב/י את PLUG',
    titleEn: 'Ideas Board — Shape PLUG',
    descriptionHe: 'יש רעיון לפיצ\'ר? פרסם/י בלוח הרעיונות, הצבע/י על רעיונות של אחרים, ויצרו יחד את עתיד הפלטפורמה. כניסה דרך "לוח הרעיונות" בתפריט.',
    descriptionEn: 'Got a feature idea? Post on the Ideas Board, vote on others\' ideas, and shape the platform\'s future together. Access via "Ideas Board" in the menu.',
    icon: Lightbulb,
    sectionLabelHe: 'פיצ\'רים — רעיונות',
    sectionLabelEn: 'Features — Ideas Board',
  },

  // 21. Credits & Ambassador
  {
    section: 'overview',
    targetSelector: '[data-tour="credit-hud"]',
    titleHe: 'דלק + שגרירים — 15 ביום, ועוד',
    titleEn: 'Fuel + Ambassadors — 15/day, and More',
    descriptionHe: 'הדלק מניע את ה-AI — 15 מתחדשים כל בוקר. השלם/י משימות שגריר לעלייה ברמה ועוד דלק. הזמנת חבר/ה = בונוס מיידי. אל תשאיר/י אותם לפקוע!',
    descriptionEn: 'Fuel powers AI — 15 renew every morning. Complete ambassador missions to level up and get more. Invite a friend = instant bonus. Don\'t let them expire!',
    icon: Zap,
    sectionLabelHe: 'פיצ\'רים — דלק',
    sectionLabelEn: 'Features — Fuel',
  },

  // 22. Nudge Tips
  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'PLUG שולח טיפים — תמיד בזמן הנכון',
    titleEn: 'PLUG Sends Tips — Always at the Right Time',
    descriptionHe: 'מדי פעם יצוץ פופאפ עם פיצ\'ר שעוד לא ניסית, הזמנה לקהילת הווטסאפ שלנו, או קרדיטים בונוס. אפשר לסגור בכל רגע.',
    descriptionEn: 'Occasionally a popup appears with a feature you haven\'t tried yet, a WhatsApp community invite, or bonus credits. Close it any time.',
    icon: Bell,
    sectionLabelHe: 'פיצ\'רים — טיפים',
    sectionLabelEn: 'Features — Tips',
  },

  // 23. Chrome Extension
  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'תוסף כרום — PLUG עובד בכל אתר',
    titleEn: 'Chrome Extension — PLUG Works on Every Site',
    descriptionHe: 'עם התוסף, PLUG עובד ישירות ב-LinkedIn ו-AllJobs — מנתח משרות בזמן גלישה, ממלא טפסים, ושומר הכל לדשבורד. חינמי לחלוטין.',
    descriptionEn: 'With the extension, PLUG works directly on LinkedIn & AllJobs — analyzes jobs while browsing, fills forms, saves everything to the dashboard. Completely free.',
    icon: Chrome,
    sectionLabelHe: 'פיצ\'רים — תוסף כרום',
    sectionLabelEn: 'Features — Chrome Extension',
  },

  // 24. AI Auto Agent + HITL (NEW)
  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'AI Agent — מגיש בשבילך גם בזמן שאתה/ת ישנ/ה 🤖',
    titleEn: 'AI Agent — Applies for You Even While You Sleep 🤖',
    descriptionHe: 'הפעל/י את ה-AI Agent מהדשבורד — הוא סורק LinkedIn ו-AllJobs, מנתח התאמה ומגיש מועמדויות אוטומטית. עם HITL: הסוכן מראה לך כל משרה ומחכה לאישורך לפני הגשה — אתה/ת תמיד בשליטה.',
    descriptionEn: 'Activate the AI Agent from the dashboard — it scans LinkedIn & AllJobs, analyzes fit, and submits applications automatically. With HITL: the agent shows you each job and waits for your approval before applying — you\'re always in control.',
    icon: Bot,
    sectionLabelHe: 'פיצ\'רים — AI Agent',
    sectionLabelEn: 'Features — AI Agent',
  },

  // 25. Skill Gap + Location View (NEW)
  {
    section: 'job-search',
    targetSelector: '[data-tour="job-filters"]',
    titleHe: 'Skill Gap + מיקומים — דע/י מה חסר ואיפה זה',
    titleEn: 'Skill Gap + Location View — Know What\'s Missing & Where',
    descriptionHe: 'Skill Gap מנתח מה חסר לך לתפקיד הבא וממליץ קורסים. תצוגת המיקומים מאגדת משרות לפי ערים — ראה/י בבת-אחת איפה ההזדמנויות מרוכזות.',
    descriptionEn: 'Skill Gap analyzes what you\'re missing for your next role and recommends courses. Location view groups jobs by city — see at a glance where opportunities are concentrated.',
    icon: MapPin,
    sectionLabelHe: 'פיצ\'רים — Skill Gap + מיקומים',
    sectionLabelEn: 'Features — Skill Gap + Location',
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
