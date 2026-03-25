import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GhostingMeterProps {
  companyId?: string;
  avgHiringSpeedDays?: number | null;
  responseRate?: number | null;
}

export function GhostingMeter({ avgHiringSpeedDays, responseRate }: GhostingMeterProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  // Calculate response likelihood based on available data
  let likelihood: 'high' | 'medium' | 'low' = 'medium';
  let score = 50;

  if (responseRate !== null && responseRate !== undefined) {
    score = responseRate;
  } else if (avgHiringSpeedDays !== null && avgHiringSpeedDays !== undefined) {
    // Infer from hiring speed
    score = avgHiringSpeedDays <= 14 ? 80 : avgHiringSpeedDays <= 30 ? 55 : 30;
  }

  if (score >= 70) likelihood = 'high';
  else if (score >= 40) likelihood = 'medium';
  else likelihood = 'low';

  const config = {
    high: {
      Icon: ShieldCheck,
      color: 'border-green-500/20 text-green-500',
      label: isHebrew ? 'סיכוי תגובה גבוה' : 'High Response',
      detail: isHebrew ? 'חברה זו מגיבה לרוב המועמדים' : 'This company responds to most applicants',
    },
    medium: {
      Icon: Shield,
      color: 'border-yellow-500/20 text-yellow-500',
      label: isHebrew ? 'סיכוי בינוני' : 'Medium Response',
      detail: isHebrew ? 'חברה זו מגיבה לחלק מהמועמדים' : 'This company responds to some applicants',
    },
    low: {
      Icon: ShieldAlert,
      color: 'border-destructive/20 text-destructive',
      label: isHebrew ? 'סיכוי נמוך' : 'Low Response',
      detail: isHebrew ? 'חברה זו נוטה לא להגיב' : 'This company rarely responds',
    },
  };

  const { Icon, color, label, detail } = config[likelihood];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn('gap-1 cursor-help', color)}>
            <Icon className="w-3 h-3" />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{detail}</p>
          {avgHiringSpeedDays && (
            <p className="text-xs text-muted-foreground mt-1">
              {isHebrew
                ? `ממוצע ${Math.round(avgHiringSpeedDays)} ימים לגיוס`
                : `Avg ${Math.round(avgHiringSpeedDays)} days to hire`}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
