import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PartyPopper, Share2, Loader2 } from 'lucide-react';

interface SuccessStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle?: string;
  companyName?: string;
  applicationId?: string;
}

export function SuccessStoryDialog({ open, onOpenChange, jobTitle = '', companyName = '', applicationId }: SuccessStoryDialogProps) {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [story, setStory] = useState('');
  const [tipForOthers, setTipForOthers] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user || !story.trim()) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from('success_stories').insert({
        user_id: user.id,
        job_title: jobTitle,
        company_name: companyName,
        application_id: applicationId || null,
        story: story.trim(),
        tip_for_others: tipForOthers.trim() || null,
        is_public: isPublic,
      });
      if (error) throw error;

      // Award credits for sharing success story
      supabase.functions.invoke('award-credits', {
        body: { action: 'job_share' }
      }).catch(() => {});

      setSaved(true);
      toast.success(isHebrew ? 'הסיפור נשמר! תודה ששיתפת' : 'Story saved! Thanks for sharing');
    } catch (err) {
      console.error('Error saving success story:', err);
      toast.error(isHebrew ? 'שגיאה בשמירה' : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const handleShareWhatsApp = () => {
    const code = (profile as any)?.referral_code || 'plug';
    const text = isHebrew
      ? `אחרי חיפוש עבודה עם PLUG, התקבלתי ל-${companyName} כ-${jobTitle}! 🎉\nPLUG עזר לי למצוא את המשרה המושלמת עם AI. תנסו גם:\nhttps://www.plug-hr.com/invite/${code}`
      : `After job searching with PLUG, I got hired at ${companyName} as ${jobTitle}! 🎉\nPLUG helped me find the perfect job with AI. Try it:\nhttps://www.plug-hr.com/invite/${code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareLinkedIn = () => {
    const code = (profile as any)?.referral_code || 'plug';
    const url = `https://www.plug-hr.com/invite/${code}`;
    const text = isHebrew
      ? `שמח/ה לשתף שהתקבלתי ל-${companyName} כ-${jobTitle}! 🎉\nתודה ל-PLUG שעזר לי למצוא את המשרה המושלמת.`
      : `Excited to share that I've been hired at ${companyName} as ${jobTitle}! 🎉\nThanks to PLUG for helping me find the perfect match.`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`, '_blank');
  };

  if (saved) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md text-center" dir={isHebrew ? 'rtl' : 'ltr'}>
          <div className="py-6 space-y-4">
            <PartyPopper className="w-12 h-12 text-yellow-500 mx-auto" />
            <h2 className="text-xl font-bold">{isHebrew ? 'מזל טוב! 🎉' : 'Congratulations! 🎉'}</h2>
            <p className="text-sm text-muted-foreground">
              {isHebrew ? 'הסיפור שלך ישמש השראה למחפשי עבודה אחרים' : 'Your story will inspire other job seekers'}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" size="sm" className="gap-2 text-green-600" onClick={handleShareWhatsApp}>
                📱 {isHebrew ? 'שתף בווצאפ' : 'Share WhatsApp'}
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-blue-600" onClick={handleShareLinkedIn}>
                💼 {isHebrew ? 'שתף בלינקדאין' : 'Share LinkedIn'}
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              {isHebrew ? 'סגור' : 'Close'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-yellow-500" />
            {isHebrew ? 'מזל טוב! ספר/י לנו' : 'Congrats! Tell us your story'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Job info (pre-filled) */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs">{isHebrew ? 'תפקיד' : 'Role'}</Label>
              <Input value={jobTitle} readOnly className="text-sm bg-muted/30" />
            </div>
            <div className="flex-1">
              <Label className="text-xs">{isHebrew ? 'חברה' : 'Company'}</Label>
              <Input value={companyName} readOnly className="text-sm bg-muted/30" />
            </div>
          </div>

          {/* Story */}
          <div>
            <Label className="text-xs">{isHebrew ? 'ספר/י את הסיפור שלך' : 'Tell your story'}</Label>
            <Textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder={isHebrew
                ? 'איך היה תהליך החיפוש? מה עזר לך? כמה זמן לקח?'
                : 'How was the search? What helped? How long did it take?'}
              className="min-h-[100px] text-sm"
            />
          </div>

          {/* Tip */}
          <div>
            <Label className="text-xs">{isHebrew ? 'טיפ למחפשי עבודה אחרים (אופציונלי)' : 'Tip for other job seekers (optional)'}</Label>
            <Input
              value={tipForOthers}
              onChange={(e) => setTipForOthers(e.target.value)}
              placeholder={isHebrew ? 'מה הייתם ממליצים?' : 'What would you recommend?'}
              className="text-sm"
            />
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">{isHebrew ? 'הצג בפרופיל הציבורי' : 'Show on public profile'}</Label>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {/* Save */}
          <Button onClick={handleSave} disabled={saving || !story.trim()} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            {isHebrew ? 'שמור ושתף' : 'Save & Share'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
