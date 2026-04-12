import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { g, GENDERED, type GrammaticalGender, getGrammaticalGender } from '@/lib/gendered-text';

/**
 * Hook that provides gendered Hebrew text based on the current user's gender.
 *
 * Usage:
 *   const { gt, gendered } = useGenderedText();
 *   // Custom gendered text:
 *   gt('הוספת', 'הוספת')  // picks based on user gender
 *   // Pre-defined phrases:
 *   gendered.welcome()     // 'ברוך הבא' or 'ברוכה הבאה'
 *
 * For English text, just use the English string directly — no gender needed.
 */
export function useGenderedText() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const userGender = profile?.gender || null;
  const grammaticalGender: GrammaticalGender = getGrammaticalGender(userGender);

  /** Pick gendered Hebrew text. Returns male form for English. */
  const gt = useCallback(
    (male: string, female: string) => {
      if (!isHebrew) return male; // English fallback
      return g(userGender, male, female);
    },
    [userGender, isHebrew],
  );

  /** Pre-defined gendered phrases — call without arguments, gender auto-applied. */
  const gendered = {
    welcome: () => isHebrew ? GENDERED.welcome(userGender) : 'Welcome',
    dear: () => isHebrew ? GENDERED.dear(userGender) : 'dear',
    connected: () => isHebrew ? GENDERED.connected(userGender) : 'Connected',
    registered: () => isHebrew ? GENDERED.registered(userGender) : 'Registered',
    active: () => isHebrew ? GENDERED.active(userGender) : 'Active',
    visible: () => isHebrew ? GENDERED.visible(userGender) : 'Visible',
    ready: () => isHebrew ? GENDERED.ready(userGender) : 'Ready',
    invited: () => isHebrew ? GENDERED.invited(userGender) : 'Invited',
    recommended: () => isHebrew ? GENDERED.recommended(userGender) : 'Recommended',
    you: () => isHebrew ? GENDERED.you(userGender) : 'you',
    user: () => isHebrew ? GENDERED.user(userGender) : 'user',
    candidate: () => isHebrew ? GENDERED.candidate(userGender) : 'candidate',
    employee: () => isHebrew ? GENDERED.employee(userGender) : 'employee',
    recruiter: () => isHebrew ? GENDERED.recruiter(userGender) : 'recruiter',
    friend: () => isHebrew ? GENDERED.friend(userGender) : 'friend',
    chooseAction: () => isHebrew ? GENDERED.chooseAction(userGender) : 'Choose an action',
    fillProfile: () => isHebrew ? GENDERED.fillProfile(userGender) : 'Fill your profile',
    uploadResume: () => isHebrew ? GENDERED.uploadResume(userGender) : 'Upload resume',
    tryNow: () => isHebrew ? GENDERED.tryNow(userGender) : 'Try now',
    startSearch: () => isHebrew ? GENDERED.startSearch(userGender) : 'Start search',
    viewProfile: () => isHebrew ? GENDERED.viewProfile(userGender) : 'View profile',
  } as const;

  return { gt, gendered, grammaticalGender, isHebrew };
}
