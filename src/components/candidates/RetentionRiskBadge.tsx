import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RetentionRiskBadgeProps {
  daysSinceInteraction: number;
  responseRate: number | null;
  lastProfileUpdate?: string | null;
}

export function RetentionRiskBadge({ daysSinceInteraction, responseRate, lastProfileUpdate }: RetentionRiskBadgeProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  // Calculate risk score (0-100)
  const interactionScore = Math.min(daysSinceInteraction / 30, 1) * 40;
  const responseScore = responseRate !== null && responseRate < 50 ? 25 : 0;
  const profileDays = lastProfileUpdate 
    ? Math.floor((Date.now() - new Date(lastProfileUpdate).getTime()) / (1000 * 60 * 60 * 24))
    : 30;
  const profileScore = profileDays > 30 ? 20 : 0;
  const engagementScore = 15; // Default low engagement for MVP

  const totalRisk = interactionScore + responseScore + profileScore + engagementScore;

  let level: 'low' | 'medium' | 'high';
  let colorClass: string;
  if (totalRisk < 35) {
    level = 'low';
    colorClass = 'border-green-500/20 text-green-500';
  } else if (totalRisk < 60) {
    level = 'medium';
    colorClass = 'border-yellow-500/20 text-yellow-500';
  } else {
    level = 'high';
    colorClass = 'border-destructive/20 text-destructive';
  }

  const factors: string[] = [];
  if (interactionScore > 15) factors.push(isHebrew ? `${daysSinceInteraction} ימים ללא אינטראקציה` : `${daysSinceInteraction}d no interaction`);
  if (responseScore > 0) factors.push(isHebrew ? 'אחוז תגובה נמוך' : 'Low response rate');
  if (profileScore > 0) factors.push(isHebrew ? 'פרופיל לא עודכן' : 'Profile not updated');

  const label = isHebrew
    ? { low: 'סיכון נמוך', medium: 'סיכון בינוני', high: 'סיכון גבוה' }[level]
    : { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' }[level];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn('gap-1 cursor-help', colorClass)}>
            <TrendingDown className="w-3 h-3" />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <p className="font-medium mb-1">{isHebrew ? 'גורמי סיכון:' : 'Risk factors:'}</p>
          {factors.length > 0 ? (
            <ul className="text-xs space-y-0.5">
              {factors.map((f, i) => <li key={i}>• {f}</li>)}
            </ul>
          ) : (
            <p className="text-xs">{isHebrew ? 'אין גורמים משמעותיים' : 'No significant factors'}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
