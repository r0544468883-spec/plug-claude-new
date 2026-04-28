import { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlugLogo } from '@/components/PlugLogo';
import { ResumeUpload } from '@/components/documents/ResumeUpload';
import { useTypingEffect } from '@/hooks/useTypingEffect';
import {
  Check, X, Rocket, Link2, Mail, Calendar, Bell, Shield, Loader2,
  CheckCircle2, ChevronDown, Zap, Chrome,
} from 'lucide-react';
import { JOB_FIELDS, JOB_ROLES, EXPERIENCE_LEVELS, getRolesByField } from '@/lib/job-taxonomy';

// Snap totalYears to nearest EXPERIENCE_LEVELS years_min
function snapToExperienceLevel(totalYears: number): string {
  for (let i = EXPERIENCE_LEVELS.length - 1; i >= 0; i--) {
    if (totalYears >= EXPERIENCE_LEVELS[i].years_min) return String(EXPERIENCE_LEVELS[i].years_min);
  }
  return '0';
}

// Match free-text role names to JOB_ROLES slugs
function matchRoleSlugs(roleNames: string[]): string[] {
  const results: string[] = [];
  for (const name of roleNames) {
    const lower = name.toLowerCase();
    const match = JOB_ROLES.find(r =>
      r.name_en.toLowerCase().includes(lower) ||
      lower.includes(r.name_en.toLowerCase()) ||
      r.name_he.includes(name) ||
      name.includes(r.name_he)
    );
    if (match && !results.includes(match.slug)) results.push(match.slug);
    if (results.length >= 5) break;
  }
  return results;
}

// ════════════════════════════════════════════════════
//  OnboardingWizard — Premium chat-like flow
//  DataVision-level design with PLUG branding
// ════════════════════════════════════════════════════

interface OnboardingWizardProps {
  onComplete: () => void;
}

type StepId = 'welcome' | 'gender' | 'cv' | 'name' | 'fields' | 'experience' | 'links' | 'details' | 'gmail' | 'done';

const STEP_ORDER: StepId[] = ['welcome', 'gender', 'cv', 'name', 'fields', 'experience', 'links', 'details', 'gmail', 'done'];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID || '';
const EMAIL_REDIRECT_URI = `${SUPABASE_URL}/functions/v1/connect-email-callback`;
const CALENDAR_REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;
const LINKEDIN_REDIRECT_URI = `${SUPABASE_URL}/functions/v1/linkedin-callback`;

const SALARY_RANGES = [
  { value: '5000-8000', he: '5,000-8,000', en: '5K-8K' },
  { value: '8000-12000', he: '8,000-12,000', en: '8K-12K' },
  { value: '12000-18000', he: '12,000-18,000', en: '12K-18K' },
  { value: '18000-25000', he: '18,000-25,000', en: '18K-25K' },
  { value: '25000-35000', he: '25,000-35,000', en: '25K-35K' },
  { value: '35000+', he: '35,000+', en: '35K+' },
];

const COMMUTE_DISTANCES = [
  { value: '10', he: 'עד 10 ק"מ', en: 'Up to 10km' },
  { value: '30', he: 'עד 30 ק"מ', en: 'Up to 30km' },
  { value: '60', he: 'עד 60 ק"מ', en: 'Up to 60km' },
  { value: 'any', he: 'לא משנה', en: "Doesn't matter" },
  { value: 'remote', he: 'רמוט בלבד', en: 'Remote only' },
  { value: 'hybrid', he: 'היברידי', en: 'Hybrid' },
];

// ═══════════════════════════════════════
//  Sub-components — OUTSIDE main component to avoid re-creation
// ═══════════════════════════════════════

// Transition screen
function TransitionScreen({ texts, onComplete }: { texts: string[]; onComplete: () => void }) {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex(prev => {
        if (prev >= texts.length - 1) {
          clearInterval(interval);
          setTimeout(onComplete, 800);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [onComplete, texts.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-[101]"
      style={{ background: 'hsl(220 47% 5.5%)' }}
    >
      <div className="onb-glow-mint w-full h-full top-0 left-0 onb-animate-pulse-glow" />
      <div className="onb-glow-purple w-full h-full bottom-0 right-0 onb-animate-pulse-glow" style={{ animationDelay: '1s' }} />
      <div className="relative z-10 text-center px-6">
        <div className="mb-8">
          <Loader2 className="w-14 h-14 mx-auto text-primary onb-animate-spin-slow" />
        </div>
        <AnimatePresence mode="wait">
          <motion.h2
            key={textIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-2xl md:text-3xl font-bold text-foreground"
          >
            {texts[textIndex]}
          </motion.h2>
        </AnimatePresence>
        <div className="flex justify-center gap-2 mt-6">
          {texts.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i <= textIndex ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// CV Analysis Transition — terminal-style live readout with DB polling
function CVAnalysisTransition({ userId, isHebrew, onComplete, onDataFound }: {
  userId: string;
  isHebrew: boolean;
  onComplete: () => void;
  onDataFound: (summary: any) => void;
}) {
  const [lines, setLines] = useState<Array<{ text: string; type: 'info' | 'success' | 'purple' | 'bold' }>>([]);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onDataFoundRef = useRef(onDataFound);
  useEffect(() => { onCompleteRef.current = onComplete; onDataFoundRef.current = onDataFound; });

  useEffect(() => {
    const addLine = (text: string, type: 'info' | 'success' | 'purple' | 'bold', delay: number) =>
      setTimeout(() => setLines(prev => [...prev, { text, type }]), delay);

    // Phase 1 — scanning messages while waiting for API
    const p1 = isHebrew ? [
      '📄 פותח את קורות החיים...',
      '🔍 עובר שורה שורה...',
      '💼 מחפש ניסיון מקצועי...',
      '⚡ מזהה כישורים טכניים...',
      '🧠 מנתח השכלה והסמכות...',
      '🌍 בודק שפות...',
    ] : [
      '📄 Opening your CV...',
      '🔍 Scanning line by line...',
      '💼 Extracting work history...',
      '⚡ Identifying technical skills...',
      '🧠 Analyzing education...',
      '🌍 Checking languages...',
    ];
    p1.forEach((text, i) => addLine(text, i % 2 === 0 ? 'info' : 'purple', i * 900));

    // Poll DB for ai_summary
    const startedAt = Date.now();
    const poll = async () => {
      if (doneRef.current) return;
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      console.log(`[CV-TERMINAL] Polling... elapsed=${elapsed}s`);
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('ai_summary')
          .eq('owner_id', userId)
          .eq('doc_type', 'cv')
          .not('ai_summary', 'is', null)
          .limit(1)
          .maybeSingle();

        console.log('[CV-TERMINAL] Poll result:', { found: !!data?.ai_summary, error });
        if (data?.ai_summary) {
          doneRef.current = true;
          const s = data.ai_summary as any;
          const info = s?.personalInfo;
          const dataLines: Array<{ text: string; type: 'info' | 'success' | 'purple' | 'bold' }> = [];

          if (info?.name)       dataLines.push({ text: `✓ ${isHebrew ? 'שם' : 'Name'}: ${info.name}`, type: 'success' });
          if (info?.phone)      dataLines.push({ text: `✓ ${isHebrew ? 'טלפון' : 'Phone'}: ${info.phone}`, type: 'success' });
          if (info?.location)   dataLines.push({ text: `✓ ${isHebrew ? 'מיקום' : 'Location'}: ${info.location}`, type: 'success' });
          const headline = info?.headline || s?.experience?.recentRole;
          if (headline)         dataLines.push({ text: `✓ ${isHebrew ? 'כותרת' : 'Headline'}: ${headline}`, type: 'success' });
          const yrs = s?.experience?.totalYears;
          if (yrs)              dataLines.push({ text: `✓ ${isHebrew ? 'ניסיון' : 'Experience'}: ${yrs} ${isHebrew ? 'שנים' : 'yrs'}`, type: 'success' });
          if (info?.linkedin)   dataLines.push({ text: `✓ LinkedIn ${isHebrew ? 'נמצא' : 'found'} 🔗`, type: 'success' });
          if (info?.github)     dataLines.push({ text: `✓ GitHub ${isHebrew ? 'נמצא' : 'found'} 🔗`, type: 'success' });
          if (info?.portfolio)  dataLines.push({ text: `✓ ${isHebrew ? 'אתר אישי נמצא' : 'Portfolio found'} 🔗`, type: 'success' });
          const tech = (s?.skills?.technical || []).slice(0, 5);
          if (tech.length)      dataLines.push({ text: `⚡ ${tech.join(' · ')}`, type: 'purple' });
          dataLines.push({ text: isHebrew ? '🎉 הכל מוכן! ממלא פרטים...' : '🎉 Done! Filling in details...', type: 'bold' });

          dataLines.forEach((line, i) => {
            setTimeout(() => {
              setLines(prev => [...prev, line]);
              if (i === dataLines.length - 1) {
                setTimeout(() => { onDataFoundRef.current(s); onCompleteRef.current(); }, 900);
              }
            }, 300 + i * 450);
          });
          return;
        }
      } catch {}

      if (Date.now() - startedAt > 30000) {
        doneRef.current = true;
        setLines(prev => [...prev, { text: isHebrew ? '⚠️ ממשיך בלי ניתוח...' : '⚠️ Timed out, continuing...', type: 'info' }]);
        setTimeout(onCompleteRef.current, 1000);
        return;
      }
      setTimeout(poll, 2500);
    };
    setTimeout(poll, 2500);
  }, [userId, isHebrew]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-[101]"
      style={{ background: 'hsl(220 47% 5.5%)' }}
    >
      <div className="onb-glow-mint w-full h-full top-0 left-0 onb-animate-pulse-glow" />
      <div className="onb-glow-purple w-full h-full bottom-0 right-0 onb-animate-pulse-glow" style={{ animationDelay: '1s' }} />
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Terminal chrome */}
        <div className="rounded-t-xl px-4 py-2.5 flex items-center gap-2" style={{ background: 'hsl(220 40% 12%)' }}>
          <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(0 80% 60%)' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(45 90% 60%)' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(130 70% 50%)' }} />
          <span className="text-xs text-muted-foreground ms-2 font-mono tracking-wide">plug-cv-analyzer</span>
        </div>
        {/* Terminal body */}
        <div className="rounded-b-xl p-5 font-mono text-sm min-h-[220px] max-h-[60vh] overflow-y-auto"
          style={{ background: 'hsl(220 40% 7%)' }}>
          <div className="space-y-2">
            <AnimatePresence>
              {lines.map((line, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}
                  className={`flex items-start gap-2 ${
                    line.type === 'success' ? 'text-primary' :
                    line.type === 'purple'  ? 'text-[hsl(270_91%_75%)]' :
                    line.type === 'bold'    ? 'text-primary font-bold text-base' :
                    'text-muted-foreground'
                  }`}
                >
                  <span className="shrink-0 opacity-50">{isHebrew ? '←' : '>'}</span>
                  <span>{line.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {/* Blinking cursor */}
          <motion.span
            animate={{ opacity: [1, 0] }} transition={{ duration: 0.7, repeat: Infinity }}
            className="inline-block w-2 h-4 mt-2 rounded-sm"
            style={{ background: 'hsl(var(--primary))' }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// Typing message bubble
const PlugMessage = memo(function PlugMessage({ text, speed = 35, onComplete }: {
  text: string; speed?: number; onComplete?: () => void;
}) {
  const { displayedText, isComplete } = useTypingEffect(text, speed);
  const calledRef = useRef(false);

  useEffect(() => {
    if (isComplete && onComplete && !calledRef.current) {
      calledRef.current = true;
      onComplete();
    }
  }, [isComplete, onComplete]);

  // Reset when text changes (new step)
  useEffect(() => { calledRef.current = false; }, [text]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex gap-3 items-start max-w-[90%]"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 mt-0.5 shadow-lg"
        style={{ boxShadow: '0 0 20px hsl(156 100% 50% / 0.3)' }}>
        <Zap className="w-5 h-5 text-background" />
      </div>
      <div className="onb-glass-card px-5 py-3.5 text-[15px] leading-relaxed whitespace-pre-line">
        {displayedText}
        {!isComplete && <span className="animate-pulse text-primary">|</span>}
      </div>
    </motion.div>
  );
});

// Option button (quiz-style)
function OptionButton({ label, emoji, selected, onClick }: {
  label: string; emoji?: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`onb-option flex items-center gap-3 min-h-[52px] onb-animate-slide-in ${selected ? 'selected' : ''}`}
    >
      {emoji && <span className="text-2xl">{emoji}</span>}
      <span className="text-[15px] font-medium flex-1">{label}</span>
      {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
    </button>
  );
}

// Chip button
function ChipBtn({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`onb-chip ${selected ? 'selected' : ''}`}>
      {label}
      {selected && <Check className="w-3 h-3" />}
    </button>
  );
}

// ── Main Component ──
export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';

  const [currentStep, setCurrentStep] = useState<StepId>('welcome');
  const [saving, setSaving] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionTexts, setTransitionTexts] = useState<string[]>([]);
  const [showCVAnalysis, setShowCVAnalysis] = useState(false);
  const [messageReady, setMessageReady] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Form state ──
  const [gender, setGender] = useState<'male' | 'female' | 'prefer_not' | ''>('');
  const [fullName, setFullName] = useState((profile as any)?.full_name || '');
  const [phone, setPhone] = useState((profile as any)?.phone || '');
  const [tagline, setTagline] = useState((profile as any)?.personal_tagline || '');
  const [cvUploaded, setCvUploaded] = useState(false);

  // Check if user already has a resume — and pre-populate fields from existing analysis
  useEffect(() => {
    if (!user?.id) return;
    console.log('[CV-AUTOFILL] Checking for existing CV, userId:', user.id);
    supabase
      .from('documents')
      .select('id, ai_summary')
      .eq('owner_id', user.id)
      .eq('doc_type', 'cv')
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        console.log('[CV-AUTOFILL] Query result:', { data: !!data, hasAiSummary: !!(data?.ai_summary), error });
        if (error) { console.error('[CV-AUTOFILL] DB error:', error); return; }
        if (!data) { console.log('[CV-AUTOFILL] No CV document found'); return; }
        setCvUploaded(true);
        const s = data.ai_summary as any;
        if (!s) { console.log('[CV-AUTOFILL] CV found but ai_summary is null — analysis not done yet'); return; }
        console.log('[CV-AUTOFILL] ai_summary found:', { personalInfo: s?.personalInfo, recentRole: s?.experience?.recentRole, skills: s?.skills?.technical?.slice(0,5) });
        const info = s?.personalInfo;
        if (info?.name)      setFullName(info.name);
        if (info?.phone)     setPhone(info.phone);
        if (info?.location)  setCity(info.location.split(',')[0].trim());
        const headline = info?.headline || s?.experience?.recentRole;
        if (headline)        setTagline(headline);
        if (info?.linkedin)  setLinkedinUrl(info.linkedin);
        if (info?.github)    setGithubUrl(info.github);
        if (info?.portfolio) setPortfolioUrl(info.portfolio);
        const yrs = s?.experience?.totalYears;
        if (yrs)             setExperienceYears(snapToExperienceLevel(Number(yrs)));
        const tech: string[] = (s?.skills?.technical || []).slice(0, 10);
        if (tech.length)     setSkills(tech);
        // Infer job fields from role keywords
        const FIELD_KEYWORDS: Record<string, string[]> = {
          tech: ['developer','engineer','software','frontend','backend','fullstack','devops','qa','mobile','cloud','ml','ai','cyber','architect','מפתח','מהנדס','תוכנה'],
          data: ['data','analyst','analytics','bi','דאטה','אנליטיקה'],
          design: ['designer','ux','ui','graphic','creative','מעצב','עיצוב'],
          management: ['manager','director','vp','ceo','cto','product manager','pm','מנהל'],
          marketing: ['marketing','growth','seo','content','brand','שיווק'],
          sales: ['sales','account','business development','מכירות'],
          hr: ['hr','recruiter','talent','human resources','גיוס'],
          finance: ['finance','accountant','financial','controller','כספים'],
        };
        const allRoleNames: string[] = [
          ...(s?.suggestedRoles || []),
          s?.experience?.recentRole,
          ...(s?.experience?.positions || []).map((p: any) => p.role),
        ].filter(Boolean);
        const allRolesLower = allRoleNames.map((r: string) => r.toLowerCase());
        const matched = Object.entries(FIELD_KEYWORDS)
          .filter(([, kws]) => allRolesLower.some(r => kws.some(kw => r.includes(kw))))
          .map(([slug]) => slug).slice(0, 3);
        if (matched.length) setPreferredFields(matched);
        // Match specific role slugs
        const roleSlugMatches = matchRoleSlugs(allRoleNames);
        if (roleSlugMatches.length) setPreferredRoles(roleSlugMatches);
      });
  }, [user?.id]);
  const [preferredFields, setPreferredFields] = useState<string[]>((profile as any)?.preferred_fields || []);
  const [preferredRoles, setPreferredRoles] = useState<string[]>((profile as any)?.preferred_roles || []);
  const [experienceYears, setExperienceYears] = useState<string>(String((profile as any)?.experience_years || ''));
  const [skills, setSkills] = useState<string[]>((profile as any)?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState((profile as any)?.linkedin_url || '');
  const [githubUrl, setGithubUrl] = useState((profile as any)?.github_url || '');
  const [portfolioUrl, setPortfolioUrl] = useState((profile as any)?.portfolio_url || '');
  const [city, setCity] = useState((profile as any)?.city || '');
  const [commuteDistance, setCommuteDistance] = useState('');
  const [desiredSalary, setDesiredSalary] = useState((profile as any)?.desired_salary || '');
  const [searchGoal, setSearchGoal] = useState<'active' | 'open' | 'exploring'>('active');
  const [showAllFields, setShowAllFields] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');

  // Gmail/LinkedIn state
  const [gmailDone, setGmailDone] = useState(false);
  const [calendarDone, setCalendarDone] = useState(false);
  const [linkedinDone, setLinkedinDone] = useState(false);
  const [pushDone, setPushDone] = useState(false);

  const availableRoles = useMemo(() => {
    if (preferredFields.length === 0) return [];
    return preferredFields.flatMap(f => getRolesByField(f));
  }, [preferredFields]);

  const filteredFields = useMemo(() => {
    if (!fieldSearch.trim()) return JOB_FIELDS;
    const q = fieldSearch.toLowerCase();
    return JOB_FIELDS.filter(f =>
      f.name_he.includes(q) || f.name_en.toLowerCase().includes(q) || f.slug.includes(q)
    );
  }, [fieldSearch]);

  // Scroll to top when step changes
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Stable callback for PlugMessage
  const onMessageReady = useCallback(() => setMessageReady(true), []);

  // ── Navigate with optional transition ──
  const transitionCallbackRef = useRef<() => void>(() => {});

  const goToStep = useCallback((stepId: StepId, transition?: string[]) => {
    if (transition) {
      setShowTransition(true);
      setTransitionTexts(transition);
      transitionCallbackRef.current = () => {
        setShowTransition(false);
        setCurrentStep(stepId);
        setMessageReady(false);
      };
    } else {
      setCurrentStep(stepId);
      setMessageReady(false);
    }
  }, []);

  const handleNext = useCallback(() => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx >= STEP_ORDER.length - 1) return;
    const next = STEP_ORDER[idx + 1];

    if (currentStep === 'cv' && cvUploaded) {
      // Show CVAnalysisTransition — polls DB and reveals extracted data live
      setShowCVAnalysis(true);
    } else if (currentStep === 'details') {
      goToStep(next, isHebrew
        ? ['בונה את הפרופיל שלך...', 'מכין את התוסף...', 'כמעט שם!']
        : ['Building your profile...', 'Preparing extension...', 'Almost there!']);
    } else {
      goToStep(next);
    }
  }, [currentStep, cvUploaded, goToStep, isHebrew, setShowCVAnalysis]);

  // Called by CVAnalysisTransition when a fresh analysis arrives — always overwrite
  const handleCVDataFound = useCallback((s: any) => {
    console.log('[CV-AUTOFILL] handleCVDataFound called:', { personalInfo: s?.personalInfo, recentRole: s?.experience?.recentRole, skills: s?.skills?.technical?.slice(0,5) });
    const info = s?.personalInfo;
    if (info?.name)      setFullName(info.name);
    if (info?.phone)     setPhone(info.phone);
    if (info?.location)  setCity(info.location.split(',')[0].trim());
    const headline = info?.headline || s?.experience?.recentRole;
    if (headline)        setTagline(headline);
    if (info?.linkedin)  setLinkedinUrl(info.linkedin);
    if (info?.github)    setGithubUrl(info.github);
    if (info?.portfolio) setPortfolioUrl(info.portfolio);
    const yrs = s?.experience?.totalYears;
    if (yrs)             setExperienceYears(snapToExperienceLevel(Number(yrs)));
    const tech: string[] = (s?.skills?.technical || []).slice(0, 10);
    if (tech.length)     setSkills(tech);
    const FIELD_KEYWORDS: Record<string, string[]> = {
      tech: ['developer','engineer','software','frontend','backend','fullstack','devops','qa','mobile','cloud','ml','ai','data','cyber','architect','מפתח','מהנדס','תוכנה'],
      data: ['data','analyst','analytics','bi','insights','דאטה','אנליטיקה'],
      design: ['designer','ux','ui','graphic','creative','מעצב','עיצוב'],
      management: ['manager','director','vp','ceo','cto','product manager','pm','מנהל'],
      marketing: ['marketing','growth','seo','content','brand','שיווק'],
      sales: ['sales','account','business development','מכירות'],
      hr: ['hr','recruiter','talent','human resources','גיוס'],
      finance: ['finance','accountant','financial','controller','כספים'],
    };
    const allRoleNames: string[] = [
      ...(s?.suggestedRoles || []),
      s?.experience?.recentRole,
      ...(s?.experience?.positions || []).map((p: any) => p.role),
    ].filter(Boolean);
    const allRolesLower = allRoleNames.map((r: string) => r.toLowerCase());
    const matched = Object.entries(FIELD_KEYWORDS)
      .filter(([, kws]) => allRolesLower.some(r => kws.some(kw => r.includes(kw))))
      .map(([slug]) => slug).slice(0, 3);
    if (matched.length) setPreferredFields(matched);
    const roleSlugMatches = matchRoleSlugs(allRoleNames);
    if (roleSlugMatches.length) setPreferredRoles(roleSlugMatches);
  }, []);

  // Called when CVAnalysisTransition finishes
  const handleCVAnalysisDone = useCallback(() => {
    setShowCVAnalysis(false);
    const nextIdx = STEP_ORDER.indexOf('cv') + 1;
    setCurrentStep(STEP_ORDER[nextIdx]);
    setMessageReady(false);
  }, []);

  // ── Save ──
  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Build target_locations from city + commute
      const locations: string[] = [];
      if (city.trim()) locations.push(city.trim());
      if (commuteDistance && commuteDistance !== 'any') locations.push(commuteDistance);

      const updates: Record<string, any> = {
        full_name: fullName.trim(),
        gender: gender || null,
        phone: phone.trim() || null,
        personal_tagline: tagline.trim() || null,
        preferred_fields: preferredFields,
        preferred_roles: preferredRoles,
        experience_years: experienceYears ? Number(experienceYears) : null,
        skills,
        linkedin_url: linkedinUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        portfolio_url: portfolioUrl.trim() || null,
        city: city.trim() || null,
        target_locations: locations.length > 0 ? locations : null,
        desired_salary: desiredSalary || null,
        career_context: searchGoal,
        onboarding_completed: true,
      };
      const { error } = await supabase
        .from('profiles')
        .update(updates as any)
        .eq('user_id', user.id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      localStorage.setItem('plug-onboarding-done', 'true');
      toast.success(isHebrew ? 'הפרופיל עודכן בהצלחה!' : 'Profile updated!');
      onComplete();
    } catch {
      toast.error(isHebrew ? 'שגיאה בשמירה, נסו שוב' : 'Error saving, try again');
    } finally {
      setSaving(false);
    }
  };

  // ── Gmail helpers — open in NEW TAB ──
  const connectGmail = () => {
    if (!GOOGLE_CLIENT_ID || !user) return;
    const state = `${user.id}:gmail`;
    const scopes = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(EMAIL_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}&access_type=offline&prompt=consent`;
    window.open(url, '_blank', 'noopener');
    setGmailDone(true);
  };
  const connectLinkedIn = () => {
    if (!LINKEDIN_CLIENT_ID || !user) return;
    const scopes = 'openid profile email';
    const url = `https://www.linkedin.com/oauth/v2/authorization?client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${user.id}`;
    window.open(url, '_blank', 'noopener');
    setLinkedinDone(true);
  };

  const connectCalendar = () => {
    if (!GOOGLE_CLIENT_ID || !user) return;
    const scopes = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(CALENDAR_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${user.id}&access_type=offline&prompt=consent`;
    window.open(url, '_blank', 'noopener');
    setCalendarDone(true);
  };
  const connectPush = async () => {
    try {
      if (!('Notification' in window)) return;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const reg = await navigator.serviceWorker.ready;
      const pushSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
      });
      const subJson = pushSub.toJSON();
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${SUPABASE_URL}/functions/v1/push-notifications?action=register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription: { endpoint: subJson.endpoint, keys: subJson.keys } }),
      });
      setPushDone(true);
      toast.success(isHebrew ? 'התראות Push הופעלו!' : 'Push notifications enabled!');
    } catch {
      toast.error(isHebrew ? 'שגיאה בהפעלת התראות' : 'Failed to enable notifications');
    }
  };

  const addSkill = () => {
    const v = skillInput.trim();
    if (v && !skills.includes(v) && skills.length < 15) {
      setSkills([...skills, v]);
      setSkillInput('');
    }
  };

  // ── Progress ──
  const stepIndex = STEP_ORDER.indexOf(currentStep);
  const progress = Math.round((stepIndex / (STEP_ORDER.length - 1)) * 100);

  // ═══════════════════════════════════════
  //  Step renderers
  // ═══════════════════════════════════════

  const renderStep = () => {
    switch (currentStep) {

      // ── Welcome ──
      case 'welcome':
        return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="mb-8"
            >
              <PlugLogo size="xl" showText={false} />
            </motion.div>

            <PlugMessage
              text={isHebrew
                ? 'היי! אני PLUG 👋\nאני אעזור לך למצוא את המשרה הבאה שלך.\nלפני שנתחיל, אשאל אותך כמה שאלות קצרות.'
                : "Hey! I'm PLUG 👋\nI'll help you find your next job.\nBefore we start, I'll ask you a few quick questions."}
              speed={30}
              onComplete={onMessageReady}
            />

            {messageReady && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div className="onb-glass-card px-5 py-3 mt-4 inline-flex items-center gap-2 text-sm">
                  <Chrome className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">
                    {isHebrew
                      ? 'כל השאלות האלו הן כדי שתוסף הכרום של PLUG יעבוד בצורה מלאה — מילוי טפסים אוטומטי, שליחת קו"ח, והתאמת משרות.'
                      : 'All these questions help the PLUG Chrome Extension work fully — auto-fill forms, send CVs, and match jobs.'}
                  </span>
                </div>
                <div className="flex justify-center mt-6">
                  <Button onClick={handleNext} size="lg" className="min-h-[52px] gap-2 rounded-full px-8 text-base font-semibold hover:shadow-[0_0_30px_hsl(156_100%_50%/0.3)]">
                    {isHebrew ? 'בואו נתחיל!' : "Let's start!"} <Rocket className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        );

      // ── Gender ──
      case 'gender':
        return (
          <div className="max-w-lg mx-auto px-4">
            <PlugMessage
              text={isHebrew
                ? 'שאלה אחת לפני שנתחיל 👋\nמה המגדר שלך?\n(עוזר לנו לפנות אליך נכון בטפסי הגשת מועמדות)'
                : 'One quick thing 👋\nWhat is your gender?\n(Helps us address you correctly in application forms)'}
              speed={30}
              onComplete={onMessageReady}
            />
            {messageReady && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mt-4">
                <div className="space-y-2">
                  {([
                    { value: 'male' as const, he: 'זכר', en: 'Male', emoji: '👨' },
                    { value: 'female' as const, he: 'נקבה', en: 'Female', emoji: '👩' },
                    { value: 'prefer_not' as const, he: 'מעדיף/ה לא לומר', en: 'Prefer not to say', emoji: '🤐' },
                  ]).map(opt => (
                    <OptionButton
                      key={opt.value}
                      label={isHebrew ? opt.he : opt.en}
                      emoji={opt.emoji}
                      selected={gender === opt.value}
                      onClick={() => {
                        setGender(opt.value);
                        setTimeout(handleNext, 400);
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        );

      // ── CV Upload ──
      case 'cv':
        return (
          <div className="max-w-lg mx-auto px-4">
            <PlugMessage
              text={isHebrew
                ? 'יש לך קורות חיים? 📄\nאם תעלה קו"ח, אני אשאב את רוב המידע אוטומטית ונקצר את התהליך!'
                : 'Do you have a CV? 📄\nUpload it and I\'ll extract most info automatically to speed things up!'}
              speed={30}
              onComplete={onMessageReady}
            />
            {messageReady && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mt-4">
                <div className="onb-glass-card onb-glass-card-active p-6">
                  <ResumeUpload compact onSuccess={() => setCvUploaded(true)} />
                </div>
                {cvUploaded && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-sm text-primary mt-3 justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">{isHebrew ? 'קורות חיים הועלו בהצלחה!' : 'CV uploaded successfully!'}</span>
                  </motion.div>
                )}
                <div className="flex justify-center mt-6">
                  <Button onClick={handleNext} size="lg" className="min-h-[52px] gap-2 rounded-full px-8 text-base font-semibold hover:shadow-[0_0_30px_hsl(156_100%_50%/0.3)]">
                    {cvUploaded ? (isHebrew ? 'נמשיך!' : 'Continue!') : (isHebrew ? 'אדלג, אמלא ידנית' : "Skip, I'll fill manually")}
                    <Rocket className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        );

      // ── Name + Phone + Tagline ──
      case 'name':
        return (
          <div className="max-w-lg mx-auto px-4">
            <PlugMessage
              text={isHebrew
                ? 'מעולה! איך קוראים לך? 😊\nהשם, הטלפון והכותרת ימולאו אוטומטית בטפסי הגשה.'
                : 'Great! What\'s your name? 😊\nName, phone and headline will auto-fill in application forms.'}
              speed={30}
              onComplete={onMessageReady}
            />
            {messageReady && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mt-4">
                <div className="onb-glass-card p-6 space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium">{isHebrew ? 'שם מלא *' : 'Full Name *'}</label>
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder={isHebrew ? 'השם המלא שלך' : 'Your full name'} autoFocus className="onb-input" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium">{isHebrew ? 'מספר טלפון' : 'Phone Number'}</label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="050-1234567" type="tel" className="onb-input" dir="ltr" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                      {isHebrew ? 'כותרת מקצועית' : 'Professional Headline'}
                      <span className="text-muted-foreground/50 ms-1">({isHebrew ? 'לא חובה' : 'optional'})</span>
                    </label>
                    <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder={isHebrew ? 'למשל: מפתחת Full Stack עם 5 שנות ניסיון' : 'e.g. Full Stack Developer, 5 years exp'} className="onb-input" />
                  </div>
                </div>
                <div className="flex justify-center mt-6">
                  <Button onClick={handleNext} disabled={fullName.trim().length < 2} size="lg" className="min-h-[52px] gap-2 rounded-full px-8 text-base font-semibold hover:shadow-[0_0_30px_hsl(156_100%_50%/0.3)]">
                    {isHebrew ? 'המשך' : 'Continue'} <Rocket className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        );

      // ── Fields & Roles ──
      case 'fields':
        return (
          <div className="max-w-lg mx-auto px-4">
            <PlugMessage
              text={isHebrew
                ? 'באילו תחומים אתה מחפש עבודה? 💼\nבחר עד 5 תחומים — זה עוזר לתוסף לסנן ולהתאים משרות.'
                : 'What fields are you looking for? 💼\nPick up to 5 — helps the extension filter and match jobs.'}
              speed={28}
              onComplete={onMessageReady}
            />
            {messageReady && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mt-4">
                <div className="onb-glass-card p-5 space-y-4">
                  <div className="relative">
                    <Input value={fieldSearch} onChange={e => { setFieldSearch(e.target.value); setShowAllFields(true); }} onFocus={() => setShowAllFields(true)} placeholder={isHebrew ? 'חפש תחום...' : 'Search field...'} className="onb-input" />
                    {fieldSearch && (
                      <button className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground" onClick={() => { setFieldSearch(''); setShowAllFields(false); }}>
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto overscroll-contain py-1">
                    {(showAllFields ? filteredFields : JOB_FIELDS.slice(0, 12)).map(f => (
                      <ChipBtn key={f.slug} label={isHebrew ? f.name_he : f.name_en} selected={preferredFields.includes(f.slug)}
                        onClick={() => {
                          if (preferredFields.includes(f.slug)) setPreferredFields(preferredFields.filter(x => x !== f.slug));
                          else if (preferredFields.length < 5) setPreferredFields([...preferredFields, f.slug]);
                        }} />
                    ))}
                    {!showAllFields && (
                      <button onClick={() => setShowAllFields(true)} className="onb-chip !border-dashed !border-primary/30 text-primary text-xs">
                        <ChevronDown className="w-3 h-3" /> {isHebrew ? `עוד ${JOB_FIELDS.length - 12} תחומים` : `${JOB_FIELDS.length - 12} more`}
                      </button>
                    )}
                  </div>
                  {availableRoles.length > 0 && (
                    <div className="border-t border-border/30 pt-3">
                      <p className="text-xs text-muted-foreground mb-2">{isHebrew ? 'תפקידים ספציפיים (לא חובה):' : 'Specific roles (optional):'}</p>
                      <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto overscroll-contain">
                        {availableRoles.slice(0, 25).map(r => (
                          <ChipBtn key={r.slug} label={isHebrew ? r.name_he : r.name_en} selected={preferredRoles.includes(r.slug)}
                            onClick={() => {
                              if (preferredRoles.includes(r.slug)) setPreferredRoles(preferredRoles.filter(x => x !== r.slug));
                              else if (preferredRoles.length < 10) setPreferredRoles([...preferredRoles, r.slug]);
                            }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-center mt-6">
                  <Button onClick={handleNext} disabled={preferredFields.length === 0} size="lg" className="min-h-[52px] gap-2 rounded-full px-8 text-base font-semibold hover:shadow-[0_0_30px_hsl(156_100%_50%/0.3)]">
                    {isHebrew ? 'המשך' : 'Continue'} <Rocket className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        );

      // ── Experience & Skills ──
      case 'experience':
        return (
          <div className="max-w-lg mx-auto px-4">
            <PlugMessage
              text={isHebrew
                ? 'כמה ניסיון יש לך? 🎯\nעוזר לנו להתאים משרות ברמה הנכונה ולמלא שדות ניסיון בטפסים.'
                : 'How much experience do you have? 🎯\nHelps match jobs at the right level and fill experience fields.'}
              speed={28}
              onComplete={onMessageReady}
            />
            {messageReady && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mt-4">
                <div className="onb-glass-card p-5 space-y-5">
                  <div className="space-y-2">
                    {EXPERIENCE_LEVELS.map((l, i) => (
                      <OptionButton key={l.slug} label={isHebrew ? l.name_he : l.name_en}
                        emoji={['🌱', '🚀', '💼', '⭐', '👑', '🏆'][i]}
                        selected={experienceYears === String(l.years_min)}
                        onClick={() => setExperienceYears(String(l.years_min))} />
                    ))}
                  </div>
                  <div className="border-t border-border/30 pt-4">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">{isHebrew ? 'כישורים וטכנולוגיות:' : 'Skills & Technologies:'}</p>
                    <div className="flex gap-2">
                      <Input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                        placeholder={isHebrew ? 'למשל: React, ניהול פרויקטים...' : 'e.g. React, Project Management...'}
                        className="flex-1 onb-input" />
                      <Button type="button" variant="outline" size="sm" onClick={addSkill} className="min-h-[44px] border-border/50">+</Button>
                    </div>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {skills.map(s => (
                          <Badge key={s} variant="secondary" className="gap-1 pe-1 bg-primary/10 text-primary border-primary/20">
                            {s}
                            <button onClick={() => setSkills(skills.filter(x => x !== s))} className="hover:text-destructive ms-0.5"><X className="w-3 h-3" /></button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-center mt-6">
                  <Button onClick={handleNext} size="lg" className="min-h-[52px] gap-2 rounded-full px-8 text-base font-semibold hover:shadow-[0_0_30px_hsl(156_100%_50%/0.3)]">
                    {isHebrew ? 'המשך' : 'Continue'} <Rocket className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        );

      // ── Links ──
      case 'links':
        return (
          <div className="max-w-lg mx-auto px-4">
            <PlugMessage
              text={isHebrew
                ? 'יש לך פרופילים ברשת? 🔗\nהקישורים ימולאו אוטומטית בטפסי הגשת מועמדות — חוסך זמן!'
                : 'Got online profiles? 🔗\nThese links auto-fill in application forms — saves time!'}
              speed={28}
              onComplete={onMessageReady}
            />
            {messageReady && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mt-4">
                <div className="onb-glass-card p-6 space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      LinkedIn
                    </label>
                    <Input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/your-profile" className="onb-input" dir="ltr" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                      GitHub
                    </label>
                    <Input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/username" className="onb-input" dir="ltr" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" />
                      {isHebrew ? 'אתר / פורטפוליו' : 'Website / Portfolio'}
                    </label>
                    <Input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://your-site.com" className="onb-input" dir="ltr" />
                  </div>
                </div>
                <div className="flex justify-center mt-6">
                  <Button onClick={handleNext} size="lg" className="min-h-[52px] gap-2 rounded-full px-8 text-base font-semibold hover:shadow-[0_0_30px_hsl(156_100%_50%/0.3)]">
                    {(linkedinUrl || githubUrl || portfolioUrl) ? (isHebrew ? 'המשך' : 'Continue') : (isHebrew ? 'דלג' : 'Skip')}
                    <Rocket className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        );

      // ── City + Distance + Salary + Goal ──
      case 'details':
        return (
          <div className="max-w-lg mx-auto px-4">
            <PlugMessage
              text={isHebrew
                ? 'כמעט סיימנו! 🏠\nאיפה אתה גר, כמה מוכן לנסוע, ומה הציפיות?'
                : 'Almost done! 🏠\nWhere do you live, how far will you commute, and what are your expectations?'}
              speed={28}
              onComplete={onMessageReady}
            />
            {messageReady && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mt-4">
                <div className="onb-glass-card p-5 space-y-5">
                  {/* City */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium">{isHebrew ? 'עיר מגורים:' : 'City of residence:'}</p>
                    <Input value={city} onChange={e => setCity(e.target.value)} placeholder={isHebrew ? 'למשל: תל אביב' : 'e.g. Tel Aviv'} className="onb-input" />
                  </div>

                  {/* Commute distance */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">{isHebrew ? 'כמה מוכן לנסוע לעבודה?' : 'How far will you commute?'}</p>
                    <div className="flex flex-wrap gap-2">
                      {COMMUTE_DISTANCES.map(d => (
                        <ChipBtn key={d.value} label={isHebrew ? d.he : d.en} selected={commuteDistance === d.value}
                          onClick={() => setCommuteDistance(commuteDistance === d.value ? '' : d.value)} />
                      ))}
                    </div>
                  </div>

                  {/* Salary */}
                  <div className="border-t border-border/30 pt-4">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">
                      {isHebrew ? 'ציפיות שכר (ברוטו):' : 'Salary expectations (gross):'}
                      <span className="text-muted-foreground/50 ms-1">({isHebrew ? 'לא חובה' : 'optional'})</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SALARY_RANGES.map(s => (
                        <ChipBtn key={s.value} label={isHebrew ? `${s.he} ש"ח` : `${s.en} ILS`} selected={desiredSalary === s.value}
                          onClick={() => setDesiredSalary(desiredSalary === s.value ? '' : s.value)} />
                      ))}
                    </div>
                  </div>

                  {/* Search status */}
                  <div className="border-t border-border/30 pt-4">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">{isHebrew ? 'מה המצב שלך?' : "What's your status?"}</p>
                    <div className="space-y-2">
                      {([
                        { value: 'active' as const, he: 'מחפש/ת באופן אקטיבי', en: 'Actively searching', emoji: '🔥' },
                        { value: 'open' as const, he: 'פתוח/ה להצעות', en: 'Open to offers', emoji: '👀' },
                        { value: 'exploring' as const, he: 'סתם בודק/ת מה יש', en: 'Just exploring', emoji: '🧭' },
                      ]).map(opt => (
                        <OptionButton key={opt.value} label={isHebrew ? opt.he : opt.en} emoji={opt.emoji}
                          selected={searchGoal === opt.value} onClick={() => setSearchGoal(opt.value)} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-center mt-6">
                  <Button onClick={handleNext} size="lg" className="min-h-[52px] gap-2 rounded-full px-8 text-base font-semibold hover:shadow-[0_0_30px_hsl(156_100%_50%/0.3)]">
                    {isHebrew ? 'המשך' : 'Continue'} <Rocket className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        );

      // ── Gmail ──
      case 'gmail':
        return (
          <div className="max-w-lg mx-auto px-4">
            <PlugMessage
              text={isHebrew
                ? 'שלב אחרון! 🎉\nחיבור Gmail מאפשר ל-PLUG לעקוב אחרי דחיות ולסנכרן ראיונות ליומן.\nהחיבורים נפתחים בטאב חדש — חזור לפה אחרי.'
                : 'Last step! 🎉\nGmail lets PLUG track rejections and sync interviews.\nConnections open in a new tab — come back here after.'}
              speed={28}
              onComplete={onMessageReady}
            />
            {messageReady && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mt-4">
                <div className="space-y-2">
                  <button onClick={connectLinkedIn} disabled={linkedinDone || !LINKEDIN_CLIENT_ID}
                    className={`onb-option flex items-center gap-3 ${linkedinDone ? 'selected' : ''}`}>
                    {linkedinDone ? <CheckCircle2 className="w-6 h-6 text-primary shrink-0" /> : (
                      <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0 fill-current text-[#0077b5]"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    )}
                    <div className="flex-1 min-w-0 text-start">
                      <p className="text-sm font-medium">{isHebrew ? 'LinkedIn — פרופיל מקצועי' : 'LinkedIn — Professional Profile'}</p>
                      <p className="text-xs text-muted-foreground">{isHebrew ? 'סנכרן תמונה, כותרת ופרטי פרופיל' : 'Sync photo, headline and profile data'}</p>
                    </div>
                    {linkedinDone && <span className="text-xs text-primary font-medium">{isHebrew ? 'נפתח בטאב' : 'Opened'}</span>}
                    {!LINKEDIN_CLIENT_ID && <span className="text-xs text-muted-foreground/50">{isHebrew ? 'בקרוב' : 'Soon'}</span>}
                  </button>

                  <button onClick={connectGmail} disabled={gmailDone || !GOOGLE_CLIENT_ID}
                    className={`onb-option flex items-center gap-3 ${gmailDone ? 'selected' : ''}`}>
                    {gmailDone ? <CheckCircle2 className="w-6 h-6 text-primary shrink-0" /> : <Mail className="w-6 h-6 text-primary shrink-0" />}
                    <div className="flex-1 min-w-0 text-start">
                      <p className="text-sm font-medium">{isHebrew ? 'Gmail — מיילים ומעקב דחיות' : 'Gmail — Emails & Rejection Tracking'}</p>
                      <p className="text-xs text-muted-foreground">{isHebrew ? 'שלח מיילים למגייסים וזהה דחיות' : 'Send emails and detect rejections'}</p>
                    </div>
                    {gmailDone && <span className="text-xs text-primary font-medium">{isHebrew ? 'נפתח בטאב' : 'Opened'}</span>}
                  </button>

                  <button onClick={connectCalendar} disabled={calendarDone || !GOOGLE_CLIENT_ID}
                    className={`onb-option flex items-center gap-3 ${calendarDone ? 'selected' : ''}`}>
                    {calendarDone ? <CheckCircle2 className="w-6 h-6 text-primary shrink-0" /> : <Calendar className="w-6 h-6 text-primary shrink-0" />}
                    <div className="flex-1 min-w-0 text-start">
                      <p className="text-sm font-medium">{isHebrew ? 'Google Calendar — סנכרון ראיונות' : 'Calendar — Interview Sync'}</p>
                      <p className="text-xs text-muted-foreground">{isHebrew ? 'סנכרן ראיונות ליומן שלך' : 'Sync interviews to your calendar'}</p>
                    </div>
                    {calendarDone && <span className="text-xs text-primary font-medium">{isHebrew ? 'נפתח בטאב' : 'Opened'}</span>}
                  </button>

                  <button onClick={connectPush} disabled={pushDone}
                    className={`onb-option flex items-center gap-3 ${pushDone ? 'selected' : ''}`}>
                    {pushDone ? <CheckCircle2 className="w-6 h-6 text-primary shrink-0" /> : <Bell className="w-6 h-6 text-primary shrink-0" />}
                    <div className="flex-1 min-w-0 text-start">
                      <p className="text-sm font-medium">{isHebrew ? 'התראות Push — עדכונים בזמן אמת' : 'Push — Real-time Updates'}</p>
                      <p className="text-xs text-muted-foreground">{isHebrew ? 'קבל התראות על סטטוס מועמדויות' : 'Get notified about applications'}</p>
                    </div>
                    {pushDone && <span className="text-xs text-primary font-medium">{isHebrew ? 'מופעל' : 'Enabled'}</span>}
                  </button>

                  <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
                    <Shield className="w-3.5 h-3.5 shrink-0 text-primary/50" />
                    {isHebrew ? 'כל החיבורים מאובטחים עם OAuth — אנחנו לא שומרים סיסמאות' : 'All connections secured with OAuth — we never store passwords'}
                  </div>
                </div>

                <div className="flex justify-center mt-6">
                  <Button onClick={() => goToStep('done')} size="lg" className="min-h-[52px] gap-2 rounded-full px-8 text-base font-semibold hover:shadow-[0_0_30px_hsl(156_100%_50%/0.3)]">
                    {isHebrew ? 'סיום!' : 'Finish!'} <Rocket className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        );

      // ── Done ──
      case 'done':
        return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }} className="text-6xl mb-6">
              🎉
            </motion.div>
            <PlugMessage
              text={isHebrew
                ? 'מעולה, הכל מוכן!\nהפרופיל שלך מוכן. התוסף של PLUG ימלא טפסים אוטומטית עם הפרטים שמילאת.\nבהצלחה בחיפוש!'
                : "Awesome, all set!\nYour profile is ready. The PLUG extension will auto-fill forms with your details.\nGood luck with your search!"}
              speed={25}
              onComplete={onMessageReady}
            />
            {messageReady && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                <Button onClick={handleFinish} disabled={saving} size="lg"
                  className="min-h-[56px] gap-3 rounded-full px-10 text-lg font-bold hover:shadow-[0_0_40px_hsl(156_100%_50%/0.4)]">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Rocket className="w-6 h-6" /> {isHebrew ? 'קדימה, בואו נתחיל!' : "Let's go!"}</>}
                </Button>
              </motion.div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ═══════════════════════════════════════
  //  Main render
  // ═══════════════════════════════════════

  return (
    <>
      <AnimatePresence>
        {showTransition && (
          <TransitionScreen texts={transitionTexts} onComplete={() => transitionCallbackRef.current?.()} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCVAnalysis && user?.id && (
          <CVAnalysisTransition
            userId={user.id}
            isHebrew={isHebrew}
            onDataFound={handleCVDataFound}
            onComplete={handleCVAnalysisDone}
          />
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden" dir={isHebrew ? 'rtl' : 'ltr'} style={{ background: 'hsl(220 47% 5.5%)' }}>
        {/* DataVision animated background */}
        <div className="onb-cyber-grid absolute inset-0" />
        <div className="onb-bg-blob-mint absolute" style={{ top: '-120px', right: '-120px' }} />
        <div className="onb-bg-blob-purple absolute" style={{ bottom: '-120px', left: '-120px' }} />
        <div className="onb-bg-blob-mint-sm absolute" style={{ top: '45%', left: '35%' }} />

        {/* Header */}
        <div className="relative z-20 flex items-center justify-between px-5 py-3.5 border-b border-border/20"
          style={{ background: 'hsl(220 40% 7% / 0.8)', backdropFilter: 'blur(12px)' }}>
          <PlugLogo size="sm" />
          <div className="flex items-center gap-3 flex-1 max-w-[200px] mx-4">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'hsl(217 32% 15%)' }}>
              <div className="h-full onb-progress-fill rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-medium text-primary">{progress}%</span>
          </div>
          <button onClick={handleFinish} className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
            {isHebrew ? 'דלג' : 'Skip'}
          </button>
        </div>

        {/* Content */}
        <div ref={scrollContainerRef} className="relative z-10 flex-1 overflow-y-auto overscroll-contain">
          <div className="py-8 min-h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
