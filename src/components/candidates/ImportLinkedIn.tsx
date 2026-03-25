import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Linkedin, Import, User, MapPin, Briefcase, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LinkedInProfile {
  full_name: string;
  title: string;
  location: string;
  summary: string;
  skills: string[];
  experience: { company: string; role: string; duration: string }[];
}

interface ImportLinkedInProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ImportLinkedIn({ open: externalOpen, onOpenChange: externalOnOpenChange }: ImportLinkedInProps = {}) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (val: boolean) => {
    setInternalOpen(val);
    externalOnOpenChange?.(val);
  };
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isValidLinkedInUrl = (u: string) =>
    /linkedin\.com\/in\/[a-zA-Z0-9\-_]+/.test(u);

  const handleImport = async () => {
    if (!isValidLinkedInUrl(url)) {
      toast.error(isHebrew ? 'כתובת URL לא תקינה — חייבת להיות linkedin.com/in/...' : 'Invalid URL — must be linkedin.com/in/...');
      return;
    }

    setIsLoading(true);
    setProfile(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-linkedin-profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ linkedin_url: url }),
        }
      );

      if (!res.ok) throw new Error('Failed to import');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProfile(data);
    } catch (err) {
      toast.error(isHebrew ? 'שגיאה בייבוא הפרופיל' : 'Failed to import profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !user) return;
    setIsSaving(true);
    try {
      await supabase.from('profiles').update({
        full_name: profile.full_name || undefined,
        bio: profile.summary || undefined,
        linkedin_url: url || undefined,
      } as any).eq('user_id', user.id);

      toast.success(isHebrew ? 'הפרופיל עודכן בהצלחה!' : 'Profile saved successfully!');
      setOpen(false);
      setProfile(null);
      setUrl('');
    } catch {
      toast.error(isHebrew ? 'שגיאה בשמירה' : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Linkedin className="w-4 h-4 text-blue-500" />
          {isHebrew ? 'ייבא מ-LinkedIn' : 'Import from LinkedIn'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Linkedin className="w-5 h-5 text-blue-500" />
            {isHebrew ? 'ייבוא פרופיל מ-LinkedIn' : 'Import LinkedIn Profile'}
          </DialogTitle>
          <DialogDescription>
            {isHebrew
              ? 'הדבק כתובת URL של פרופיל LinkedIn וה-AI יחלץ את הפרטים'
              : 'Paste a LinkedIn profile URL and AI will extract the details'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{isHebrew ? 'כתובת URL' : 'LinkedIn URL'}</Label>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                dir="ltr"
                className="flex-1"
              />
              <Button onClick={handleImport} disabled={isLoading || !url}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Import className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {profile && (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{profile.full_name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> {profile.title}
                  </p>
                  {profile.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {profile.location}
                    </p>
                  )}
                </div>
              </div>

              {profile.summary && (
                <p className="text-sm text-muted-foreground line-clamp-3">{profile.summary}</p>
              )}

              {profile.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {profile.skills.slice(0, 6).map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                  {profile.skills.length > 6 && (
                    <Badge variant="outline" className="text-xs">+{profile.skills.length - 6}</Badge>
                  )}
                </div>
              )}

              {profile.experience?.length > 0 && (
                <div className="space-y-1">
                  {profile.experience.slice(0, 3).map((exp, i) => (
                    <div key={i} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{exp.role}</span> @ {exp.company}
                      {exp.duration && <span className="ms-1 opacity-60">· {exp.duration}</span>}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={isSaving} className="flex-1 gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {isHebrew ? 'שמור לפרופיל' : 'Save to Profile'}
                </Button>
                <Button variant="outline" onClick={() => setProfile(null)}>
                  {isHebrew ? 'ערוך' : 'Edit'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
