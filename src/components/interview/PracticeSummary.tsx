import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Target,
  RefreshCw,
  Briefcase,
  Star,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

interface FeedbackDimensions {
  substance: number;
  structure: number;
  relevance: number;
  credibility: number;
  differentiation: number;
}

interface SessionFeedback {
  score: number;
  dimensions?: FeedbackDimensions;
  priorityMove?: string;
}

interface PracticeSummaryProps {
  jobTitle: string;
  companyName: string;
  totalQuestions: number;
  answeredQuestions: number;
  feedbacks: Record<number, SessionFeedback>;
  onRetry: () => void;
  onNewJob: () => void;
}

export function PracticeSummary({
  jobTitle,
  companyName,
  totalQuestions,
  answeredQuestions,
  feedbacks,
  onRetry,
  onNewJob,
}: PracticeSummaryProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const feedbackEntries = Object.values(feedbacks);
  const hasFeedbacks = feedbackEntries.length > 0;

  // Calculate averages
  const avgScore = hasFeedbacks
    ? Math.round((feedbackEntries.reduce((s, f) => s + f.score, 0) / feedbackEntries.length) * 10) / 10
    : 0;

  const dimKeys: (keyof FeedbackDimensions)[] = ['substance', 'structure', 'relevance', 'credibility', 'differentiation'];
  const dimLabels: Record<keyof FeedbackDimensions, { he: string; en: string }> = {
    substance: { he: 'תוכן', en: 'Substance' },
    structure: { he: 'מבנה', en: 'Structure' },
    relevance: { he: 'רלוונטיות', en: 'Relevance' },
    credibility: { he: 'אמינות', en: 'Credibility' },
    differentiation: { he: 'ייחודיות', en: 'Differentiation' },
  };

  const avgDimensions: FeedbackDimensions | null = hasFeedbacks && feedbackEntries.some(f => f.dimensions)
    ? dimKeys.reduce((acc, key) => {
        const vals = feedbackEntries.filter(f => f.dimensions).map(f => f.dimensions![key]);
        acc[key] = vals.length > 0 ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : 0;
        return acc;
      }, {} as FeedbackDimensions)
    : null;

  // Find strongest and weakest dimension
  let strongestDim: keyof FeedbackDimensions | null = null;
  let weakestDim: keyof FeedbackDimensions | null = null;
  if (avgDimensions) {
    let maxVal = -1, minVal = 6;
    for (const key of dimKeys) {
      if (avgDimensions[key] > maxVal) { maxVal = avgDimensions[key]; strongestDim = key; }
      if (avgDimensions[key] < minVal) { minVal = avgDimensions[key]; weakestDim = key; }
    }
  }

  const scoreCls = avgScore >= 7 ? 'text-green-500' : avgScore >= 4 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-6 text-center">
          <Trophy className="w-12 h-12 text-primary mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-1">
            {isRTL ? 'כל הכבוד! סיימת את האימון' : 'Great Job! Practice Complete'}
          </h2>
          <p className="text-muted-foreground">
            {jobTitle}{companyName ? ` · ${companyName}` : ''}
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{answeredQuestions}/{totalQuestions}</p>
            <p className="text-xs text-muted-foreground">{isRTL ? 'שאלות שנענו' : 'Questions Answered'}</p>
          </CardContent>
        </Card>
        {hasFeedbacks && (
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${scoreCls}`}>{avgScore}/10</p>
              <p className="text-xs text-muted-foreground">{isRTL ? 'ציון ממוצע' : 'Average Score'}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dimension Summary */}
      {avgDimensions && (
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {isRTL ? 'ביצועים לפי ממד' : 'Performance by Dimension'}
            </h4>
            <div className="space-y-2">
              {dimKeys.map((key) => {
                const val = avgDimensions[key];
                const barCls = val >= 4 ? 'bg-green-500' : val >= 3 ? 'bg-yellow-500' : 'bg-red-500';
                const isStrong = key === strongestDim;
                const isWeak = key === weakestDim;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 shrink-0 text-end">
                      {isRTL ? dimLabels[key].he : dimLabels[key].en}
                    </span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${(val / 5) * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold w-8 text-end">{val}/5</span>
                    {isStrong && <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-green-500/10 text-green-600">{isRTL ? 'חזק' : 'Strong'}</Badge>}
                    {isWeak && strongestDim !== weakestDim && <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-amber-500/10 text-amber-600">{isRTL ? 'לשפר' : 'Improve'}</Badge>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strongest & Weakest */}
      {strongestDim && weakestDim && strongestDim !== weakestDim && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-green-500" fill="currentColor" />
                <p className="text-xs font-semibold text-green-600">{isRTL ? 'הנקודה החזקה שלך' : 'Your Strength'}</p>
              </div>
              <p className="text-sm font-medium">{isRTL ? dimLabels[strongestDim].he : dimLabels[strongestDim].en}</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-semibold text-amber-600">{isRTL ? 'לשפר' : 'To Improve'}</p>
              </div>
              <p className="text-sm font-medium">{isRTL ? dimLabels[weakestDim].he : dimLabels[weakestDim].en}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onRetry} className="flex-1 gap-2">
          <RefreshCw className="w-4 h-4" />
          {isRTL ? 'התאמן שוב' : 'Practice Again'}
        </Button>
        <Button onClick={onNewJob} className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground">
          <Briefcase className="w-4 h-4" />
          {isRTL ? 'משרה חדשה' : 'New Job'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
