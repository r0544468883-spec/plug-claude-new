import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Star, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WriteReviewProps {
  companyName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const relationships = [
  { value: 'current_employee', en: 'Current Employee', he: 'עובד/ת נוכחי/ת' },
  { value: 'former_employee', en: 'Former Employee', he: 'עובד/ת לשעבר' },
  { value: 'candidate', en: 'Candidate', he: 'מועמד/ת' },
  { value: 'intern', en: 'Intern', he: 'מתמחה' },
];

const ratingCategories = [
  { key: 'culture_rating', en: 'Culture', he: 'תרבות ארגונית' },
  { key: 'management_rating', en: 'Management', he: 'ניהול' },
  { key: 'salary_rating', en: 'Salary & Benefits', he: 'שכר והטבות' },
  { key: 'worklife_rating', en: 'Work-Life Balance', he: 'איזון עבודה-חיים' },
  { key: 'growth_rating', en: 'Growth Opportunities', he: 'הזדמנויות צמיחה' },
];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              'w-6 h-6 transition-colors',
              (hovered || value) >= star
                ? 'fill-accent text-accent'
                : 'text-muted-foreground'
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function WriteReview({ companyName, onSuccess, onCancel }: WriteReviewProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'he';

  const [relationship, setRelationship] = useState('');
  const [ratings, setRatings] = useState<Record<string, number>>({
    culture_rating: 0, management_rating: 0, salary_rating: 0,
    worklife_rating: 0, growth_rating: 0,
  });
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [advice, setAdvice] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const overallRating = Math.round(
    Object.values(ratings).filter(Boolean).reduce((a, b) => a + b, 0) /
    (Object.values(ratings).filter(Boolean).length || 1)
  );

  const isValid =
    relationship &&
    Object.values(ratings).every(Boolean) &&
    pros.trim().length >= 50 &&
    cons.trim().length >= 50;

  const handleSubmit = async () => {
    if (!user || !isValid) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('company_reviews').insert({
        company_name: companyName,
        reviewer_id: user.id,
        relationship,
        overall_rating: overallRating,
        ...ratings,
        pros: pros.trim(),
        cons: cons.trim(),
        advice: advice.trim() || null,
        is_anonymous: isAnonymous,
        is_approved: false,
      });
      if (error) throw error;
      toast.success(isRTL
        ? 'הביקורת נשלחה! היא תאושר תוך 24 שעות.'
        : 'Review submitted! It will be approved within 24 hours.');
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error(isRTL ? 'שגיאה בשליחת הביקורת' : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h3 className="text-lg font-semibold mb-1">
          {isRTL ? `כתוב ביקורת על ${companyName}` : `Write a review for ${companyName}`}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isRTL
            ? 'הביקורת תעבור אישור לפני פרסום'
            : 'Your review will be moderated before publishing'}
        </p>
      </div>

      {/* Relationship */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {isRTL ? 'מה הקשר שלך לחברה?' : 'What is your relationship with the company?'}
        </Label>
        <RadioGroup value={relationship} onValueChange={setRelationship} className="grid grid-cols-2 gap-2">
          {relationships.map((r) => (
            <div
              key={r.value}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors',
                relationship === r.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              )}
              onClick={() => setRelationship(r.value)}
            >
              <RadioGroupItem value={r.value} />
              <Label className="cursor-pointer text-sm">{isRTL ? r.he : r.en}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Ratings */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          {isRTL ? 'דירוגים' : 'Ratings'}
        </Label>
        {ratingCategories.map((cat) => (
          <div key={cat.key} className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground min-w-[140px]">
              {isRTL ? cat.he : cat.en}
            </span>
            <StarRating
              value={ratings[cat.key]}
              onChange={(v) => setRatings((prev) => ({ ...prev, [cat.key]: v }))}
            />
          </div>
        ))}
      </div>

      {/* Pros */}
      <div className="space-y-2">
        <Label>
          {isRTL ? 'יתרונות' : 'Pros'}
          <span className="text-xs text-muted-foreground ms-2">
            ({pros.length}/50 {isRTL ? 'תווים מינימום' : 'chars min'})
          </span>
        </Label>
        <Textarea
          value={pros}
          onChange={(e) => setPros(e.target.value)}
          placeholder={isRTL ? 'מה טוב בחברה הזו?' : 'What is good about this company?'}
          rows={3}
          className={pros.length > 0 && pros.length < 50 ? 'border-destructive' : ''}
        />
      </div>

      {/* Cons */}
      <div className="space-y-2">
        <Label>
          {isRTL ? 'חסרונות' : 'Cons'}
          <span className="text-xs text-muted-foreground ms-2">
            ({cons.length}/50 {isRTL ? 'תווים מינימום' : 'chars min'})
          </span>
        </Label>
        <Textarea
          value={cons}
          onChange={(e) => setCons(e.target.value)}
          placeholder={isRTL ? 'מה ניתן לשפר?' : 'What could be improved?'}
          rows={3}
          className={cons.length > 0 && cons.length < 50 ? 'border-destructive' : ''}
        />
      </div>

      {/* Advice */}
      <div className="space-y-2">
        <Label>
          {isRTL ? 'עצה להנהלה (אופציונלי)' : 'Advice to Management (optional)'}
        </Label>
        <Textarea
          value={advice}
          onChange={(e) => setAdvice(e.target.value)}
          placeholder={isRTL ? 'מה היית ממליץ להנהלה?' : 'What would you recommend to management?'}
          rows={2}
        />
      </div>

      {/* Anonymous toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
        <div>
          <p className="text-sm font-medium">{isRTL ? 'פרסם בעילום שם' : 'Publish anonymously'}</p>
          <p className="text-xs text-muted-foreground">
            {isRTL ? 'שמך לא יוצג בביקורת' : 'Your name will not be shown'}
          </p>
        </div>
        <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1">
            {isRTL ? 'ביטול' : 'Cancel'}
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className="flex-1 gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {isRTL ? 'שלח ביקורת' : 'Submit Review'}
        </Button>
      </div>
    </div>
  );
}
