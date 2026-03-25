// Credit costs for various actions
export const CREDIT_COSTS = {
  CV_BUILDER: 10,
  RESUME_MATCH: 3,
  AI_INTERVIEW: 5,
  INTERVIEW_TIPS: 5,
  HOME_TASK_REVIEW: 10,
  SMART_SEARCH: 2,
  PING_AFTER_FREE: 15,
  FEED_INTERACTION: 1,
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
  feed_like: { en: 'Feed Like', he: 'לייק בפיד' },
  feed_comment: { en: 'Feed Comment', he: 'תגובה בפיד' },
  feed_poll_vote: { en: 'Feed Poll Vote', he: 'הצבעה בסקר' },
} as const;

// Free pings per day before credits are charged
export const FREE_PINGS_PER_DAY = 4;

// Threshold for showing confirmation dialog (credits)
export const CONFIRMATION_THRESHOLD = 5;

// Social task rewards (one-time)
export const SOCIAL_TASK_REWARDS: Record<string, { credits: number; label: string; labelHe: string; url: string; icon: string }> = {
  github_star: {
    credits: 100,
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
  REFERRAL: { amount: 10 },
  VOUCH_RECEIVED: { amount: 25, monthlyCap: 5 },
  VOUCH_GIVEN: { amount: 5, monthlyCap: 5 },
  SKILL_ADDED: { amount: 10 }, // Reward for adding new skill to global database
} as const;

// Calculate total potential from social tasks
export const TOTAL_SOCIAL_CREDITS = Object.values(SOCIAL_TASK_REWARDS).reduce(
  (sum, task) => sum + task.credits,
  0
);

// Default daily fuel amount
export const DEFAULT_DAILY_FUEL = 20;
