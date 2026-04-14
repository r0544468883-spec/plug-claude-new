// Credit costs for various actions
export const CREDIT_COSTS = {
  CV_BUILDER: 10,
  RESUME_MATCH: 3,
  RESUME_ANALYSIS: 8,
  AI_INTERVIEW: 5,
  INTERVIEW_TIPS: 5,
  HOME_TASK_REVIEW: 10,
  SMART_SEARCH: 2,
  PING_AFTER_FREE: 15,
  PLUG_CHAT: 0, // free — 5 messages/day limit enforced in context
  FEED_INTERACTION: 0, // free — engagement should never cost credits
  JOB_SWIPE_BATCH: 15,
} as const;

// Daily usage limits (not credit-based, count-based)
export const DAILY_USAGE_LIMITS = {
  PLUG_CHAT_MESSAGES: 5,
  FREE_RESUME_ANALYSIS: 1, // first analysis free, then RESUME_ANALYSIS cost
} as const;

// Action names mapped for display
export const CREDIT_ACTION_LABELS = {
  cv_builder: { en: 'CV Builder', he: 'בונה קורות חיים' },
  resume_match: { en: 'Resume Match', he: 'התאמת קו"ח' },
  ai_interview: { en: 'AI Interview Prep', he: 'הכנה לראיון AI' },
  interview_tips: { en: 'Personalized Interview Tips', he: 'טיפים אישיים לראיון' },
  home_task_review: { en: 'Home Task Review', he: 'בדיקת משימת בית' },
  smart_search: { en: 'Smart Search', he: 'חיפוש חכם' },
  ping: { en: 'Internal Ping', he: 'פינג פנימי' },
  resume_analysis: { en: 'Resume Analysis', he: 'ניתוח קורות חיים' },
  plug_chat: { en: 'PLUG Chat', he: 'צ\'אט PLUG' },
  feed_like: { en: 'Feed Like', he: 'לייק בפיד' },
  feed_comment: { en: 'Feed Comment', he: 'תגובה בפיד' },
  feed_poll_vote: { en: 'Feed Poll Vote', he: 'הצבעה בסקר' },
  job_swipe_batch: { en: 'Job Match Refresh', he: 'רענון התאמות משרות' },
} as const;

// Free pings per day before credits are charged
export const FREE_PINGS_PER_DAY = 4;

// Threshold for showing confirmation dialog (credits)
export const CONFIRMATION_THRESHOLD = 5;

// Social task rewards (one-time)
export const SOCIAL_TASK_REWARDS: Record<string, { credits: number; label: string; labelHe: string; url: string; icon: string }> = {
  invite_friend: {
    credits: 150,
    label: 'Invite a Friend to PLUG',
    labelHe: 'הזמן חבר/ה ל-PLUG',
    url: '__invite__', // special: handled by InviteFriendDialog, not external URL
    icon: 'user-plus',
  },
  github_star: {
    credits: 50,
    label: 'Star us on GitHub',
    labelHe: 'תנו לנו כוכב ב-GitHub',
    url: 'https://github.com/r0544468883-spec/Plug-for-users',
    icon: 'github',
  },
  linkedin_follow: {
    credits: 50,
    label: 'Follow on LinkedIn',
    labelHe: 'עקבו ב-LinkedIn',
    url: 'https://www.linkedin.com/company/plug-hr',
    icon: 'linkedin',
  },
  whatsapp_join: {
    credits: 50,
    label: 'Join WhatsApp Community',
    labelHe: 'הצטרפו לקהילת WhatsApp',
    url: 'https://chat.whatsapp.com/Kbh0vYaFUTWG1Km3t0ogBw',
    icon: 'whatsapp',
  },
  tiktok_follow: {
    credits: 50,
    label: 'Follow on TikTok',
    labelHe: 'עקבו ב-TikTok',
    url: 'https://www.tiktok.com/@plug_hr',
    icon: 'tiktok',
  },
  discord_join: {
    credits: 50,
    label: 'Join Discord Server',
    labelHe: 'הצטרפו לשרת Discord',
    url: 'https://discord.gg/Pe5NFPKcFu',
    icon: 'discord',
  },
  youtube_subscribe: {
    credits: 50,
    label: 'Subscribe on YouTube',
    labelHe: 'הרשמו ב-YouTube',
    url: 'https://www.youtube.com/channel/UCiPKqhdBPG5rbMuwn58sqCg',
    icon: 'youtube',
  },
  spotify_follow: {
    credits: 25,
    label: 'Follow on Spotify',
    labelHe: 'עקבו ב-Spotify',
    url: 'https://open.spotify.com/episode/1JoFU1uy5Ji3CkQGtOvhF6?si=3cb37f1836524578',
    icon: 'spotify',
  },
  telegram_join: {
    credits: 25,
    label: 'Join Telegram',
    labelHe: 'הצטרפו ל-Telegram',
    url: 'https://t.me/+7ITI4MUzD-hmZDk0',
    icon: 'telegram',
  },
  facebook_follow: {
    credits: 25,
    label: 'Follow on Facebook',
    labelHe: 'עקבו ב-Facebook',
    url: 'https://www.facebook.com/profile.php?id=61587514412711',
    icon: 'facebook',
  },
  instagram_follow: {
    credits: 25,
    label: 'Follow on Instagram',
    labelHe: 'עקבו ב-Instagram',
    url: 'https://www.instagram.com/plug_hr.ai/',
    icon: 'instagram',
  },
  linkedin_post_share: {
    credits: 25,
    label: 'Share Launch Post',
    labelHe: 'שתפו את פוסט ההשקה',
    url: 'https://www.linkedin.com/company/plug-hr',
    icon: 'share',
  },
  x_follow: {
    credits: 25,
    label: 'Follow on X',
    labelHe: 'עקבו ב-X',
    url: 'https://x.com/plug_hr', // Update with correct X handle if needed
    icon: 'twitter',
  },
};

// Recurring action rewards
export const RECURRING_REWARDS = {
  COMMUNITY_SHARE: { amount: 5, dailyCap: 3 },
  JOB_SHARE: { amount: 5, dailyCap: 5 },
  REFERRAL_SIGNUP: { amount: 15 },         // referral registered
  REFERRAL_PROFILE_COMPLETE: { amount: 10 }, // referral completed 80%+ profile
  REFERRAL_APPLIED: { amount: 25 },        // referral applied to a job
  REFERRAL_ACTIVE_7D: { amount: 15 },      // referral active 7 days
  REFERRAL_HIRED: { amount: 100 },         // referral got hired
  VOUCH_RECEIVED: { amount: 25, monthlyCap: 5 },
  VOUCH_GIVEN: { amount: 5, monthlyCap: 5 },
  VOUCH_RECIPROCAL: { amount: 5 },         // returned a vouch
  VOUCH_VIA_EXTERNAL_LINK: { amount: 15 }, // vouch from external link that brought a referral
  VOUCH_FROM_RECRUITER: { amount: 50 },    // vouch from a recruiter (premium)
  CONNECTION_ACCEPTED: { amount: 10, monthlyCap: 10 }, // new connection accepted
  SKILL_ADDED: { amount: 10 },
  LOGIN_STREAK: { amount: 2, dailyCap: 1 }, // daily login reward
} as const;

// XP rewards for ambassador system
export const XP_REWARDS = {
  REFERRAL_SIGNUP: 10,
  REFERRAL_APPLIED: 25,
  REFERRAL_HIRED: 100,
  JOB_SHARE_CLICKED: 5,
  CONTENT_CREATED: 50,       // wrote a review / success story
  VIDEO_CONTENT: 100,        // TikTok/Reels about PLUG
  STREAK_7_DAYS: 15,
  STREAK_30_DAYS: 75,
  SOCIAL_TASKS_COMPLETE: 50, // completed all 12 social tasks
  VOUCH_GIVEN: 5,
  VOUCH_RECEIVED: 10,
  VOUCH_RECIPROCAL: 10,
  VOUCH_VIA_EXTERNAL: 15,
  CONNECTION_ACCEPTED: 5,
  CONNECTION_MILESTONE_10: 25,
  CONNECTION_MILESTONE_50: 75,
  DAILY_LOGIN: 1,
  WEEKLY_INVITE_2: 20,       // invited 2+ friends in a week
  WEEKLY_SHARE_10: 10,       // shared 10+ jobs in a week
  WEEKLY_POST: 10,           // wrote a feed post this week
} as const;

// Ambassador tiers
export const AMBASSADOR_TIERS = {
  explorer:   { minXP: 0,     dailyFuel: 15, referralBonus: 0,  label: { en: 'Explorer',  he: 'חוקר' },  badge: null },
  connector:  { minXP: 100,   dailyFuel: 20, referralBonus: 5,  label: { en: 'Connector', he: 'מקשר' },  badge: 'bronze' },
  advocate:   { minXP: 500,   dailyFuel: 25, referralBonus: 10, label: { en: 'Advocate',  he: 'תומך' },  badge: 'silver' },
  ambassador: { minXP: 2000,  dailyFuel: 30, referralBonus: 15, label: { en: 'Ambassador', he: 'שגריר' }, badge: 'gold' },
  champion:   { minXP: 10000, dailyFuel: 40, referralBonus: 25, label: { en: 'Champion',  he: 'אלוף' },  badge: 'platinum' },
} as const;

export type AmbassadorTier = keyof typeof AMBASSADOR_TIERS;

// Get tier from XP
export function getTierFromXP(xp: number): AmbassadorTier {
  if (xp >= AMBASSADOR_TIERS.champion.minXP) return 'champion';
  if (xp >= AMBASSADOR_TIERS.ambassador.minXP) return 'ambassador';
  if (xp >= AMBASSADOR_TIERS.advocate.minXP) return 'advocate';
  if (xp >= AMBASSADOR_TIERS.connector.minXP) return 'connector';
  return 'explorer';
}

// Get daily fuel for a given XP level
export function getDailyFuelForXP(xp: number): number {
  return AMBASSADOR_TIERS[getTierFromXP(xp)].dailyFuel;
}

// Fuel warning thresholds (percentage of daily fuel remaining)
export const FUEL_WARNING_THRESHOLDS = {
  INFO: 0.30,     // 70% used → 30% remaining → subtle indicator
  WARNING: 0.15,  // 85% used → 15% remaining → toast notification
  CRITICAL: 0.05, // 95% used → 5% remaining → toast + options
  EMPTY: 0,       // 100% used → gentle block with CTA
} as const;

// Achievement milestones
export const ACHIEVEMENTS = {
  networker:         { xp: 50,  fuel: 50,  requirement: 'referrals_5',        label: { en: 'Networker', he: 'נטוורקר' } },
  influencer:        { xp: 200, fuel: 200, requirement: 'referrals_20',       label: { en: 'Influencer', he: 'משפיען' } },
  committed:         { xp: 75,  fuel: 100, requirement: 'streak_30',          label: { en: 'Committed', he: 'מחויב' } },
  job_spreader:      { xp: 100, fuel: 100, requirement: 'job_shares_100',     label: { en: 'Job Spreader', he: 'מפיץ משרות' } },
  community_builder: { xp: 50,  fuel: 75,  requirement: 'vouches_given_10',   label: { en: 'Community Builder', he: 'בונה קהילה' } },
  social_butterfly:  { xp: 50,  fuel: 100, requirement: 'social_tasks_all',   label: { en: 'Social Butterfly', he: 'פרפר חברתי' } },
  trusted_pro:       { xp: 30,  fuel: 50,  requirement: 'vouches_received_5', label: { en: 'Trusted Professional', he: 'מקצוען מהימן' } },
  super_connector:   { xp: 100, fuel: 100, requirement: 'connections_25',     label: { en: 'Super Connector', he: 'מקשר-על' } },
} as const;

export type AchievementId = keyof typeof ACHIEVEMENTS;

// Calculate total potential from social tasks
export const TOTAL_SOCIAL_CREDITS = Object.values(SOCIAL_TASK_REWARDS).reduce(
  (sum, task) => sum + task.credits,
  0
);

// Default daily fuel amount (base tier — Explorer)
export const DEFAULT_DAILY_FUEL = 15;
