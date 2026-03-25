import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Building2, GraduationCap, Lightbulb, Video, Save, Loader2, Eye, Briefcase, X } from 'lucide-react';
import { PhotoUpload } from '@/components/profile/PhotoUpload';

export function RecruiterProfileEditor() {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const isRTL = language === 'he';

  const [industries, setIndustries] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [philosophy, setPhilosophy] = useState('');
  const [background, setBackground] = useState('');
  const [education, setEducation] = useState('');
  const [tip, setTip] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'companies' | 'candidates'>('edit');

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('recruiter_industries, recruiter_companies, recruiter_philosophy, recruiter_background, recruiter_education, recruiter_tip, recruiter_video_url').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        setIndustries((data as any).recruiter_industries || []);
        setCompanies((data as any).recruiter_companies || []);
        setPhilosophy((data as any).recruiter_philosophy || '');
        setBackground((data as any).recruiter_background || '');
        setEducation((data as any).recruiter_education || '');
        setTip((data as any).recruiter_tip || '');
        setVideoUrl((data as any).recruiter_video_url || '');
      }
    });
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        recruiter_industries: industries,
        recruiter_companies: companies,
        recruiter_philosophy: philosophy,
        recruiter_background: background,
        recruiter_education: education,
        recruiter_tip: tip,
        recruiter_video_url: videoUrl,
      } as any).eq('user_id', user.id);
      if (error) throw error;
      toast.success(isRTL ? 'הפרופיל נשמר בהצלחה' : 'Profile saved successfully');
    } catch {
      toast.error(isRTL ? 'שגיאה בשמירה' : 'Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  const addTag = (list: string[], setList: (v: string[]) => void, value: string, setValue: (v: string) => void) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setValue('');
  };

  const removeTag = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  // Preview: Company view
  const renderCompanyPreview = () => (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{profile?.full_name?.charAt(0)?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-bold">{profile?.full_name}</h3>
            <p className="text-sm text-muted-foreground">{(profile as any)?.personal_tagline || (isRTL ? 'מגייסת מקצועית' : 'Professional Recruiter')}</p>
          </div>
        </div>
        {industries.length > 0 && (
          <div><p className="text-sm font-medium mb-2">{isRTL ? 'תעשיות' : 'Industries'}</p><div className="flex flex-wrap gap-1.5">{industries.map((i, idx) => <Badge key={idx} variant="secondary">{i}</Badge>)}</div></div>
        )}
        {companies.length > 0 && (
          <div><p className="text-sm font-medium mb-2">{isRTL ? 'חברות' : 'Companies'}</p><div className="flex flex-wrap gap-1.5">{companies.map((c, idx) => <Badge key={idx} variant="outline">{c}</Badge>)}</div></div>
        )}
        {background && <div><p className="text-sm font-medium mb-1">{isRTL ? 'רקע מקצועי' : 'Professional Background'}</p><p className="text-sm text-muted-foreground">{background}</p></div>}
        {education && <div><p className="text-sm font-medium mb-1">{isRTL ? 'רקע אקדמאי' : 'Education'}</p><p className="text-sm text-muted-foreground">{education}</p></div>}
      </CardContent>
    </Card>
  );

  // Preview: Candidate view
  const renderCandidatePreview = () => (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{profile?.full_name?.charAt(0)?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-bold">{profile?.full_name}</h3>
            <p className="text-sm text-muted-foreground">{(profile as any)?.personal_tagline || (isRTL ? 'מגייסת מקצועית' : 'Professional Recruiter')}</p>
          </div>
        </div>
        {philosophy && (
          <Card className="bg-primary/5 border-primary/20"><CardContent className="p-4"><p className="text-sm font-medium mb-1">{isRTL ? 'הפילוסופיה שלי' : 'My Philosophy'}</p><p className="text-sm text-muted-foreground italic">"{philosophy}"</p></CardContent></Card>
        )}
        {tip && (
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center gap-2 mb-1"><Lightbulb className="w-4 h-4 text-accent" /><p className="text-sm font-medium">{isRTL ? 'טיפ למועמדים' : 'Tip for Candidates'}</p></div>
            <p className="text-sm text-muted-foreground">{tip}</p>
          </div>
        )}
        {videoUrl && <div><p className="text-sm font-medium mb-2">{isRTL ? 'סרטון היכרות' : 'Intro Video'}</p><video src={videoUrl} controls className="w-full rounded-lg max-h-[300px]" /></div>}
        {industries.length > 0 && <div className="flex flex-wrap gap-1.5">{industries.map((i, idx) => <Badge key={idx} variant="secondary">{i}</Badge>)}</div>}
      </CardContent>
    </Card>
  );

  if (previewMode === 'companies') {
    return (
      <div className="space-y-4 max-w-2xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{isRTL ? 'כך חברות רואות אותך' : 'How companies see you'}</h2>
          <Button variant="outline" size="sm" onClick={() => setPreviewMode('edit')}>{isRTL ? 'חזרה לעריכה' : 'Back to edit'}</Button>
        </div>
        {renderCompanyPreview()}
      </div>
    );
  }

  if (previewMode === 'candidates') {
    return (
      <div className="space-y-4 max-w-2xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{isRTL ? 'כך מועמדים רואים אותך' : 'How candidates see you'}</h2>
          <Button variant="outline" size="sm" onClick={() => setPreviewMode('edit')}>{isRTL ? 'חזרה לעריכה' : 'Back to edit'}</Button>
        </div>
        {renderCandidatePreview()}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'} data-tour="recruiter-profile">
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <User className="w-6 h-6 text-primary" />
        {isRTL ? 'הפרופיל שלי' : 'My Profile'}
      </h2>

      {/* Photo Upload */}
      {user && (
        <div className="flex justify-center">
          <PhotoUpload
            userId={user.id}
            currentAvatarUrl={profile?.avatar_url || null}
            userName={profile?.full_name || 'User'}
            onUpload={() => {}}
            size="lg"
          />
        </div>
      )}

      {/* Preview Toggles */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setPreviewMode('companies')}>
          <Eye className="w-4 h-4" />{isRTL ? 'כך חברות רואות אותך' : 'Company view'}
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setPreviewMode('candidates')}>
          <Eye className="w-4 h-4" />{isRTL ? 'כך מועמדים רואים אותך' : 'Candidate view'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-5 space-y-5">
          {/* Industries */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Briefcase className="w-4 h-4" />{isRTL ? 'תעשיות' : 'Industries'}</Label>
            <div className="flex gap-2">
              <Input value={newIndustry} onChange={(e) => setNewIndustry(e.target.value)} placeholder={isRTL ? 'הוסף תעשייה...' : 'Add industry...'} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(industries, setIndustries, newIndustry, setNewIndustry))} />
              <Button variant="outline" size="sm" onClick={() => addTag(industries, setIndustries, newIndustry, setNewIndustry)}>+</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">{industries.map((t, i) => <Badge key={i} variant="secondary" className="gap-1">{t}<button onClick={() => removeTag(industries, setIndustries, i)}><X className="w-3 h-3" /></button></Badge>)}</div>
          </div>

          {/* Companies */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Building2 className="w-4 h-4" />{isRTL ? 'חברות' : 'Companies'}</Label>
            <div className="flex gap-2">
              <Input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder={isRTL ? 'הוסף חברה...' : 'Add company...'} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(companies, setCompanies, newCompany, setNewCompany))} />
              <Button variant="outline" size="sm" onClick={() => addTag(companies, setCompanies, newCompany, setNewCompany)}>+</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">{companies.map((c, i) => <Badge key={i} variant="outline" className="gap-1">{c}<button onClick={() => removeTag(companies, setCompanies, i)}><X className="w-3 h-3" /></button></Badge>)}</div>
          </div>

          {/* Philosophy */}
          <div className="space-y-2">
            <Label>{isRTL ? 'פילוסופיית גיוס' : 'Recruitment Philosophy'}</Label>
            <Textarea value={philosophy} onChange={(e) => setPhilosophy(e.target.value)} placeholder={isRTL ? 'מה את/ה מאמין/ה לגבי תהליך הגיוס...' : 'What do you believe about the recruitment process...'} rows={3} />
          </div>

          {/* Background */}
          <div className="space-y-2">
            <Label>{isRTL ? 'רקע מקצועי' : 'Professional Background'}</Label>
            <Textarea value={background} onChange={(e) => setBackground(e.target.value)} placeholder={isRTL ? 'ספר/י על הניסיון המקצועי שלך...' : 'Tell about your professional experience...'} rows={3} />
          </div>

          {/* Education */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><GraduationCap className="w-4 h-4" />{isRTL ? 'רקע אקדמאי' : 'Education'}</Label>
            <Textarea value={education} onChange={(e) => setEducation(e.target.value)} placeholder={isRTL ? 'תארים והשכלה...' : 'Degrees and education...'} rows={2} />
          </div>

          {/* Tip */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Lightbulb className="w-4 h-4" />{isRTL ? 'טיפ למועמדים' : 'Tip for Candidates'}</Label>
            <Textarea value={tip} onChange={(e) => setTip(e.target.value)} placeholder={isRTL ? 'טיפ שיעזור למועמדים...' : 'A tip that will help candidates...'} rows={2} />
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Video className="w-4 h-4" />{isRTL ? 'סרטון היכרות (URL)' : 'Intro Video (URL)'}</Label>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isRTL ? 'שמור פרופיל' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
