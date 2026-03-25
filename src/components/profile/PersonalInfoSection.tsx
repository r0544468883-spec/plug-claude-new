import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PhotoUpload } from '@/components/profile/PhotoUpload';
import { ResumeUpload } from '@/components/documents/ResumeUpload';
import { User, Mail, Phone, Link, Loader2, Save, Send, Linkedin, Github, Globe } from 'lucide-react';

export function PersonalInfoSection() {
  const { user, profile, refreshProfile } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [isSaving, setIsSaving] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    full_name_en: '',
    phone: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        full_name_en: profile.full_name_en || '',
        phone: profile.phone || '',
        linkedin_url: profile.linkedin_url || '',
        github_url: profile.github_url || '',
        portfolio_url: profile.portfolio_url || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          full_name_en: form.full_name_en || null,
          phone: form.phone || null,
          linkedin_url: form.linkedin_url || null,
          github_url: form.github_url || null,
          portfolio_url: form.portfolio_url || null,
        } as any)
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success(isHebrew ? 'הפרטים נשמרו בהצלחה!' : 'Details saved successfully!');
      await refreshProfile();
    } catch {
      toast.error(isHebrew ? 'שגיאה בשמירת הפרטים' : 'Failed to save details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      toast.error(isHebrew ? 'נא להזין כתובת אימייל תקינה' : 'Please enter a valid email address');
      return;
    }
    setIsChangingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      toast.success(isHebrew
        ? 'נשלח קישור אימות לאימייל החדש'
        : 'Verification link sent to your new email');
      setNewEmail('');
    } catch (err: any) {
      toast.error(err.message || (isHebrew ? 'שגיאה בשינוי האימייל' : 'Failed to change email'));
    } finally {
      setIsChangingEmail(false);
    }
  };

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {isHebrew ? 'פרטים אישיים' : 'Personal Information'}
        </CardTitle>
        <CardDescription>
          {isHebrew
            ? 'הפרטים שישמשו לשליחת קורות חיים אוטומטית'
            : 'Details used for automatic CV submission'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Photo */}
        {user && (
          <PhotoUpload
            userId={user.id}
            currentAvatarUrl={profile?.avatar_url || null}
            userName={form.full_name || 'User'}
            onUpload={() => refreshProfile()}
            size="md"
          />
        )}

        <Separator />

        {/* Name */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {isHebrew ? 'שם מלא (עברית)' : 'Full Name (Hebrew)'}
            </Label>
            <Input
              value={form.full_name}
              onChange={set('full_name')}
              placeholder={isHebrew ? 'ישראל ישראלי' : 'Israel Israeli'}
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {isHebrew ? 'שם מלא (אנגלית)' : 'Full Name (English)'}
            </Label>
            <Input
              value={form.full_name_en}
              onChange={set('full_name_en')}
              placeholder="Israel Israeli"
              dir="ltr"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            {isHebrew ? 'טלפון' : 'Phone'}
          </Label>
          <Input
            value={form.phone}
            onChange={set('phone')}
            placeholder="050-0000000"
            type="tel"
            dir="ltr"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            {isHebrew ? 'אימייל' : 'Email'}
          </Label>
          <Input
            value={profile?.email || user?.email || ''}
            disabled
            className="bg-muted"
            dir="ltr"
          />
          <div className="flex gap-2">
            <Input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={isHebrew ? 'אימייל חדש לשינוי' : 'New email to change'}
              type="email"
              dir="ltr"
            />
            <Button
              variant="outline"
              onClick={handleEmailChange}
              disabled={isChangingEmail || !newEmail.trim()}
              className="shrink-0 gap-2"
            >
              {isChangingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isHebrew ? 'שנה' : 'Change'}
            </Button>
          </div>
        </div>

        <Separator />

        {/* CV Upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-base font-medium">
            <User className="w-4 h-4" />
            {isHebrew ? 'קורות חיים' : 'Resume / CV'}
          </Label>
          <ResumeUpload />
        </div>

        <Separator />

        {/* External Links */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2 text-base font-medium">
            <Link className="w-4 h-4" />
            {isHebrew ? 'קישורים חיצוניים' : 'External Links'}
          </Label>

          <div className="grid gap-3">
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </Label>
              <Input
                value={form.linkedin_url}
                onChange={set('linkedin_url')}
                placeholder="https://linkedin.com/in/..."
                type="url"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Github className="w-4 h-4" />
                GitHub
              </Label>
              <Input
                value={form.github_url}
                onChange={set('github_url')}
                placeholder="https://github.com/..."
                type="url"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="w-4 h-4" />
                {isHebrew ? 'אתר אישי / פורטפוליו' : 'Personal Website / Portfolio'}
              </Label>
              <Input
                value={form.portfolio_url}
                onChange={set('portfolio_url')}
                placeholder="https://..."
                type="url"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="gap-2 w-full sm:w-auto">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isHebrew ? 'שמור פרטים' : 'Save Details'}
        </Button>
      </CardContent>
    </Card>
  );
}
