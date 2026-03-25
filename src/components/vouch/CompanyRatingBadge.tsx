import { forwardRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Building2, ThumbsUp, Ghost, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyRatingBadgeProps {
  companyId: string;
  companyName?: string;
  showDetails?: boolean;
  className?: string;
}

export const CompanyRatingBadge = forwardRef<HTMLDivElement, CompanyRatingBadgeProps>(({ 
  companyId, 
  companyName,
  showDetails = false,
  className 
}, ref) => {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const { data: rating } = useQuery({
    queryKey: ['company-rating', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_ratings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  if (!rating) return null;

  const recommendPercent = rating.total_reviews > 0 
    ? Math.round((rating.recommend_count / rating.total_reviews) * 100)
    : 0;

  const ghostedPercent = rating.total_reviews > 0 
    ? Math.round((rating.ghosted_count / rating.total_reviews) * 100)
    : 0;

  const getOverallColor = (score: number) => {
    if (score >= 4) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    if (score >= 3) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30';
  };

  if (showDetails) {
    return (
      <div ref={ref} className={cn('space-y-2 p-3 bg-muted/30 rounded-lg', className)} dir={isHebrew ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Building2 className="h-4 w-4 text-primary" />
          {isHebrew ? 'דירוג קהילת PLUG' : 'PLUG Community Rating'}
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-1">
            <div className={cn('text-lg font-bold rounded-md py-1', getOverallColor(rating.avg_overall || 0))}>
              {rating.avg_overall?.toFixed(1) || '-'}
            </div>
            <p className="text-xs text-muted-foreground">{isHebrew ? 'ציון כללי' : 'Overall'}</p>
          </div>
          
          <div className="space-y-1">
            <div className="text-lg font-bold text-green-600">
              {recommendPercent}%
            </div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              {isHebrew ? 'ממליצים' : 'Recommend'}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className={cn('text-lg font-bold', ghostedPercent > 30 ? 'text-red-500' : 'text-muted-foreground')}>
              {ghostedPercent}%
            </div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Ghost className="h-3 w-3" />
              {isHebrew ? 'גוסטינג' : 'Ghosted'}
            </p>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Users className="h-3 w-3" />
          {isHebrew 
            ? `מבוסס על ${rating.total_reviews} חוות דעת`
            : `Based on ${rating.total_reviews} reviews`}
        </p>
      </div>
    );
  }

  // Compact badge version
  return (
    <div ref={ref} className="inline-block">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                'gap-1 cursor-help',
                getOverallColor(rating.avg_overall || 0),
                className
              )}
            >
              <Building2 className="h-3 w-3" />
              {rating.avg_overall?.toFixed(1)}
              <span className="text-xs opacity-70">({rating.total_reviews})</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-medium">{companyName || isHebrew ? 'דירוג חברה' : 'Company Rating'}</p>
              <div className="flex gap-3">
                <span className="text-green-500">{recommendPercent}% {isHebrew ? 'ממליצים' : 'recommend'}</span>
                {ghostedPercent > 0 && (
                  <span className="text-red-400">{ghostedPercent}% {isHebrew ? 'גוסטינג' : 'ghosted'}</span>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
});

CompanyRatingBadge.displayName = 'CompanyRatingBadge';
