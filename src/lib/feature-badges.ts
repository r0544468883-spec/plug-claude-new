export const FEATURE_BADGES = {
  builder: {
    label: { en: 'Builder', he: 'בונה' },
    description: { en: 'Submitted a feature idea', he: 'הגיש רעיון לפיצ׳ר' },
    icon: 'Wrench',
    color: 'bg-blue-500',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
  },
  visionary: {
    label: { en: 'Visionary', he: 'בעל חזון' },
    description: { en: 'Idea was planned for development', he: 'הרעיון שלו נכנס לתכנון' },
    icon: 'Eye',
    color: 'bg-purple-500',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
  },
  founder: {
    label: { en: 'Founder', he: 'מייסד' },
    description: { en: 'Idea was shipped!', he: 'הרעיון שלו יצא לאוויר!' },
    icon: 'Rocket',
    color: 'bg-amber-500',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
  },
} as const;

export type BadgeType = keyof typeof FEATURE_BADGES;

export const SYSTEM_AREAS = {
  dashboard: { en: 'Dashboard', he: 'דשבורד' },
  extension: { en: 'Chrome Extension', he: 'תוסף כרום' },
  ai_engine: { en: 'AI Engine', he: 'מנוע AI' },
  candidate_view: { en: 'Candidate View', he: 'ממשק מועמדים' },
  other: { en: 'Other', he: 'אחר' },
} as const;

export const TARGET_AUDIENCES = {
  recruiters: { en: 'Recruiters', he: 'מגייסים' },
  candidates: { en: 'Candidates', he: 'מועמדים' },
  both: { en: 'Both', he: 'שניהם' },
} as const;

export const REQUEST_STATUSES = {
  submitted: { en: 'Submitted', he: 'הוגש', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  under_review: { en: 'Under Review', he: 'בבדיקה', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  planned: { en: 'Planned', he: 'מתוכנן', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  in_development: { en: 'In Development', he: 'בפיתוח', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  shipped: { en: 'Shipped', he: 'שוחרר!', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  declined: { en: 'Declined', he: 'נדחה', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
} as const;

export type RequestStatus = keyof typeof REQUEST_STATUSES;
