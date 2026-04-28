import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResumeUpload } from '@/components/documents/ResumeUpload';
import { PhotoUpload } from '@/components/profile/PhotoUpload';
import {
  Upload, User, Briefcase, MapPin, ChevronLeft, ChevronRight, Check, X, Sparkles, Target, Rocket,
} from 'lucide-react';
import { JOB_FIELDS, EXPERIENCE_LEVELS, getRolesByField } from '@/lib/job-taxonomy';

// ════════════════════════════════════════════════════
//  OnboardingWizard — 5-step post-signup questionnaire
//  Collects essential data for the extension + job matching
// ════════════════════════════════════════════════════

interface OnboardingWizardProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 5;

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';
  const isRTL = isHebrew;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // ── Step 1: Who are you ──
  const [fullName, setFullName] = useState((profile as any)?.full_name || '');
  const [tagline, setTagline] = useState((profile as any)?.personal_tagline || '');

  // ── Step 2: CV Upload ──
  const [cvUploaded, setCvUploaded] = useState(!!((profile as any)?.cv_data && Object.keys((profile as any).cv_data || {}).length > 0));

  // ── Step 3: What field & roles ──
  const [preferredFields, setPreferredFields] = useState<string[]>((profile as any)?.preferred_fields || []);
  const [preferredRoles, setPreferredRoles] = useState<string[]>((profile as any)?.preferred_roles || []);
  const [selectedField, setSelectedField] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // ── Step 4: Experience & Skills ──
  const [experienceYears, setExperienceYears] = useState<string>(String((profile as any)?.experience_years || ''));
  const [skills, setSkills] = useState<string[]>((profile as any)?.skills || []);
  const [skillInput, setSkillInput] = useState('');

  // ── Step 5: Where & Goal ──
  const [targetLocations, setTargetLocations] = useState<string[]>((profile as any)?.target_locations || []);
  const [locationInput, setLocationInput] = useState('');
  const [searchGoal, setSearchGoal] = useState<'active' | 'open' | 'exploring'>('active');

  const availableRoles = useMemo(() => {
    if (preferredFields.length === 0) return [];
    return preferredFields.flatMap(f => getRolesByField(f));
  }, [preferredFields]);

  // ── Navigation ──
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;

  const canProceed = useCallback(() => {
    switch (step) {
      case 0: return fullName.trim().length >= 2;
      case 1: return true; // CV is optional
      case 2: return preferredFields.length > 0;
      case 3: return true; // experience optional
      case 4: return true;
      default: return true;
    }
  }, [step, fullName, preferredFields]);

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1);
    else handleFinish();
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        full_name: fullName.trim(),
        personal_tagline: tagline.trim() || null,
        preferred_fields: preferredFields,
        preferred_roles: preferredRoles,
        experience_years: experienceYears ? Number(experienceYears) : null,
        skills,
        target_locations: targetLocations,
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

  // ── Skill helpers ──
  const addSkill = () => {
    const v = skillInput.trim();
    if (v && !skills.includes(v) && skills.length < 15) {
      setSkills([...skills, v]);
      setSkillInput('');
    }
  };
  const addLocation = () => {
    const v = locationInput.trim();
    if (v && !targetLocations.includes(v) && targetLocations.length < 5) {
      setTargetLocations([...targetLocations, v]);
      setLocationInput('');
    }
  };

  const addField = (slug: string) => {
    if (slug && !preferredFields.includes(slug) && preferredFields.length < 5) {
      setPreferredFields([...preferredFields, slug]);
      setSelectedField('');
    }
  };
  const addRole = (slug: string) => {
    if (slug && !preferredRoles.includes(slug) && preferredRoles.length < 10) {
      setPreferredRoles([...preferredRoles, slug]);
      setSelectedRole('');
    }
  };

  // ── Step configs ──
  const steps = [
    {
      icon: User,
      titleHe: 'ספרו לנו מי אתם',
      titleEn: 'Tell us about yourself',
      subtitleHe: 'שם וכותרת מקצועית קצרה',
      subtitleEn: 'Name and a short professional headline',
    },
    {
      icon: Upload,
      titleHe: 'העלו קורות חיים',
      titleEn: 'Upload your CV',
      subtitleHe: 'פלאג ינתח את הניסיון שלכם וימצא משרות מתאימות',
      subtitleEn: 'PLUG will analyze your experience and find matching jobs',
    },
    {
      icon: Briefcase,
      titleHe: 'באיזה תחום מחפשים?',
      titleEn: 'What field are you looking for?',
      subtitleHe: 'בחרו תחומים ותפקידים (עד 5 תחומים)',
      subtitleEn: 'Pick fields and roles (up to 5 fields)',
    },
    {
      icon: Target,
      titleHe: 'ניסיון וכישורים',
      titleEn: 'Experience & Skills',
      subtitleHe: 'עוזר לנו להתאים משרות ברמה הנכונה',
      subtitleEn: 'Helps us match jobs at the right level',
    },
    {
      icon: MapPin,
      titleHe: 'איפה ומה המטרה?',
      titleEn: 'Where & what\'s your goal?',
      subtitleHe: 'מיקום מועדף וקצב החיפוש',
      subtitleEn: 'Preferred location and search pace',
    },
  ];

  const currentStep = steps[step];
  const StepIcon = currentStep.icon;

  // ── Render step content ──
  const renderStepContent = () => {
    switch (step) {
      // Step 1: Name + Tagline
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">{isHebrew ? 'שם מלא' : 'Full Name'}</Label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder={isHebrew ? 'השם המלא שלכם' : 'Your full name'}
                className="mt-1.5"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm font-medium">
                {isHebrew ? 'כותרת מקצועית' : 'Professional Headline'}
                <span className="text-muted-foreground text-xs mr-1 ml-1">
                  ({isHebrew ? 'לא חובה' : 'optional'})
                </span>
              </Label>
              <Input
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder={isHebrew ? 'למשל: מפתחת Full Stack עם 5 שנות ניסיון' : 'e.g. Full Stack Developer with 5 years experience'}
                className="mt-1.5"
              />
            </div>
          </div>
        );

      // Step 2: CV Upload
      case 1:
        return (
          <div className="space-y-3">
            <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4">
              <ResumeUpload
                compact
                onUploadSuccess={() => setCvUploaded(true)}
              />
            </div>
            {cvUploaded && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                {isHebrew ? 'קורות חיים הועלו בהצלחה!' : 'CV uploaded successfully!'}
              </div>
            )}
            {!cvUploaded && (
              <p className="text-xs text-muted-foreground text-center">
                {isHebrew
                  ? 'אפשר לדלג ולהעלות אחר כך, אבל ההתאמה תהיה פחות מדויקת'
                  : 'You can skip this, but job matching will be less accurate'}
              </p>
            )}
          </div>
        );

      // Step 3: Fields + Roles
      case 2:
        return (
          <div className="space-y-4">
            {/* Field selection */}
            <div>
              <Label className="text-sm font-medium">{isHebrew ? 'תחומים' : 'Fields'}</Label>
              <div className="flex gap-2 mt-1.5">
                <Select value={selectedField} onValueChange={v => addField(v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={isHebrew ? 'בחרו תחום...' : 'Pick a field...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_FIELDS.filter(f => !preferredFields.includes(f.slug)).map(f => (
                      <SelectItem key={f.slug} value={f.slug}>
                        {isHebrew ? f.name_he : f.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {preferredFields.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {preferredFields.map(slug => {
                    const f = JOB_FIELDS.find(x => x.slug === slug);
                    return (
                      <Badge key={slug} variant="secondary" className="gap-1 pr-1">
                        {isHebrew ? f?.name_he : f?.name_en}
                        <button onClick={() => setPreferredFields(preferredFields.filter(x => x !== slug))}
                          className="hover:text-destructive ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Role selection (shows only if fields selected) */}
            {availableRoles.length > 0 && (
              <div>
                <Label className="text-sm font-medium">
                  {isHebrew ? 'תפקידים ספציפיים' : 'Specific Roles'}
                  <span className="text-muted-foreground text-xs mr-1 ml-1">
                    ({isHebrew ? 'לא חובה' : 'optional'})
                  </span>
                </Label>
                <div className="flex gap-2 mt-1.5">
                  <Select value={selectedRole} onValueChange={v => addRole(v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={isHebrew ? 'בחרו תפקיד...' : 'Pick a role...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.filter(r => !preferredRoles.includes(r.slug)).map(r => (
                        <SelectItem key={r.slug} value={r.slug}>
                          {isHebrew ? r.name_he : r.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {preferredRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {preferredRoles.map(slug => {
                      const r = availableRoles.find(x => x.slug === slug);
                      return (
                        <Badge key={slug} variant="outline" className="gap-1 pr-1">
                          {isHebrew ? r?.name_he : r?.name_en}
                          <button onClick={() => setPreferredRoles(preferredRoles.filter(x => x !== slug))}
                            className="hover:text-destructive ml-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      // Step 4: Experience + Skills
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">{isHebrew ? 'שנות ניסיון' : 'Years of Experience'}</Label>
              <Select value={experienceYears} onValueChange={setExperienceYears}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={isHebrew ? 'בחרו...' : 'Select...'} />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map(l => (
                    <SelectItem key={l.slug} value={String(l.years_min)}>
                      {isHebrew ? l.name_he : l.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">
                {isHebrew ? 'כישורים וטכנולוגיות' : 'Skills & Technologies'}
              </Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder={isHebrew ? 'למשל: React, ניהול פרויקטים...' : 'e.g. React, Project Management...'}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addSkill}
                  className="min-h-[44px]">
                  +
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {skills.map(s => (
                    <Badge key={s} variant="secondary" className="gap-1 pr-1">
                      {s}
                      <button onClick={() => setSkills(skills.filter(x => x !== s))}
                        className="hover:text-destructive ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      // Step 5: Location + Goal
      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">{isHebrew ? 'מיקום מועדף' : 'Preferred Location'}</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={locationInput}
                  onChange={e => setLocationInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                  placeholder={isHebrew ? 'למשל: תל אביב, מרכז, רמוט...' : 'e.g. Tel Aviv, Remote...'}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addLocation}
                  className="min-h-[44px]">
                  +
                </Button>
              </div>
              {targetLocations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {targetLocations.map(l => (
                    <Badge key={l} variant="secondary" className="gap-1 pr-1">
                      {l}
                      <button onClick={() => setTargetLocations(targetLocations.filter(x => x !== l))}
                        className="hover:text-destructive ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">{isHebrew ? 'מה המצב שלכם?' : 'What\'s your status?'}</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {([
                  { value: 'active' as const, he: 'מחפש/ת באופן אקטיבי', en: 'Actively searching', emoji: '🔥' },
                  { value: 'open' as const, he: 'פתוח/ה להצעות', en: 'Open to offers', emoji: '👀' },
                  { value: 'exploring' as const, he: 'סתם בודק/ת מה יש', en: 'Just exploring', emoji: '🧭' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSearchGoal(opt.value)}
                    className={`flex items-center gap-3 rounded-lg border-2 p-3 text-start transition-all min-h-[48px] ${
                      searchGoal === opt.value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <span className="text-lg">{opt.emoji}</span>
                    <span className="text-sm font-medium">{isHebrew ? opt.he : opt.en}</span>
                    {searchGoal === opt.value && <Check className="w-4 h-4 text-primary ms-auto" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 pb-2">
          {/* Progress bar */}
          <div className="flex gap-1.5 mb-5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step number */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <StepIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {isHebrew ? `שלב ${step + 1} מתוך ${TOTAL_STEPS}` : `Step ${step + 1} of ${TOTAL_STEPS}`}
              </p>
              <h2 className="text-lg font-bold leading-tight">
                {isHebrew ? currentStep.titleHe : currentStep.titleEn}
              </h2>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            {isHebrew ? currentStep.subtitleHe : currentStep.subtitleEn}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 pb-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" onClick={handleBack} className="min-h-[44px]">
              <PrevIcon className="w-4 h-4 me-1" />
              {isHebrew ? 'הקודם' : 'Back'}
            </Button>
          ) : (
            <div />
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className="min-h-[44px] min-w-[120px] gap-2"
          >
            {saving ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : step === TOTAL_STEPS - 1 ? (
              <>
                <Rocket className="w-4 h-4" />
                {isHebrew ? 'בואו נתחיל!' : "Let's go!"}
              </>
            ) : (
              <>
                {isHebrew ? 'הבא' : 'Next'}
                <NextIcon className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>

        {/* Skip link */}
        {step < TOTAL_STEPS - 1 && (
          <div className="px-6 pb-4 text-center">
            <button
              onClick={handleFinish}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              {isHebrew ? 'דלגו ועברו לדשבורד' : 'Skip and go to dashboard'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
