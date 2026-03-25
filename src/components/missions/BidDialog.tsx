import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Users, CheckCircle, EyeOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface BidDialogProps {
  missionId: string | null;
  missionTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BidDialog({ missionId, missionTitle, open, onOpenChange, onSuccess }: BidDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [pitch, setPitch] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !missionId || !pitch.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('mission_bids').insert({
        mission_id: missionId,
        hunter_id: user.id,
        pitch: pitch.trim(),
        verified_candidates_count: 0,
        vouched_candidates_count: 0,
        is_anonymous: isAnonymous,
      } as any);

      if (error) throw error;
      toast.success(isHebrew ? 'ההצעה נשלחה!' : 'Bid submitted on project!');
      setPitch('');
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(isHebrew ? 'שגיאה בשליחת ההצעה' : 'Failed to submit bid');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            {isHebrew ? 'הגשת הצעה' : 'Submit Bid'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium">{missionTitle}</p>
          </div>

          {/* Talent Snapshot */}
          <div className="p-4 rounded-lg border border-border bg-card space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              {isHebrew ? 'סנאפשוט כישרון' : 'Talent Snapshot'}
            </h4>
            <div className="flex gap-3">
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                0 {isHebrew ? 'מאומתים' : 'Verified'}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="w-3 h-3 text-blue-500" />
                0 {isHebrew ? 'מומלצים' : 'Vouched'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isHebrew ? 'למה את/ה הכי מתאימ/ה?' : 'Why are you the best fit?'} *</Label>
            <Textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder={isHebrew ? 'תאר/י את הניסיון והיתרונות שלך...' : 'Describe your experience and advantages...'}
              rows={5}
            />
          </div>

          {/* Anonymous option */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/50">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked === true)}
            />
            <label htmlFor="anonymous" className="flex items-center gap-2 text-sm cursor-pointer">
              <EyeOff className="w-4 h-4 text-muted-foreground" />
              {isHebrew ? 'הגשה אנונימית (שמך לא יוצג למפרסם)' : 'Submit anonymously (your name won\'t be shown)'}
            </label>
          </div>

          <Button onClick={handleSubmit} disabled={isSubmitting || !pitch.trim()} className="w-full gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isHebrew ? 'שלח הצעה' : 'Submit Bid'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
