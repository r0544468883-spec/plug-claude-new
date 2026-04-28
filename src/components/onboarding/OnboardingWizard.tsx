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
import { ResumeUpload } from '@/components/documents/ResumeUpload';
import {
  Upload, User, Briefcase, MapPin, Check, X, Target, Rocket,
  Link2, Mail, Calendar, Bell, Shield, Loader2, CheckCircle2, Chrome,
  ChevronDown, Sparkles,
} from 'lucide-react';
import { JOB_FIELDS, EXPERIENCE_LEVELS, getRolesByField } from '@/lib/job-taxonomy';

// ════════════════════════════════════════════════════
//  OnboardingWizard — Chat-like post-signup flow
//  Collects profile data needed for extension auto-fill + job matching
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

// Common Israeli locations for quick selection
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
  { value: '5000-8000', he: '5,000-8,000 ש"ח', en: '5,000-8,000 ILS' },
  { value: '8000-12000', he: '8,000-12,000 ש"ח', en: '8,000-12,000 ILS' },
  { value: '12000-18000', he: '12,000-18,000 ש"ח', en: '12,000-18,000 ILS' },
  { value: '18000-25000', he: '18,000-25,000 ש"ח', en: '18,000-25,000 ILS' },
  { value: '25000-35000', he: '25,000-35,000 ש"ח', en: '25,000-35,000 ILS' },
  { value: '35000+', he: '35,000+ ש"ח', en: '35,000+ ILS' },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';

  const [currentStep, setCurrentStep] = useState<StepId>('welcome');
  const [saving, setSaving] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [visibleMessages, setVisibleMessages] = useState<string[]>(['welcome-1']);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
  const [showFieldSearch, setShowFieldSearch] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');

  // Gmail connection state
  const [gmailDone, setGmailDone] = useState(false);
  const [calendarDone, setCalendarDone] = useState(false);
  const [pushDone, setPushDone] = useState(false);

  const availableRoles = useMemo(() => {
    if (preferredFields.length === 0) return [];
    return preferredFields.flatMap(f => getRolesByField(f));
  }, [preferredFields]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages, currentStep, typingMessageId]);

  // Show typing animation then reveal message
  const showMessage = useCallback((messageId: string, delay = 600) => {
    setTypingMessageId(messageId);
    return new Promise<void>(resolve => {
      setTimeout(() => {
        setTypingMessageId(null);
        setVisibleMessages(prev => prev.includes(messageId) ? prev : [...prev, messageId]);
        resolve();
      }, delay);
    });
  }, []);

  // Navigate to step with typing animation
  const goToStep = useCallback(async (stepId: StepId) => {
    setCurrentStep(stepId);
    // Show first message of the step
    await showMessage(`${stepId}-1`, 500);
    // Show second message if exists
    const secondId = `${stepId}-2`;
    if (STEP_MESSAGES[stepId]?.[1]) {
      await showMessage(secondId, 400);
    }
  }, [showMessage]);

  const handleNext = useCallback(() => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx < STEP_ORDER.length - 1) {
      goToStep(STEP_ORDER[idx + 1]);
    }
  }, [currentStep, goToStep]);

  // ── Save all data ──
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
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(EMAIL_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}&access_type=offline&prompt=consent`;
    window.location.href = url;
  };
  const connectCalendar = () => {
    if (!GOOGLE_CLIENT_ID || !user) return;
    const scopes = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(CALENDAR_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${user.id}&access_type=offline&prompt=consent`;
    window.location.href = url;
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

  // ── Skill / Location helpers ──
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

  const filteredFields = useMemo(() => {
    if (!fieldSearch.trim()) return JOB_FIELDS;
    const q = fieldSearch.toLowerCase();
    return JOB_FIELDS.filter(f =>
      f.name_he.includes(q) || f.name_en.toLowerCase().includes(q) || f.slug.includes(q)
    );
  }, [fieldSearch]);

  // ═══════════════════════════════════════
  //  Render helpers
  // ═══════════════════════════════════════

  const PlugBubble = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-2.5 items-start max-w-[95%] ${className}`}
    >
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-muted/60 rounded-2xl rounded-ts-sm px-4 py-2.5 text-sm leading-relaxed">
        {children}
      </div>
    </motion.div>
  );

  const TypingIndicator = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-2.5 items-start max-w-[95%]"
    >
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-muted/60 rounded-2xl rounded-ts-sm px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-muted-foreground/40"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );

  const UserResponse = ({ children }: { children: React.ReactNode }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-end"
    >
      <div className="bg-primary text-primary-foreground rounded-2xl rounded-te-sm px-4 py-2.5 text-sm max-w-[85%]">
        {children}
      </div>
    </motion.div>
  );

  const ChipButton = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all min-h-[36px] border
        ${selected
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : 'bg-card border-border hover:border-primary/50 hover:bg-primary/5'
        }`}
    >
      {label}
      {selected && <Check className="w-3 h-3" />}
    </button>
  );

  const NextButton = ({ onClick, disabled = false, label }: { onClick: () => void; disabled?: boolean; label?: string }) => (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end mt-3">
      <Button
        onClick={onClick}
        disabled={disabled}
        className="min-h-[44px] gap-2 rounded-full px-6"
      >
        {label || (isHebrew ? 'המשך' : 'Continue')}
        <Rocket className="w-4 h-4" />
      </Button>
    </motion.div>
  );

  // ═══════════════════════════════════════
  //  Step content renderers
  // ═══════════════════════════════════════

  const renderStepContent = () => {
    switch (currentStep) {
      // ── Welcome ──
      case 'welcome':
        return (
          <div className="space-y-3">
            {visibleMessages.includes('welcome-1') && (
              <PlugBubble>
                <p className="font-medium text-base">
                  {isHebrew ? 'היי! אני PLUG' : 'Hey! I\'m PLUG'} <span className="inline-block">👋</span>
                </p>
                <p className="mt-1 text-muted-foreground">
                  {isHebrew
                    ? 'אני אעזור לך למצוא את המשרה הבאה שלך. לפני שנתחיל, אני צריך לדעת קצת עליך.'
                    : 'I\'ll help you find your next job. Before we start, I need to know a bit about you.'}
                </p>
              </PlugBubble>
            )}
            {visibleMessages.includes('welcome-1') && (
              <PlugBubble>
                <div className="flex items-center gap-2 text-primary font-medium">
                  <Chrome className="w-4 h-4" />
                  {isHebrew
                    ? 'כל השאלות האלו הן כדי שתוסף הכרום של PLUG יעבוד בצורה מלאה'
                    : 'All these questions help the PLUG Chrome Extension work fully'}
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  {isHebrew
                    ? 'התוסף ממלא אוטומטית טפסי הגשה באתרי דרושים, שולח קורות חיים, ומתאים משרות עבורך. ככל שנדע יותר, התוסף יעבוד טוב יותר!'
                    : 'The extension auto-fills application forms on job sites, sends CVs, and matches jobs for you. The more we know, the better it works!'}
                </p>
              </PlugBubble>
            )}
            {visibleMessages.includes('welcome-1') && (
              <NextButton onClick={() => goToStep('cv')} label={isHebrew ? 'בואו נתחיל!' : "Let's start!"} />
            )}
          </div>
        );

      // ── CV Upload ──
      case 'cv':
        return (
          <div className="space-y-3">
            {visibleMessages.includes('cv-1') && (
              <PlugBubble>
                <p className="font-medium">
                  {isHebrew ? 'יש לך קורות חיים?' : 'Do you have a CV?'} <Upload className="w-4 h-4 inline" />
                </p>
                <p className="mt-1 text-muted-foreground">
                  {isHebrew
                    ? 'אם תעלה קו"ח, אני אשאב את רוב המידע אוטומטית ונקצר את התהליך!'
                    : 'Upload your CV and I\'ll extract most info automatically to speed things up!'}
                </p>
              </PlugBubble>
            )}
            {visibleMessages.includes('cv-1') && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="ms-10">
                <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-3">
                  <ResumeUpload compact onSuccess={() => setCvUploaded(true)} />
                </div>
                {cvUploaded && (
                  <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                    <Check className="w-4 h-4" />
                    {isHebrew ? 'קורות חיים הועלו בהצלחה!' : 'CV uploaded successfully!'}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <NextButton onClick={handleNext} label={cvUploaded ? (isHebrew ? 'המשך' : 'Continue') : (isHebrew ? 'דלג, אמלא ידנית' : 'Skip, I\'ll fill manually')} />
                </div>
              </motion.div>
            )}
          </div>
        );

      // ── Name + Phone + Tagline ──
      case 'name':
        return (
          <div className="space-y-3">
            {visibleMessages.includes('name-1') && (
              <PlugBubble>
                <p className="font-medium">
                  {isHebrew ? 'מעולה! איך קוראים לך?' : 'Great! What\'s your name?'} <User className="w-4 h-4 inline" />
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  {isHebrew
                    ? 'השם, הטלפון והכותרת המקצועית ימולאו אוטומטית בטפסי הגשה'
                    : 'Name, phone and headline will be auto-filled in application forms'}
                </p>
              </PlugBubble>
            )}
            {visibleMessages.includes('name-1') && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="ms-10 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {isHebrew ? 'שם מלא *' : 'Full Name *'}
                  </label>
                  <Input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder={isHebrew ? 'השם המלא שלך' : 'Your full name'}
                    autoFocus
                    className="bg-card"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {isHebrew ? 'מספר טלפון' : 'Phone Number'}
                  </label>
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder={isHebrew ? '050-1234567' : '050-1234567'}
                    type="tel"
                    className="bg-card"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {isHebrew ? 'כותרת מקצועית' : 'Professional Headline'}
                    <span className="text-muted-foreground/60 ms-1">({isHebrew ? 'לא חובה' : 'optional'})</span>
                  </label>
                  <Input
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder={isHebrew ? 'למשל: מפתחת Full Stack עם 5 שנות ניסיון' : 'e.g. Full Stack Developer with 5 years experience'}
                    className="bg-card"
                  />
                </div>
                <NextButton onClick={handleNext} disabled={fullName.trim().length < 2} />
              </motion.div>
            )}
          </div>
        );

      // ── Fields & Roles ──
      case 'fields':
        return (
          <div className="space-y-3">
            {visibleMessages.includes('fields-1') && (
              <PlugBubble>
                <p className="font-medium">
                  {isHebrew ? 'באילו תחומים אתה מחפש עבודה?' : 'What fields are you looking for?'} <Briefcase className="w-4 h-4 inline" />
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  {isHebrew ? 'בחר עד 5 תחומים — זה עוזר לתוסף לסנן ולהתאים משרות' : 'Pick up to 5 fields — helps the extension filter and match jobs'}
                </p>
              </PlugBubble>
            )}
            {visibleMessages.includes('fields-1') && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="ms-10 space-y-3">
                {/* Search bar for fields */}
                <div className="relative">
                  <Input
                    value={fieldSearch}
                    onChange={e => { setFieldSearch(e.target.value); setShowFieldSearch(true); }}
                    onFocus={() => setShowFieldSearch(true)}
                    placeholder={isHebrew ? 'חפש תחום...' : 'Search field...'}
                    className="bg-card"
                  />
                  {showFieldSearch && (
                    <button
                      className="absolute top-1/2 -translate-y-1/2 end-2 text-muted-foreground"
                      onClick={() => { setShowFieldSearch(false); setFieldSearch(''); }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Field chips */}
                <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto overscroll-contain">
                  {(showFieldSearch ? filteredFields : JOB_FIELDS.slice(0, 12)).map(f => (
                    <ChipButton
                      key={f.slug}
                      label={isHebrew ? f.name_he : f.name_en}
                      selected={preferredFields.includes(f.slug)}
                      onClick={() => {
                        if (preferredFields.includes(f.slug)) {
                          setPreferredFields(preferredFields.filter(x => x !== f.slug));
                          setPreferredRoles(preferredRoles.filter(r => {
                            const role = availableRoles.find(ar => ar.slug === r);
                            return role?.fieldSlug !== f.slug;
                          }));
                        } else if (preferredFields.length < 5) {
                          setPreferredFields([...preferredFields, f.slug]);
                        }
                      }}
                    />
                  ))}
                  {!showFieldSearch && JOB_FIELDS.length > 12 && (
                    <button
                      onClick={() => setShowFieldSearch(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-primary hover:bg-primary/5 border border-dashed border-primary/30"
                    >
                      <ChevronDown className="w-3 h-3" />
                      {isHebrew ? `עוד ${JOB_FIELDS.length - 12} תחומים` : `${JOB_FIELDS.length - 12} more`}
                    </button>
                  )}
                </div>

                {/* Roles (show after fields selected) */}
                {availableRoles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {isHebrew ? 'תפקידים ספציפיים (לא חובה):' : 'Specific roles (optional):'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-[150px] overflow-y-auto overscroll-contain">
                      {availableRoles.slice(0, 20).map(r => (
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

                <NextButton onClick={handleNext} disabled={preferredFields.length === 0} />
              </motion.div>
            )}
          </div>
        );

      // ── Experience & Skills ──
      case 'experience':
        return (
          <div className="space-y-3">
            {visibleMessages.includes('experience-1') && (
              <PlugBubble>
                <p className="font-medium">
                  {isHebrew ? 'כמה ניסיון יש לך?' : 'How much experience do you have?'} <Target className="w-4 h-4 inline" />
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  {isHebrew
                    ? 'עוזר לנו להתאים משרות ברמה הנכונה ולמלא שדות ניסיון בטפסים'
                    : 'Helps us match jobs at the right level and fill experience fields in forms'}
                </p>
              </PlugBubble>
            )}
            {visibleMessages.includes('experience-1') && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="ms-10 space-y-4">
                {/* Experience chips */}
                <div className="flex flex-wrap gap-1.5">
                  {EXPERIENCE_LEVELS.map(l => (
                    <ChipButton
                      key={l.slug}
                      label={isHebrew ? l.name_he : l.name_en}
                      selected={experienceYears === String(l.years_min)}
                      onClick={() => setExperienceYears(String(l.years_min))}
                    />
                  ))}
                </div>

                {/* Skills input */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    {isHebrew ? 'כישורים וטכנולוגיות:' : 'Skills & Technologies:'}
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={e => setSkillInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      placeholder={isHebrew ? 'למשל: React, ניהול פרויקטים...' : 'e.g. React, Project Management...'}
                      className="flex-1 bg-card"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addSkill} className="min-h-[44px]">+</Button>
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {skills.map(s => (
                        <Badge key={s} variant="secondary" className="gap-1 pe-1">
                          {s}
                          <button onClick={() => setSkills(skills.filter(x => x !== s))} className="hover:text-destructive ms-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <NextButton onClick={handleNext} />
              </motion.div>
            )}
          </div>
        );

      // ── Links ──
      case 'links':
        return (
          <div className="space-y-3">
            {visibleMessages.includes('links-1') && (
              <PlugBubble>
                <p className="font-medium">
                  {isHebrew ? 'יש לך פרופילים ברשת?' : 'Got any online profiles?'} <Link2 className="w-4 h-4 inline" />
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  {isHebrew
                    ? 'הקישורים האלה ימולאו אוטומטית בטפסי הגשת מועמדות — חוסך זמן!'
                    : 'These links will be auto-filled in application forms — saves time!'}
                </p>
              </PlugBubble>
            )}
            {visibleMessages.includes('links-1') && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="ms-10 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">LinkedIn</label>
                  <Input
                    value={linkedinUrl}
                    onChange={e => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/your-profile"
                    className="bg-card"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">GitHub</label>
                  <Input
                    value={githubUrl}
                    onChange={e => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/your-username"
                    className="bg-card"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {isHebrew ? 'אתר / פורטפוליו' : 'Website / Portfolio'}
                  </label>
                  <Input
                    value={portfolioUrl}
                    onChange={e => setPortfolioUrl(e.target.value)}
                    placeholder="https://your-site.com"
                    className="bg-card"
                    dir="ltr"
                  />
                </div>
                <NextButton onClick={handleNext} label={isHebrew ? (linkedinUrl || githubUrl || portfolioUrl ? 'המשך' : 'דלג') : (linkedinUrl || githubUrl || portfolioUrl ? 'Continue' : 'Skip')} />
              </motion.div>
            )}
          </div>
        );

      // ── Location + Salary + Goal ──
      case 'details':
        return (
          <div className="space-y-3">
            {visibleMessages.includes('details-1') && (
              <PlugBubble>
                <p className="font-medium">
                  {isHebrew ? 'כמעט סיימנו! איפה ומה מחפשים?' : 'Almost done! Where and what are you looking for?'} <MapPin className="w-4 h-4 inline" />
                </p>
              </PlugBubble>
            )}
            {visibleMessages.includes('details-1') && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="ms-10 space-y-4">
                {/* Location chips */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">{isHebrew ? 'מיקום מועדף:' : 'Preferred location:'}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_LOCATIONS.map(l => (
                      <ChipButton
                        key={l.en}
                        label={isHebrew ? l.he : l.en}
                        selected={targetLocations.includes(isHebrew ? l.he : l.en)}
                        onClick={() => {
                          const val = isHebrew ? l.he : l.en;
                          if (targetLocations.includes(val)) {
                            setTargetLocations(targetLocations.filter(x => x !== val));
                          } else if (targetLocations.length < 5) {
                            setTargetLocations([...targetLocations, val]);
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Salary chips */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    {isHebrew ? 'ציפיות שכר (ברוטו):' : 'Salary expectations (gross):'}
                    <span className="text-muted-foreground/60 ms-1">({isHebrew ? 'לא חובה' : 'optional'})</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SALARY_RANGES.map(s => (
                      <ChipButton
                        key={s.value}
                        label={isHebrew ? s.he : s.en}
                        selected={desiredSalary === s.value}
                        onClick={() => setDesiredSalary(desiredSalary === s.value ? '' : s.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* Search goal */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">{isHebrew ? 'מה המצב שלך?' : 'What\'s your status?'}</p>
                  <div className="space-y-1.5">
                    {([
                      { value: 'active' as const, he: 'מחפש/ת באופן אקטיבי', en: 'Actively searching', emoji: '🔥' },
                      { value: 'open' as const, he: 'פתוח/ה להצעות', en: 'Open to offers', emoji: '👀' },
                      { value: 'exploring' as const, he: 'סתם בודק/ת מה יש', en: 'Just exploring', emoji: '🧭' },
                    ]).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSearchGoal(opt.value)}
                        className={`flex items-center gap-3 rounded-xl border-2 p-3 text-start transition-all w-full min-h-[44px] text-sm ${
                          searchGoal === opt.value
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <span>{opt.emoji}</span>
                        <span className="font-medium">{isHebrew ? opt.he : opt.en}</span>
                        {searchGoal === opt.value && <Check className="w-4 h-4 text-primary ms-auto" />}
                      </button>
                    ))}
                  </div>
                </div>

                <NextButton onClick={handleNext} />
              </motion.div>
            )}
          </div>
        );

      // ── Gmail / Calendar / Push ──
      case 'gmail':
        return (
          <div className="space-y-3">
            {visibleMessages.includes('gmail-1') && (
              <PlugBubble>
                <p className="font-medium">
                  {isHebrew ? 'שלב אחרון! חיבור חשבונות' : 'Last step! Connect accounts'} <Mail className="w-4 h-4 inline" />
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  {isHebrew
                    ? 'חיבור Gmail מאפשר ל-PLUG לעקוב אחרי דחיות ולסנכרן ראיונות ליומן שלך'
                    : 'Gmail connection lets PLUG track rejections and sync interviews to your calendar'}
                </p>
              </PlugBubble>
            )}
            {visibleMessages.includes('gmail-1') && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="ms-10 space-y-2">
                {/* Gmail */}
                <button
                  onClick={connectGmail}
                  disabled={gmailDone || !GOOGLE_CLIENT_ID}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 w-full text-start transition-all min-h-[48px] ${
                    gmailDone ? 'border-green-500/30 bg-green-500/5' : 'border-border hover:border-primary/40'
                  }`}
                >
                  {gmailDone ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> : <Mail className="w-5 h-5 text-primary shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{isHebrew ? 'Gmail — מיילים ומעקב דחיות' : 'Gmail — Emails & Rejection Tracking'}</p>
                  </div>
                  {gmailDone && <span className="text-xs text-green-600">{isHebrew ? 'מחובר' : 'Connected'}</span>}
                </button>

                {/* Calendar */}
                <button
                  onClick={connectCalendar}
                  disabled={calendarDone || !GOOGLE_CLIENT_ID}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 w-full text-start transition-all min-h-[48px] ${
                    calendarDone ? 'border-green-500/30 bg-green-500/5' : 'border-border hover:border-primary/40'
                  }`}
                >
                  {calendarDone ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> : <Calendar className="w-5 h-5 text-primary shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{isHebrew ? 'Google Calendar — סנכרון ראיונות' : 'Google Calendar — Interview Sync'}</p>
                  </div>
                  {calendarDone && <span className="text-xs text-green-600">{isHebrew ? 'מחובר' : 'Connected'}</span>}
                </button>

                {/* Push */}
                <button
                  onClick={connectPush}
                  disabled={pushDone}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 w-full text-start transition-all min-h-[48px] ${
                    pushDone ? 'border-green-500/30 bg-green-500/5' : 'border-border hover:border-primary/40'
                  }`}
                >
                  {pushDone ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> : <Bell className="w-5 h-5 text-primary shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{isHebrew ? 'התראות Push — עדכונים בזמן אמת' : 'Push — Real-time Updates'}</p>
                  </div>
                  {pushDone && <span className="text-xs text-green-600">{isHebrew ? 'מופעל' : 'Enabled'}</span>}
                </button>

                {/* Security note */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground mt-1">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  {isHebrew ? 'כל החיבורים מאובטחים עם OAuth' : 'All connections secured with OAuth'}
                </div>

                <NextButton
                  onClick={() => goToStep('done')}
                  label={isHebrew ? 'סיום וכניסה לדשבורד' : 'Finish & enter dashboard'}
                />
              </motion.div>
            )}
          </div>
        );

      // ── Done ──
      case 'done':
        return (
          <div className="space-y-3">
            {visibleMessages.includes('done-1') && (
              <PlugBubble>
                <p className="font-medium text-base">
                  {isHebrew ? 'מעולה, הכל מוכן!' : 'Awesome, all set!'} <span className="inline-block">🎉</span>
                </p>
                <p className="mt-1 text-muted-foreground">
                  {isHebrew
                    ? 'הפרופיל שלך מוכן. התוסף של PLUG ימלא טפסים אוטומטית עם הפרטים שמילאת. בהצלחה בחיפוש!'
                    : 'Your profile is ready. The PLUG extension will auto-fill forms with your details. Good luck with your search!'}
                </p>
              </PlugBubble>
            )}
            {visibleMessages.includes('done-1') && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mt-4">
                <Button
                  onClick={handleFinish}
                  disabled={saving}
                  size="lg"
                  className="min-h-[48px] gap-2 rounded-full px-8"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Rocket className="w-5 h-5" />
                      {isHebrew ? 'קדימה, בואו נתחיל!' : "Let's go!"}
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-md"
      dir={isHebrew ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">PLUG</p>
            <p className="text-[10px] text-muted-foreground leading-none">
              {isHebrew ? 'הגדרת פרופיל' : 'Profile Setup'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{progress}%</span>
          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Skip button */}
        <button
          onClick={handleFinish}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center"
        >
          {isHebrew ? 'דלג' : 'Skip'}
        </button>
      </div>

      {/* Chat area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
        {renderStepContent()}

        {/* Typing indicator */}
        {typingMessageId && <TypingIndicator />}

        <div ref={chatEndRef} />
      </div>
    </div>
  );
}

// Step message definitions (for the showMessage system)
const STEP_MESSAGES: Partial<Record<StepId, string[]>> = {
  welcome: ['welcome-1'],
  cv: ['cv-1'],
  name: ['name-1'],
  fields: ['fields-1'],
  experience: ['experience-1'],
  links: ['links-1'],
  details: ['details-1'],
  gmail: ['gmail-1'],
  done: ['done-1'],
};
