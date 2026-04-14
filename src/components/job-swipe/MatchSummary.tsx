import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Bookmark, X, RefreshCw, Sparkles } from 'lucide-react';
import { CREDIT_COSTS } from '@/lib/credit-costs';

interface MatchSummaryProps {
  applied: number;
  saved: number;
  skipped: number;
  total: number;
  onRefresh: () => void;
  hasFreeBatch: boolean;
}

export function MatchSummary({ applied, saved, skipped, total, onRefresh, hasFreeBatch }: MatchSummaryProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-2">
            {isHebrew ? 'סיימת! 🎉' : 'All Done! 🎉'}
          </h2>
          <p className="text-muted-foreground">
            {isHebrew
              ? `עברת על ${total} משרות מותאמות`
              : `You reviewed ${total} matched jobs`}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-lg font-bold">{applied}</span>
            <span className="text-xs text-muted-foreground">
              {isHebrew ? 'הגשות' : 'Applied'}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-lg font-bold">{saved}</span>
            <span className="text-xs text-muted-foreground">
              {isHebrew ? 'נשמרו' : 'Saved'}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center">
              <X className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-lg font-bold">{skipped}</span>
            <span className="text-xs text-muted-foreground">
              {isHebrew ? 'דולגו' : 'Skipped'}
            </span>
          </div>
        </div>

        {/* Refresh */}
        <div className="space-y-2">
          <Button onClick={onRefresh} className="gap-2 w-full">
            <RefreshCw className="w-4 h-4" />
            {isHebrew
              ? `רענן התאמות (${CREDIT_COSTS.JOB_SWIPE_BATCH} קרדיטים)`
              : `Refresh Matches (${CREDIT_COSTS.JOB_SWIPE_BATCH} credits)`}
          </Button>
          <p className="text-xs text-muted-foreground">
            {isHebrew
              ? 'סט חינמי חדש יהיה זמין בשבוע הבא'
              : 'A new free set will be available next week'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
