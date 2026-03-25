export type FeedPostType = 'tip' | 'culture' | 'poll' | 'visual' | 'video' | 'question' | 'event';

export interface FeedPost {
  id: string;
  recruiterName: string;
  recruiterAvatar: string;
  companyName: string;
  postType: FeedPostType;
  content: string;
  contentHe: string;
  imageUrl?: string;
  videoUrl?: string;
  likes: number;
  comments: number;
  createdAt: string;
  pollOptions?: PollOption[];
  authorId?: string;
  companyId?: string;
}

export interface PollOption {
  id: string;
  text: string;
  textHe: string;
  votes: number;
}

const GENERIC_COMPANIES = ['TechFlow', 'DataSphere', 'CloudBase', 'NovaTech', 'BrightPath', 'Cybereason', 'Monday.com', 'Wix', 'IronSource', 'Gett'];

const RECRUITER_NAMES = [
  { en: 'Tahel R.', he: 'טהל ר.' },
  { en: 'Maya L.', he: 'מאיה ל.' },
  { en: 'Noam K.', he: 'נועם ק.' },
  { en: 'Shira B.', he: 'שירה ב.' },
  { en: 'Yael G.', he: 'יעל ג.' },
  { en: 'Lior S.', he: 'ליאור ס.' },
];

const TIP_POSTS: Omit<FeedPost, 'id' | 'companyName' | 'recruiterName' | 'recruiterAvatar' | 'createdAt'>[] = [
  {
    postType: 'tip',
    content: '🎯 How to ace our technical task: Focus on clean code over clever solutions. We value readability and tests!',
    contentHe: '🎯 איך לעבור את המשימה הטכנית שלנו: תתמקדו בקוד נקי ולא בפתרונות מתוחכמים. אנחנו מעריכים קריאות וטסטים!',
    likes: 47,
    comments: 12,
  },
  {
    postType: 'tip',
    content: '💡 3 mistakes candidates make in behavioral interviews: 1) Not using STAR method 2) Being too vague 3) Not asking questions back',
    contentHe: '💡 3 טעויות שמועמדים עושים בראיון התנהגותי: 1) לא משתמשים בשיטת STAR 2) עמומים מדי 3) לא שואלים שאלות חזרה',
    likes: 83,
    comments: 24,
  },
  {
    postType: 'tip',
    content: '🚀 What I look for in a portfolio: Real projects > tutorials. Show your problem-solving process, not just the result.',
    contentHe: '🚀 מה אני מחפשת בפורטפוליו: פרויקטים אמיתיים > תרגולים. הראו את תהליך פתרון הבעיות, לא רק את התוצאה.',
    likes: 62,
    comments: 18,
  },
];

const CULTURE_POSTS: Omit<FeedPost, 'id' | 'companyName' | 'recruiterName' | 'recruiterAvatar' | 'createdAt'>[] = [
  {
    postType: 'culture',
    content: '☕ A day at our office: Morning stand-up at 10, lunch together on Wednesdays, and our famous 4PM coffee break!',
    contentHe: '☕ יום במשרד שלנו: סטנד-אפ בוקר ב-10, ארוחת צהריים ביחד ביום רביעי, והפסקת הקפה המפורסמת שלנו ב-4!',
    likes: 91,
    comments: 15,
  },
  {
    postType: 'culture',
    content: '🎉 We just celebrated our 50th hire this year! Our team grew from 30 to 80 people. Come join the ride!',
    contentHe: '🎉 חגגנו את הגיוס ה-50 השנה! הצוות גדל מ-30 ל-80 אנשים. בואו להצטרף!',
    likes: 124,
    comments: 31,
  },
  {
    postType: 'culture',
    content: '🏠 Hybrid culture done right: 3 days office, 2 remote. No meetings on Wednesdays. Productivity at its peak!',
    contentHe: '🏠 תרבות היברידית נכונה: 3 ימים במשרד, 2 מרחוק. בלי פגישות ביום רביעי. פרודוקטיביות בשיא!',
    likes: 76,
    comments: 22,
  },
];

const POLL_POSTS: Omit<FeedPost, 'id' | 'companyName' | 'recruiterName' | 'recruiterAvatar' | 'createdAt'>[] = [
  {
    postType: 'poll',
    content: '📊 What matters most to you in a new job?',
    contentHe: '📊 מה הכי חשוב לכם בעבודה חדשה?',
    likes: 156,
    comments: 43,
    pollOptions: [
      { id: 'salary', text: 'Salary & Benefits', textHe: 'שכר והטבות', votes: 42 },
      { id: 'culture', text: 'Company Culture', textHe: 'תרבות ארגונית', votes: 35 },
      { id: 'growth', text: 'Growth Opportunities', textHe: 'אפשרויות קידום', votes: 48 },
      { id: 'wlb', text: 'Work-Life Balance', textHe: 'איזון עבודה-חיים', votes: 31 },
    ],
  },
  {
    postType: 'poll',
    content: '🤔 How long should a hiring process take?',
    contentHe: '🤔 כמה זמן צריך לקחת תהליך גיוס?',
    likes: 89,
    comments: 27,
    pollOptions: [
      { id: '1w', text: '1 week', textHe: 'שבוע', votes: 28 },
      { id: '2w', text: '2 weeks', textHe: 'שבועיים', votes: 45 },
      { id: '1m', text: '1 month', textHe: 'חודש', votes: 12 },
      { id: 'depends', text: 'Depends on role', textHe: 'תלוי בתפקיד', votes: 34 },
    ],
  },
];

/**
 * Generate personalized feed posts. Companies from the user's applications are prioritized.
 */
export function generateFeedPosts(userCompanyNames: string[] = []): FeedPost[] {
  const companies = [...userCompanyNames];
  // Fill remaining with generic companies
  for (const c of GENERIC_COMPANIES) {
    if (!companies.includes(c)) companies.push(c);
    if (companies.length >= 8) break;
  }

  const allTemplates = [...TIP_POSTS, ...CULTURE_POSTS, ...POLL_POSTS];
  const posts: FeedPost[] = [];

  allTemplates.forEach((template, i) => {
    const recruiter = RECRUITER_NAMES[i % RECRUITER_NAMES.length];
    const company = companies[i % companies.length];
    const daysAgo = Math.floor(Math.random() * 7) + 1;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    posts.push({
      ...template,
      id: `feed-${i}`,
      recruiterName: recruiter.en,
      recruiterAvatar: recruiter.en.charAt(0),
      companyName: company,
      createdAt: date.toISOString(),
      content: template.content.replace('[Company Name]', company),
      contentHe: template.contentHe.replace('[Company Name]', company),
    });
  });

  // Sort: user's companies first, then by date
  const userSet = new Set(userCompanyNames.map(n => n.toLowerCase()));
  posts.sort((a, b) => {
    const aUser = userSet.has(a.companyName.toLowerCase()) ? 0 : 1;
    const bUser = userSet.has(b.companyName.toLowerCase()) ? 0 : 1;
    if (aUser !== bUser) return aUser - bUser;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return posts;
}
