import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useJobSwipeBatch } from '@/hooks/useJobSwipeBatch';
import { SwipeDeck } from '@/components/job-swipe/SwipeDeck';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CREDIT_COSTS } from '@/lib/credit-costs';

export default function JobSwipe() {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    batchId,
    jobs,
    remainingCards,
    isLoading,
    hasFreeBatchThisWeek,
    generateOnDemand,
    isGenerating,
    recordAction,
  } = useJobSwipeBatch();

  const BackIcon = isHebrew ? ArrowRight : ArrowLeft;

  const handleAction = async (jobId: string, action: 'apply' | 'skip' | 'save') => {
    try {
      await recordAction({ jobId, action });
      if (action === 'apply') {
        toast.success(isHebrew ? 'הוגשה מועמדות!' : 'Applied!');
      } else if (action === 'save') {
        toast.success(isHebrew ? 'נשמר!' : 'Saved!');
      }
    } catch {
      toast.error(isHebrew ? 'שגיאה, נסה שוב' : 'Error, try again');
    }
  };

  const handleRefresh = async () => {
    try {
      await generateOnDemand();
      toast.success(isHebrew ? 'התאמות חדשות נוצרו!' : 'New matches generated!');
    } catch (err: any) {
      if (err?.error === 'insufficient_credits') {
        toast.error(isHebrew ? 'אין מספיק קרדיטים' : 'Insufficient credits');
      } else {
        toast.error(isHebrew ? 'שגיאה ביצירת התאמות' : 'Error generating matches');
      }
    }
  };

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <BackIcon className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">
              {isHebrew ? 'התאמות השבוע' : 'Weekly Matches'}
            </h1>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Loading */}
        {(isLoading || isGenerating) && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <Loader2 className="w-6 h-6 text-primary animate-spin absolute -bottom-1 -right-1" />
            </div>
            <p className="text-muted-foreground text-center">
              {isHebrew ? 'מחפש את ההתאמות הטובות ביותר...' : 'Finding your best matches...'}
            </p>
          </div>
        )}

        {/* No matches / Generate CTA */}
        {!isLoading && !isGenerating && jobs.length === 0 && (
          <Card className="mt-12">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">
                {isHebrew ? 'מוכן למצוא התאמות?' : 'Ready to find matches?'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {isHebrew
                  ? 'נמצא עבורך את 10 המשרות שהכי מתאימות לפרופיל שלך'
                  : "We'll find the top 10 jobs that best match your profile"}
              </p>
              <Button onClick={() => refetch()} className="gap-2" size="lg">
                <Sparkles className="w-4 h-4" />
                {isHebrew ? 'צור התאמות (חינם)' : 'Generate Matches (Free)'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Swipe Deck */}
        {!isLoading && !isGenerating && jobs.length > 0 && batchId && (
          <SwipeDeck
            jobs={jobs}
            batchId={batchId}
            onAction={handleAction}
            onRefresh={handleRefresh}
            hasFreeBatch={hasFreeBatchThisWeek}
          />
        )}
      </main>
    </div>
  );
}
