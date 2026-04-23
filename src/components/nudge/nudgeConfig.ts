export type NudgeType = 'credits' | 'profile' | 'chat' | 'referral';

export interface NudgeConfig {
  type: NudgeType;
  titleHe: string;
  titleEn: string;
  descHe: string;
  descEn: string;
  ctaHe: string;
  ctaEn: string;
  route: string;
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
    ctaHe: 'להשלמת הפרופיל',
    ctaEn: 'Complete Profile',
    route: '/profile',
  },
  {
    type: 'chat',
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
    titleHe: 'הזמן חבר וקבל 25 קרדיטים',
    titleEn: 'Invite a friend, get 25 credits',
    descHe: 'כל חבר שמצטרף דרכך מביא לך 25 קרדיטים בחינם — ולו 25 קרדיטים נוספים כמתנת הצטרפות.',
    descEn: 'Every friend who joins through your link earns you 25 free credits — and gives them 25 too.',
    ctaHe: 'הזמנת חברים',
    ctaEn: 'Invite Friends',
    route: '/referrals',
    badgeHe: '+25 קרדיטים',
    badgeEn: '+25 Credits',
  },
];
