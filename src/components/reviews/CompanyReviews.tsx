import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Star, PenLine, ThumbsUp, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { WriteReview } from './WriteReview';
import { cn } from '@/lib/utils';

interface CompanyReviewsProps {
  companyName: string;
}

const ratingCategories = [
  { key: 'culture_rating', en: 'Culture', he: 'תרבות ארגונית' },
  { key: 'management_rating', en: 'Management', he: 'ניהול' },
  { key: 'salary_rating', en: 'Salary & Benefits', he: 'שכר והטבות' },
  { key: 'worklife_rating', en: 'Work-Life Balance', he: 'איזון עבודה-חיים' },
  { key: 'growth_rating', en: 'Growth Opportunities', he: 'הזדמנויות צמיחה' },
];

const relationshipLabels: Record<string, { en: string; he: string }> = {
  current_employee: { en: 'Current Employee', he: 'עובד/ת נוכחי/ת' },
  former_employee: { en: 'Former Employee', he: 'עובד/ת לשעבר' },
  candidate: { en: 'Candidate', he: 'מועמד/ת' },
  intern: { en: 'Intern', he: 'מתמחה' },
};

function StarDisplay({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn(
                      'transition-colors',
                      size === 'lg' ? 'w-6 h-6' : 'w-3.5 h-3.5',
                      value >= s ? 'fill-accent text-accent' : 'text-muted-foreground/30'
                    )}
        />
      ))}
    </div>
  );
}

export function CompanyReviews({ companyName }: CompanyReviewsProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'he';
  const [showWriteReview, setShowWriteReview] = useState(false);

  const { data: reviews = [], refetch } = useQuery({
    queryKey: ['company-reviews', companyName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_reviews')
        .select('*')
        .ilike('company_name', companyName)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const avgRating = (key: string) =>
    reviews.length
      ? Number((reviews.reduce((acc: number, r: any) => acc + (r[key] || 0), 0) / reviews.length).toFixed(1))
      : 0;

  const overallAvg = reviews.length
    ? Number((reviews.reduce((acc: number, r: any) => acc + (r.overall_rating || 0), 0) / reviews.length).toFixed(1))
    : 0;

  if (showWriteReview) {
    return (
      <WriteReview
        companyName={companyName}
        onSuccess={() => { setShowWriteReview(false); refetch(); }}
        onCancel={() => setShowWriteReview(false)}
      />
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">
          {isRTL ? 'מה אומרים על החברה' : 'What people say about this company'}
        </h3>
        {user && (
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowWriteReview(true)}>
            <PenLine className="w-3.5 h-3.5" />
            {isRTL ? 'כתוב ביקורת' : 'Write Review'}
          </Button>
        )}
      </div>

      {reviews.length < 3 ? (
        <div className="text-center py-8 rounded-lg bg-muted/30 border border-dashed border-border">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">{isRTL ? 'אין מספיק ביקורות עדיין' : 'Not enough reviews yet'}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isRTL
              ? 'נדרשות לפחות 3 ביקורות כדי להציג ציונים'
              : 'At least 3 reviews needed to show ratings'}
          </p>
          {user && (
            <Button size="sm" className="mt-4 gap-2" onClick={() => setShowWriteReview(true)}>
              <PenLine className="w-3.5 h-3.5" />
              {isRTL ? 'היה הראשון לכתוב' : 'Be the first to review'}
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Overall Score */}
          <div className="flex items-center gap-6 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary">{overallAvg}</div>
              <StarDisplay value={Math.round(overallAvg)} size="lg" />
              <p className="text-xs text-muted-foreground mt-1">
                {reviews.length} {isRTL ? 'ביקורות' : 'reviews'}
              </p>
            </div>
            <div className="flex-1 space-y-2">
              {ratingCategories.map((cat) => {
                const avg = avgRating(cat.key);
                return (
                  <div key={cat.key} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 shrink-0">
                      {isRTL ? cat.he : cat.en}
                    </span>
                    <Progress value={(avg / 5) * 100} className="h-1.5 flex-1" />
                    <span className="text-xs font-medium w-6 text-end">{avg}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review Cards */}
          <div className="space-y-4">
            {reviews.map((review: any) => (
              <div key={review.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <StarDisplay value={review.overall_rating || 0} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {relationshipLabels[review.relationship]
                        ? (isRTL ? relationshipLabels[review.relationship].he : relationshipLabels[review.relationship].en)
                        : review.relationship}
                      {' · '}
                      {formatDistanceToNow(new Date(review.created_at), {
                        addSuffix: true, locale: isRTL ? he : enUS,
                      })}
                    </p>
                  </div>
                  {review.is_anonymous && (
                    <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                      <Lock className="w-3 h-3" />
                      {isRTL ? 'אנונימי' : 'Anonymous'}
                    </Badge>
                  )}
                </div>

                {review.pros && (
                  <div>
                    <p className="text-xs font-medium text-primary mb-1">
                      {isRTL ? '✅ יתרונות' : '✅ Pros'}
                    </p>
                    <p className="text-sm text-muted-foreground">{review.pros}</p>
                  </div>
                )}

                {review.cons && (
                  <div>
                    <p className="text-xs font-medium text-destructive mb-1">
                      {isRTL ? '⚠️ חסרונות' : '⚠️ Cons'}
                    </p>
                    <p className="text-sm text-muted-foreground">{review.cons}</p>
                  </div>
                )}

                {review.advice && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-primary mb-1">
                        {isRTL ? '💡 עצה להנהלה' : '💡 Advice to Management'}
                      </p>
                      <p className="text-sm text-muted-foreground italic">{review.advice}</p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
