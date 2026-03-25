import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EyeOff, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BlindHiringToggleProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
  compact?: boolean;
}

export function BlindHiringToggle({ enabled, onChange, compact }: BlindHiringToggleProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Switch checked={enabled} onCheckedChange={onChange} />
        <Label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
          <EyeOff className="h-3 w-3" />
          {isRTL ? 'Blind Hiring' : 'Blind Hiring'}
        </Label>
      </div>
    );
  }

  return (
    <div className={`flex items-start justify-between p-4 rounded-lg border ${enabled ? 'bg-purple-500/5 border-purple-500/20' : 'bg-muted/30 border-border'}`}>
      <div className="space-y-1 max-w-sm">
        <Label className="flex items-center gap-2 cursor-pointer">
          <EyeOff className={`h-4 w-4 ${enabled ? 'text-purple-500' : 'text-muted-foreground'}`} />
          {isRTL ? 'הפעל Blind Hiring' : 'Enable Blind Hiring'}
          <Badge variant="outline" className={`text-xs ${enabled ? 'border-purple-500/30 text-purple-500' : ''}`}>
            DEI
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {isRTL
                ? 'מסתיר שם, תמונה, גיל ומגדר מהמגייס בשלב הסינון. הפרטים מתגלים אוטומטית כשמועמד עובר לשלב ראיון.'
                : 'Hides candidate name, photo, age, and gender during screening. Details auto-reveal when candidate advances to interview stage.'}
            </TooltipContent>
          </Tooltip>
        </Label>
        <p className="text-xs text-muted-foreground">
          {isRTL
            ? 'מסתיר מידע מזהה בשלב הסינון — מפחית הטיה ומקדם גיוון'
            : 'Hides identifying info during screening — reduces bias and promotes diversity'}
        </p>
      </div>
      <Switch checked={enabled} onCheckedChange={onChange} />
    </div>
  );
}
