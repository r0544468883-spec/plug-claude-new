export type FeedPostType = 'tip' | 'culture' | 'poll' | 'visual' | 'video' | 'question' | 'event' | 'assignment';

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
    content: '🎯 How to ace our technical task: Focus on clean code over clever solutions. We value readability and tests!\n\nHere are my top 5 tips:\n1. Write tests before code\n2. Use meaningful variable names\n3. Keep functions small and focused\n4. Add comments only when the "why" isn\'t obvious\n5. Submit with a README explaining your approach\n\nDon\'t overthink it — we care more about how you think than whether you find the "optimal" solution.',
    contentHe: '🎯 איך לעבור את המשימה הטכנית שלנו: תתמקדו בקוד נקי ולא בפתרונות מתוחכמים. אנחנו מעריכים קריאות וטסטים!\n\nהנה 5 הטיפים המובילים שלי:\n1. כתבו טסטים לפני קוד\n2. השתמשו בשמות משתנים משמעותיים\n3. שמרו על פונקציות קטנות וממוקדות\n4. הוסיפו הערות רק כשה-"למה" לא ברור\n5. הגישו עם README שמסביר את הגישה שלכם\n\nאל תחשבו יותר מדי — אנחנו מעריכים איך אתם חושבים יותר ממציאת הפתרון ה"אופטימלי".',
    likes: 47,
    comments: 12,
  },
  {
    postType: 'tip',
    content: '💡 3 mistakes candidates make in behavioral interviews:\n\n1) Not using STAR method — Tell us the Situation, Task, Action, and Result. Structure your answers!\n\n2) Being too vague — "I improved performance" → "I reduced API response time from 2s to 200ms by implementing Redis caching"\n\n3) Not asking questions back — This is a two-way conversation. Ask about the team, challenges, and growth opportunities.\n\nBonus: Research the company beforehand. Know their products, recent news, and culture. It shows you care.',
    contentHe: '💡 3 טעויות שמועמדים עושים בראיון התנהגותי:\n\n1) לא משתמשים בשיטת STAR — ספרו לנו את המצב, המשימה, הפעולה והתוצאה. תבנו את התשובות שלכם!\n\n2) עמומים מדי — "שיפרתי ביצועים" → "צמצמתי זמן תגובת API מ-2 שניות ל-200ms באמצעות Redis caching"\n\n3) לא שואלים שאלות חזרה — זו שיחה דו-כיוונית. שאלו על הצוות, אתגרים ואפשרויות צמיחה.\n\nבונוס: חקרו את החברה מראש. הכירו את המוצרים, חדשות אחרונות והתרבות. זה מראה שאכפת לכם.',
    likes: 83,
    comments: 24,
  },
  {
    postType: 'tip',
    content: '🚀 What I look for in a portfolio: Real projects > tutorials.\n\nShow your problem-solving process, not just the result. I want to see:\n• What problem you identified\n• How you approached it\n• What trade-offs you made\n• What you learned\n\nA single well-documented project beats 10 tutorial clones. Include a live demo link if possible — I will click it.',
    contentHe: '🚀 מה אני מחפשת בפורטפוליו: פרויקטים אמיתיים > תרגולים.\n\nהראו את תהליך פתרון הבעיות, לא רק את התוצאה. אני רוצה לראות:\n• איזו בעיה זיהיתם\n• איך ניגשתם אליה\n• אילו פשרות עשיתם\n• מה למדתם\n\nפרויקט אחד מתועד היטב מנצח 10 העתקות של תרגולים. כללו קישור לדמו חי אם אפשר — אני אלחץ עליו.',
    likes: 62,
    comments: 18,
  },
];

const CULTURE_POSTS: Omit<FeedPost, 'id' | 'companyName' | 'recruiterName' | 'recruiterAvatar' | 'createdAt'>[] = [
  {
    postType: 'culture',
    content: '☕ A day at our office: Morning stand-up at 10, lunch together on Wednesdays, and our famous 4PM coffee break! Our team knows that the best ideas come from casual conversations over a good cup of coffee. We believe in creating an environment where collaboration happens naturally.',
    contentHe: '☕ יום במשרד שלנו: סטנד-אפ בוקר ב-10, ארוחת צהריים ביחד ביום רביעי, והפסקת הקפה המפורסמת שלנו ב-4! הצוות שלנו יודע שהרעיונות הכי טובים מגיעים משיחות חופשיות מעל כוס קפה טובה. אנחנו מאמינים ביצירת סביבה שבה שיתוף פעולה קורה באופן טבעי.',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=400&fit=crop',
    likes: 91,
    comments: 15,
  },
  {
    postType: 'culture',
    content: '🎉 We just celebrated our 50th hire this year! Our team grew from 30 to 80 people. Come join the ride! Looking for talented developers, designers, and product managers who want to make an impact.',
    contentHe: '🎉 חגגנו את הגיוס ה-50 השנה! הצוות גדל מ-30 ל-80 אנשים. בואו להצטרף! מחפשים מפתחים, מעצבים ומנהלי מוצר מוכשרים שרוצים לעשות אימפקט.',
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=400&fit=crop',
    likes: 124,
    comments: 31,
  },
  {
    postType: 'culture',
    content: '🏠 Hybrid culture done right: 3 days office, 2 remote. No meetings on Wednesdays. Productivity at its peak! We surveyed our team and 94% said this is the best work-life balance they have ever had.',
    contentHe: '🏠 תרבות היברידית נכונה: 3 ימים במשרד, 2 מרחוק. בלי פגישות ביום רביעי. פרודוקטיביות בשיא! עשינו סקר בצוות ו-94% אמרו שזה האיזון הכי טוב בין עבודה לחיים שהיה להם אי פעם.',
    imageUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=400&fit=crop',
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
export function generateFeedPosts(userCompanyNames: string[] = [], language: string = 'en'): FeedPost[] {
  const isHebrew = language === 'he';
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
      recruiterName: isHebrew ? recruiter.he : recruiter.en,
      recruiterAvatar: (isHebrew ? recruiter.he : recruiter.en).charAt(0),
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
