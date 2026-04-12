/**
 * Gendered Hebrew text utility.
 *
 * Hebrew has grammatical gender — verbs, adjectives, and pronouns change form.
 * This utility provides a simple way to select the correct form based on
 * the user's gender preference.
 *
 * Rules:
 * - "male" → masculine form
 * - "female" → feminine form
 * - "prefer_not" / "other" / null / undefined → default to masculine form
 */

export type GrammaticalGender = 'male' | 'female';

/**
 * Returns the grammatical gender to use for Hebrew text.
 * "prefer_not", "other", null, undefined all default to male.
 */
export function getGrammaticalGender(gender: string | null | undefined): GrammaticalGender {
  return gender === 'female' ? 'female' : 'male';
}

/**
 * Pick between masculine and feminine Hebrew text.
 * For English, just returns the English string (no gender).
 */
export function g(
  gender: string | null | undefined,
  male: string,
  female: string,
): string {
  return getGrammaticalGender(gender) === 'female' ? female : male;
}

/**
 * Common gendered Hebrew phrases used across the app.
 * Each returns the correct form for the given gender.
 */
export const GENDERED = {
  // Greetings & general
  welcome: (gender: string | null) => g(gender, 'ברוך הבא', 'ברוכה הבאה'),
  hello: (gender: string | null) => g(gender, 'שלום', 'שלום'),
  dear: (gender: string | null) => g(gender, 'יקר', 'יקרה'),

  // Actions
  youSent: (gender: string | null) => g(gender, 'שלחת', 'שלחת'),
  youReceived: (gender: string | null) => g(gender, 'קיבלת', 'קיבלת'),
  youGave: (gender: string | null) => g(gender, 'נתת', 'נתת'),
  youCreated: (gender: string | null) => g(gender, 'יצרת', 'יצרת'),
  youCompleted: (gender: string | null) => g(gender, 'השלמת', 'השלמת'),
  youApplied: (gender: string | null) => g(gender, 'הגשת', 'הגשת'),
  youEarned: (gender: string | null) => g(gender, 'הרווחת', 'הרווחת'),

  // Status / adjectives
  connected: (gender: string | null) => g(gender, 'מחובר', 'מחוברת'),
  registered: (gender: string | null) => g(gender, 'רשום', 'רשומה'),
  active: (gender: string | null) => g(gender, 'פעיל', 'פעילה'),
  visible: (gender: string | null) => g(gender, 'גלוי', 'גלויה'),
  ready: (gender: string | null) => g(gender, 'מוכן', 'מוכנה'),
  invited: (gender: string | null) => g(gender, 'מוזמן', 'מוזמנת'),
  recommended: (gender: string | null) => g(gender, 'מומלץ', 'מומלצת'),

  // Pronouns
  you: (gender: string | null) => g(gender, 'אתה', 'את'),
  your: (gender: string | null) => g(gender, 'שלך', 'שלך'),

  // Nouns
  user: (gender: string | null) => g(gender, 'משתמש', 'משתמשת'),
  candidate: (gender: string | null) => g(gender, 'מועמד', 'מועמדת'),
  employee: (gender: string | null) => g(gender, 'עובד', 'עובדת'),
  recruiter: (gender: string | null) => g(gender, 'מגייס', 'מגייסת'),
  friend: (gender: string | null) => g(gender, 'חבר', 'חברה'),

  // Dashboard / instructions
  chooseAction: (gender: string | null) => g(gender, 'בחר פעולה', 'בחרי פעולה'),
  fillProfile: (gender: string | null) => g(gender, 'מלא את הפרופיל', 'מלאי את הפרופיל'),
  uploadResume: (gender: string | null) => g(gender, 'העלה קורות חיים', 'העלי קורות חיים'),
  tryNow: (gender: string | null) => g(gender, 'נסה עכשיו', 'נסי עכשיו'),
  startSearch: (gender: string | null) => g(gender, 'התחל חיפוש', 'התחילי חיפוש'),
  viewProfile: (gender: string | null) => g(gender, 'צפה בפרופיל', 'צפי בפרופיל'),
} as const;
