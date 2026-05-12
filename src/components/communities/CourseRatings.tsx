import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Star, Loader2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface CourseRatingsProps {
  courseId: string;
  isEnrolled: boolean;
}

interface RatingRow {
  id: string;
  course_id: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

function StarRow({
  value,
  interactive = false,
  hovered,
  onHover,
  onClick,
  size = 20,
}: {
  value: number;
  interactive?: boolean;
  hovered?: number;
  onHover?: (n: number) => void;
  onClick?: (n: number) => void;
  size?: number;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = hovered != null ? n <= hovered : n <= value;
        return (
          <Star
            key={n}
            size={size}
            className={cn(
              'transition-colors',
              filled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-100',
              interactive && 'cursor-pointer hover:scale-110'
            )}
            onMouseEnter={() => interactive && onHover?.(n)}
            onMouseLeave={() => interactive && onHover?.(0)}
            onClick={() => interactive && onClick?.(n)}
          />
        );
      })}
    </div>
  );
}

export function CourseRatings({ courseId, isEnrolled }: CourseRatingsProps) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const { data: ratings = [], isLoading } = useQuery<RatingRow[]>({
    queryKey: ['course-ratings', courseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_course_ratings')
        .select('*, profiles(full_name, avatar_url)')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const myRating = ratings.find((r) => r.user_id === user?.id);
  const canSubmit = isEnrolled && !!user && !myRating;

  const totalCount = ratings.length;
  const average =
    totalCount > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalCount
      : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratings.filter((r) => r.rating === star).length,
    pct: totalCount > 0 ? (ratings.filter((r) => r.rating === star).length / totalCount) * 100 : 0,
  }));

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || selected === 0) throw new Error('invalid');
      const { error } = await (supabase as any)
        .from('community_course_ratings')
        .insert({
          course_id: courseId,
          user_id: user.id,
          rating: selected,
          review: reviewText.trim() || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'הדירוג נשמר!' : 'Rating submitted!');
      setSelected(0);
      setReviewText('');
      queryClient.invalidateQueries({ queryKey: ['course-ratings', courseId] });
    },
    onError: () => {
      toast.error(isRTL ? 'שגיאה בשמירת הדירוג' : 'Failed to submit rating');
    },
  });

  const dateLocale = isRTL ? he : enUS;

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {/* Big average */}
            <div className="flex flex-col items-center min-w-[80px]">
              <span className="text-5xl font-bold text-yellow-500">
                {totalCount > 0 ? average.toFixed(1) : '—'}
              </span>
              <StarRow value={Math.round(average)} size={16} />
              <span className="text-xs text-muted-foreground mt-1">
                {totalCount} {isRTL ? 'דירוגים' : 'ratings'}
              </span>
            </div>

            {/* Distribution bars */}
            <div className="flex-1 w-full space-y-1.5">
              {distribution.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-3 text-muted-foreground">{star}</span>
                  <Star size={12} className="text-yellow-400 fill-yellow-400 shrink-0" />
                  <Progress value={pct} className="h-2 flex-1" />
                  <span className="w-5 text-muted-foreground text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit rating */}
      {canSubmit && (
        <Card className="border-dashed border-primary/40">
          <CardContent className="pt-6 space-y-4">
            <p className="font-medium">
              {isRTL ? 'שתף את חוות דעתך' : 'Share your review'}
            </p>

            <StarRow
              value={selected}
              hovered={hovered}
              interactive
              onHover={setHovered}
              onClick={setSelected}
              size={28}
            />

            <Textarea
              placeholder={isRTL ? 'כתוב ביקורת (אופציונלי)...' : 'Write a review (optional)...'}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={3}
              className="resize-none"
            />

            <Button
              disabled={selected === 0 || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
              className="w-full sm:w-auto"
            >
              {submitMutation.isPending && <Loader2 className="animate-spin me-2" size={16} />}
              {isRTL ? 'שלח דירוג' : 'Submit Rating'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reviews list */}
      {ratings.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <MessageSquare size={32} />
          <p className="text-sm">{isRTL ? 'אין דירוגים עדיין' : 'No ratings yet'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ratings.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  {r.profiles?.avatar_url ? (
                    <img
                      src={r.profiles.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                      {r.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <span className="font-medium text-sm truncate">
                        {r.profiles?.full_name ?? (isRTL ? 'משתמש אנונימי' : 'Anonymous')}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(r.created_at), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                    <StarRow value={r.rating} size={14} />
                    {r.review && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {r.review}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
