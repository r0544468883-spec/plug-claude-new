/**
 * PLUG Nudge Popup — Shared Design Config
 *
 * To add a new popup type:
 * 1. Add a CSS variable pair in index.css  → --plug-nudge-*
 * 2. Add the gradient utility class        → .plug-nudge-gradient-{name}
 * 3. Register colors in tailwind.config.ts → plug: { "nudge-*": ... }
 * 4. Add a new entry below in NUDGES
 */

export type NudgeType = 'credits' | 'profile' | 'chat' | 'referral';

export interface NudgeConfig {
  type: NudgeType;
  /** CSS utility class from index.css (@layer utilities) */
  gradientClass: string;
  /** Tailwind bg opacity class for the icon container */
  iconBg: string;
  titleHe: string;
  titleEn: string;
  descHe: string;
  descEn: string;
  ctaHe: string;
  ctaEn: string;
  /** Internal route to navigate to on CTA click */
  route: string;
  badgeHe?: string;
  badgeEn?: string;
}

export const NUDGES: NudgeConfig[] = [
  {
    type: 'credits',
    gradientClass: 'plug-nudge-gradient-credits',   // indigo-600 → violet-700
    iconBg: 'bg-yellow-400/20',
    titleHe: 'תוסיף לפלאג קצת דלק?',
    titleEn: 'Top up PLUG with fuel?',
    descHe: 'הקרדיטים שלך מניעים את ה-AI — ככל שיש יותר דלק, יותר כלים פתוחים עבורך.',
    descEn: 'Your credits power the AI — more fuel means more tools available to you.',
    ctaHe: 'לדף הקרדיטים',
    ctaEn: 'Go to Credits',
    route: '/credits',
  },
  {
    type: 'profile',
    gradientClass: 'plug-nudge-gradient-profile',   // violet-600 → purple-700
    iconBg: 'bg-emerald-400/20',
    titleHe: 'הפרופיל שלך לא שלם',
    titleEn: 'Your profile is incomplete',
    descHe: 'פרופיל מלא מגדיל את הסיכוי להתאמה טובה ונותן לפלאג AI יותר על מה לעבוד.',
    descEn: 'A complete profile boosts match quality and gives PLUG AI more to work with.',
    ctaHe: 'להשלמת הפרופיל',
    ctaEn: 'Complete Profile',
    route: '/profile',
  },
  {
    type: 'chat',
    gradientClass: 'plug-nudge-gradient-chat',      // purple-600 → indigo-700
    iconBg: 'bg-blue-400/20',
    titleHe: 'יש לך שאלות על החיפוש?',
    titleEn: 'Questions about your job search?',
    descHe: 'פלאג AI מכיר את כל ההגשות שלך ויכול לעזור עם אסטרטגיה, כיסוי מכתבים, ועוד.',
    descEn: 'PLUG AI knows all your applications and can help with strategy, cover letters, and more.',
    ctaHe: 'שוחח עם PLUG',
    ctaEn: 'Chat with PLUG',
    route: '/chat',
  },
  {
    type: 'referral',
    gradientClass: 'plug-nudge-gradient-referral',  // rose-600 → pink-700
    iconBg: 'bg-pink-400/20',
    titleHe: '🎁 הזמן חבר וקבל 25 קרדיטים',
    titleEn: '🎁 Invite a friend, get 25 credits',
    descHe: 'כל חבר שמצטרף דרכך מביא לך 25 קרדיטים בחינם — ולו 25 קרדיטים נוספים כמתנת הצטרפות.',
    descEn: 'Every friend who joins through your link earns you 25 free credits — and gives them 25 credits too.',
    ctaHe: 'להזמנת חברים ← 25 קרדיטים',
    ctaEn: 'Invite Friends ← 25 credits',
    route: '/referrals',
    badgeHe: '+25 קרדיטים',
    badgeEn: '+25 Credits',
  },
];
