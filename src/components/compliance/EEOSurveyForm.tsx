import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShieldCheck, Info, CheckCircle2, Loader2, Lock } from 'lucide-react';

interface EEOSurveyFormProps {
  applicationId: string;
  candidateId: string;
  onComplete?: () => void;
}

type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
type RaceEthnicity =
  | 'white'
  | 'black_african_american'
  | 'hispanic_latino'
  | 'asian'
  | 'native_american'
  | 'pacific_islander'
  | 'two_or_more'
  | 'prefer_not_to_say';
type VeteranStatus = 'veteran' | 'not_veteran' | 'prefer_not_to_say';
type DisabilityStatus = 'yes' | 'no' | 'prefer_not_to_say';

interface FormValues {
  gender: Gender | '';
  race_ethnicity: RaceEthnicity | '';
  veteran_status: VeteranStatus | '';
  disability_status: DisabilityStatus | '';
}

const GENDER_OPTIONS: { value: Gender; en: string; he: string }[] = [
  { value: 'male', en: 'Male', he: 'זכר' },
  { value: 'female', en: 'Female', he: 'נקבה' },
  { value: 'non_binary', en: 'Non-binary / Gender non-conforming', he: 'לא בינארי / אי-ציות מגדרי' },
  { value: 'prefer_not_to_say', en: 'Prefer not to say', he: 'מעדיף/ת שלא לציין' },
];

const RACE_OPTIONS: { value: RaceEthnicity; en: string; he: string }[] = [
  { value: 'white', en: 'White', he: 'לבן/לבנה' },
  { value: 'black_african_american', en: 'Black or African American', he: 'שחור/ה או אפריקאי-אמריקאי' },
  { value: 'hispanic_latino', en: 'Hispanic or Latino', he: 'היספני/ת או לטינו/ה' },
  { value: 'asian', en: 'Asian', he: 'אסייתי/ת' },
  { value: 'native_american', en: 'American Indian or Alaska Native', he: 'יליד/ת אמריקה או אלסקה' },
  { value: 'pacific_islander', en: 'Native Hawaiian or Pacific Islander', he: 'יליד/ת הוואי או איי האוקיאנוס השקט' },
  { value: 'two_or_more', en: 'Two or more races', he: 'שתי קבוצות גזע או יותר' },
  { value: 'prefer_not_to_say', en: 'Prefer not to say', he: 'מעדיף/ת שלא לציין' },
];

const VETERAN_OPTIONS: { value: VeteranStatus; en: string; he: string }[] = [
  { value: 'veteran', en: 'I am a protected veteran', he: 'אני ותיק/ה מוגן/ת' },
  { value: 'not_veteran', en: 'I am not a protected veteran', he: 'איני ותיק/ה מוגן/ת' },
  { value: 'prefer_not_to_say', en: 'Prefer not to say', he: 'מעדיף/ת שלא לציין' },
];

const DISABILITY_OPTIONS: { value: DisabilityStatus; en: string; he: string }[] = [
  { value: 'yes', en: 'Yes, I have a disability or have had one previously', he: 'כן, יש לי מוגבלות או הייתה לי בעבר' },
  { value: 'no', en: 'No, I do not have a disability', he: 'לא, אין לי מוגבלות' },
  { value: 'prefer_not_to_say', en: 'Prefer not to say', he: 'מעדיף/ת שלא לציין' },
];

export function EEOSurveyForm({ applicationId, candidateId, onComplete }: EEOSurveyFormProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [values, setValues] = useState<FormValues>({
    gender: '',
    race_ethnicity: '',
    veteran_status: '',
    disability_status: '',
  });

  // Check if already submitted
  const { data: existing, isLoading: checkLoading } = useQuery({
    queryKey: ['eeo-submission', applicationId, candidateId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('eeo_submissions')
        .select('id, submitted_at')
        .eq('application_id', applicationId)
        .eq('candidate_id', candidateId)
        .maybeSingle();
      return data;
    },
    enabled: !!applicationId && !!candidateId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('eeo_submissions').insert({
        application_id: applicationId,
        candidate_id: candidateId,
        gender: values.gender || null,
        race_ethnicity: values.race_ethnicity || null,
        veteran_status: values.veteran_status || null,
        disability_status: values.disability_status || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        isRTL ? 'השאלון הוגש בהצלחה. תודה!' : 'Survey submitted successfully. Thank you!'
      );
      onComplete?.();
    },
    onError: () => {
      toast.error(
        isRTL ? 'שגיאה בהגשת השאלון. נסה שוב.' : 'Failed to submit survey. Please try again.'
      );
    },
  });

  const isFormValid =
    values.gender !== '' &&
    values.race_ethnicity !== '' &&
    values.veteran_status !== '' &&
    values.disability_status !== '';

  if (checkLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (existing) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-medium text-foreground">
              {isRTL ? 'השאלון הוגש בהצלחה' : 'Survey already submitted'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? 'תודה על השתתפותך. תשובותיך נשמרו בצורה מאובטחת.'
                : 'Thank you for participating. Your responses have been saved securely.'}
            </p>
            <Badge variant="outline" className="border-green-500/30 text-green-500 gap-1">
              <Lock className="h-3 w-3" />
              {isRTL ? 'סודי ומאובטח' : 'Confidential & Secure'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border" dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-6 w-6 text-primary mt-0.5 shrink-0" />
          <div>
            <CardTitle className="text-lg leading-tight">
              {isRTL
                ? 'שאלון הזדהות עצמית מרצון'
                : 'Voluntary Self-Identification'}
            </CardTitle>
            <CardDescription className="mt-1">
              {isRTL
                ? 'Voluntary Self-Identification Survey — EEO/OFCCP'
                : 'שאלון הזדהות עצמית — EEO/OFCCP'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Confidentiality Banner */}
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {isRTL
                ? 'טופס זה הוא מרצון וסודי לחלוטין'
                : 'This form is voluntary and strictly confidential'}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isRTL
                ? 'המידע שתספק/י ישמש אך ורק לצורך דיווח סטטיסטי מצטבר בהתאם לדרישות ה-EEO/OFCCP. הוא לא ישפיע על תהליך המיון שלך. ניתן לבחור "מעדיף/ת שלא לציין" בכל שאלה.'
                : 'Information you provide will be used solely for aggregate statistical reporting in compliance with EEO/OFCCP requirements. It will not affect your application process in any way. You may select "Prefer not to say" for any question.'}
            </p>
          </div>
        </div>

        {/* Gender */}
        <FieldSection
          title={isRTL ? 'מגדר' : 'Gender'}
          isRTL={isRTL}
        >
          <RadioGroup
            value={values.gender}
            onValueChange={(v) => setValues((prev) => ({ ...prev, gender: v as Gender }))}
            className="space-y-2"
          >
            {GENDER_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={opt.value} id={`gender-${opt.value}`} />
                <Label
                  htmlFor={`gender-${opt.value}`}
                  className="flex-1 cursor-pointer text-sm font-normal"
                >
                  {isRTL ? opt.he : opt.en}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </FieldSection>

        {/* Race / Ethnicity */}
        <FieldSection
          title={isRTL ? 'גזע / מוצא אתני' : 'Race / Ethnicity'}
          isRTL={isRTL}
        >
          <RadioGroup
            value={values.race_ethnicity}
            onValueChange={(v) => setValues((prev) => ({ ...prev, race_ethnicity: v as RaceEthnicity }))}
            className="space-y-2"
          >
            {RACE_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={opt.value} id={`race-${opt.value}`} />
                <Label
                  htmlFor={`race-${opt.value}`}
                  className="flex-1 cursor-pointer text-sm font-normal"
                >
                  {isRTL ? opt.he : opt.en}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </FieldSection>

        {/* Veteran Status */}
        <FieldSection
          title={isRTL ? 'סטטוס ותיק/ה' : 'Veteran Status'}
          isRTL={isRTL}
          tooltip={
            isRTL
              ? 'ותיק/ה מוגן/ת כולל: נכי מלחמה, ותיקים שהשתחררו לאחרונה, ותיקים שנמצאים בסיכון ועוד, בהתאם ל-VEVRAA.'
              : 'Protected veteran includes: disabled veterans, recently separated veterans, active duty wartime/campaign badge veterans, Armed Forces service medal veterans, per VEVRAA.'
          }
        >
          <RadioGroup
            value={values.veteran_status}
            onValueChange={(v) => setValues((prev) => ({ ...prev, veteran_status: v as VeteranStatus }))}
            className="space-y-2"
          >
            {VETERAN_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={opt.value} id={`veteran-${opt.value}`} />
                <Label
                  htmlFor={`veteran-${opt.value}`}
                  className="flex-1 cursor-pointer text-sm font-normal"
                >
                  {isRTL ? opt.he : opt.en}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </FieldSection>

        {/* Disability */}
        <FieldSection
          title={isRTL ? 'מוגבלות' : 'Disability Status'}
          isRTL={isRTL}
          tooltip={
            isRTL
              ? 'מוגבלות כוללת מגוון רחב של מצבים גופניים, נפשיים ורגשיים בהתאם ל-Section 503 of the Rehabilitation Act.'
              : 'Disability includes a wide range of physical, mental, and emotional conditions per Section 503 of the Rehabilitation Act.'
          }
        >
          <RadioGroup
            value={values.disability_status}
            onValueChange={(v) => setValues((prev) => ({ ...prev, disability_status: v as DisabilityStatus }))}
            className="space-y-2"
          >
            {DISABILITY_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={opt.value} id={`disability-${opt.value}`} />
                <Label
                  htmlFor={`disability-${opt.value}`}
                  className="flex-1 cursor-pointer text-sm font-normal"
                >
                  {isRTL ? opt.he : opt.en}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </FieldSection>

        {/* Legal notice */}
        <p className="text-xs text-muted-foreground border-t border-border pt-4 leading-relaxed">
          {isRTL
            ? 'הגשת טופס זה הינה מרצון לחלוטין. אי-מילויו לא ישפיע לרעה על ועדת קבלה, תנאי העסקה, קידום, פיצויים, הכשרה או כל תנאי עסקה אחר. שאלות: EEO@company.com'
            : 'Submission of this form is entirely voluntary. Refusal to provide it will not subject you to any adverse treatment. Questions about the program may be directed to EEO@company.com'}
        </p>

        {/* Submit */}
        <Button
          className="w-full gap-2"
          onClick={() => submitMutation.mutate()}
          disabled={!isFormValid || submitMutation.isPending}
          aria-label={isRTL ? 'הגש שאלון' : 'Submit survey'}
        >
          {submitMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          {isRTL ? 'הגש שאלון' : 'Submit Survey'}
        </Button>

        {!isFormValid && (
          <p className="text-xs text-center text-muted-foreground">
            {isRTL
              ? 'יש לבחור תשובה לכל השאלות (ניתן לבחור "מעדיף/ת שלא לציין")'
              : 'Please answer all questions (you may select "Prefer not to say" for any)'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Helper sub-component ----

interface FieldSectionProps {
  title: string;
  isRTL: boolean;
  tooltip?: string;
  children: React.ReactNode;
}

function FieldSection({ title, isRTL, tooltip, children }: FieldSectionProps) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {tooltip && (
          <div className="relative">
            <button
              type="button"
              aria-label={isRTL ? 'מידע נוסף' : 'More information'}
              onClick={() => setShowTip((v) => !v)}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
            {showTip && (
              <div
                className={`absolute z-10 top-5 ${isRTL ? 'right-0' : 'left-0'} w-64 rounded-md border border-border bg-popover p-3 text-xs text-muted-foreground shadow-md`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
        <div className="p-2">{children}</div>
      </div>
    </div>
  );
}
