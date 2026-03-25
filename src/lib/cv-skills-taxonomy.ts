// CV Skills and Languages Taxonomy

export const TECHNICAL_SKILLS = {
  programming: ['JavaScript', 'Python', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Rust', 'Scala'],
  frontend: ['React', 'Vue.js', 'Angular', 'HTML/CSS', 'Tailwind CSS', 'Next.js', 'Svelte', 'jQuery', 'Bootstrap', 'SASS/SCSS'],
  backend: ['Node.js', 'Django', 'FastAPI', 'Spring Boot', '.NET', 'Express.js', 'Flask', 'Rails', 'Laravel', 'NestJS'],
  database: ['PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Elasticsearch', 'SQLite', 'Oracle', 'DynamoDB', 'Firebase'],
  cloud: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Serverless', 'Heroku', 'Vercel', 'Netlify'],
  tools: ['Git', 'CI/CD', 'Jira', 'Figma', 'VS Code', 'Linux', 'Webpack', 'Jenkins', 'GitHub Actions', 'Postman'],
  data: ['Machine Learning', 'Data Analysis', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'SQL', 'Power BI', 'Tableau'],
  mobile: ['React Native', 'Flutter', 'iOS Development', 'Android Development', 'Xamarin', 'Ionic'],
};

export const SOFT_SKILLS = [
  'Leadership',
  'Communication',
  'Teamwork',
  'Problem Solving',
  'Time Management',
  'Creativity',
  'Adaptability',
  'Critical Thinking',
  'Negotiation',
  'Presentation',
  'Conflict Resolution',
  'Decision Making',
  'Project Management',
  'Mentoring',
  'Strategic Planning',
  'Emotional Intelligence',
  'Attention to Detail',
  'Collaboration',
];

export const SOFT_SKILLS_HE: Record<string, string> = {
  'Leadership': 'מנהיגות',
  'Communication': 'תקשורת',
  'Teamwork': 'עבודת צוות',
  'Problem Solving': 'פתרון בעיות',
  'Time Management': 'ניהול זמן',
  'Creativity': 'יצירתיות',
  'Adaptability': 'גמישות',
  'Critical Thinking': 'חשיבה ביקורתית',
  'Negotiation': 'משא ומתן',
  'Presentation': 'מצגות',
  'Conflict Resolution': 'יישוב סכסוכים',
  'Decision Making': 'קבלת החלטות',
  'Project Management': 'ניהול פרויקטים',
  'Mentoring': 'הדרכה',
  'Strategic Planning': 'תכנון אסטרטגי',
  'Emotional Intelligence': 'אינטליגנציה רגשית',
  'Attention to Detail': 'תשומת לב לפרטים',
  'Collaboration': 'שיתוף פעולה',
};

export const TECHNICAL_CATEGORIES_HE: Record<string, string> = {
  programming: 'תכנות',
  frontend: 'פרונטאנד',
  backend: 'בקאנד',
  database: 'מסדי נתונים',
  cloud: 'ענן',
  tools: 'כלים',
  data: 'נתונים ו-AI',
  mobile: 'מובייל',
};

export interface LanguageOption {
  code: string;
  name: string;
  nameEn: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'he', name: 'עברית', nameEn: 'Hebrew' },
  { code: 'en', name: 'English', nameEn: 'English' },
  { code: 'ar', name: 'العربية', nameEn: 'Arabic' },
  { code: 'ru', name: 'Русский', nameEn: 'Russian' },
  { code: 'fr', name: 'Français', nameEn: 'French' },
  { code: 'es', name: 'Español', nameEn: 'Spanish' },
  { code: 'de', name: 'Deutsch', nameEn: 'German' },
  { code: 'zh', name: '中文', nameEn: 'Chinese' },
  { code: 'pt', name: 'Português', nameEn: 'Portuguese' },
  { code: 'it', name: 'Italiano', nameEn: 'Italian' },
  { code: 'hi', name: 'हिन्दी', nameEn: 'Hindi' },
  { code: 'ja', name: '日本語', nameEn: 'Japanese' },
  { code: 'ko', name: '한국어', nameEn: 'Korean' },
  { code: 'am', name: 'አማርኛ', nameEn: 'Amharic' },
  { code: 'pl', name: 'Polski', nameEn: 'Polish' },
  { code: 'uk', name: 'Українська', nameEn: 'Ukrainian' },
  { code: 'ro', name: 'Română', nameEn: 'Romanian' },
];

export const LANGUAGE_LEVELS = [
  { value: 'native', labelEn: 'Native', labelHe: 'שפת אם' },
  { value: 'fluent', labelEn: 'Fluent', labelHe: 'שוטף' },
  { value: 'advanced', labelEn: 'Advanced', labelHe: 'מתקדם' },
  { value: 'intermediate', labelEn: 'Intermediate', labelHe: 'בינוני' },
  { value: 'basic', labelEn: 'Basic', labelHe: 'בסיסי' },
] as const;
