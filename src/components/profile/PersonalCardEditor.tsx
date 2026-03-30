import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PhotoUpload } from './PhotoUpload';
import { IntroVideoUpload } from './IntroVideoUpload';
import { PersonalCardPreview } from './PersonalCardPreview';
import { ResumeUpload } from '@/components/documents/ResumeUpload';
import { User, Sparkles, Eye, Loader2, Save, FileText, Link2, Calendar, Shield, Users2, CreditCard, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';

// Helper text for fields that need explanation
const HELPER_TEXT: Record<string, { he: string; en: string }> = {
  work_authorized: {
    he: 'מגייסים מסננים לפי הרשאת עבודה — מומלץ למלא',
    en: 'Recruiters filter by work authorization — recommended',
  },
  requires_sponsorship: {
    he: 'סמן אם אתה צריך חסות ויזה מהמעסיק',
    en: 'Check if you need visa sponsorship from employer',
  },
  personal_tagline: {
    he: 'מה שמגייסים רואים ראשון — כמו כותרת LinkedIn',
    en: 'What recruiters see first — like a LinkedIn headline',
  },
  about_me: {
    he: 'ספר על עצמך ב-2-3 משפטים. מוצג בכרטיס האישי שלך',
    en: 'Tell about yourself in 2-3 sentences. Shown on your personal card',
  },
  eeo: {
    he: 'מידע זה אופציונלי לחלוטין ולא ישפיע על מועמדותך',
    en: 'This information is completely optional and won\'t affect your candidacy',
  },
  intro_video: {
    he: 'סרטון קצר (עד 60 שניות) שמאפשר למגייסים להכיר אותך',
    en: 'Short video (up to 60s) that lets recruiters get to know you',
  },
  available_start_date: {
    he: 'מתי אתה יכול להתחיל לעבוד?',
    en: 'When can you start working?',
  },
  desired_salary: {
    he: 'ציפיות שכר — מוצג רק לך, לא למגייסים',
    en: 'Salary expectations — visible only to you, not to recruiters',
  },
};

function HelperText({ field, isHebrew }: { field: string; isHebrew: boolean }) {
  const text = HELPER_TEXT[field];
  if (!text) return null;
  return <p className="text-xs text-muted-foreground mt-1">{isHebrew ? text.he : text.en}</p>;
}

// Section completion indicator
function SectionStatus({ filled, total }: { filled: number; total: number }) {
  if (filled === total) {
    return <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />;
  }
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
      {filled}/{total}
    </span>
  );
}

export function PersonalCardEditor() {
  const { user, profile, refreshProfile } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');

  const [formData, setFormData] = useState({
    // Basic
    title: '',
    first_name: '',
    last_name: '',
    first_name_en: '',
    last_name_en: '',
    full_name: '',
    full_name_en: '',
    phone: '',
    email: '',
    gender: '',
    city: '',
    date_of_birth: '',
    is_reservist: false,
    driver_license: false,
    // Card
    personal_tagline: '',
    about_me: '',
    avatar_url: null as string | null,
    intro_video_url: null as string | null,
    portfolio_url: '',
    linkedin_url: '',
    github_url: '',
    // CV & Documents
    cover_letter: '',
    // Availability & Salary
    available_start_date: '',
    desired_salary: '',
    // Legal
    work_authorized: '' as string,
    requires_sponsorship: false,
    // EEO
    race_ethnicity: '',
    veteran_status: '',
    disability_status: '',
  });

  // Track saved data to detect unsaved changes
  const [savedData, setSavedData] = useState(formData);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const setSelect = (field: string) => (v: string) =>
    setFormData(prev => ({ ...prev, [field]: v }));

  const setCheck = (field: string) => (v: boolean | 'indeterminate') =>
    setFormData(prev => ({ ...prev, [field]: !!v }));

  useEffect(() => {
    if (profile) {
      const p = profile as any;
      const data = {
        title: p.title || '',
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        first_name_en: p.first_name_en || '',
        last_name_en: p.last_name_en || '',
        full_name: profile.full_name || '',
        full_name_en: profile.full_name_en || '',
        phone: p.phone || '',
        email: profile.email || '',
        gender: p.gender || '',
        city: p.city || '',
        date_of_birth: p.date_of_birth || '',
        is_reservist: p.is_reservist || false,
        driver_license: p.driver_license || false,
        personal_tagline: p.personal_tagline || '',
        about_me: p.about_me || '',
        avatar_url: profile.avatar_url || null,
        intro_video_url: p.intro_video_url || null,
        portfolio_url: p.portfolio_url || '',
        linkedin_url: p.linkedin_url || '',
        github_url: p.github_url || '',
        cover_letter: p.cover_letter || '',
        available_start_date: p.available_start_date || '',
        desired_salary: p.desired_salary || '',
        work_authorized: p.work_authorized === null || p.work_authorized === undefined ? '' : String(p.work_authorized),
        requires_sponsorship: p.requires_sponsorship || false,
        race_ethnicity: p.race_ethnicity || '',
        veteran_status: p.veteran_status || '',
        disability_status: p.disability_status || '',
      };
      setFormData(data);
      setSavedData(data);
    }
  }, [profile]);

  // Fetch video signed URL if needed
  useEffect(() => {
    const fetchVideoUrl = async () => {
      const videoPath = (profile as any)?.intro_video_url;
      if (videoPath && videoPath.startsWith('profile-videos/')) {
        const filePath = videoPath.replace('profile-videos/', '');
        const { data } = await supabase.storage
          .from('profile-videos')
          .createSignedUrl(filePath, 60 * 60);
        if (data?.signedUrl) {
          setFormData(prev => ({ ...prev, intro_video_url: data.signedUrl }));
        }
      }
    };
    fetchVideoUrl();
  }, [profile]);

  // Detect unsaved changes
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(savedData);
  }, [formData, savedData]);

  // Section completion stats
  const sectionStats = useMemo(() => {
    const personal = {
      filled: [formData.full_name, formData.phone, formData.city, formData.avatar_url].filter(Boolean).length,
      total: 4,
    };
    const docs = {
      filled: [formData.cover_letter].filter(Boolean).length,
      total: 1,
    };
    const links = {
      filled: [formData.linkedin_url, formData.github_url, formData.portfolio_url].filter(Boolean).length,
      total: 3,
    };
    const availability = {
      filled: [formData.available_start_date, formData.desired_salary].filter(Boolean).length,
      total: 2,
    };
    const legal = {
      filled: [formData.work_authorized].filter(Boolean).length,
      total: 1,
    };
    const eeo = {
      filled: [formData.race_ethnicity, formData.veteran_status, formData.disability_status].filter(Boolean).length,
      total: 3,
    };
    const card = {
      filled: [formData.personal_tagline, formData.about_me].filter(Boolean).length,
      total: 2,
    };
    return { personal, docs, links, availability, legal, eeo, card };
  }, [formData]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const workAuth = formData.work_authorized === 'true' ? true
        : formData.work_authorized === 'false' ? false : null;

      const { error } = await supabase
        .from('profiles')
        .update({
          title: formData.title || null,
          first_name: formData.first_name || null,
          last_name: formData.last_name || null,
          first_name_en: formData.first_name_en || null,
          last_name_en: formData.last_name_en || null,
          full_name: formData.full_name,
          full_name_en: formData.full_name_en || null,
          phone: formData.phone || null,
          gender: formData.gender || null,
          city: formData.city || null,
          date_of_birth: formData.date_of_birth || null,
          is_reservist: formData.is_reservist,
          driver_license: formData.driver_license,
          personal_tagline: formData.personal_tagline || null,
          about_me: formData.about_me || null,
          portfolio_url: formData.portfolio_url || null,
          linkedin_url: formData.linkedin_url || null,
          github_url: formData.github_url || null,
          cover_letter: formData.cover_letter || null,
          available_start_date: formData.available_start_date || null,
          desired_salary: formData.desired_salary || null,
          work_authorized: workAuth,
          requires_sponsorship: formData.requires_sponsorship,
          race_ethnicity: formData.race_ethnicity || null,
          veteran_status: formData.veteran_status || null,
          disability_status: formData.disability_status || null,
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;
      await refreshProfile();
      setSavedData(formData);
      toast.success(isHebrew ? 'הפרופיל נשמר!' : 'Profile saved!');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      toast.error(`שגיאה: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(savedData);
  };

  if (!user) return null;

  return (
    <Card className="bg-card border-border" dir={isHebrew ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {isHebrew ? 'הפרופיל שלי' : 'My Profile'}
        </CardTitle>
        <CardDescription>
          {isHebrew
            ? 'פרטים שישמשו למילוי טפסי הגשת מועמדות אוטומטית'
            : 'Details used for automatic job application form filling'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="edit" className="gap-2">
              <Sparkles className="w-4 h-4" />
              {isHebrew ? 'עריכה' : 'Edit'}
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="w-4 h-4" />
              {isHebrew ? 'תצוגה מקדימה' : 'Preview'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit">
            <Accordion type="multiple" defaultValue={['personal']} className="w-full">

              {/* ── Section 1: Personal Info ── */}
              <AccordionItem value="personal">
                <AccordionTrigger className="hover:no-underline gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <User className="w-4 h-4 text-primary" />
                    <span>{isHebrew ? 'פרטים אישיים' : 'Personal Information'}</span>
                  </div>
                  <SectionStatus {...sectionStats.personal} />
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  {/* Photo */}
                  <div className="flex flex-col items-center pb-4">
                    <PhotoUpload
                      userId={user.id}
                      currentAvatarUrl={formData.avatar_url}
                      userName={formData.full_name}
                      onUpload={(url) => setFormData(prev => ({ ...prev, avatar_url: url }))}
                    />
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <Label>{isHebrew ? 'פנייה' : 'Title'}</Label>
                    <Select value={formData.title} onValueChange={setSelect('title')}>
                      <SelectTrigger>
                        <SelectValue placeholder={isHebrew ? 'בחר/י פנייה' : 'Select title'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mr">{isHebrew ? 'מר (Mr.)' : 'Mr.'}</SelectItem>
                        <SelectItem value="mrs">{isHebrew ? 'גברת (Mrs.)' : 'Mrs.'}</SelectItem>
                        <SelectItem value="ms">{isHebrew ? 'גברת (Ms.)' : 'Ms.'}</SelectItem>
                        <SelectItem value="dr">{isHebrew ? 'ד"ר (Dr.)' : 'Dr.'}</SelectItem>
                        <SelectItem value="prof">{isHebrew ? "פרופ' (Prof.)" : 'Prof.'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Hebrew names */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">{isHebrew ? 'שם פרטי (עברית)' : 'First Name (Hebrew)'}</Label>
                      <Input id="first_name" value={formData.first_name} onChange={set('first_name')} placeholder={isHebrew ? 'ישראל' : 'Israel'} dir="rtl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">{isHebrew ? 'שם משפחה (עברית)' : 'Last Name (Hebrew)'}</Label>
                      <Input id="last_name" value={formData.last_name} onChange={set('last_name')} placeholder={isHebrew ? 'ישראלי' : 'Israeli'} dir="rtl" />
                    </div>
                  </div>

                  {/* English names */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first_name_en">{isHebrew ? 'שם פרטי (אנגלית)' : 'First Name (English)'}</Label>
                      <Input id="first_name_en" value={formData.first_name_en} onChange={set('first_name_en')} placeholder="Israel" dir="ltr" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name_en">{isHebrew ? 'שם משפחה (אנגלית)' : 'Last Name (English)'}</Label>
                      <Input id="last_name_en" value={formData.last_name_en} onChange={set('last_name_en')} placeholder="Israeli" dir="ltr" />
                    </div>
                  </div>

                  {/* Full names */}
                  <div className="space-y-2">
                    <Label htmlFor="full_name">{isHebrew ? 'שם מלא (עברית)' : 'Full Name (Hebrew)'}</Label>
                    <Input id="full_name" value={formData.full_name} onChange={set('full_name')} placeholder={isHebrew ? 'ישראל ישראלי' : 'Israel Israeli'} dir="rtl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name_en">{isHebrew ? 'שם מלא (אנגלית)' : 'Full Name (English)'}</Label>
                    <Input id="full_name_en" value={formData.full_name_en} onChange={set('full_name_en')} placeholder="Israel Israeli" dir="ltr" />
                  </div>

                  {/* Phone / Email */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">{isHebrew ? 'טלפון' : 'Phone'}</Label>
                      <Input id="phone" type="tel" value={formData.phone} onChange={set('phone')} placeholder="050-0000000" dir="ltr" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{isHebrew ? 'אימייל' : 'Email'}</Label>
                      <Input id="email" type="email" value={formData.email} disabled className="bg-muted" dir="ltr" />
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <Label>{isHebrew ? 'מגדר' : 'Gender'}</Label>
                    <Select value={formData.gender} onValueChange={setSelect('gender')}>
                      <SelectTrigger>
                        <SelectValue placeholder={isHebrew ? 'בחר/י' : 'Select'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{isHebrew ? 'זכר (He/Him)' : 'Male (He/Him)'}</SelectItem>
                        <SelectItem value="female">{isHebrew ? 'נקבה (She/Her)' : 'Female (She/Her)'}</SelectItem>
                        <SelectItem value="other">{isHebrew ? 'אחר' : 'Other'}</SelectItem>
                        <SelectItem value="prefer_not">{isHebrew ? 'מעדיף/ה לא לציין' : 'Prefer not to say'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* City / DOB */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="city">{isHebrew ? 'עיר מגורים' : 'City'}</Label>
                      <Input id="city" value={formData.city} onChange={set('city')} placeholder={isHebrew ? 'תל אביב' : 'Tel Aviv'} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">{isHebrew ? 'תאריך לידה' : 'Date of Birth'}</Label>
                      <Input id="date_of_birth" type="date" value={formData.date_of_birth} onChange={set('date_of_birth')} dir="ltr" />
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Checkbox id="is_reservist" checked={formData.is_reservist} onCheckedChange={setCheck('is_reservist')} />
                      <Label htmlFor="is_reservist" className="cursor-pointer">{isHebrew ? 'חייל/ת מילואים פעיל/ה' : 'Active Reservist Soldier'}</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox id="driver_license" checked={formData.driver_license} onCheckedChange={setCheck('driver_license')} />
                      <Label htmlFor="driver_license" className="cursor-pointer">{isHebrew ? "בעל/ת רישיון נהיגה" : "Driver's License"}</Label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── Section 2: Documents ── */}
              <AccordionItem value="documents">
                <AccordionTrigger className="hover:no-underline gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>{isHebrew ? 'מסמכים' : 'Documents'}</span>
                  </div>
                  <SectionStatus {...sectionStats.docs} />
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>{isHebrew ? 'קורות חיים (PDF/Word)' : 'Resume / CV (PDF/Word)'}</Label>
                    <ResumeUpload />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cover_letter">{isHebrew ? 'מכתב מקדים (ברירת מחדל)' : 'Cover Letter (default)'}</Label>
                    <Textarea
                      id="cover_letter"
                      value={formData.cover_letter}
                      onChange={set('cover_letter')}
                      placeholder={isHebrew ? 'מכתב מקדים כללי שיוגש עם קורות החיים...' : 'A general cover letter to submit with applications...'}
                      rows={5}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── Section 3: Professional Links ── */}
              <AccordionItem value="links">
                <AccordionTrigger className="hover:no-underline gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Link2 className="w-4 h-4 text-primary" />
                    <span>{isHebrew ? 'לינקים מקצועיים' : 'Professional Links'}</span>
                  </div>
                  <SectionStatus {...sectionStats.links} />
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid gap-4 sm:grid-cols-1">
                    <div className="space-y-2">
                      <Label htmlFor="linkedin_url">LinkedIn</Label>
                      <Input id="linkedin_url" type="url" value={formData.linkedin_url} onChange={set('linkedin_url')} placeholder="https://linkedin.com/in/..." dir="ltr" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="github_url">GitHub</Label>
                      <Input id="github_url" type="url" value={formData.github_url} onChange={set('github_url')} placeholder="https://github.com/..." dir="ltr" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portfolio_url">Portfolio</Label>
                      <Input id="portfolio_url" type="url" value={formData.portfolio_url} onChange={set('portfolio_url')} placeholder="https://" dir="ltr" />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── Section 4: Availability & Salary ── */}
              <AccordionItem value="availability">
                <AccordionTrigger className="hover:no-underline gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>{isHebrew ? 'זמינות ושכר' : 'Availability & Salary'}</span>
                  </div>
                  <SectionStatus {...sectionStats.availability} />
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="available_start_date">{isHebrew ? 'תאריך התחלה אפשרי' : 'Available Start Date'}</Label>
                      <Input id="available_start_date" type="date" value={formData.available_start_date} onChange={set('available_start_date')} dir="ltr" />
                      <HelperText field="available_start_date" isHebrew={isHebrew} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="desired_salary">{isHebrew ? 'ציפיות שכר' : 'Desired Salary'}</Label>
                      <Input id="desired_salary" value={formData.desired_salary} onChange={set('desired_salary')} placeholder={isHebrew ? '20,000–25,000 ₪' : '$80,000–$100,000'} dir="ltr" />
                      <HelperText field="desired_salary" isHebrew={isHebrew} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── Section 5: Work Authorization ── */}
              <AccordionItem value="legal">
                <AccordionTrigger className="hover:no-underline gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>{isHebrew ? 'הרשאת עבודה' : 'Work Authorization'}</span>
                  </div>
                  <SectionStatus {...sectionStats.legal} />
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{isHebrew ? 'האם יש לך אישור עבודה חוקי?' : 'Legally authorized to work?'}</Label>
                      <Select value={formData.work_authorized} onValueChange={setSelect('work_authorized')}>
                        <SelectTrigger>
                          <SelectValue placeholder={isHebrew ? 'בחר/י' : 'Select'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">{isHebrew ? 'כן' : 'Yes'}</SelectItem>
                          <SelectItem value="false">{isHebrew ? 'לא' : 'No'}</SelectItem>
                        </SelectContent>
                      </Select>
                      <HelperText field="work_authorized" isHebrew={isHebrew} />
                    </div>
                    <div className="space-y-2">
                      <Label>{isHebrew ? 'האם תזדקק לספונסרשיפ לויזה?' : 'Will you require visa sponsorship?'}</Label>
                      <div className="flex items-center gap-3 h-10">
                        <Checkbox id="requires_sponsorship" checked={formData.requires_sponsorship} onCheckedChange={setCheck('requires_sponsorship')} />
                        <Label htmlFor="requires_sponsorship" className="cursor-pointer font-normal">
                          {isHebrew ? 'כן, אני צריך/ה ספונסרשיפ' : 'Yes, I require sponsorship'}
                        </Label>
                      </div>
                      <HelperText field="requires_sponsorship" isHebrew={isHebrew} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── Section 6: EEO (Voluntary) ── */}
              <AccordionItem value="eeo">
                <AccordionTrigger className="hover:no-underline gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Users2 className="w-4 h-4 text-primary" />
                    <span>{isHebrew ? 'מידע רגולטורי (רשות)' : 'EEO (Voluntary)'}</span>
                  </div>
                  <SectionStatus {...sectionStats.eeo} />
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    <HelperText field="eeo" isHebrew={isHebrew} />
                  </p>
                  <div className="space-y-2">
                    <Label>{isHebrew ? 'מוצא / גזע (EEO)' : 'Race / Ethnicity (EEO)'}</Label>
                    <Select value={formData.race_ethnicity} onValueChange={setSelect('race_ethnicity')}>
                      <SelectTrigger>
                        <SelectValue placeholder={isHebrew ? 'בחר/י (רשות)' : 'Select (optional)'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="white">{isHebrew ? 'לבן/ה' : 'White'}</SelectItem>
                        <SelectItem value="hispanic">{isHebrew ? 'היספני/ת' : 'Hispanic or Latino'}</SelectItem>
                        <SelectItem value="black">{isHebrew ? 'שחור/ה' : 'Black or African American'}</SelectItem>
                        <SelectItem value="asian">{isHebrew ? 'אסייתי/ת' : 'Asian'}</SelectItem>
                        <SelectItem value="native">{isHebrew ? 'ילידי/ת' : 'Native American'}</SelectItem>
                        <SelectItem value="two_or_more">{isHebrew ? 'שתי קבוצות ומעלה' : 'Two or more races'}</SelectItem>
                        <SelectItem value="other">{isHebrew ? 'אחר' : 'Other'}</SelectItem>
                        <SelectItem value="prefer_not">{isHebrew ? 'מעדיף/ה לא לציין' : 'Prefer not to say'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{isHebrew ? 'סטטוס ותיק צבאי' : 'Veteran Status'}</Label>
                    <Select value={formData.veteran_status} onValueChange={setSelect('veteran_status')}>
                      <SelectTrigger>
                        <SelectValue placeholder={isHebrew ? 'בחר/י (רשות)' : 'Select (optional)'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_veteran">{isHebrew ? 'לא ותיק/ה' : 'Not a veteran'}</SelectItem>
                        <SelectItem value="veteran">{isHebrew ? 'ותיק/ה' : 'Veteran'}</SelectItem>
                        <SelectItem value="disabled_veteran">{isHebrew ? 'ותיק/ה עם מוגבלות' : 'Disabled veteran'}</SelectItem>
                        <SelectItem value="prefer_not">{isHebrew ? 'מעדיף/ה לא לציין' : 'Prefer not to say'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{isHebrew ? 'סטטוס מוגבלות' : 'Disability Status'}</Label>
                    <Select value={formData.disability_status} onValueChange={setSelect('disability_status')}>
                      <SelectTrigger>
                        <SelectValue placeholder={isHebrew ? 'בחר/י (רשות)' : 'Select (optional)'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">{isHebrew ? 'אין מוגבלות' : 'No disability'}</SelectItem>
                        <SelectItem value="yes">{isHebrew ? 'יש מוגבלות' : 'Yes, I have a disability'}</SelectItem>
                        <SelectItem value="prefer_not">{isHebrew ? 'מעדיף/ה לא לציין' : 'Prefer not to say'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── Section 7: Personal Card (Public) ── */}
              <AccordionItem value="card">
                <AccordionTrigger className="hover:no-underline gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <span>{isHebrew ? 'הכרטיס האישי (ציבורי)' : 'Personal Card (Public)'}</span>
                  </div>
                  <SectionStatus {...sectionStats.card} />
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="personal_tagline">{isHebrew ? 'כותרת אישית' : 'Personal Tagline'}</Label>
                    <Input
                      id="personal_tagline"
                      value={formData.personal_tagline}
                      onChange={set('personal_tagline')}
                      placeholder={isHebrew ? '"חובב טיולים, אוהב אתגרים, תמיד מחפש ללמוד"' : '"Adventure seeker, lifelong learner"'}
                      maxLength={100}
                    />
                    <div className="flex items-center justify-between">
                      <HelperText field="personal_tagline" isHebrew={isHebrew} />
                      <span className="text-xs text-muted-foreground">{formData.personal_tagline.length}/100</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="about_me">{isHebrew ? 'כמה מילים על עצמי' : 'A Few Words About Me'}</Label>
                    <Textarea
                      id="about_me"
                      value={formData.about_me}
                      onChange={set('about_me')}
                      placeholder={isHebrew ? 'ספר/י על עצמך, על התחביבים שלך...' : 'Tell us about yourself, your hobbies...'}
                      rows={4}
                      maxLength={500}
                    />
                    <div className="flex items-center justify-between">
                      <HelperText field="about_me" isHebrew={isHebrew} />
                      <span className="text-xs text-muted-foreground">{formData.about_me.length}/500</span>
                    </div>
                  </div>

                  {/* Video */}
                  <div className="space-y-2">
                    <Label>{isHebrew ? 'סרטון היכרות (אופציונלי)' : 'Introduction Video (optional)'}</Label>
                    <HelperText field="intro_video" isHebrew={isHebrew} />
                    <IntroVideoUpload
                      userId={user.id}
                      currentVideoUrl={formData.intro_video_url}
                      onUpload={(url) => setFormData(prev => ({ ...prev, intro_video_url: url }))}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="preview">
            <PersonalCardPreview
              profile={formData}
              showActions={false}
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* ── Sticky Save Bar ── */}
      {isDirty && (
        <div className="sticky bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {isHebrew ? 'יש שינויים שלא נשמרו' : 'You have unsaved changes'}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} className="gap-1.5">
              <X className="w-3.5 h-3.5" />
              {isHebrew ? 'ביטול' : 'Cancel'}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isHebrew ? 'שמור שינויים' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
