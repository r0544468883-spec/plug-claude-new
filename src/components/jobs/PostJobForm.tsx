import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Briefcase, MapPin, DollarSign, Loader2, Plus, Building2, Layers, GraduationCap } from 'lucide-react';
import { 
  JOB_FIELDS, 
  EXPERIENCE_LEVELS, 
  getRolesByField 
} from '@/lib/job-taxonomy';
import { formatSalaryRange, monthlyEquivalent, CURRENCY_SYMBOLS } from '@/lib/salary-utils';
import { KnockoutQuestionsSection, type KnockoutQuestion } from './KnockoutQuestionsSection';

const JOB_TYPES = [
  { value: 'full-time', labelEn: 'Full-time', labelHe: 'משרה מלאה' },
  { value: 'part-time', labelEn: 'Part-time', labelHe: 'משרה חלקית' },
  { value: 'hybrid', labelEn: 'Hybrid', labelHe: 'היברידי' },
  { value: 'contract', labelEn: 'Contract', labelHe: 'חוזה' },
  { value: 'freelance', labelEn: 'Freelance', labelHe: 'פרילנס' },
  { value: 'internship', labelEn: 'Internship', labelHe: 'התמחות' },
];

const CURRENCIES = [
  { value: 'ILS', label: '₪ שקלים (ILS)' },
  { value: 'USD', label: '$ דולרים (USD)' },
  { value: 'EUR', label: '€ יורו (EUR)' },
];

const SALARY_PERIODS = [
  { value: 'monthly', labelEn: 'Monthly', labelHe: 'חודשי' },
  { value: 'yearly', labelEn: 'Yearly', labelHe: 'שנתי' },
];

interface PostJobFormProps {
  onSuccess?: () => void;
}

export function PostJobForm({ onSuccess }: PostJobFormProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [location, setLocation] = useState('');
  const [fieldSlug, setFieldSlug] = useState('');
  const [roleSlug, setRoleSlug] = useState('');
  const [experienceLevelSlug, setExperienceLevelSlug] = useState('');
  const [jobType, setJobType] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [hybridOfficeDays, setHybridOfficeDays] = useState(3);
  const [knockoutQuestions, setKnockoutQuestions] = useState<KnockoutQuestion[]>([]);
  const [blindHiring, setBlindHiring] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['plug', 'google_jobs']);

  // Structured salary
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState('ILS');
  const [salaryPeriod, setSalaryPeriod] = useState('monthly');

  const availableRoles = useMemo(() => {
    if (!fieldSlug) return [];
    return getRolesByField(fieldSlug);
  }, [fieldSlug]);

  const handleFieldChange = (value: string) => {
    setFieldSlug(value);
    setRoleSlug('');
  };

  // Salary preview
  const salaryPreview = useMemo(() => {
    const min = salaryMin ? parseInt(salaryMin) : null;
    const max = salaryMax ? parseInt(salaryMax) : null;
    if (!min && !max) return null;
    const formatted = formatSalaryRange(min, max, salaryCurrency, salaryPeriod);
    
    // Show monthly equivalent if yearly
    if (salaryPeriod === 'yearly' && (min || max)) {
      const sym = CURRENCY_SYMBOLS[salaryCurrency] || salaryCurrency;
      const monthlyMin = min ? monthlyEquivalent(min, 'yearly') : null;
      const monthlyMax = max ? monthlyEquivalent(max, 'yearly') : null;
      const monthlyStr = monthlyMin && monthlyMax
        ? `${sym}${monthlyMin.toLocaleString()}-${sym}${monthlyMax.toLocaleString()}/mo`
        : monthlyMin ? `${sym}${monthlyMin.toLocaleString()}+/mo` : `${sym}${monthlyMax?.toLocaleString()}/mo`;
      return `${formatted} (${monthlyStr})`;
    }
    return formatted;
  }, [salaryMin, salaryMax, salaryCurrency, salaryPeriod]);

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      let companyId: string | null = null;
      if (companyName) {
        const { data: existingCompany } = await supabase
          .from('companies').select('id').eq('name', companyName).single();
        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const { data: newCompany, error: companyError } = await supabase
            .from('companies').insert({ name: companyName, created_by: user.id }).select('id').single();
          if (companyError) throw companyError;
          companyId = newCompany.id;
        }
      }

      let fieldId = null, roleId = null, experienceLevelId = null;
      if (fieldSlug) {
        const { data: field } = await supabase.from('job_fields').select('id').eq('slug', fieldSlug).single();
        if (field) fieldId = field.id;
      }
      if (roleSlug) {
        const { data: role } = await supabase.from('job_roles').select('id').eq('slug', roleSlug).single();
        if (role) roleId = role.id;
      }
      if (experienceLevelSlug) {
        const { data: expLevel } = await supabase.from('experience_levels').select('id').eq('slug', experienceLevelSlug).single();
        if (expLevel) experienceLevelId = expLevel.id;
      }

      const minVal = salaryMin ? parseInt(salaryMin) : null;
      const maxVal = salaryMax ? parseInt(salaryMax) : null;

      const { error } = await supabase.from('jobs').insert({
        title, description, requirements, location,
        salary_range: formatSalaryRange(minVal, maxVal, salaryCurrency, salaryPeriod),
        salary_min: minVal, salary_max: maxVal,
        salary_currency: (minVal || maxVal) ? salaryCurrency : null,
        salary_period: (minVal || maxVal) ? salaryPeriod : null,
        hybrid_office_days: jobType === 'hybrid' ? hybridOfficeDays : null,
        category: fieldSlug, field_id: fieldId, role_id: roleId,
        experience_level_id: experienceLevelId, job_type: jobType,
        company_id: companyId, created_by: user.id, status: 'active',
      } as any);
      if (error) throw error;

      // Get the new job ID and create publications
      const { data: newJob } = await supabase.from('jobs').select('id').eq('created_by', user.id).order('created_at', { ascending: false }).limit(1).single();
      if (newJob) {
        await supabase.from('job_publications' as any).insert(
          selectedChannels.map(ch => ({
            job_id: newJob.id,
            channel: ch,
            status: ch === 'plug' || ch === 'google_jobs' ? 'published' : 'pending',
            published_at: ch === 'plug' || ch === 'google_jobs' ? new Date().toISOString() : null,
          }))
        );
        if (newJob) {
          await supabase.from('knockout_questions').insert(
            knockoutQuestions
              .filter(q => q.question_text.trim())
              .map((q, i) => ({
                job_id: newJob.id,
                question_text: q.question_text,
                question_order: i + 1,
                is_required: q.is_required,
                correct_answer: q.correct_answer,
              })) as any
          );
        }
      }
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'המשרה פורסמה בהצלחה!' : 'Job posted successfully!');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setTitle(''); setDescription(''); setRequirements(''); setLocation('');
      setSalaryMin(''); setSalaryMax(''); setSalaryCurrency('ILS'); setSalaryPeriod('monthly');
      setFieldSlug(''); setRoleSlug(''); setExperienceLevelSlug('');
      setJobType(''); setCompanyName(''); setHybridOfficeDays(3);
      onSuccess?.();
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בפרסום המשרה' : 'Failed to post job');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !fieldSlug || !jobType) {
      toast.error(isHebrew ? 'אנא מלא את כל השדות הנדרשים' : 'Please fill in all required fields');
      return;
    }
    postMutation.mutate();
  };

  return (
    <Card className="bg-card border-border" data-tour="post-job-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          {isHebrew ? 'פרסום משרה חדשה' : 'Post New Job'}
        </CardTitle>
        <CardDescription>
          {isHebrew ? 'מלא את הפרטים ליצירת משרה חדשה' : 'Fill in the details to create a new job posting'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label>{isHebrew ? 'כותרת המשרה *' : 'Job Title *'}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isHebrew ? 'לדוגמה: מפתח Full-Stack' : 'e.g. Full-Stack Developer'} required />
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {isHebrew ? 'שם החברה' : 'Company Name'}
            </Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={isHebrew ? 'שם החברה המגייסת' : 'Hiring company name'} />
          </div>

          {/* Field, Role & Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                {isHebrew ? 'תחום עבודה *' : 'Job Field *'}
              </Label>
              <Select value={fieldSlug} onValueChange={handleFieldChange} required>
                <SelectTrigger><SelectValue placeholder={isHebrew ? 'בחר תחום' : 'Select field'} /></SelectTrigger>
                <SelectContent>
                  {JOB_FIELDS.map((field) => (
                    <SelectItem key={field.slug} value={field.slug}>{isHebrew ? field.name_he : field.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                {isHebrew ? 'תפקיד' : 'Role'}
              </Label>
              <Select value={roleSlug} onValueChange={setRoleSlug} disabled={!fieldSlug}>
                <SelectTrigger><SelectValue placeholder={isHebrew ? 'בחר תפקיד' : 'Select role'} /></SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.slug} value={role.slug}>{isHebrew ? role.name_he : role.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{isHebrew ? 'סוג משרה *' : 'Job Type *'}</Label>
              <Select value={jobType} onValueChange={setJobType} required>
                <SelectTrigger><SelectValue placeholder={isHebrew ? 'בחר סוג משרה' : 'Select job type'} /></SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{isHebrew ? type.labelHe : type.labelEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Hybrid Office Days */}
          {jobType === 'hybrid' && (
            <div className="space-y-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Label className="flex items-center justify-between">
                <span>{isHebrew ? 'כמה ימים מהמשרד?' : 'How many days from office?'}</span>
                <span className="text-primary font-semibold">{hybridOfficeDays} {isHebrew ? 'ימים' : 'days'}</span>
              </Label>
              <Slider
                value={[hybridOfficeDays]}
                onValueChange={(v) => setHybridOfficeDays(v[0])}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>
          )}

          {/* Experience Level */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              {isHebrew ? 'רמת ותק נדרשת' : 'Required Experience Level'}
            </Label>
            <Select value={experienceLevelSlug} onValueChange={setExperienceLevelSlug}>
              <SelectTrigger><SelectValue placeholder={isHebrew ? 'בחר רמת ותק' : 'Select experience level'} /></SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map((level) => (
                  <SelectItem key={level.slug} value={level.slug}>{isHebrew ? level.name_he : level.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {isHebrew ? 'מיקום' : 'Location'}
            </Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={isHebrew ? 'לדוגמה: תל אביב, מרחוק' : 'e.g. Tel Aviv, Remote'} />
          </div>

          {/* Structured Salary */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {isHebrew ? 'שכר' : 'Salary'}
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{isHebrew ? 'מינימום' : 'Min'}</Label>
                <Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="25,000" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{isHebrew ? 'מקסימום' : 'Max'}</Label>
                <Input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="35,000" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{isHebrew ? 'מטבע' : 'Currency'}</Label>
                <Select value={salaryCurrency} onValueChange={setSalaryCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{isHebrew ? 'תדירות' : 'Period'}</Label>
                <Select value={salaryPeriod} onValueChange={setSalaryPeriod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SALARY_PERIODS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{isHebrew ? p.labelHe : p.labelEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {salaryPreview && (
              <p className="text-sm text-primary font-medium">{salaryPreview}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{isHebrew ? 'תיאור המשרה *' : 'Job Description *'}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isHebrew ? 'תאר את המשרה, האחריות והיומיום...' : 'Describe the role, responsibilities, and day-to-day...'} className="min-h-[120px]" required />
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <Label>{isHebrew ? 'דרישות' : 'Requirements'}</Label>
            <Textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder={isHebrew ? 'כישורים, ניסיון, והסמכות נדרשות...' : 'Skills, experience, and qualifications required...'} className="min-h-[100px]" />
          </div>

          {/* Knockout Questions */}
          <KnockoutQuestionsSection
            questions={knockoutQuestions}
            onChange={setKnockoutQuestions}
            jobTitle={title}
          />

          {/* Submit */}
          <Button type="submit" disabled={postMutation.isPending} className="w-full gap-2">
            {postMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isHebrew ? 'פרסם משרה' : 'Post Job'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
