import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Star, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  jobId?: string;
  triggerEvent: 'after_interview' | 'after_rejection' | 'after_offer' | 'after_hire';
  onClose?: () => void;
}

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="focus:outline-none"
          >
            <Star
              className={cn(
                "w-6 h-6 transition-colors",
                (hover || value) >= star ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function CandidateSurveyForm({ jobId, triggerEvent, onClose }: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [overall, setOverall] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [process, setProcess] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!overall || !user) {
      toast.error(isHebrew ? 'אנא דרג את החוויה הכללית' : 'Please rate the overall experience');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('candidate_surveys').insert({
        candidate_id: user.id,
        job_id: jobId || null,
        trigger_event: triggerEvent,
        overall_rating: overall,
        communication_rating: communication || null,
        process_rating: process || null,
        feedback_text: feedback || null,
        would_recommend: wouldRecommend,
      } as any);
      if (error) throw error;
      setSubmitted(true);
      toast.success(isHebrew ? 'תודה על המשוב!' : 'Thank you for your feedback!');
    } catch {
      toast.error(isHebrew ? 'שגיאה בשליחת הסקר' : 'Failed to submit survey');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <h3 className="text-lg font-semibold">{isHebrew ? 'תודה רבה!' : 'Thank you!'}</h3>
          <p className="text-muted-foreground text-sm">{isHebrew ? 'המשוב שלך עוזר לנו לשפר את המערכת' : 'Your feedback helps us improve'}</p>
          {onClose && <Button onClick={onClose} variant="outline" className="mt-2">{isHebrew ? 'סגור' : 'Close'}</Button>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border" dir={isHebrew ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle>{isHebrew ? 'שתף את החוויה שלך' : 'Share Your Experience'}</CardTitle>
        <CardDescription>{isHebrew ? 'סקר קצר של 30 שניות — שמוע אותך חשוב לנו' : 'A 30-second survey — your voice matters'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <StarRating
          value={overall}
          onChange={setOverall}
          label={isHebrew ? 'חוויה כללית *' : 'Overall Experience *'}
        />
        <StarRating
          value={communication}
          onChange={setCommunication}
          label={isHebrew ? 'תקשורת עם הגורם המגייס' : 'Communication quality'}
        />
        <StarRating
          value={process}
          onChange={setProcess}
          label={isHebrew ? 'מהירות ושקיפות התהליך' : 'Process speed & transparency'}
        />

        <div className="flex items-center gap-3">
          <Switch
            checked={wouldRecommend === true}
            onCheckedChange={(v) => setWouldRecommend(v ? true : false)}
            id="would-recommend"
          />
          <Label htmlFor="would-recommend" className="text-sm">
            {isHebrew ? 'הייתי ממליץ על החברה לחברים' : 'I would recommend this company to friends'}
          </Label>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">{isHebrew ? 'הערות נוספות (אופציונלי)' : 'Additional comments (optional)'}</Label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={isHebrew ? 'שתף מה עבד טוב ומה ניתן לשפר...' : 'Share what worked well and what could be improved...'}
            className="min-h-[80px]"
          />
        </div>

        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose} className="flex-1">
              {isHebrew ? 'מאוחר יותר' : 'Later'}
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={submitting || !overall} className="flex-1 gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isHebrew ? 'שלח משוב' : 'Submit Feedback'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
