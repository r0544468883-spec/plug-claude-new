import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Upload, X, Tag, Lock, Pencil, Building2, Briefcase } from 'lucide-react';

interface CreateAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editTemplate?: { id: string; title: string; description: string; tags?: string[]; difficulty: string | null; estimated_hours: number | null; deadline?: string | null; access_mode?: 'public' | 'request_only'; company_name?: string | null; domain?: string | null; };
}

const SUGGESTED_SKILLS = [
  'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'SQL', 'Figma',
  'Product', 'Data Analysis', 'UX Design', 'Vue', 'Next.js', 'Docker', 'AWS',
];

export function CreateAssignmentDialog({ open, onOpenChange, onSuccess, editTemplate }: CreateAssignmentDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [deadline, setDeadline] = useState('');
  const [accessMode, setAccessMode] = useState<'public' | 'request_only'>('public');
  const [companyName, setCompanyName] = useState('');
  const [domain, setDomain] = useState('');
  const [briefFile, setBriefFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>(SUGGESTED_SKILLS);
  const [userIsVisible, setUserIsVisible] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!editTemplate;

  // Populate form when editing
  useEffect(() => {
    if (!open || !editTemplate) return;
    setTitle(editTemplate.title);
    setDescription(editTemplate.description);
    setTags(editTemplate.tags ?? []);
    setDifficulty(editTemplate.difficulty ?? '');
    setEstimatedHours(editTemplate.estimated_hours?.toString() ?? '');
    setDeadline(editTemplate.deadline ?? '');
    setAccessMode(editTemplate.access_mode ?? 'public');
    setCompanyName(editTemplate.company_name ?? '');
    setDomain(editTemplate.domain ?? '');
  }, [open, editTemplate?.id]);

  // Fetch user profile skills + visibility
  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from('profiles')
      .select('cv_data, visible_to_hr, role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const profileSkills: string[] = [
          ...((data?.cv_data as any)?.skills?.technical ?? []),
          ...((data?.cv_data as any)?.skills?.soft ?? []),
        ].filter(Boolean);
        const merged = [...new Set([...profileSkills, ...SUGGESTED_SKILLS])].slice(0, 20);
        setSuggestedTags(merged);

        const isVisible = (data as any)?.visible_to_hr !== false;
        const role = (data as any)?.role;
        const isHR = role && role !== 'job_seeker';
        setUserIsVisible(isVisible || isHR);
        // Default access_mode based on visibility
        setAccessMode(isVisible || isHR ? 'public' : 'request_only');
      });
  }, [open, user]);

  const reset = () => {
    setTitle(''); setDescription(''); setTags([]); setTagInput('');
    setDifficulty(''); setEstimatedHours(''); setDeadline('');
    setAccessMode('public'); setBriefFile(null);
    setCompanyName(''); setDomain('');
  };

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t || tags.includes(t) || tags.length >= 8) return;
    setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleSubmit = async () => {
    if (!user || !title.trim() || !description.trim()) return;
    setIsSubmitting(true);
    try {
      let fileUrl: string | null = null;

      if (briefFile) {
        const ext = briefFile.name.split('.').pop();
        const path = `templates/${crypto.randomUUID()}/brief.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('home-assignments')
          .upload(path, briefFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = await supabase.storage
          .from('home-assignments')
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        fileUrl = urlData?.signedUrl ?? null;
      }

      const payload: Record<string, any> = {
        title: title.trim(),
        description: description.trim(),
        difficulty: difficulty || null,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
      };

      if (tags.length > 0) payload.tags = tags;
      if (deadline) payload.deadline = deadline;
      if (accessMode !== 'public') payload.access_mode = accessMode;
      if (companyName.trim()) payload.company_name = companyName.trim();
      if (domain.trim()) payload.domain = domain.trim();

      if (isEdit && editTemplate) {
        // Update existing
        if (fileUrl) payload.file_url = fileUrl;
        const { error } = await supabase
          .from('assignment_templates' as any)
          .update(payload)
          .eq('id', editTemplate.id);
        if (error) throw error;
        toast.success(isHebrew ? 'המטלה עודכנה!' : 'Assignment updated!');
      } else {
        // Create new
        payload.created_by = user.id;
        payload.file_url = fileUrl;
        const { data: newAssignment, error } = await supabase
          .from('assignment_templates' as any)
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;

        // Notify followers
        const { data: followers } = await supabase
          .from('follows' as any)
          .select('follower_id')
          .eq('followed_user_id', user.id);

        if (followers && (followers as any[]).length > 0) {
          await supabase.from('notifications' as any).insert(
            (followers as any[]).map(f => ({
              user_id: f.follower_id,
              type: 'new_assignment',
              title: isHebrew ? 'מטלה חדשה מאדם שאתה עוקב' : 'New assignment posted',
              message: isHebrew
                ? `פרסם/ה מטלה: "${title.trim()}"`
                : `Posted a new assignment: "${title.trim()}"`,
              metadata: { assignment_id: (newAssignment as any)?.id, path: '/assignments' },
            }))
          ).catch(() => {});
        }
        toast.success(isHebrew ? 'המטלה פורסמה בהצלחה!' : 'Assignment published!');
      }
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || '';
      toast.error(isHebrew ? `שגיאה בפרסום המטלה: ${msg}` : `Failed to publish assignment: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
            {isEdit
              ? (isHebrew ? 'עריכת מטלה' : 'Edit Assignment')
              : (isHebrew ? 'פרסם מטלה' : 'Publish Assignment')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label>{isHebrew ? 'כותרת *' : 'Title *'}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isHebrew ? 'למשל: אתגר React Performance' : 'e.g. React Performance Challenge'}
            />
          </div>

          {/* Company + Domain */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                {isHebrew ? 'שם חברה' : 'Company Name'}
              </Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={isHebrew ? 'למשל: Google' : 'e.g. Google'}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                {isHebrew ? 'תחום' : 'Domain'}
              </Label>
              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger>
                  <SelectValue placeholder={isHebrew ? 'בחר תחום...' : 'Select domain...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="frontend">{isHebrew ? 'פרונטאנד' : 'Frontend'}</SelectItem>
                  <SelectItem value="backend">{isHebrew ? 'בקאנד' : 'Backend'}</SelectItem>
                  <SelectItem value="fullstack">{isHebrew ? 'פולסטאק' : 'Full Stack'}</SelectItem>
                  <SelectItem value="data">{isHebrew ? 'דאטה' : 'Data'}</SelectItem>
                  <SelectItem value="devops">{isHebrew ? 'דבאופס' : 'DevOps'}</SelectItem>
                  <SelectItem value="design">{isHebrew ? 'עיצוב' : 'Design'}</SelectItem>
                  <SelectItem value="product">{isHebrew ? 'מוצר' : 'Product'}</SelectItem>
                  <SelectItem value="mobile">{isHebrew ? 'מובייל' : 'Mobile'}</SelectItem>
                  <SelectItem value="qa">{isHebrew ? 'בדיקות' : 'QA'}</SelectItem>
                  <SelectItem value="security">{isHebrew ? 'אבטחה' : 'Security'}</SelectItem>
                  <SelectItem value="ai_ml">{isHebrew ? 'AI / למידת מכונה' : 'AI / Machine Learning'}</SelectItem>
                  <SelectItem value="blockchain">{isHebrew ? 'בלוקצ׳יין' : 'Blockchain'}</SelectItem>
                  <SelectItem value="embedded">{isHebrew ? 'מערכות משובצות' : 'Embedded Systems'}</SelectItem>
                  <SelectItem value="gaming">{isHebrew ? 'גיימינג' : 'Gaming'}</SelectItem>
                  <SelectItem value="cloud">{isHebrew ? 'ענן' : 'Cloud'}</SelectItem>
                  <SelectItem value="marketing">{isHebrew ? 'שיווק' : 'Marketing'}</SelectItem>
                  <SelectItem value="hr">{isHebrew ? 'משאבי אנוש' : 'HR'}</SelectItem>
                  <SelectItem value="finance">{isHebrew ? 'פיננסים' : 'Finance'}</SelectItem>
                  <SelectItem value="other">{isHebrew ? 'אחר' : 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>{isHebrew ? 'תיאור המטלה *' : 'Assignment Description *'}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isHebrew ? 'תאר את המטלה, מה מצופה מהמועמד...' : 'Describe the task, what is expected...'}
              rows={4}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              {isHebrew ? 'תגיות / כישורים' : 'Tags / Skills'}
            </Label>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1 pe-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              placeholder={isHebrew ? 'הקלד כישור ולחץ Enter...' : 'Type a skill and press Enter...'}
              disabled={tags.length >= 8}
            />

            <div className="flex flex-wrap gap-1.5">
              {suggestedTags
                .filter(s => !tags.includes(s))
                .slice(0, 10)
                .map(s => (
                  <button
                    key={s}
                    onClick={() => addTag(s)}
                    disabled={tags.length >= 8}
                    className="px-2 py-0.5 rounded-full text-xs border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
                  >
                    + {s}
                  </button>
                ))}
            </div>
          </div>

          {/* Difficulty + Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isHebrew ? 'רמת קושי' : 'Difficulty'}</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder={isHebrew ? 'בחר...' : 'Select...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{isHebrew ? 'קל' : 'Easy'}</SelectItem>
                  <SelectItem value="medium">{isHebrew ? 'בינוני' : 'Medium'}</SelectItem>
                  <SelectItem value="hard">{isHebrew ? 'קשה' : 'Hard'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{isHebrew ? 'זמן משוער (שעות)' : 'Est. Time (hours)'}</Label>
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder={isHebrew ? 'למשל: 3' : 'e.g. 3'}
              />
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-1.5">
            <Label>{isHebrew ? 'דדליין (אופציונלי)' : 'Deadline (optional)'}</Label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Access mode toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p>{isHebrew ? 'דרוש אישור גישה' : 'Require access approval'}</p>
                <p className="text-xs text-muted-foreground">
                  {isHebrew
                    ? 'מועמדים יצטרכו לבקש גישה לפני הגשת פתרון'
                    : 'Candidates must request access before submitting'}
                </p>
              </div>
            </div>
            <Switch
              checked={accessMode === 'request_only'}
              onCheckedChange={v => setAccessMode(v ? 'request_only' : 'public')}
            />
          </div>

          {!userIsVisible && (
            <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
              {isHebrew
                ? 'הפרופיל שלך לא גלוי למגייסים — המטלה תוצג בגישה מוגבלת'
                : 'Your profile is not visible to recruiters — assignment will require access approval'}
            </p>
          )}

          {/* Brief file */}
          <div className="space-y-1.5">
            <Label>{isHebrew ? 'קובץ בריף (אופציונלי)' : 'Brief File (optional)'}</Label>
            {briefFile ? (
              <div className="flex items-center gap-2 p-2.5 border rounded-lg bg-muted/50">
                <span className="text-sm flex-1 truncate">{briefFile.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setBriefFile(null)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4" />
                {isHebrew ? 'העלה קובץ בריף' : 'Upload Brief File'}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.md"
              onChange={(e) => setBriefFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !description.trim()}
            className="w-full gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isEdit
              ? (isHebrew ? 'שמור שינויים' : 'Save Changes')
              : (isHebrew ? 'פרסם מטלה' : 'Publish Assignment')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
