import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Route, X, ChevronRight, ChevronLeft, Check, ChevronDown, Map, Monitor, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import type { DashboardSection } from '@/components/dashboard/DashboardLayout';
import { TOUR_STEPS } from './JobSeekerTour';
import { TourTooltip } from './TourTooltip';

// Module-level variables: survive component remounts within the same session
let _fabViewMode: 'tour' | 'screens' = (() => {
  try { return (localStorage.getItem('plug_tour_view') as 'tour' | 'screens') || 'tour'; } catch { return 'tour'; }
})();
let _fabOpen = false;
let _spotlightKeyCounter = 0;
let _moduleSpotlight: { key: number; label: string; desc: string; selector: string; section: DashboardSection; stepIdx?: number; toolCategoryIdx: number; toolIdx: number } | null = null;

interface TourGuideFABProps {
  onNavigate?: (section: DashboardSection) => void;
  onStartTour?: () => void;
}

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  section?: DashboardSection;
}

interface ToolItem {
  icon: string;
  label: string;
  desc: string;
  section?: DashboardSection;
  isNew?: boolean;
  action?: () => void; // custom action override
  tourStepIdx?: number; // index into TOUR_STEPS for spotlight title/desc/selector
}

interface ToolCategory {
  title: string;
  tools: ToolItem[];
}

export function TourGuideFAB({ onNavigate, onStartTour }: TourGuideFABProps) {
  const { role, profile } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(_fabOpen);
  const setOpenPersistent = (v: boolean) => { _fabOpen = v; setOpen(v); };
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [, forceRender] = useState(0);
  const [spotlight, _setSpotlightState] = useState(_moduleSpotlight);
  const [spotlightRect, setSpotlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const setSpotlight = (v: typeof _moduleSpotlight) => { _moduleSpotlight = v; _setSpotlightState(v); };

  // On mount: restore spotlight if navigation caused a remount
  useEffect(() => {
    if (_moduleSpotlight) _setSpotlightState(_moduleSpotlight);
  }, []);

  // Find the target element in the DOM and compute its rect
  useEffect(() => {
    if (!spotlight?.selector) { setSpotlightRect(null); return; }
    let cancelled = false;
    let attempts = 0;
    const tryFind = () => {
      if (cancelled) return;
      const el = document.querySelector(spotlight.selector);
      if (el) {
        const r = el.getBoundingClientRect();
        const pad = 12;
        setSpotlightRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (attempts++ < 8) {
        setTimeout(tryFind, 200 + attempts * 100);
      }
    };
    const t = setTimeout(tryFind, 420);
    return () => { cancelled = true; clearTimeout(t); };
  }, [spotlight?.selector, spotlight?.key]);

  // viewMode lives entirely in the module-level variable — no useState
  const viewMode = _fabViewMode;
  const switchView = (mode: 'tour' | 'screens') => {
    _fabViewMode = mode;
    try { localStorage.setItem('plug_tour_view', mode); } catch {}
    forceRender(n => n + 1);
  };

  // Focus management: move focus into panel on open, return to FAB on close
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        const first = panelRef.current?.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])'
        );
        first?.focus();
      }, 50);
      return () => clearTimeout(t);
    } else {
      fabRef.current?.focus();
    }
  }, [open]);

  // Focus trap: keep Tab inside panel while open
  useEffect(() => {
    if (!open) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])'
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, [open]);

  useEffect(() => {
    const handler = () => setOpenPersistent(true);
    window.addEventListener('plug:open-tour-guide', handler);
    return () => window.removeEventListener('plug:open-tour-guide', handler);
  }, []);

  const hasCV = !!(profile as any)?.cv_data && Object.keys((profile as any)?.cv_data || {}).length > 0;
  const hasFullProfile = !!(profile?.full_name && profile?.phone);

  const navigate = (section: DashboardSection) => {
    if (onNavigate) onNavigate(section);
    setOpenPersistent(false);
  };

  const getChecklist = (): ChecklistItem[] => {
    if (role === 'job_seeker') {
      return [
        { key: 'account', label: isRTL ? '✅ נרשמת — כל הכבוד!' : '✅ Account created — nice!', done: true },
        { key: 'profile', label: isRTL ? 'השלם פרופיל (שם + טלפון)' : 'Complete profile (name + phone)', done: hasFullProfile, section: 'profile-docs' },
        { key: 'cv', label: isRTL ? 'בנה קורות חיים' : 'Build your CV', done: hasCV, section: 'cv-builder' },
        { key: 'apply', label: isRTL ? 'הגש מועמדות ראשונה' : 'Submit your first application', done: false, section: 'job-search' },
        { key: 'vouch', label: isRTL ? 'קבל Vouch ממנהל/ת' : 'Get a Vouch from a manager', done: false, section: 'vouches' },
        { key: 'prep', label: isRTL ? 'תרגל ראיון ראשון עם AI' : 'Practice first AI interview', done: false, section: 'interview-prep' },
        { key: 'agent', label: isRTL ? 'הפעל את ה-AI Agent' : 'Activate the AI Agent', done: false, section: 'overview' },
      ];
    }
    if (role === 'freelance_hr' || role === 'inhouse_hr') {
      return [
        { key: 'account', label: isRTL ? 'יצירת חשבון' : 'Create account', done: true },
        { key: 'profile', label: isRTL ? 'הגדרת פרופיל מגייס' : 'Setup recruiter profile', done: hasFullProfile, section: 'recruiter-profile' as DashboardSection },
        { key: 'client', label: isRTL ? 'הוספת לקוח ראשון' : 'Add first client', done: false, section: 'clients' },
        { key: 'job', label: isRTL ? 'פרסום משרה ראשונה' : 'Post first job', done: false, section: 'post-job' },
        { key: 'pool', label: isRTL ? 'שמירת מועמד לבנק מועמדים' : 'Save candidate to Talent Pool', done: false, section: 'hr-tools' as DashboardSection },
        { key: 'analytics', label: isRTL ? 'צפייה ב-Pipeline Analytics' : 'View Pipeline Analytics', done: false, section: 'hr-tools' as DashboardSection },
      ];
    }
    // company
    return [
      { key: 'account', label: isRTL ? 'יצירת חשבון חברה' : 'Create company account', done: true },
      { key: 'profile', label: isRTL ? 'הגדרת פרופיל חברה' : 'Setup company profile', done: hasFullProfile, section: 'profile-docs' },
      { key: 'job', label: isRTL ? 'פרסום משרה ראשונה' : 'Post first job', done: false, section: 'post-job' as DashboardSection },
      { key: 'career', label: isRTL ? 'הפעלת Career Site' : 'Activate Career Site', done: false, section: 'profile-docs' as DashboardSection },
      { key: 'view', label: isRTL ? 'צפייה במועמדים' : 'View candidates', done: false, section: 'candidates' },
      { key: 'onboard', label: isRTL ? 'הגדרת תהליך Onboarding' : 'Setup Onboarding flow', done: false, section: 'hr-tools' as DashboardSection },
    ];
  };

  const getToolCategories = (): ToolCategory[] => {
    if (role === 'job_seeker') {
      return [
        {
          title: isRTL ? '🤖 התוסף של פלאג' : '🤖 PLUG Extension',
          tools: [
            { icon: '🚗', label: isRTL ? 'Auto Apply Agent' : 'Auto Apply Agent', desc: isRTL ? 'סורק LinkedIn + AllJobs ומגיש בשבילך — גם כשאתה ישן' : 'Scans LinkedIn + AllJobs and applies — even while you sleep', section: 'overview' as DashboardSection, isNew: true, tourStepIdx: 1 },
            { icon: '✋', label: isRTL ? 'HITL — אשר לפני הגשה' : 'HITL — Approve Before Apply', desc: isRTL ? 'הסוכן מראה לך כל משרה ומחכה לאישורך — אתה בשליטה' : 'Agent shows each job and waits for your OK — you\'re in control', section: 'overview' as DashboardSection, isNew: true, tourStepIdx: 1 },
          ],
        },
        {
          title: isRTL ? '🚀 מתחילים' : '🚀 Getting Started',
          tools: [
            { icon: '🙋', label: isRTL ? 'הפרופיל שלי' : 'My Profile', desc: isRTL ? 'ספר לנו מי אתה — ה-AI ישתמש בזה בכל מקום' : 'Tell us who you are — AI uses this everywhere', section: 'profile-docs' as DashboardSection, tourStepIdx: 2 },
            { icon: '🎯', label: isRTL ? 'יעד הקריירה שלי' : 'Career Goal', desc: isRTL ? 'מה אתה מחפש? חברות חלומות? שכר? ה-AI יזכור' : 'Dream companies, salary, goals — AI will remember', section: 'profile-docs' as DashboardSection, tourStepIdx: 2 },
            { icon: '🔗', label: isRTL ? 'ייבא מ-LinkedIn' : 'Import from LinkedIn', desc: isRTL ? 'קליק אחד ופרופיל מלא — בלי להקליד כלום' : 'One click and your profile is ready — zero typing', section: 'profile-docs' as DashboardSection, tourStepIdx: 3 },
          ],
        },
        {
          title: isRTL ? '📄 קורות חיים' : '📄 CV & Resume',
          tools: [
            { icon: '🖊️', label: isRTL ? 'CV Builder' : 'CV Builder', desc: isRTL ? '10 תבניות מעוצבות + ייצוא PDF בלחיצה' : '10 professional templates + one-click PDF export', section: 'cv-builder' as DashboardSection, tourStepIdx: 4 },
            { icon: '✨', label: isRTL ? '20 שיפורי AI' : '20 AI Enhancements', desc: isRTL ? 'Bullet rewriter, STAR stories, ATS optimizer — הכל כאן' : 'Bullet rewriter, STAR stories, ATS optimizer — all inside', section: 'cv-builder' as DashboardSection, isNew: true, tourStepIdx: 5 },
            { icon: '🎯', label: isRTL ? 'התאם לכל משרה' : 'Tailor per Job', desc: isRTL ? 'הדבק תיאור משרה → AI מתאים את הקו"ח בדיוק לתפקיד' : 'Paste job description → AI tailors your CV to fit perfectly', section: 'cv-builder' as DashboardSection, isNew: true, tourStepIdx: 5 },
          ],
        },
        {
          title: isRTL ? '🔍 מצא משרות' : '🔍 Find Jobs',
          tools: [
            { icon: '🔍', label: isRTL ? 'חיפוש משרות' : 'Job Search', desc: isRTL ? 'AI Match + פילטרים + סוויפ — כמו Tinder למשרות' : 'AI Match + filters + swipe — like Tinder for jobs', section: 'job-search' as DashboardSection, tourStepIdx: 7 },
            { icon: '🗺️', label: isRTL ? 'תצוגת מיקומים' : 'Location View', desc: isRTL ? 'ראה איפה המשרות מרוכזות — ת"א, הרצליה, ירושלים...' : 'See where jobs cluster — by city, in one view', section: 'my-matches' as DashboardSection, isNew: true, tourStepIdx: 7 },
            { icon: '🏢', label: isRTL ? 'ספריית חברות' : 'Company Directory', desc: isRTL ? 'חפש לפי tech stack, גודל, remote — מצא את ה-vibe שלך' : 'Search by tech stack, size, remote — find your vibe', section: 'companies' as DashboardSection, isNew: true, tourStepIdx: 8 },
            { icon: '🔔', label: isRTL ? 'התראות משרות' : 'Job Alerts', desc: isRTL ? 'משרות רלוונטיות ישר לאימייל — בלי לחפש' : 'Relevant jobs straight to email — no searching', section: 'settings' as DashboardSection, tourStepIdx: 6 },
          ],
        },
        {
          title: isRTL ? '💼 המועמדויות שלי' : '💼 My Applications',
          tools: [
            { icon: '🗂️', label: isRTL ? 'Kanban Board' : 'Kanban Board', desc: isRTL ? 'גרור קלפים בין שלבים — Applied, Interview, Offer, Hired 🎉' : 'Drag cards between stages — Applied, Interview, Offer, Hired 🎉', section: 'applications' as DashboardSection, isNew: true, tourStepIdx: 11 },
            { icon: '📅', label: isRTL ? 'לוח זמנים' : 'Schedule View', desc: isRTL ? 'כל הראיונות וה-Follow-ups בקלנדר אחד נקי' : 'All interviews and follow-ups in one clean calendar', section: 'schedule' as DashboardSection, isNew: true, tourStepIdx: 12 },
            { icon: '📉', label: isRTL ? 'פידבק דחיות' : 'Rejection Feedback', desc: isRTL ? 'נדחית? סמן למה — ה-AI ילמד ויעזור לשפר' : 'Rejected? Tag the reason — AI learns and helps improve', section: 'applications' as DashboardSection, isNew: true, tourStepIdx: 11 },
            { icon: '⏱️', label: isRTL ? 'מעקב זמן' : 'Time Tracking', desc: isRTL ? 'כמה שעות השקעת השבוע? אנחנו סופרים בשבילך' : 'How many hours this week? We count for you', section: 'my-stats' as DashboardSection, isNew: true, tourStepIdx: 19 },
          ],
        },
        {
          title: isRTL ? '🎤 הכנה לראיון' : '🎤 Interview Prep',
          tools: [
            { icon: '🎭', label: isRTL ? 'סימולטור ראיון' : 'Interview Simulator', desc: isRTL ? 'תרגול קולי + וידאו לפי חברה ותפקיד — בלי הפתעות' : 'Voice + video practice by company and role — no surprises', section: 'interview-prep' as DashboardSection, tourStepIdx: 13 },
            { icon: '📋', label: isRTL ? 'בוחן ידע' : 'Assessments', desc: isRTL ? 'מבחנים שמגייסים שולחים — תתאמן מראש' : 'Tests recruiters send — practice in advance', section: 'applications' as DashboardSection, tourStepIdx: 11 },
          ],
        },
        {
          title: isRTL ? '💬 Plug Chat — הקואצ\'ר שלך' : '💬 Plug Chat — Your Coach',
          tools: [
            { icon: '⭐', label: isRTL ? '25 פרומפטים מוכנים' : '25 Ready Prompts', desc: isRTL ? 'לחץ על הכוכב בצ\'אט — שאלות מוכנות לכל מצב' : 'Click the star in chat — ready questions for every situation', section: 'chat' as DashboardSection, isNew: true, tourStepIdx: 10 },
            { icon: '🤖', label: isRTL ? '4 מומחי AI' : '4 AI Specialists', desc: isRTL ? 'Resume Tailor, Interview Coach, Salary Negotiator, Recruiter Outreach' : 'Resume Tailor, Interview Coach, Salary Negotiator, Recruiter Outreach', section: 'chat' as DashboardSection, isNew: true, tourStepIdx: 10 },
          ],
        },
        {
          title: isRTL ? '👥 קהילה' : '👥 Community',
          tools: [
            { icon: '📰', label: isRTL ? 'פיד' : 'Feed', desc: isRTL ? 'פוסטים, וובינרים, סקרים — תישאר בלופ' : 'Posts, webinars, polls — stay in the loop', section: 'feed' as DashboardSection, tourStepIdx: 15 },
          ],
        },
        {
          title: isRTL ? '📊 כלים ונתונים' : '📊 Tools & Data',
          tools: [
            { icon: '⭐', label: 'Vouches', desc: isRTL ? 'מכתבי המלצה ממנהלים — מעלים אותך ב-40% בדירוג' : 'Recommendation letters from managers — boosts ranking 40%', section: 'vouches' as DashboardSection, tourStepIdx: 17 },
            { icon: '📊', label: isRTL ? 'Skill Gap' : 'Skill Gap', desc: isRTL ? 'מה חסר לך לתפקיד? ה-AI אומר + ממליץ קורסים' : 'What\'s missing for the role? AI tells you + suggests courses', section: 'job-search' as DashboardSection, tourStepIdx: 7 },
            { icon: '💰', label: isRTL ? 'מידע שכר' : 'Salary Insights', desc: isRTL ? 'כמה מרוויחים בתפקיד הזה? אל תיכנס לראיון בעיוור' : 'What does this role pay? Don\'t go in blind', section: 'job-search' as DashboardSection, tourStepIdx: 7 },
            { icon: '📈', label: isRTL ? '8 דוחות אישיים' : '8 Personal Reports', desc: isRTL ? 'סטטיסטיקות מלאות על חיפוש העבודה שלך' : 'Full stats on your job search journey', section: 'my-stats' as DashboardSection, tourStepIdx: 19 },
            { icon: '🔥', label: isRTL ? 'קרדיטים' : 'Credits', desc: isRTL ? '15 יומיים — צבור, הרוויח, שתף' : '15 daily — earn more, share, grow', section: 'credits' as DashboardSection, tourStepIdx: 22 },
            { icon: '🔗', label: isRTL ? 'תוכנית שותפים' : 'Referral Program', desc: isRTL ? 'הזמן חברים → הרוויח קרדיטים' : 'Invite friends → earn credits', section: 'referrals' as DashboardSection },
          ],
        },
      ];
    }

    if (role === 'freelance_hr' || role === 'inhouse_hr') {
      return [
        {
          title: isRTL ? 'גיוס מועמדים' : 'Candidate Sourcing',
          tools: [
            { icon: '🔍', label: isRTL ? 'חיפוש מועמדים' : 'Candidate Search', desc: isRTL ? 'AI Match + Blind Hiring' : 'AI Match + Blind Hiring', section: 'candidates' as DashboardSection },
            {
              icon: '💼',
              label: isRTL ? 'ייבוא LinkedIn' : 'LinkedIn Import',
              desc: isRTL ? 'ייבא פרופיל מועמד ב-AI' : 'AI-powered candidate import',
              section: 'candidates' as DashboardSection,
              isNew: true,
              action: () => {
                navigate('candidates');
                // Fire event to open LinkedIn dialog after navigation
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('plug:open-linkedin-import'));
                }, 300);
              },
            },
            { icon: '🏦', label: isRTL ? 'בנק מועמדים (Talent Pool)' : 'Talent Pool', desc: isRTL ? 'תיקיות מועמדים שמורים' : 'Saved candidate folders', section: 'hr-tools' as DashboardSection },
          ],
        },
        {
          title: isRTL ? 'ניהול משרות' : 'Job Management',
          tools: [
            { icon: '📝', label: isRTL ? 'פרסום משרות' : 'Post Jobs', desc: isRTL ? 'AI + שאלות סינון (Knockout)' : 'AI + Knockout screening questions', section: 'post-job' as DashboardSection },
            { icon: '✅', label: isRTL ? 'אישורי הצעות' : 'Approvals', desc: isRTL ? 'Workflow אישורים מרובי שלבים' : 'Multi-step approval workflow', section: 'hr-tools' as DashboardSection },
            { icon: '🔔', label: isRTL ? 'התראות משרות' : 'Job Alerts', desc: isRTL ? 'עדכן מועמדים אוטומטית' : 'Auto-notify candidates', section: 'hr-tools' as DashboardSection },
          ],
        },
        {
          title: isRTL ? 'הערכת מועמדים' : 'Candidate Evaluation',
          tools: [
            { icon: '🎬', label: isRTL ? 'ראיונות וידאו' : 'Video Interviews', desc: isRTL ? 'ראיון אסינכרוני חד-כיווני' : 'Async one-way interviews', section: 'hr-tools' as DashboardSection },
            { icon: '📋', label: 'Scorecards', desc: isRTL ? 'תבניות הערכה עם ציונים' : 'Evaluation templates with scores', section: 'hr-tools' as DashboardSection },
            { icon: '🧪', label: isRTL ? 'מבחני הערכה' : 'Assessments', desc: isRTL ? 'מבחנים + ציון AI' : 'Tests + AI scoring', section: 'hr-tools' as DashboardSection, isNew: true },
            { icon: '📅', label: isRTL ? 'תזמון ראיונות' : 'Interview Scheduling', desc: isRTL ? 'Slot Picker למועמדים' : 'Slot Picker for candidates', section: 'hr-tools' as DashboardSection },
          ],
        },
        {
          title: isRTL ? 'כלי HR מתקדמים' : 'HR Power Tools',
          tools: [
            { icon: '📊', label: isRTL ? 'Pipeline Analytics' : 'Pipeline Analytics', desc: isRTL ? 'Funnel + Time-to-Hire + מקורות' : 'Funnel + Time-to-Hire + sources', section: 'hr-tools' as DashboardSection },
            { icon: '⭐', label: isRTL ? 'סקרי מועמדים' : 'Candidate Surveys', desc: isRTL ? 'NPS + חוויית מועמד' : 'NPS + candidate experience', section: 'hr-tools' as DashboardSection },
            { icon: '🎁', label: isRTL ? 'חבר מביא חבר' : 'Referral Program', desc: isRTL ? 'הרוויח Fuel על הפניות' : 'Earn Fuel for referrals', section: 'hr-tools' as DashboardSection, isNew: true },
          ],
        },
        {
          title: isRTL ? 'CRM ולקוחות' : 'CRM & Clients',
          tools: [
            { icon: '🏢', label: 'CRM', desc: isRTL ? 'לקוחות, contacts, tasks' : 'Clients, contacts, tasks', section: 'clients' as DashboardSection },
            { icon: '📧', label: isRTL ? 'Email Sequences' : 'Email Sequences', desc: isRTL ? 'תזכורות אוטומטיות' : 'Automated reminders', section: 'clients' as DashboardSection },
          ],
        },
        {
          title: isRTL ? 'אנליטיקס ודוחות' : 'Analytics & Reports',
          tools: [
            { icon: '📈', label: isRTL ? '8 דוחות HR' : '8 HR Reports', desc: isRTL ? 'גיוס, הכנסות, CRM, מקורות' : 'Hiring, revenue, CRM, sources', section: 'settings' as DashboardSection, isNew: true },
            { icon: '🔗', label: 'Webhooks', desc: isRTL ? 'חיבורים לכלים חיצוניים' : 'Connect to external tools', section: 'settings' as DashboardSection, isNew: true },
            { icon: '💬', label: 'Plug Chat AI', desc: isRTL ? 'עוזר AI לכל שאלת גיוס' : 'AI assistant for all recruiting', section: 'chat' as DashboardSection },
          ],
        },
        {
          title: isRTL ? 'קהילה ותוכן' : 'Community & Content',
          tools: [
            { icon: '🎯', label: 'Missions', desc: isRTL ? 'לוח פרויקטי גיוס' : 'Recruitment project board', section: 'missions' as DashboardSection },
            { icon: '👥', label: isRTL ? 'קהילות' : 'Communities', desc: isRTL ? 'בניית רשת מועמדים' : 'Build candidate network', section: 'communities' as DashboardSection },
            { icon: '💬', label: isRTL ? 'הודעות' : 'Messages', desc: isRTL ? 'תקשורת ישירה עם מועמדים' : 'Direct candidate communication', section: 'messages' as DashboardSection },
          ],
        },
      ];
    }

    // company_employee
    return [
      {
        title: isRTL ? 'משרות ומועמדים' : 'Jobs & Candidates',
        tools: [
          { icon: '📝', label: isRTL ? 'פרסום משרות' : 'Post Jobs', desc: isRTL ? 'עם Blind Hiring + Knockout' : 'With Blind Hiring + Knockout', section: 'post-job' as DashboardSection },
          { icon: '👤', label: isRTL ? 'מועמדים' : 'Candidates', desc: isRTL ? 'AI Match + ציון התאמה' : 'AI Match + fit score', section: 'candidates' as DashboardSection },
        ],
      },
      {
        title: isRTL ? 'הערכה וגיוס' : 'Evaluation & Hiring',
        tools: [
          { icon: '🎬', label: isRTL ? 'ראיונות וידאו' : 'Video Interviews', desc: isRTL ? 'ראיון אסינכרוני' : 'Async interview', section: 'candidates' as DashboardSection },
          { icon: '📋', label: 'Scorecards', desc: isRTL ? 'הערכת מועמדים בצוות' : 'Team candidate evaluation', section: 'candidates' as DashboardSection },
          { icon: '🧪', label: isRTL ? 'מבחני הערכה' : 'Assessments', desc: isRTL ? 'behavioral + technical' : 'behavioral + technical', section: 'candidates' as DashboardSection, isNew: true },
          { icon: '💼', label: isRTL ? 'הצעות עבודה' : 'Offers', desc: isRTL ? 'חתימה דיגיטלית + מעקב' : 'Digital signing + tracking', section: 'candidates' as DashboardSection },
        ],
      },
      {
        title: isRTL ? 'מותג מעסיק' : 'Employer Brand',
        tools: [
          { icon: '🌐', label: 'Career Site', desc: isRTL ? 'דף קריירה ממותג עם AI Chat' : 'Branded career page with AI Chat', section: 'profile-docs' as DashboardSection },
          { icon: '🎨', label: isRTL ? 'White Label' : 'White Label', desc: isRTL ? 'דומיין + CSS + לוגו מותאם' : 'Custom domain + CSS + logo', section: 'settings' as DashboardSection, isNew: true },
          { icon: '⭐', label: 'Vouches', desc: isRTL ? 'בנה מותג מעסיק' : 'Build employer brand', section: 'profile-docs' as DashboardSection },
          { icon: '🏆', label: isRTL ? 'ביקורות חברה' : 'Company Reviews', desc: isRTL ? 'מה מועמדים אומרים עליכם' : 'What candidates say about you', section: 'profile-docs' as DashboardSection, isNew: true },
        ],
      },
      {
        title: isRTL ? 'HR ועובדים' : 'HR & People',
        tools: [
          { icon: '🤝', label: 'Onboarding', desc: isRTL ? 'צ\'קליסט לעובדים חדשים' : 'New hire checklist', section: 'candidates' as DashboardSection, isNew: true },
          { icon: '🌈', label: isRTL ? 'DEI Tools' : 'DEI Tools', desc: isRTL ? 'Blind Hiring + דוח גיוון' : 'Blind Hiring + diversity report', section: 'candidates' as DashboardSection },
          { icon: '📋', label: isRTL ? 'סקרי מועמדים' : 'Candidate Surveys', desc: isRTL ? 'NPS + חוויית מועמד' : 'NPS + candidate experience', section: 'candidates' as DashboardSection },
        ],
      },
      {
        title: isRTL ? 'אנליטיקס' : 'Analytics',
        tools: [
          { icon: '📈', label: isRTL ? '8 דוחות חברה' : '8 Company Reports', desc: isRTL ? 'משרות, מועמדים, DEI, Career Site' : 'Jobs, candidates, DEI, career site', section: 'settings' as DashboardSection, isNew: true },
          { icon: '🔗', label: 'Webhooks', desc: isRTL ? 'חיבורים לכלים חיצוניים' : 'Connect to external tools', section: 'settings' as DashboardSection, isNew: true },
          { icon: '💬', label: 'Plug Chat', desc: isRTL ? 'AI לכל שאלת גיוס' : 'AI for any hiring question', section: 'chat' as DashboardSection },
        ],
      },
    ];
  };

  const getTips = (): string[] => {
    if (role === 'job_seeker') {
      return isRTL
        ? [
            'ציון Match 80%+ = תגיש עכשיו, אל תחכה',
            'קו"ח מעודכן = פי 3 יותר מגייסים יראו אותך',
            'מכתב המלצה ממנהל מעלה אותך ב-40% בדירוג',
            'ב-Plug Chat יש 25 פרומפטים מוכנים — לחץ על הכוכב',
            'Kanban במועמדויות — גרור קלפים בין שלבים בלי מאמץ',
            'תצוגת מיקומים — ראה איפה המשרות מתכנסות על המפה',
            'AI Agent מגיש בשבילך ברקע — גם בזמן שאתה ישן',
            'HITL — כל הגשה מחכה לאישורך, אתה בשליטה מלאה',
            'סימולטור הראיון מותאם לתפקיד ולחברה הספציפית',
            'ה-AI יודע מה לכתוב לכל מגייס — נסה Recruiter Outreach בצ\'אט',
            '15 קרדיטים מתחדשים כל יום — אל תשאיר אותם לפקוע',
          ]
        : [
            'Match 80%+ = apply now, don\'t overthink it',
            'Updated CV = 3x more recruiter views',
            'A manager\'s recommendation letter boosts your ranking 40%',
            'Plug Chat has 25 ready prompts — click the star icon',
            'Kanban in Applications — drag cards between stages effortlessly',
            'Location view — see where job opportunities cluster by city',
            'AI Agent applies for you in the background — even while you sleep',
            'HITL — every submission waits for your approval, you\'re in full control',
            'Interview simulator is tailored to the specific role and company',
            'AI knows what to write to any recruiter — try Recruiter Outreach in Chat',
            '15 credits renew every day — don\'t let them expire',
          ];
    }
    if (role === 'freelance_hr' || role === 'inhouse_hr') {
      return isRTL
        ? [
            'Knockout Questions מסנן מועמדים לא מתאימים אוטומטית',
            'Blind Hiring משפר diversity ב-pipeline שלך',
            'Missions מביאים מועמדים אקטיביים אליך',
            'Scorecards עם צוות = החלטות גיוס טובות יותר',
            'CRM מעודכן = לקוחות מרוצים = יותר עסקאות',
            'Pipeline Analytics מזהה bottlenecks בתהליך',
            'ייבוא LinkedIn = חסוך שעות הקלדה ידנית',
          ]
        : [
            'Knockout Questions auto-filters unfit candidates',
            'Blind Hiring improves pipeline diversity',
            'Missions bring active candidates to you',
            'Team Scorecards = better hiring decisions',
            'Updated CRM = happy clients = more deals',
            'Pipeline Analytics spots bottlenecks fast',
            'LinkedIn Import = save hours of manual entry',
          ];
    }
    return isRTL
      ? [
          'תיאור משרה מפורט + Knockout = מועמדים ממוקדים',
          'Career Site עם תוכן תרבותי = יותר הגשות',
          'Blind Hiring מגדיל diversity בלי לוותר על איכות',
          'Onboarding מובנה = עובדים שמחים יותר',
          'סקרי מועמדים מגלים בעיות בתהליך הגיוס',
          'Webhooks מחברים את PLUG לכלים הקיימים שלך',
        ]
      : [
          'Detailed JD + Knockout = focused candidates',
          'Career Site with culture content = more applications',
          'Blind Hiring increases diversity without losing quality',
          'Structured onboarding = happier employees',
          'Candidate surveys reveal hiring process issues',
          'Webhooks connect PLUG to your existing tools',
        ];
  };

  const checklist = getChecklist();
  const toolCategories = getToolCategories();
  const tips = getTips();
  const completedCount = checklist.filter(c => c.done).length;

  // Map each section to its first matching TOUR_STEP index (for spotlight)
  const sectionToFirstStep: Partial<Record<string, number>> = {};
  TOUR_STEPS.forEach((step, idx) => {
    if (!(step.section in sectionToFirstStep)) {
      sectionToFirstStep[step.section] = idx;
    }
  });

  const launchSpotlight = (tool: ToolItem, ci: number, i: number) => {
    _spotlightKeyCounter++;
    const key = _spotlightKeyCounter;
    const section = tool.section!;

    // Prefer explicit tourStepIdx → use that step's selector + translated texts
    let selector = '';
    let label = tool.label;
    let desc = tool.desc;
    let stepIdx: number | undefined;

    if (tool.tourStepIdx !== undefined) {
      stepIdx = tool.tourStepIdx;
      const step = TOUR_STEPS[stepIdx];
      selector = step.targetSelector;
      label = isRTL ? step.titleHe : step.titleEn;
      desc = isRTL ? step.descriptionHe : step.descriptionEn;
    } else {
      const fallbackIdx = sectionToFirstStep[section];
      if (fallbackIdx !== undefined) {
        stepIdx = fallbackIdx;
        selector = TOUR_STEPS[fallbackIdx].targetSelector;
      }
    }

    setSpotlightRect(null);
    setSpotlight({ key, label, desc, selector, section, stepIdx, toolCategoryIdx: ci, toolIdx: i });
    if (onNavigate) onNavigate(section);
  };

  return (
    <>
      {/* Spotlight overlay — dims the page with spotlight hole. pointer-events:none so panel stays clickable */}
      <AnimatePresence>
        {spotlight && (
          <motion.div
            key={spotlight.key}
            className="fixed inset-0 z-[9998] pointer-events-none"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <svg className="absolute inset-0 w-full h-full" aria-hidden="true" focusable="false">
              <defs>
                <mask id="fab-spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {spotlightRect && (
                    <rect
                      x={spotlightRect.left}
                      y={spotlightRect.top}
                      width={spotlightRect.width}
                      height={spotlightRect.height}
                      rx="12"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#fab-spotlight-mask)" />
            </svg>
            {spotlightRect && (
              <div
                className="absolute border-2 border-primary rounded-xl"
                style={{
                  top: spotlightRect.top,
                  left: spotlightRect.left,
                  width: spotlightRect.width,
                  height: spotlightRect.height,
                  boxShadow: '0 0 32px hsl(var(--primary) / 0.55)',
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TourTooltip popup — shown when a feature is spotlighted in "By Screens" mode */}
      {spotlight && viewMode === 'screens' && (() => {
        const step = spotlight.stepIdx !== undefined
          ? TOUR_STEPS[spotlight.stepIdx]
          : TOUR_STEPS.find(s => s.section === spotlight.section);
        return (
          <TourTooltip
            key={spotlight.key}
            targetSelector={spotlight.selector}
            title={spotlight.label}
            description={spotlight.desc}
            currentStep={0}
            totalSteps={1}
            onNext={() => { if (onNavigate) onNavigate(spotlight.section); setSpotlight(null); }}
            onPrev={() => {}}
            onSkip={() => setSpotlight(null)}
            isFirst
            isLast
            lastLabel={isRTL ? 'עבור למסך' : 'Go to screen'}
            icon={step?.icon}
            sectionLabel={isRTL ? step?.sectionLabelHe : step?.sectionLabelEn}
          />
        );
      })()}

      {/* FAB Button - visible on mobile and desktop */}
      <button
        ref={fabRef}
        onClick={() => setOpenPersistent(true)}
        className={cn(
          'fixed z-40 rounded-full bg-secondary border border-accent/30 shadow-lg flex items-center justify-center transition-all hover:scale-105 hover:border-accent',
          isMobile ? 'w-12 h-12 bottom-[calc(88px+env(safe-area-inset-bottom,0px))]' : 'w-11 h-11 bottom-6',
          isRTL ? 'right-4' : 'left-4'
        )}
        aria-label={isRTL ? 'מדריך המערכת' : 'System Guide'}
        title={isRTL ? 'מדריך המערכת' : 'System Guide'}
      >
        <Route className={cn('text-accent', isMobile ? 'w-[22px] h-[22px]' : 'w-5 h-5')} />
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[55]"
              onClick={() => { setOpenPersistent(false); setSpotlight(null); setSpotlightRect(null); }}
            />
            <motion.div
              ref={panelRef}
              initial={{ x: reducedMotion ? 0 : (isRTL ? '100%' : '-100%'), opacity: reducedMotion ? 0 : 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reducedMotion ? 0 : (isRTL ? '100%' : '-100%'), opacity: reducedMotion ? 0 : 1 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300, duration: reducedMotion ? 0.15 : undefined }}
              className={cn(
                'fixed top-0 z-[9999] h-full bg-background border-e border-border/50',
                isRTL ? 'right-0' : 'left-0',
                isMobile ? 'w-full' : 'w-[380px]'
              )}
              dir={isRTL ? 'rtl' : 'ltr'}
              role="dialog"
              aria-modal="true"
              aria-label={isRTL ? 'מדריך המערכת' : 'System Guide'}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  📋 {isRTL ? 'מדריך המערכת' : 'System Guide'}
                </h2>
                <button
                  onClick={() => setOpenPersistent(false)}
                  className="text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={isRTL ? 'סגור מדריך' : 'Close guide'}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Spotlight active indicator — shown when a feature is highlighted */}
              {spotlight && viewMode === 'screens' && (
                <div className="px-4 py-2 border-b border-border bg-primary/5 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <p className="text-xs text-primary font-medium flex-1 truncate">{spotlight.label}</p>
                  <button onClick={() => setSpotlight(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* View mode toggle + guided tour button (job_seeker only) */}
              {role === 'job_seeker' && (
                <div className="px-4 py-3 border-b border-border space-y-2">
                  {/* Toggle — two separate buttons with gap */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => switchView('tour')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-all"
                      style={viewMode === 'tour'
                        ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderColor: 'hsl(var(--primary))' }
                        : { background: 'transparent', color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))' }}
                    >
                      <Map className="w-3.5 h-3.5" />
                      {isRTL ? 'מסע מודרך' : 'Guided Tour'}
                    </button>
                    <button
                      type="button"
                      onClick={() => switchView('screens')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-all"
                      style={viewMode === 'screens'
                        ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderColor: 'hsl(var(--primary))' }
                        : { background: 'transparent', color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))' }}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      {isRTL ? 'לפי מסכים' : 'By Screen'}
                    </button>
                  </div>
                  {/* Start tour button — only in 'tour' mode */}
                  {viewMode === 'tour' && onStartTour && (
                    <Button
                      type="button"
                      variant="default"
                      className="w-full gap-2"
                      onClick={() => {
                        setSpotlight(null);
                        setSpotlightRect(null);
                        setOpenPersistent(false);
                        setTimeout(() => onStartTour(), 350);
                      }}
                    >
                      🗺️ {isRTL ? 'התחל סיור מודרך' : 'Start Guided Tour'}
                    </Button>
                  )}
                </div>
              )}

              {/* Non-job_seeker: keep old tour button */}
              {role !== 'job_seeker' && onStartTour && (
                <div className="px-4 py-3 border-b border-border">
                  <Button
                    variant="default"
                    className="w-full gap-2"
                    onClick={() => {
                      setSpotlight(null);
                      setSpotlightRect(null);
                      setOpenPersistent(false);
                      setTimeout(() => onStartTour(), 350);
                    }}
                  >
                    🗺️ {isRTL ? 'התחל סיור מודרך' : 'Start Guided Tour'}
                  </Button>
                </div>
              )}

              <ScrollArea className="h-[calc(100%-130px-env(safe-area-inset-bottom,0px))]">
                <div key={viewMode} className="p-4 space-y-6">

                  {/* ── BY SCREENS VIEW — uses toolCategories (correct sections) ── */}
                  {role === 'job_seeker' && viewMode === 'screens' && (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground">
                        {isRTL
                          ? 'לחצו על פיצ\'ר כדי לנווט ישירות אליו'
                          : 'Click any feature to navigate directly to it'}
                      </p>
                      {toolCategories.map((category, ci) => (
                        <div key={ci}>
                          <h3 className="font-semibold text-sm mb-2 text-foreground">{category.title}</h3>
                          <div className="space-y-1 ps-2 border-s-2 border-border">
                            {category.tools.map((tool, i) => {
                              const isActiveBtn = spotlight?.toolCategoryIdx === ci && spotlight?.toolIdx === i;
                              return (
                              <button
                                key={i}
                                onClick={() => {
                                  if (tool.action) { tool.action(); setOpenPersistent(false); }
                                  else if (tool.section) { launchSpotlight(tool, ci, i); }
                                }}
                                className={cn(
                                  'w-full flex items-center gap-2.5 p-2 rounded-lg transition-colors text-start relative',
                                  isActiveBtn
                                    ? 'bg-primary/10 border border-primary/20'
                                    : 'hover:bg-secondary/50'
                                )}
                              >
                                {/* Active indicator bar */}
                                {isActiveBtn && (
                                  <div className={cn('absolute top-1 bottom-1 w-0.5 bg-primary rounded-full', isRTL ? 'right-0' : 'left-0')} />
                                )}
                                <span className="text-base leading-none flex-shrink-0 w-6 text-center">{tool.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium leading-tight truncate">{tool.label}</p>
                                </div>
                                {tool.isNew && (
                                  <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 rounded px-1 flex-shrink-0">New</span>
                                )}
                                {isRTL
                                  ? <ChevronLeft className={cn('w-3.5 h-3.5 flex-shrink-0', isActiveBtn ? 'text-primary' : 'text-muted-foreground')} />
                                  : <ChevronRight className={cn('w-3.5 h-3.5 flex-shrink-0', isActiveBtn ? 'text-primary' : 'text-muted-foreground')} />
                                }
                              </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── TOUR / DEFAULT VIEW ── */}
                  {(role !== 'job_seeker' || viewMode === 'tour') && (<>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        {isRTL
                          ? `השלמת ${completedCount} מתוך ${checklist.length} שלבים`
                          : `Completed ${completedCount} of ${checklist.length} steps`}
                      </span>
                      <span className="font-bold text-primary">
                        {Math.round((completedCount / checklist.length) * 100)}%
                      </span>
                    </div>
                    <div
                      className="w-full h-2 rounded-full bg-secondary"
                      role="progressbar"
                      aria-valuenow={completedCount}
                      aria-valuemin={0}
                      aria-valuemax={checklist.length}
                      aria-label={isRTL ? `${completedCount} מתוך ${checklist.length} שלבים הושלמו` : `${completedCount} of ${checklist.length} steps completed`}
                    >
                      <div
                        className="h-2 rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${(completedCount / checklist.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Checklist - collapsible */}
                  <div>
                    <button
                      onClick={() => setChecklistOpen(prev => !prev)}
                      className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
                    >
                      <h3 className="font-semibold">{isRTL ? '✅ שלבים ראשונים:' : '✅ First steps:'}</h3>
                      <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', checklistOpen && 'rotate-180')} />
                    </button>
                    <AnimatePresence initial={false}>
                      {checklistOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-1.5 pt-1">
                            {checklist.map((item) => (
                              <button
                                key={item.key}
                                onClick={() => {
                                  if (!item.done && item.section && onNavigate) {
                                    onNavigate(item.section);
                                    setOpenPersistent(false);
                                  }
                                }}
                                className={cn(
                                  'w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-start',
                                  item.done
                                    ? 'text-muted-foreground'
                                    : 'hover:bg-secondary/50 text-foreground cursor-pointer'
                                )}
                                disabled={item.done}
                              >
                                {item.done ? (
                                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                ) : (
                                  <div className="w-4 h-4 rounded border border-border flex-shrink-0" />
                                )}
                                <span className={item.done ? 'line-through text-sm' : 'text-sm'}>{item.label}</span>
                                {!item.done && (isRTL
                                  ? <ChevronLeft className="w-4 h-4 ms-auto text-muted-foreground" />
                                  : <ChevronRight className="w-4 h-4 ms-auto text-muted-foreground" />
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Tool Categories */}
                  {toolCategories.map((category, ci) => (
                    <div key={ci}>
                      <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">
                        {category.title}
                      </h3>
                      <div className="space-y-1">
                        {category.tools.map((tool, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (tool.action) {
                                tool.action();
                              } else if (tool.section && onNavigate) {
                                onNavigate(tool.section);
                                setOpenPersistent(false);
                              }
                            }}
                            className={cn(
                              'w-full flex items-start gap-3 p-2.5 rounded-lg transition-colors text-start',
                              (tool.section || tool.action) ? 'hover:bg-secondary/50 cursor-pointer' : 'opacity-60'
                            )}
                          >
                            <span className="text-base mt-0.5">{tool.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{tool.label}</p>
                                {tool.isNew && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 leading-none">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{tool.desc}</p>
                            </div>
                            {(tool.section || tool.action) && (
                              <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Tips */}
                  <div>
                    <h3 className="font-semibold mb-3">{isRTL ? '💡 טיפים:' : '💡 Tips:'}</h3>
                    <div className="space-y-2">
                      {tips.map((tip, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex gap-2 leading-relaxed">
                          <span className="flex-shrink-0">•</span>
                          {tip}
                        </p>
                      ))}
                    </div>
                  </div>

                  </>)}

                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
