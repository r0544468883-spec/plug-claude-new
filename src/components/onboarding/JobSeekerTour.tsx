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
  Wand2, Mail, Newspaper,
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

  // ── שלב 2: תוסף (overview) ────────────────────────────

  {
    section: 'overview',
    targetSelector: '[data-tour="extension-download"]',
    titleHe: 'התוסף של פלאג - עובד בכל מקום 🤖',
    titleEn: 'PLUG Extension - Works Everywhere 🤖',
    descriptionHe: 'לחצו על הבאנר כאן בסייד-בר כדי להוריד את התוסף. עם התוסף, פלאג עובד ישירות ב-LinkedIn ו-AllJobs - מנתח משרות בזמן גלישה, ממלא טפסים ושומר הכל לדשבורד. הפעילו את הסוכן החכם - הוא סורק, מנתח ומגיש מועמדויות. עם HITL: הסוכן מציג לכם כל משרה ומחכה לאישורכם.',
    descriptionEn: 'Click this banner in the sidebar to download the extension. With it, PLUG works directly on LinkedIn & AllJobs - analyzes jobs while browsing, fills forms, saves everything to the dashboard. Activate the AI Agent - it scans, analyzes fit, and submits applications. With HITL: the agent shows each job and waits for your approval.',
    icon: Bot,
    sectionLabelHe: 'שלב 2: התוסף',
    sectionLabelEn: 'Step 2: Extension',
  },

  // ── שלב 2.5: AI בצ'אט LinkedIn (overview) ───────────────

  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'AI ישירות בצ\'אט של LinkedIn ✍️',
    titleEn: 'AI Directly in LinkedIn Chat ✍️',
    descriptionHe: 'בתוסף פלאג: כשכותבים הודעה ל-LinkedIn — מסמנים טקסט ומופיעות 3 אפשרויות AI: ✨ שפר | 💼 מקצועי | ✂️ קצר. פלאג כותב מחדש את ההודעה בשניות. יש גם כפתור "✨ PLUG" שמייצר טיוטה שלמה מאפס לפי הפרופיל שלכם.',
    descriptionEn: 'In the PLUG extension: while writing a LinkedIn message - select text and 3 AI options appear: ✨ Improve | 💼 Professional | ✂️ Shorten. PLUG rewrites your message in seconds. There\'s also a "✨ PLUG" button that generates a full draft from scratch based on your profile.',
    icon: Wand2,
    sectionLabelHe: 'שלב 3: AI בלינקדין',
    sectionLabelEn: 'Step 3: AI in LinkedIn',
  },

  // ── שלבים 3-4: פרופיל (profile-docs) ───────────────────

  {
    section: 'profile-docs',
    targetSelector: '[data-tour="resume-upload"]',
    titleHe: 'העלאת קורות חיים - פלאג לומד אתכם',
    titleEn: 'Upload Your CV - PLUG Learns You',
    descriptionHe: 'העלו קו"ח פה. פלאג ינתח כישורים, ניסיון ותחומים - וישתמש בזה כדי להתאים משרות, לשפר את הפרופיל ולעזור בצ\'אט. שניות ספורות.',
    descriptionEn: 'Upload your CV here. PLUG analyzes your skills, experience, and interests - and uses that to match jobs, improve your profile, and help in chat. Takes seconds.',
    icon: Brain,
    sectionLabelHe: 'שלב 3: פרופיל',
    sectionLabelEn: 'Step 3: Profile',
  },

  {
    section: 'profile-docs',
    targetSelector: '[data-tour="portfolio-links"]',
    titleHe: 'כרטיס אישי - לינק אחד שמספר הכל',
    titleEn: 'Personal Card - One Link That Says It All',
    descriptionHe: 'פלאג יוצר כרטיס עם לינק ייחודי - תמונה, כישורים, ניסיון וקו"ח. שלחו אותו למגייסים ישירות. כניסה דרך "הפרופיל שלי" ← "כרטיס אישי".',
    descriptionEn: 'PLUG creates a card with a unique link - photo, skills, experience, and CV. Send it directly to recruiters. Access via "My Profile" ← "Personal Card".',
    icon: CreditCard,
    sectionLabelHe: 'שלב 4: כרטיס אישי',
    sectionLabelEn: 'Step 4: Personal Card',
  },

  // ── שלבים 5-6: בניית קו"ח (cv-builder) ─────────────────

  {
    section: 'cv-builder',
    targetSelector: '[data-tour="cv-builder"]',
    titleHe: 'בונה קו"ח - 10 תבניות או כתיבה מאפס',
    titleEn: 'CV Builder - 10 Templates or Start Fresh',
    descriptionHe: 'בחרו תבנית או כתבו מאפס, מלאו פרטים ולחצו "הורד PDF". פלאג מציע bullet rewrites ומבנה STAR לסיפורים. ✨',
    descriptionEn: 'Pick a template or start from scratch, fill in details, hit "Download PDF". PLUG suggests bullet rewrites and STAR story structure. ✨',
    icon: FileEdit,
    customImage: onboardingNotesImage,
    sectionLabelHe: 'שלב 5: בניית קו"ח',
    sectionLabelEn: 'Step 5: CV Builder',
  },

  {
    section: 'cv-builder',
    targetSelector: '[data-tour="cv-preview"]',
    titleHe: 'משפר קו"ח חכם - מותאם לכל משרה',
    titleEn: 'Smart CV Enhancer - Tailored to Each Job',
    descriptionHe: 'הדביקו תיאור משרה ופלאג יתאים את הקו"ח שלכם לתפקיד הספציפי - מנסח מחדש bullet points, מוסיף מילות מפתח לATS, ומוציא ציון התאמה. כניסה דרך "שפר קו"ח" בבונה.',
    descriptionEn: 'Paste a job description and PLUG tailors your CV to that specific role - rewrites bullet points, adds ATS keywords, and gives a match score. Access via "Enhance CV" in the builder.',
    icon: Sparkles,
    sectionLabelHe: 'שלב 6: שיפור קו"ח',
    sectionLabelEn: 'Step 6: CV Enhancer',
  },

  // ── שלב 7: הגדרות (settings) ────────────────────────────

  {
    section: 'settings',
    targetSelector: '[data-tour="preferences"]',
    titleHe: 'הגדרות - תגידו לפלאג מה אתם מחפשים',
    titleEn: 'Settings - Tell PLUG What You\'re Looking For',
    descriptionHe: 'הגדירו סוג משרה, מיקום, תחום ושכר מצופה. כאן גם שולטים על נראות הפרופיל למגייסים ומחברים Gmail לסנכרון אוטומטי של תקשורת.',
    descriptionEn: 'Set job type, location, field, and expected salary. Also control profile visibility to recruiters and connect Gmail for automatic communication sync.',
    icon: SlidersHorizontal,
    sectionLabelHe: 'שלב 7: הגדרות',
    sectionLabelEn: 'Step 7: Settings',
  },

  // ── שלב 8.5: AI בכתיבת מיילים (settings) ───────────────

  {
    section: 'settings',
    targetSelector: '[data-tour="email-ai"]',
    titleHe: 'AI ישירות בתוך המייל ✉️',
    titleEn: 'AI Directly Inside Your Email ✉️',
    descriptionHe: 'בחלון כתיבת המייל: לחצו "טיוטה עם AI" — פלאג מייצר נושא + גוף מייל מלא לפי שלב הבקשה (follow-up / תודה על ראיון / משא ומתן שכר). מסמנים טקסט בגוף המייל ומופיעה toolbar: שפר / מקצועי / קצר / הרחב / תקן.',
    descriptionEn: 'In the email composer: click "Draft with AI" — PLUG generates a full subject + body based on your application stage (follow-up / post-interview thank you / salary negotiation). Select text in the body and a toolbar appears: Improve / Professional / Shorten / Expand / Fix.',
    icon: Mail,
    sectionLabelHe: 'שלב 9: AI במייל',
    sectionLabelEn: 'Step 9: AI in Email',
  },

  // ── שלב 8.6: דייג'סט משרות (settings) ──────────────────

  {
    section: 'settings',
    targetSelector: '[data-tour="email-digest"]',
    titleHe: 'דייג\'סט משרות — כל יומיים למייל 📬',
    titleEn: 'Job Digest — Every 2 Days to Your Inbox 📬',
    descriptionHe: 'פלאג שולח אוטומטית כל יומיים מייל עם 5-8 המשרות הכי חדשות ורלוונטיות עבורכם. רואים את ההזדמנויות הכי טובות בלי לפתוח את האפליקציה. נדרש: חיבור Gmail בהגדרות.',
    descriptionEn: 'PLUG automatically sends every 2 days an email with the 5-8 newest and most relevant jobs for you. See the best opportunities without opening the app. Requires: Gmail connected in Settings.',
    icon: Newspaper,
    sectionLabelHe: 'שלב 10: דייג\'סט משרות',
    sectionLabelEn: 'Step 10: Job Digest',
  },

  // ── שלב 8.7: תזכורות follow-up (settings) ──────────────

  {
    section: 'settings',
    targetSelector: '[data-tour="email-followup"]',
    titleHe: 'תזכורות Follow-up אוטומטיות 🔔',
    titleEn: 'Automatic Follow-up Reminders 🔔',
    descriptionHe: 'פלאג מזהה מועמדויות שלא קיבלו תגובה אחרי 5 ימים ומציג בנר עם כפתור שליחת מייל ישיר. פשוט לחצו על המשרה ובחרו "שלח מייל" — הנושא והטקסט כבר מוכנים.',
    descriptionEn: 'PLUG detects applications with no reply after 5 days and shows a banner with a direct email button. Just click the job and choose "Send Email" — subject and body are already prepared.',
    icon: Bell,
    sectionLabelHe: 'שלב 8: Follow-up',
    sectionLabelEn: 'Step 8: Follow-up',
  },

  // ── שלב 8.8: ניתוח ביצועי מייל (settings) ──────────────

  {
    section: 'settings',
    targetSelector: '[data-tour="email-analytics"]',
    titleHe: 'ניתוח ביצועי מייל 📊',
    titleEn: 'Email Performance Analytics 📊',
    descriptionHe: 'פלאג מנתח את כל המיילים שקיבלתם ומציג: אחוז מענה, זמן מענה ממוצע, מספר ראיונות שהוזמנתם ומספר דחיות. ראו בדיוק עד כמה חיפוש העבודה שלכם אפקטיבי.',
    descriptionEn: 'PLUG analyzes all your received emails and shows: response rate, average response time, number of interview invites, and rejections. See exactly how effective your job search is.',
    icon: BarChart3,
    sectionLabelHe: 'שלב 9: ניתוח מייל',
    sectionLabelEn: 'Step 9: Email Analytics',
  },

  // ── שלב 8.9: Google Calendar (settings) ─────────────────

  {
    section: 'settings',
    targetSelector: '[data-tour="google-calendar-card"]',
    titleHe: 'Google Calendar — ראיונות בלוח השנה 📅',
    titleEn: 'Google Calendar — Interviews in Your Calendar 📅',
    descriptionHe: 'חברו את Google Calendar פה. כשמגיע מייל הזמנה לראיון, פלאג מציע "הוסף ליומן" — לחיצה אחת ואירוע עם 2 תזכורות (שעה ו-10 דקות לפני) נוצר אוטומטית.',
    descriptionEn: 'Connect your Google Calendar here. When an interview invite arrives, PLUG shows "Add to calendar" — one click and an event with 2 reminders (1 hour and 10 minutes before) is created automatically.',
    icon: CalendarDays,
    sectionLabelHe: 'שלב 10: יומן Google',
    sectionLabelEn: 'Step 10: Google Calendar',
  },

  // ── שלב 11: חיפוש משרות (job-search) ───────────────────

  {
    section: 'job-search',
    targetSelector: '[data-tour="job-filters"]',
    titleHe: 'חיפוש משרות - מיקוד + ציון התאמה',
    titleEn: 'Job Search - Focus + Match Score',
    descriptionHe: 'סננו לפי מיקום, קטגוריה ושכר. לחצו "מתאים לי" לסינון פלאג. כפתור המפה מציג איפה המשרות מרוכזות - שלא תחמיצו כלום בעיר שלכם. ציון 80%+ = תגישו עכשיו.',
    descriptionEn: 'Filter by location, category, and salary. Click "Match Me" for PLUG filtering. The map button shows where jobs cluster - so you don\'t miss anything in your city. 80%+ score = apply now.',
    icon: Search,
    sectionLabelHe: 'שלב 8: חיפוש משרות',
    sectionLabelEn: 'Step 8: Job Search',
  },

  // ── שלב 9: ספריית חברות (companies) ────────────────────

  {
    section: 'companies',
    targetSelector: '[data-tour="companies-grid"]',
    titleHe: 'ספריית חברות - מצאו את ה-vibe שלכם',
    titleEn: 'Company Directory - Find Your Vibe',
    descriptionHe: 'גלריית חברות עם פילטר לפי tech stack, גודל, תחום ומדיניות remote. לחיצה על חברה מציגה משרות פתוחות, אנשי קשר ותרבות ארגונית. כניסה דרך "חברות" בתפריט.',
    descriptionEn: 'Company gallery with filters by tech stack, size, industry, and remote policy. Click a company to see open roles, contacts, and culture. Access via "Companies" in the menu.',
    icon: Building2,
    sectionLabelHe: 'שלב 9: ספריית חברות',
    sectionLabelEn: 'Step 9: Company Directory',
  },

  // ── שלבים 10-11: overview ────────────────────────────────

  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'ספרינט - סוויפ על משרות כמו Tinder 👆',
    titleEn: 'Sprint - Swipe Jobs Like Tinder 👆',
    descriptionHe: 'ממשק מהיר - שמאל לדחיה, ימין לשמירה. מושלם ל-5 דקות בתור לקפה.',
    descriptionEn: 'Fast swipe interface - left to skip, right to save. Perfect for 5 minutes in line for coffee.',
    icon: Zap,
    sectionLabelHe: 'שלב 10: ספרינט',
    sectionLabelEn: 'Step 10: Sprint',
  },

  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'הצ\'אט החכם של פלאג',
    titleEn: 'PLUG Smart Chat',
    descriptionHe: 'פלאג יודע את כל ההגשות שלכם. יש פרומפטים מוכנים - לחצו על הכוכב בצ\'אט. ויש מומחי פלאג: Resume Tailor, Interview Coach, Salary Negotiator, Recruiter Outreach. פשוט לשאול.',
    descriptionEn: 'PLUG knows all your applications. There are ready prompts - click the star in chat. And PLUG specialists: Resume Tailor, Interview Coach, Salary Negotiator, Recruiter Outreach. Just ask.',
    icon: MessageCircle,
    sectionLabelHe: 'שלב 11: פלאג צ\'אט',
    sectionLabelEn: 'Step 11: PLUG Chat',
  },

  // ── שלב 12: מועמדויות (applications) ───────────────────

  {
    section: 'applications',
    targetSelector: '[data-tour="applications-page"]',
    titleHe: 'מועמדויות - Kanban, לוח זמנים ופידבק',
    titleEn: 'Applications - Kanban, Schedule & Feedback',
    descriptionHe: 'הדביקו לינק למשרה - פלאג שולף את כל הפרטים. הציגו את המועמדויות כ-Kanban (גררו קלפים בין שלבים) או כקלנדר. נדחתם? סמנו את הסיבה - פלאג לומד ועוזר לשפר.',
    descriptionEn: 'Paste a job link - PLUG extracts all details. View your applications as a Kanban board (drag cards between stages) or as a calendar. Rejected? Tag the reason - PLUG learns and helps improve.',
    icon: LayoutDashboard,
    sectionLabelHe: 'שלב 12: מועמדויות',
    sectionLabelEn: 'Step 12: Applications',
  },

  // ── שלב 12.5: הזמנה לראיון (applications) ──────────────

  {
    section: 'applications',
    targetSelector: '[data-tour="email-interview-actions"]',
    titleHe: 'הזמנה לראיון — תגובה בקליק + יומן 🎯',
    titleEn: 'Interview Invite — Reply in 1 Click + Calendar 🎯',
    descriptionHe: 'כשמגיע מייל הזמנה לראיון, פלאג מציג בנר כחול על המועמדות: כפתור "ענה עם זמינות" יפתח מייל AI מוכן לשליחה, וכפתור "הוסף ליומן" ייצור אירוע ב-Google Calendar עם תזכורות. הכל בלי לעזוב את פלאג.',
    descriptionEn: 'When an interview invite arrives, PLUG shows a blue banner on the application: "Reply with availability" opens a ready AI email, and "Add to calendar" creates a Google Calendar event with reminders. All without leaving PLUG.',
    icon: CalendarDays,
    sectionLabelHe: 'שלב 13: ראיון',
    sectionLabelEn: 'Step 13: Interview',
  },

  // ── שלב 13: יומן (schedule) ─────────────────────────────

  {
    section: 'schedule',
    targetSelector: '[data-tour="schedule-calendar"]',
    titleHe: 'יומן החיפוש - כל הראיונות במקום אחד',
    titleEn: 'Search Journal - All Interviews in One Place',
    descriptionHe: 'יומן שמרכז ראיונות, follow-ups, תזכורות ומשימות. רואים את כל מה שתוכנן לשבוע הקרוב, מסמנים משימות כבוצעו ועוקבים אחרי תשובות מחברות. אפשר לחבר ל-Google Calendar.',
    descriptionEn: 'Journal that centralizes interviews, follow-ups, reminders, and tasks. See everything planned for the coming week, mark tasks done, and track responses from companies. Connect to Google Calendar.',
    icon: CalendarDays,
    sectionLabelHe: 'שלב 13: יומן החיפוש',
    sectionLabelEn: 'Step 13: Search Journal',
  },

  // ── שלב 14: סימולציות (interview-prep) ──────────────────

  {
    section: 'interview-prep',
    targetSelector: '[data-tour="interview-prep"]',
    titleHe: 'סימולציות',
    titleEn: 'Simulations',
    descriptionHe: 'לחצו "התחל תרגול" לסימולציית ראיון עם פלאג. השאלות מותאמות לחברה ולתפקיד הספציפי. עונים בקול או בטקסט ומקבלים פידבק מיידי.',
    descriptionEn: 'Click "Start Practice" for an interview simulation with PLUG. Questions are tailored to the specific company and role. Answer by voice or text and get instant feedback.',
    icon: Mic,
    sectionLabelHe: 'שלב 14: סימולציות',
    sectionLabelEn: 'Step 14: Simulations',
  },

  // ── שלב 15: הודעות (messages) ───────────────────────────

  {
    section: 'messages',
    targetSelector: '[data-tour="message-inbox"]',
    titleHe: 'הודעות ממגייסים - הכל כאן',
    titleEn: 'Messages from Recruiters - All Here',
    descriptionHe: 'מגייס מתעניין? ההודעה מגיעה לכאן. עונים, מצרפים קבצים ומנהלים את כל התקשורת במקום אחד - בלי לחפש ב-Gmail.',
    descriptionEn: 'Recruiter interested? The message lands here. Reply, attach files, manage all communication in one place - no digging through Gmail.',
    icon: MessageSquare,
    sectionLabelHe: 'שלב 15: הודעות',
    sectionLabelEn: 'Step 15: Messages',
  },

  // ── שלב 16: פיד (feed) ──────────────────────────────────

  {
    section: 'feed',
    targetSelector: '[data-tour="feed-content"]',
    titleHe: 'פיד הקהילה - להיות בלופ',
    titleEn: 'Community Feed - Stay in the Loop',
    descriptionHe: 'מגייסים ואנשי מקצוע משתפים משרות, טיפים ותובנות. פרסמו, הגיבו, הצטרפו לדיונים - ובנו נוכחות מקצועית שמגייסים מבחינים בה.',
    descriptionEn: 'Recruiters and pros share jobs, tips, and insights. Post, comment, join discussions - build a professional presence recruiters actually notice.',
    icon: Users,
    sectionLabelHe: 'שלב 16: קהילה',
    sectionLabelEn: 'Step 16: Community',
  },

  // ── שלבים 17-24: פיצ\'רים ────────────────────────────────

  {
    section: 'overview',
    targetSelector: '[data-tour="connections-widget"]',
    titleHe: 'קשרים = הזדמנויות',
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
    targetSelector: '[data-tour="plug-tip"]',
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
    targetSelector: '[data-tour="content-hub"]',
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
