export type NudgeType =
  | 'credits'
  | 'profile'
  | 'chat'
  | 'assignments'
  | 'community'
  | 'extension'
  | 'personal_card'
  | 'vouch'
  | 'ambassador'
  | 'whatsapp'
  | 'newsletter'
  | 'referral';

export interface NudgeConfig {
  type: NudgeType;
  titleHe: string;
  titleEn: string;
  descHe: string;
  descEn: string;
  featuresHe: string[];
  featuresEn: string[];
  ctaHe: string;
  ctaEn: string;
  dismissHe?: string;
  dismissEn?: string;
  route: string;
  /** Opens in new tab instead of internal navigation */
  externalUrl?: string;
  badgeHe?: string;
  badgeEn?: string;
}

export const NUDGES: NudgeConfig[] = [
  {
    type: 'credits',
    titleHe: 'תוסיף לפלאג קצת דלק?',
    titleEn: 'Top up PLUG with fuel?',
    descHe: 'הקרדיטים שלך מניעים את ה-AI — ככל שיש יותר דלק, יותר כלים פתוחים עבורך.',
    descEn: 'Your credits power the AI — more fuel means more tools available to you.',
    featuresHe: ['שיחות AI ללא הגבלה', 'ניתוח קורות חיים', 'הצעות מייל מותאמות אישית'],
    featuresEn: ['Unlimited AI chat', 'Resume analysis', 'Personalized email suggestions'],
    ctaHe: 'לדף הקרדיטים',
    ctaEn: 'Go to Credits',
    route: '/credits',
  },
  {
    type: 'profile',
    titleHe: 'הפרופיל שלך לא שלם',
    titleEn: 'Your profile is incomplete',
    descHe: 'פרופיל מלא מגדיל את הסיכוי להתאמה טובה ונותן לפלאג AI יותר על מה לעבוד.',
    descEn: 'A complete profile boosts match quality and gives PLUG AI more to work with.',
    featuresHe: ['תמונה מקצועית', 'כישורים ותחומי עניין', 'סיכום אישי קצר'],
    featuresEn: ['Professional photo', 'Skills & interests', 'Short personal summary'],
    ctaHe: 'להשלמת הפרופיל',
    ctaEn: 'Complete Profile',
    route: '/profile',
  },
  {
    type: 'chat',
    titleHe: 'יש לך שאלות על החיפוש?',
    titleEn: 'Questions about your job search?',
    descHe: 'פלאג AI מכיר את כל ההגשות שלך ויכול לעזור עם אסטרטגיה, כיסויי מכתב, ועוד.',
    descEn: 'PLUG AI knows all your applications and can help with strategy, cover letters, and more.',
    featuresHe: ['אסטרטגיית חיפוש', 'כיסויי מכתב', 'הכנה לראיונות'],
    featuresEn: ['Search strategy', 'Cover letters', 'Interview prep'],
    ctaHe: 'שוחח עם PLUG',
    ctaEn: 'Chat with PLUG',
    route: '/chat',
  },
  {
    type: 'assignments',
    titleHe: 'ניסית את מבחני הבית?',
    titleEn: 'Tried the home assignments?',
    descHe: 'מאגר מבחני בית ממאות חברות טכנולוגיה — תרגל, שתף, וצבור קרדיטים.',
    descEn: 'A library of home assignments from hundreds of tech companies — practice, share, and earn credits.',
    featuresHe: ['מבחנים ממאות חברות', 'הגש פתרון וקבל פידבק', 'שתף וצבור קרדיטים'],
    featuresEn: ['Assignments from hundreds of companies', 'Submit & get feedback', 'Share to earn credits'],
    ctaHe: 'לדף המבחנים',
    ctaEn: 'View Assignments',
    route: '/assignments',
    badgeHe: 'חדש',
    badgeEn: 'New',
  },
  {
    type: 'community',
    titleHe: 'הצץ בפיד הקהילה',
    titleEn: 'Check out the community feed',
    descHe: 'אנשי מקצוע משתפים תובנות, הצעות עבודה, וחוויות מחיפוש עבודה בזמן אמת.',
    descEn: 'Professionals share insights, job tips, and real-time job search experiences.',
    featuresHe: ['פוסטים מקצועיים', 'הצעות עבודה מהקהילה', 'שאלות ותשובות אמיתיות'],
    featuresEn: ['Professional posts', 'Community job tips', 'Real Q&A'],
    ctaHe: 'לפיד הקהילה',
    ctaEn: 'Go to Feed',
    route: '/feed',
  },
  {
    type: 'extension',
    titleHe: 'הורד את תוסף הכרום של PLUG',
    titleEn: 'Download the PLUG Chrome Extension',
    descHe: 'התוסף מנתח משרות ישירות ב-LinkedIn ו-AllJobs, מגיש בשבילך, ומסנכרן הכל לדשבורד.',
    descEn: 'The extension analyzes jobs on LinkedIn & AllJobs, applies for you, and syncs everything to your dashboard.',
    featuresHe: ['ניתוח AI של משרות בזמן גלישה', 'הגשה אוטומטית', 'סנכרון מיידי לפלאג'],
    featuresEn: ['AI job analysis while browsing', 'Auto-apply', 'Instant sync to PLUG'],
    ctaHe: 'להורדת התוסף',
    ctaEn: 'Get the Extension',
    route: '/extension',
    badgeHe: 'חינמי',
    badgeEn: 'Free',
  },
  {
    type: 'personal_card',
    titleHe: 'יש לך כרטיס אישי ב-PLUG',
    titleEn: 'You have a personal card on PLUG',
    descHe: 'הכרטיס האישי שלך הוא הפנים שלך כלפי מעסיקים — שתף אותו ותן לו לעבוד בשבילך.',
    descEn: 'Your personal card is your face to employers — share it and let it work for you.',
    featuresHe: ['קישור ייחודי שניתן לשיתוף', 'כישורים, ניסיון, וקורות חיים', 'נראה מקצועי על כל מכשיר'],
    featuresEn: ['Unique shareable link', 'Skills, experience & resume', 'Looks professional on any device'],
    ctaHe: 'צפה בכרטיס שלך',
    ctaEn: 'View Your Card',
    route: '/profile',
  },
  {
    type: 'vouch',
    titleHe: 'בקש המלצה מקולגה',
    titleEn: 'Request a vouch from a colleague',
    descHe: 'המלצה אמיתית ממכר מגדילה משמעותית את האמינות שלך בעיני מגייסים.',
    descEn: 'A real vouch from someone you know significantly boosts your credibility with recruiters.',
    featuresHe: ['שלח בקשה בקליק', 'ההמלצה מוצגת בפרופיל', 'מגייסים מייחסים לכך חשיבות רבה'],
    featuresEn: ['Send a request in one click', 'Vouch appears on your profile', 'Recruiters value this highly'],
    ctaHe: 'לבקשת המלצה',
    ctaEn: 'Request a Vouch',
    route: '/profile',
  },
  {
    type: 'ambassador',
    titleHe: 'השלם משימות שגריר',
    titleEn: 'Complete ambassador missions',
    descHe: 'משימות שגריר הן הדרך הכי מהירה לצבור דלק קבוע ו-XP שמשדרג את הרמה שלך.',
    descEn: 'Ambassador missions are the fastest way to earn permanent fuel and XP to level up.',
    featuresHe: ['דלק קבוע שלא פג', 'שדרוג רמת שגריר', 'גישה לכלים מתקדמים'],
    featuresEn: ['Permanent fuel that never expires', 'Ambassador level upgrades', 'Access to advanced tools'],
    ctaHe: 'למשימות השגריר',
    ctaEn: 'View Missions',
    route: '/fuel-up',
  },
  {
    type: 'whatsapp',
    titleHe: 'הצטרף לקהילת PLUG בוואטסאפ',
    titleEn: 'Join the PLUG WhatsApp community',
    descHe: 'קבל עדכונים על משרות חמות, טיפים מקצועיים, ועדכוני פלטפורמה ישירות לנייד.',
    descEn: 'Get updates on hot jobs, career tips, and platform news directly on your phone.',
    featuresHe: ['התראות משרות בזמן אמת', 'טיפים מקצועיים שבועיים', 'קהילה פעילה של מחפשי עבודה'],
    featuresEn: ['Real-time job alerts', 'Weekly career tips', 'Active job seeker community'],
    ctaHe: 'הצטרף לקבוצה',
    ctaEn: 'Join the Group',
    route: '/community',
    externalUrl: 'https://chat.whatsapp.com/Kbh0vYaFUTWG1Km3t0ogBw',
  },
  {
    type: 'newsletter',
    titleHe: 'עדכוני שוק העבודה למייל',
    titleEn: 'Job market updates to your inbox',
    descHe: 'הירשם לניוזלטר השבועי — ניתוח שוק, עצות ממגייסים, ועדכוני פיצ\'רים חדשים.',
    descEn: 'Subscribe to the weekly newsletter — market analysis, recruiter tips, and new feature updates.',
    featuresHe: ['ניתוח שוק עבודה שבועי', 'עצות ישירות ממגייסים', 'עדכוני פיצ\'רים ראשונה'],
    featuresEn: ['Weekly job market analysis', 'Tips straight from recruiters', 'First to know about new features'],
    ctaHe: 'הרשמה לניוזלטר',
    ctaEn: 'Subscribe',
    route: '/profile',
  },
  {
    type: 'referral',
    titleHe: 'הזמן חבר וקבל 25 קרדיטים',
    titleEn: 'Invite a friend, get 25 credits',
    descHe: 'כל חבר שמצטרף דרכך מביא לך 25 קרדיטים בחינם — ולו 25 קרדיטים נוספים כמתנת הצטרפות.',
    descEn: 'Every friend who joins through your link earns you 25 free credits — and gives them 25 too.',
    featuresHe: ['קישור הזמנה אישי', 'קרדיטים מיידיים לשניכם', 'ללא הגבלה על מספר ההזמנות'],
    featuresEn: ['Personal invite link', 'Instant credits for both', 'No limit on invites'],
    ctaHe: 'הזמנת חברים',
    ctaEn: 'Invite Friends',
    route: '/referrals',
    badgeHe: '+25 קרדיטים',
    badgeEn: '+25 Credits',
  },
];
