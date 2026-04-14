import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useJobSwipeBatch } from '@/hooks/useJobSwipeBatch';

export function SwipeWidget() {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const navigate = useNavigate();
  const { remainingCards, jobs, isLoading } = useJobSwipeBatch();

  const ArrowIcon = isHebrew ? ArrowLeft : ArrowRight;
  const hasMatches = jobs.length > 0;
  const remaining = remainingCards.length;
  const topScore = jobs.length > 0 ? Math.max(...jobs.map(j => j.match_score)) : 0;

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-card to-primary/5 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
      onClick={() => navigate('/job-swipe')}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">
              {isHebrew ? 'התאמות השבוע' : 'Weekly Matches'}
            </h3>
            {isLoading ? (
              <p className="text-xs text-muted-foreground mt-1">
                {isHebrew ? 'טוען...' : 'Loading...'}
              </p>
            ) : hasMatches ? (
              <>
                <p className="text-xs text-muted-foreground mt-1">
                  {remaining > 0
                    ? (isHebrew ? `${remaining} משרות ממתינות לסוויפ` : `${remaining} jobs waiting to swipe`)
                    : (isHebrew ? 'סיימת את כל ההתאמות!' : 'All matches reviewed!')}
                </p>
                {topScore > 0 && remaining > 0 && (
                  <p className="text-xs font-medium text-primary mt-0.5">
                    {isHebrew ? `התאמה מרבית: ${topScore}%` : `Top match: ${topScore}%`}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                {isHebrew ? 'צור התאמות חדשות' : 'Generate new matches'}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
            <ArrowIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
