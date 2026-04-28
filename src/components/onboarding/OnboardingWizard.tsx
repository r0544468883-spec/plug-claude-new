import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
import { JOB_FIELDS, EXPERIENCE_LEVELS, getRolesByField } from '@/lib/job-taxonomy';

// ════════════════════════════════════════════════════
//  OnboardingWizard — Premium chat-like flow
//  DataVision-level design with PLUG branding
// ════════════════════════════════════════════════════

interface OnboardingWizardProps {
  onComplete: () => void;
}

type StepId = 'welcome' | 'cv' | 'name' | 'fields' | 'experience' | 'links' | 'details' | 'gmail' | 'done';

const STEP_ORDER: StepId[] = ['welcome', 'cv', 'name', 'fields', 'experience', 'links', 'details', 'gmail', 'done'];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const EMAIL_REDIRECT_URI = `${SUPABASE_URL}/functions/v1/connect-email-callback`;
const CALENDAR_REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;

const POPULAR_LOCATIONS = [
  { he: 'תל אביב', en: 'Tel Aviv' },
  { he: 'ירושלים', en: 'Jerusalem' },
  { he: 'חיפה', en: 'Haifa' },
  { he: 'באר שבע', en: 'Beer Sheva' },
  { he: 'מרכז', en: 'Central' },
  { he: 'רמוט / מרחוק', en: 'Remote' },
  { he: 'היברידי', en: 'Hybrid' },
];

const SALARY_RANGES = [
  { value: '5000-8000', he: '5,000-8,000', en: '5K-8K' },
  { value: '8000-12000', he: '8,000-12,000', en: '8K-12K' },
  { value: '12000-18000', he: '12,000-18,000', en: '12K-18K' },
  { value: '18000-25000', he: '18,000-25,000', en: '18K-25K' },
  { value: '25000-35000', he: '25,000-35,000', en: '25K-35K' },
  { value: '35000+', he: '35,000+', en: '35K+' },
];

// ── Transition screen between steps ──
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
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i <= textIndex ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── PLUG typing message bubble ──
function PlugMessage({ text, speed = 35, onComplete, showCursor = true }: {
  text: string; speed?: number; onComplete?: () => void; showCursor?: boolean;
}) {
  const { displayedText, isComplete } = useTypingEffect(text, speed);

  useEffect(() => {
    if (isComplete && onComplete) onComplete();
  }, [isComplete, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex gap-3 items-start max-w-[90%] onb-animate-slide-up"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 mt-0.5 shadow-lg"
        style={{ boxShadow: '0 0 20px hsl(156 100% 50% / 0.3)' }}>
        <Zap className="w-5 h-5 text-background" />
      </div>
      <div className="onb-glass-card px-5 py-3.5 text-[15px] leading-relaxed whitespace-pre-line">
        {displayedText}
        {!isComplete && showCursor && <span className="animate-pulse text-primary">|</span>}
      </div>
    </motion.div>
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
  const [messageReady, setMessageReady] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Form state ──
  const [fullName, setFullName] = useState((profile as any)?.full_name || '');
  const [phone, setPhone] = useState((profile as any)?.phone || '');
  const [tagline, setTagline] = useState((profile as any)?.personal_tagline || '');
  const [cvUploaded, setCvUploaded] = useState(!!((profile as any)?.cv_data && Object.keys((profile as any).cv_data || {}).length > 0));
  const [preferredFields, setPreferredFields] = useState<string[]>((profile as any)?.preferred_fields || []);
  const [preferredRoles, setPreferredRoles] = useState<string[]>((profile as any)?.preferred_roles || []);
  const [experienceYears, setExperienceYears] = useState<string>(String((profile as any)?.experience_years || ''));
  const [skills, setSkills] = useState<string[]>((profile as any)?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState((profile as any)?.linkedin_url || '');
  const [githubUrl, setGithubUrl] = useState((profile as any)?.github_url || '');
  const [portfolioUrl, setPortfolioUrl] = useState((profile as any)?.portfolio_url || '');
  const [targetLocations, setTargetLocations] = useState<string[]>((profile as any)?.target_locations || []);
  const [desiredSalary, setDesiredSalary] = useState((profile as any)?.desired_salary || '');
  const [searchGoal, setSearchGoal] = useState<'active' | 'open' | 'exploring'>('active');
  const [showAllFields, setShowAllFields] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');

  // Gmail state
  const [gmailDone, setGmailDone] = useState(false);
  const [calendarDone, setCalendarDone] = useState(false);
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

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentStep, messageReady]);

  // ── Navigate with optional transition ──
  const goToStep = useCallback((stepId: StepId, transition?: string[]) => {
    if (transition) {
      setShowTransition(true);
      setTransitionTexts(transition);
      setIsTransitioning(true);
      // TransitionScreen will call onComplete which triggers the actual navigation
      const doTransition = () => {
        setShowTransition(false);
        setIsTransitioning(false);
        setCurrentStep(stepId);
        setMessageReady(false);
      };
      // Store callback for TransitionScreen
      transitionCallbackRef.current = doTransition;
    } else {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(stepId);
        setMessageReady(false);
        setIsTransitioning(false);
      }, 300);
    }
  }, []);

  const transitionCallbackRef = useRef<() => void>(() => {});

  const handleNext = useCallback(() => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx >= STEP_ORDER.length - 1) return;
    const next = STEP_ORDER[idx + 1];

    // Special transitions
    if (currentStep === 'cv' && cvUploaded) {
      goToStep(next, isHebrew
        ? ['מנתח את קורות החיים...', 'שואב פרטים...', 'מוכן!']
        : ['Analyzing your CV...', 'Extracting details...', 'Ready!']
      );
    } else if (currentStep === 'details') {
      goToStep(next, isHebrew
        ? ['בונה את הפרופיל שלך...', 'מכין את התוסף...', 'כמעט שם!']
        : ['Building your profile...', 'Preparing extension...', 'Almost there!']
      );
    } else {
      goToStep(next);
    }
  }, [currentStep, cvUploaded, goToStep, isHebrew]);

  // ── Save ──
  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        personal_tagline: tagline.trim() || null,
        preferred_fields: preferredFields,
        preferred_roles: preferredRoles,
        experience_years: experienceYears ? Number(experienceYears) : null,
        skills,
        linkedin_url: linkedinUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        portfolio_url: portfolioUrl.trim() || null,
        target_locations: targetLocations,
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

  // ── Gmail helpers ──
  const connectGmail = () => {
    if (!GOOGLE_CLIENT_ID || !user) return;
    const state = `${user.id}:gmail`;
    const scopes = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly';
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(EMAIL_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}&access_type=offline&prompt=consent`;
  };
  const connectCalendar = () => {
    if (!GOOGLE_CLIENT_ID || !user) return;
    const scopes = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(CALENDAR_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${user.id}&access_type=offline&prompt=consent`;
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
  //  Reusable UI pieces
  // ═══════════════════════════════════════

  const OptionButton = ({ label, emoji, selected, onClick, delay = 0 }: {
    label: string; emoji?: string; selected: boolean; onClick: () => void; delay?: number;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`onb-option flex items-center gap-3 min-h-[52px] ${selected ? 'selected' : ''}`}
      style={{ opacity: 0, animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      {emoji && <span className="text-2xl group-hover:scale-110 transition-transform">{emoji}</span>}
      <span className="text-[15px] font-medium flex-1">{label}</span>
      {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
    </button>
  );

  const ChipButton = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={`onb-chip ${selected ? 'selected' : ''}`}
    >
      {label}
      {selected && <Check className="w-3 h-3" />}
    </button>
  );

  const ContinueButton = ({ onClick, disabled = false, label }: { onClick: () => void; disabled?: boolean; label?: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex justify-center mt-6"
    >
      <Button
        onClick={onClick}
        disabled={disabled}
        size="lg"
        className="min-h-[52px] gap-2 rounded-full px-8 text-base font-semibold transition-all duration-300 hover:shadow-[0_0_30px_hsl(156_100%_50%/0.3)]"
      >
        {label || (isHebrew ? 'המשך' : 'Continue')}
        <Rocket className="w-5 h-5" />
      </Button>
    </motion.div>
  );

  // Content area that appears after typing finishes
  const ContentArea = ({ children, delay = 0.2 }: { children: React.ReactNode; delay?: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={messageReady ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className={`mt-4 ${!messageReady ? 'opacity-0' : ''}`}
    >
      {children}
    </motion.div>
  );

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
              onComplete={() => setMessageReady(true)}
            />

            <ContentArea delay={0.1}>
              <div className="onb-glass-card px-5 py-3 mt-4 inline-flex items-center gap-2 text-sm">
                <Chrome className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">
                  {isHebrew
                    ? 'כל השאלות האלו הן כדי שתוסף הכרום של PLUG יעבוד בצורה מלאה — מילוי טפסים אוטומטי, שליחת קו"ח, והתאמת משרות.'
                    : 'All these questions help the PLUG Chrome Extension work fully — auto-fill forms, send CVs, and match jobs.'}
                </span>
              </div>
              <ContinueButton
                onClick={() => goToStep('cv')}
                label={isHebrew ? 'בואו נתחיל!' : "Let's start!"}
              />
            </ContentArea>
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
              onComplete={() => setMessageReady(true)}
            />

            <ContentArea>
              <div className="onb-glass-card onb-glass-card-active p-6">
                <ResumeUpload compact onSuccess={() => setCvUploaded(true)} />
              </div>
              {cvUploaded && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 text-sm text-primary mt-3 justify-center"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">
                    {isHebrew ? 'קורות חיים הועלו בהצלחה!' : 'CV uploaded successfully!'}
                  </span>
                </motion.div>
              )}
              <ContinueButton
                onClick={handleNext}
                label={cvUploaded
                  ? (isHebrew ? 'נמשיך!' : 'Continue!')
                  : (isHebrew ? 'אדלג, אמלא ידנית' : "Skip, I'll fill manually")}
              />
            </ContentArea>
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
              onComplete={() => setMessageReady(true)}
            />

            <ContentArea>
              <div className="onb-glass-card p-6 space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                    {isHebrew ? 'שם מלא *' : 'Full Name *'}
                  </label>
                  <Input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder={isHebrew ? 'השם המלא שלך' : 'Your full name'}
                    autoFocus
                    className="onb-input"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                    {isHebrew ? 'מספר טלפון' : 'Phone Number'}
                  </label>
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="050-1234567"
                    type="tel"
                    className="onb-input"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                    {isHebrew ? 'כותרת מקצועית' : 'Professional Headline'}
                    <span className="text-muted-foreground/50 ms-1">({isHebrew ? 'לא חובה' : 'optional'})</span>
                  </label>
                  <Input
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder={isHebrew ? 'למשל: מפתחת Full Stack עם 5 שנות ניסיון' : 'e.g. Full Stack Developer, 5 years exp'}
                    className="onb-input"
                  />
                </div>
              </div>
              <ContinueButton onClick={handleNext} disabled={fullName.trim().length < 2} />
            </ContentArea>
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
              onComplete={() => setMessageReady(true)}
            />

            <ContentArea>
              <div className="onb-glass-card p-5 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Input
                    value={fieldSearch}
                    onChange={e => { setFieldSearch(e.target.value); setShowAllFields(true); }}
                    onFocus={() => setShowAllFields(true)}
                    placeholder={isHebrew ? 'חפש תחום...' : 'Search field...'}
                    className="onb-input"
                  />
                  {fieldSearch && (
                    <button className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground" onClick={() => { setFieldSearch(''); setShowAllFields(false); }}>
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Field chips */}
                <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto overscroll-contain py-1">
                  {(showAllFields ? filteredFields : JOB_FIELDS.slice(0, 12)).map((f, i) => (
                    <ChipButton
                      key={f.slug}
                      label={isHebrew ? f.name_he : f.name_en}
                      selected={preferredFields.includes(f.slug)}
                      onClick={() => {
                        if (preferredFields.includes(f.slug)) {
                          setPreferredFields(preferredFields.filter(x => x !== f.slug));
                        } else if (preferredFields.length < 5) {
                          setPreferredFields([...preferredFields, f.slug]);
                        }
                      }}
                    />
                  ))}
                  {!showAllFields && (
                    <button
                      onClick={() => setShowAllFields(true)}
                      className="onb-chip !border-dashed !border-primary/30 text-primary text-xs"
                    >
                      <ChevronDown className="w-3 h-3" />
                      {isHebrew ? `עוד ${JOB_FIELDS.length - 12} תחומים` : `${JOB_FIELDS.length - 12} more`}
                    </button>
                  )}
                </div>

                {/* Roles */}
                {availableRoles.length > 0 && (
                  <div className="border-t border-border/30 pt-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      {isHebrew ? 'תפקידים ספציפיים (לא חובה):' : 'Specific roles (optional):'}
                    </p>
                    <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto overscroll-contain">
                      {availableRoles.slice(0, 25).map(r => (
                        <ChipButton
                          key={r.slug}
                          label={isHebrew ? r.name_he : r.name_en}
                          selected={preferredRoles.includes(r.slug)}
                          onClick={() => {
                            if (preferredRoles.includes(r.slug)) {
                              setPreferredRoles(preferredRoles.filter(x => x !== r.slug));
                            } else if (preferredRoles.length < 10) {
                              setPreferredRoles([...preferredRoles, r.slug]);
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <ContinueButton onClick={handleNext} disabled={preferredFields.length === 0} />
            </ContentArea>
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
              onComplete={() => setMessageReady(true)}
            />

            <ContentArea>
              <div className="onb-glass-card p-5 space-y-5">
                {/* Experience as quiz options */}
                <div className="space-y-2">
                  {EXPERIENCE_LEVELS.map((l, i) => (
                    <OptionButton
                      key={l.slug}
                      label={isHebrew ? l.name_he : l.name_en}
                      emoji={['🌱', '🚀', '💼', '⭐', '👑', '🏆'][i]}
                      selected={experienceYears === String(l.years_min)}
                      onClick={() => setExperienceYears(String(l.years_min))}
                      delay={i * 80}
                    />
                  ))}
                </div>

                {/* Skills */}
                <div className="border-t border-border/30 pt-4">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                    {isHebrew ? 'כישורים וטכנולוגיות:' : 'Skills & Technologies:'}
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={e => setSkillInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      placeholder={isHebrew ? 'למשל: React, ניהול פרויקטים...' : 'e.g. React, Project Management...'}
                      className="flex-1 onb-input"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addSkill} className="min-h-[44px] border-border/50">+</Button>
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {skills.map(s => (
                        <Badge key={s} variant="secondary" className="gap-1 pe-1 bg-primary/10 text-primary border-primary/20">
                          {s}
                          <button onClick={() => setSkills(skills.filter(x => x !== s))} className="hover:text-destructive ms-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <ContinueButton onClick={handleNext} />
            </ContentArea>
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
              onComplete={() => setMessageReady(true)}
            />

            <ContentArea>
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
              <ContinueButton
                onClick={handleNext}
                label={(linkedinUrl || githubUrl || portfolioUrl) ? (isHebrew ? 'המשך' : 'Continue') : (isHebrew ? 'דלג' : 'Skip')}
              />
            </ContentArea>
          </div>
        );

      // ── Location + Salary + Goal ──
      case 'details':
        return (
          <div className="max-w-lg mx-auto px-4">
            <PlugMessage
              text={isHebrew
                ? 'כמעט סיימנו! 🏠\nאיפה מחפשים, מה התקציב, ומה הקצב?'
                : 'Almost done! 🏠\nWhere, what budget, and what pace?'}
              speed={28}
              onComplete={() => setMessageReady(true)}
            />

            <ContentArea>
              <div className="onb-glass-card p-5 space-y-5">
                {/* Location */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">{isHebrew ? 'מיקום מועדף:' : 'Preferred location:'}</p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_LOCATIONS.map(l => {
                      const val = isHebrew ? l.he : l.en;
                      return (
                        <ChipButton
                          key={l.en}
                          label={val}
                          selected={targetLocations.includes(val)}
                          onClick={() => {
                            if (targetLocations.includes(val)) setTargetLocations(targetLocations.filter(x => x !== val));
                            else if (targetLocations.length < 5) setTargetLocations([...targetLocations, val]);
                          }}
                        />
                      );
                    })}
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
                      <ChipButton
                        key={s.value}
                        label={isHebrew ? `${s.he} ש"ח` : `${s.en} ILS`}
                        selected={desiredSalary === s.value}
                        onClick={() => setDesiredSalary(desiredSalary === s.value ? '' : s.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* Search status — quiz-style options */}
                <div className="border-t border-border/30 pt-4">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">{isHebrew ? 'מה המצב שלך?' : "What's your status?"}</p>
                  <div className="space-y-2">
                    {([
                      { value: 'active' as const, he: 'מחפש/ת באופן אקטיבי', en: 'Actively searching', emoji: '🔥' },
                      { value: 'open' as const, he: 'פתוח/ה להצעות', en: 'Open to offers', emoji: '👀' },
                      { value: 'exploring' as const, he: 'סתם בודק/ת מה יש', en: 'Just exploring', emoji: '🧭' },
                    ]).map((opt, i) => (
                      <OptionButton
                        key={opt.value}
                        label={isHebrew ? opt.he : opt.en}
                        emoji={opt.emoji}
                        selected={searchGoal === opt.value}
                        onClick={() => setSearchGoal(opt.value)}
                        delay={i * 80}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <ContinueButton onClick={handleNext} />
            </ContentArea>
          </div>
        );

      // ── Gmail ──
      case 'gmail':
        return (
          <div className="max-w-lg mx-auto px-4">
            <PlugMessage
              text={isHebrew
                ? 'שלב אחרון! 🎉\nחיבור Gmail מאפשר ל-PLUG לעקוב אחרי דחיות ולסנכרן ראיונות ליומן.'
                : 'Last step! 🎉\nGmail lets PLUG track rejections and sync interviews to your calendar.'}
              speed={28}
              onComplete={() => setMessageReady(true)}
            />

            <ContentArea>
              <div className="space-y-2">
                {/* Gmail */}
                <button onClick={connectGmail} disabled={gmailDone || !GOOGLE_CLIENT_ID}
                  className={`onb-option flex items-center gap-3 ${gmailDone ? 'selected' : ''}`}>
                  {gmailDone ? <CheckCircle2 className="w-6 h-6 text-primary shrink-0" /> : <Mail className="w-6 h-6 text-primary shrink-0" />}
                  <div className="flex-1 min-w-0 text-start">
                    <p className="text-sm font-medium">{isHebrew ? 'Gmail — מיילים ומעקב דחיות' : 'Gmail — Emails & Rejection Tracking'}</p>
                    <p className="text-xs text-muted-foreground">{isHebrew ? 'שלח מיילים למגייסים וזהה דחיות' : 'Send emails and detect rejections'}</p>
                  </div>
                  {gmailDone && <span className="text-xs text-primary font-medium">{isHebrew ? 'מחובר' : 'Connected'}</span>}
                </button>

                {/* Calendar */}
                <button onClick={connectCalendar} disabled={calendarDone || !GOOGLE_CLIENT_ID}
                  className={`onb-option flex items-center gap-3 ${calendarDone ? 'selected' : ''}`}>
                  {calendarDone ? <CheckCircle2 className="w-6 h-6 text-primary shrink-0" /> : <Calendar className="w-6 h-6 text-primary shrink-0" />}
                  <div className="flex-1 min-w-0 text-start">
                    <p className="text-sm font-medium">{isHebrew ? 'Google Calendar — סנכרון ראיונות' : 'Calendar — Interview Sync'}</p>
                    <p className="text-xs text-muted-foreground">{isHebrew ? 'סנכרן ראיונות ליומן שלך' : 'Sync interviews to your calendar'}</p>
                  </div>
                  {calendarDone && <span className="text-xs text-primary font-medium">{isHebrew ? 'מחובר' : 'Connected'}</span>}
                </button>

                {/* Push */}
                <button onClick={connectPush} disabled={pushDone}
                  className={`onb-option flex items-center gap-3 ${pushDone ? 'selected' : ''}`}>
                  {pushDone ? <CheckCircle2 className="w-6 h-6 text-primary shrink-0" /> : <Bell className="w-6 h-6 text-primary shrink-0" />}
                  <div className="flex-1 min-w-0 text-start">
                    <p className="text-sm font-medium">{isHebrew ? 'התראות Push — עדכונים בזמן אמת' : 'Push — Real-time Updates'}</p>
                    <p className="text-xs text-muted-foreground">{isHebrew ? 'קבל התראות על סטטוס מועמדויות' : 'Get notified about applications'}</p>
                  </div>
                  {pushDone && <span className="text-xs text-primary font-medium">{isHebrew ? 'מופעל' : 'Enabled'}</span>}
                </button>

                {/* Security */}
                <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
                  <Shield className="w-3.5 h-3.5 shrink-0 text-primary/50" />
                  {isHebrew ? 'כל החיבורים מאובטחים עם OAuth — אנחנו לא שומרים סיסמאות' : 'All connections secured with OAuth — we never store passwords'}
                </div>
              </div>

              <ContinueButton
                onClick={() => goToStep('done')}
                label={isHebrew ? 'סיום!' : 'Finish!'}
              />
            </ContentArea>
          </div>
        );

      // ── Done ──
      case 'done':
        return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
              className="text-6xl mb-6"
            >
              🎉
            </motion.div>

            <PlugMessage
              text={isHebrew
                ? 'מעולה, הכל מוכן!\nהפרופיל שלך מוכן. התוסף של PLUG ימלא טפסים אוטומטית עם הפרטים שמילאת.\nבהצלחה בחיפוש!'
                : "Awesome, all set!\nYour profile is ready. The PLUG extension will auto-fill forms with your details.\nGood luck with your search!"}
              speed={25}
              onComplete={() => setMessageReady(true)}
            />

            <ContentArea>
              <Button
                onClick={handleFinish}
                disabled={saving}
                size="lg"
                className="min-h-[56px] gap-3 rounded-full px-10 text-lg font-bold transition-all duration-300 hover:shadow-[0_0_40px_hsl(156_100%_50%/0.4)] mt-6"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Rocket className="w-6 h-6" />
                    {isHebrew ? 'קדימה, בואו נתחיל!' : "Let's go!"}
                  </>
                )}
              </Button>
            </ContentArea>
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
      {/* Transition screen overlay */}
      <AnimatePresence>
        {showTransition && (
          <TransitionScreen
            texts={transitionTexts}
            onComplete={() => transitionCallbackRef.current?.()}
          />
        )}
      </AnimatePresence>

      <div
        className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
        dir={isHebrew ? 'rtl' : 'ltr'}
        style={{ background: 'hsl(220 47% 5.5%)' }}
      >
        {/* Ambient glows */}
        <div className="onb-glow-mint w-[700px] h-[500px] -top-40 -right-40 opacity-70" />
        <div className="onb-glow-purple w-[600px] h-[400px] -bottom-40 -left-40 opacity-60" />

        {/* Header */}
        <div className="relative z-20 flex items-center justify-between px-5 py-3.5 border-b border-border/20"
          style={{ background: 'hsl(220 40% 7% / 0.8)', backdropFilter: 'blur(12px)' }}>
          <PlugLogo size="sm" />

          {/* Progress */}
          <div className="flex items-center gap-3 flex-1 max-w-[200px] mx-4">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'hsl(217 32% 15%)' }}>
              <div className="h-full onb-progress-fill rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-medium text-primary">{progress}%</span>
          </div>

          {/* Skip */}
          <button
            onClick={handleFinish}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {isHebrew ? 'דלג' : 'Skip'}
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain">
          <div className="py-8 min-h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
            <div ref={chatEndRef} className="h-8" />
          </div>
        </div>
      </div>
    </>
  );
}
