import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Route, X, ChevronRight, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import type { DashboardSection } from '@/components/dashboard/DashboardLayout';

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
}

interface ToolCategory {
  title: string;
  tools: ToolItem[];
}

export function TourGuideFAB({ onNavigate, onStartTour }: TourGuideFABProps) {
  const { role, profile, user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('plug:open-tour-guide', handler);
    return () => window.removeEventListener('plug:open-tour-guide', handler);
  }, []);

  const hasCV = !!(profile as any)?.cv_data && Object.keys((profile as any)?.cv_data || {}).length > 0;
  const hasFullProfile = !!(profile?.full_name && profile?.phone);

  const navigate = (section: DashboardSection) => {
    if (onNavigate) onNavigate(section);
    setOpen(false);
  };

  const getChecklist = (): ChecklistItem[] => {
    if (role === 'job_seeker') {
      return [
        { key: 'account', label: isRTL ? 'יצירת חשבון' : 'Create account', done: true },
        { key: 'profile', label: isRTL ? 'מילוי פרופיל מלא' : 'Complete full profile', done: hasFullProfile, section: 'profile-docs' },
        { key: 'cv', label: isRTL ? 'בניית קורות חיים' : 'Build your CV', done: hasCV, section: 'cv-builder' },
        { key: 'apply', label: isRTL ? 'הגשת מועמדות ראשונה' : 'Submit first application', done: false, section: 'job-search' },
        { key: 'vouch', label: isRTL ? 'קבלת Vouch ראשון' : 'Get first Vouch', done: false, section: 'profile-docs' },
        { key: 'prep', label: isRTL ? 'תרגול ראיון ראשון' : 'Practice first interview', done: false, section: 'interview-prep' },
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
          title: isRTL ? 'חיפוש עבודה' : 'Job Hunting',
          tools: [
            { icon: '🔍', label: isRTL ? 'חיפוש משרות' : 'Job Search', desc: isRTL ? 'AI Match + סינון מתקדם' : 'AI Match + advanced filters', section: 'job-search' as DashboardSection },
            { icon: '💼', label: isRTL ? 'המועמדויות שלי' : 'My Applications', desc: isRTL ? 'מעקב Pipeline ויזואלי' : 'Visual pipeline tracking', section: 'applications' as DashboardSection },
            { icon: '🔔', label: isRTL ? 'התראות משרות' : 'Job Alerts', desc: isRTL ? 'קבל משרות חדשות במייל' : 'Get new jobs by email', section: 'settings' as DashboardSection },
            { icon: '💾', label: isRTL ? 'משרות שמורות' : 'Saved Jobs', desc: isRTL ? 'משרות שסימנת לשמירה' : 'Jobs you bookmarked', section: 'saved-jobs' as DashboardSection },
          ],
        },
        {
          title: isRTL ? 'פרופיל ומסמכים' : 'Profile & Documents',
          tools: [
            { icon: '📄', label: isRTL ? 'בונה קורות חיים' : 'CV Builder', desc: isRTL ? '10 תבניות + עיצוב AI' : '10 templates + AI design', section: 'cv-builder' as DashboardSection },
            { icon: '⭐', label: 'Vouches', desc: isRTL ? 'המלצות ממנהלים לשעבר' : 'Recommendations from managers', section: 'profile-docs' as DashboardSection },
            { icon: '📊', label: isRTL ? 'ניתוח Skill Gap' : 'Skill Gap Analysis', desc: isRTL ? 'מה חסר לך + קורסים מומלצים' : 'What you lack + recommended courses', section: 'job-search' as DashboardSection, isNew: true },
            { icon: '🔗', label: isRTL ? 'ייבא מ-LinkedIn' : 'Import from LinkedIn', desc: isRTL ? 'ייבא פרופיל LinkedIn בלחיצה' : 'Import LinkedIn profile in one click', section: 'profile-docs' as DashboardSection, isNew: true },
          ],
        },
        {
          title: isRTL ? 'הכנה לראיון' : 'Interview Prep',
          tools: [
            { icon: '🎤', label: isRTL ? 'סימולציית ראיונות' : 'Interview Simulator', desc: isRTL ? 'תרגול קולי/וידאו לפי חברה' : 'Voice/video practice by company', section: 'interview-prep' as DashboardSection },
            { icon: '📋', label: isRTL ? 'בוחן ידע' : 'Assessments', desc: isRTL ? 'מבחנים שמגייסים שולחים' : 'Tests sent by recruiters', section: 'applications' as DashboardSection, isNew: true },
          ],
        },
        {
          title: isRTL ? 'קהילה ותוכן' : 'Community & Content',
          tools: [
            { icon: '👥', label: isRTL ? 'קהילות' : 'Communities', desc: isRTL ? 'נטוורקינג + ערוצים' : 'Networking + channels', section: 'communities' as DashboardSection },
            { icon: '📰', label: isRTL ? 'פיד תוכן' : 'Content Feed', desc: isRTL ? 'פוסטים, וובינרים, סקרים' : 'Posts, webinars, polls', section: 'feed' as DashboardSection },
            { icon: '🎯', label: 'Missions', desc: isRTL ? 'פרויקטי פרילנס קצרים' : 'Short freelance projects', section: 'missions' as DashboardSection },
          ],
        },
        {
          title: isRTL ? 'כלים ומידע' : 'Tools & Data',
          tools: [
            { icon: '💬', label: 'Plug Chat', desc: isRTL ? 'קואצ\'ר קריירה AI 24/7' : 'AI career coach 24/7', section: 'chat' as DashboardSection },
            { icon: '📈', label: isRTL ? 'דוחות אישיים' : 'My Reports', desc: isRTL ? '8 דוחות אישיים + גרפים' : '8 personal reports + charts', section: 'settings' as DashboardSection, isNew: true },
            { icon: '🔥', label: isRTL ? 'קרדיטים' : 'Credits', desc: isRTL ? '20 יומיים + צבירה' : '20 daily + earn more', section: 'settings' as DashboardSection },
            { icon: '🔗', label: isRTL ? 'תוכנית שותפים' : 'Referral Program', desc: isRTL ? 'הזמן חברים → הרוויח קרדיטים' : 'Invite friends → earn credits', section: 'settings' as DashboardSection, isNew: true },
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
            'ציון Match 80%+ = כדאי להגיש מיד',
            'קו"ח מעודכן = פי 3 יותר חשיפה למגייסים',
            'Vouches מ-מנהלים מעלים דירוג ב-40%',
            'השתמש ב-Skill Gap כדי לדעת מה ללמוד',
            'ראיונות AI מכינים אותך בדיוק לתפקיד',
            'קרדיטים יומיים מתחדשים כל יום — אל תבזבז',
          ]
        : [
            'Match score 80%+ = apply immediately',
            'Updated CV = 3x more recruiter visibility',
            'Manager Vouches boost your ranking by 40%',
            'Use Skill Gap to know exactly what to learn',
            'AI interview prep is tailored to the exact role',
            'Daily credits renew every day — use them!',
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

  return (
    <>
      {/* FAB Button - mobile only */}
      {isMobile && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'fixed z-40 w-12 h-12 rounded-full bg-secondary border border-accent/30 shadow-lg flex items-center justify-center transition-all hover:scale-105 hover:border-accent',
            'bottom-[88px]',
            isRTL ? 'right-4' : 'left-4'
          )}
          aria-label={isRTL ? 'מדריך המערכת' : 'System Guide'}
        >
          <Route className="w-[22px] h-[22px] text-accent" />
        </button>
      )}

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[55]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: isRTL ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                'fixed top-0 z-[56] h-full bg-background border-e border-border/50',
                isRTL ? 'right-0' : 'left-0',
                isMobile ? 'w-full' : 'w-[380px]'
              )}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  📋 {isRTL ? 'מדריך המערכת' : 'System Guide'}
                </h2>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Start Guided Tour Button - right below header */}
              {onStartTour && (
                <div className="px-4 py-3 border-b border-border">
                  <Button
                    variant="default"
                    className="w-full gap-2"
                    onClick={() => {
                      setOpen(false);
                      onStartTour();
                    }}
                  >
                    🗺️ {isRTL ? 'התחל סיור מודרך' : 'Start Guided Tour'}
                  </Button>
                </div>
              )}

              <ScrollArea className={cn(onStartTour ? "h-[calc(100%-120px)]" : "h-[calc(100%-60px)]")}>
                <div className="p-4 space-y-6">

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
                    <div className="w-full h-2 rounded-full bg-secondary">
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
                                    setOpen(false);
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
                                {!item.done && <ChevronRight className="w-4 h-4 ms-auto text-muted-foreground" />}
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
                                setOpen(false);
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

                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
