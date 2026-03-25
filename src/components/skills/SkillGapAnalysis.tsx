import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, CheckCircle2, AlertCircle, Info, ExternalLink, Loader2, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Recommendation {
  title: string;
  platform: string;
  url: string;
  duration: string;
}

interface MissingSkill {
  skill: string;
  importance: 'critical' | 'important' | 'nice_to_have';
  recommendation: Recommendation;
}

interface GapResult {
  matched_skills: string[];
  missing_skills: MissingSkill[];
  match_percentage: number;
  summary_he: string;
  summary_en: string;
}

interface SkillGapAnalysisProps {
  jobTitle: string;
  jobRequirements: string | null;
  jobDescription?: string | null;
}

const importanceConfig = {
  critical: {
    label_he: 'חיוני',
    label_en: 'Critical',
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    dot: 'bg-destructive',
  },
  important: {
    label_he: 'חשוב',
    label_en: 'Important',
    color: 'bg-accent/10 text-accent border-accent/20',
    dot: 'bg-accent',
  },
  nice_to_have: {
    label_he: 'יתרון',
    label_en: 'Nice to have',
    color: 'bg-secondary text-secondary-foreground border-border',
    dot: 'bg-muted-foreground',
  },
};

const platformColors: Record<string, string> = {
  'Coursera': 'bg-primary/10 text-primary',
  'Udemy': 'bg-accent/10 text-accent',
  'YouTube': 'bg-destructive/10 text-destructive',
  'LinkedIn Learning': 'bg-secondary text-secondary-foreground',
  'freeCodeCamp': 'bg-primary/5 text-primary',
};

export function SkillGapAnalysis({ jobTitle, jobRequirements, jobDescription }: SkillGapAnalysisProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [result, setResult] = useState<GapResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const candidateSkills = (profile as any)?.skills || [];

  const analyze = async () => {
    if (!jobRequirements && !jobDescription) {
      toast.error(isRTL ? 'אין מספיק מידע על המשרה' : 'Not enough job information');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('skill-gap-analysis', {
        body: {
          candidateSkills,
          jobRequirements: `${jobRequirements || ''}\n${jobDescription || ''}`.trim(),
          jobTitle,
        },
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast.error(isRTL ? 'חרגת ממגבלת הבקשות, נסה שוב בעוד רגע' : 'Rate limit exceeded, try again shortly');
        } else if (data.error.includes('Payment')) {
          toast.error(isRTL ? 'נדרשת תשלום לשימוש ב-AI' : 'Payment required for AI usage');
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setResult(data);
      setExpanded(true);
    } catch (err) {
      console.error(err);
      toast.error(isRTL ? 'שגיאה בניתוח פערי הכישורים' : 'Failed to analyze skill gaps');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Trigger Button */}
      {!result ? (
        <Button
          variant="outline"
          className="w-full gap-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5"
          onClick={analyze}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-primary" />
          )}
          {isLoading
            ? (isRTL ? 'מנתח פערי כישורים...' : 'Analyzing skill gaps...')
            : (isRTL ? 'נתח פערי כישורים עם AI' : 'Analyze Skill Gaps with AI')}
        </Button>
      ) : (
        <button
          className="w-full flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-sm"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium text-primary">
              {isRTL ? 'ניתוח פערי כישורים' : 'Skill Gap Analysis'}
            </span>
            <Badge variant="outline" className={cn(
              'text-xs',
              result.match_percentage >= 70 ? 'border-primary text-primary' :
              result.match_percentage >= 40 ? 'border-accent text-accent' :
              'border-destructive text-destructive'
            )}>
              {result.match_percentage}%
            </Badge>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}

      {/* Results */}
      {result && expanded && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300" dir={isRTL ? 'rtl' : 'ltr'}>
          
          {/* Summary */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                {isRTL ? result.summary_he : result.summary_en}
              </p>
            </div>
          </div>

          {/* Matched Skills */}
          {result.matched_skills.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                {isRTL ? 'כישורים שיש לך' : 'Skills You Have'}
                <Badge variant="secondary" className="text-xs">{result.matched_skills.length}</Badge>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {result.matched_skills.map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs gap-1 border-primary/30 text-primary bg-primary/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Missing Skills */}
          {result.missing_skills.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-accent" />
                {isRTL ? 'כישורים לפיתוח' : 'Skills to Develop'}
                <Badge variant="secondary" className="text-xs">{result.missing_skills.length}</Badge>
              </h4>
              <div className="space-y-3">
                {result.missing_skills.map((item, i) => {
                  const cfg = importanceConfig[item.importance] || importanceConfig.nice_to_have;
                  const platformColor = platformColors[item.recommendation.platform] || 'bg-muted text-muted-foreground';
                  return (
                    <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />
                          <span className="text-sm font-medium">{item.skill}</span>
                        </div>
                        <Badge variant="outline" className={cn('text-xs shrink-0', cfg.color)}>
                          {isRTL ? cfg.label_he : cfg.label_en}
                        </Badge>
                      </div>
                      {/* Course Recommendation */}
                      <div className="flex items-start gap-2 pt-1">
                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium truncate">{item.recommendation.title}</span>
                            <Badge className={cn('text-xs h-4 px-1.5', platformColor)}>
                              {item.recommendation.platform}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            {item.recommendation.duration && (
                              <span className="text-xs text-muted-foreground">
                                ⏱ {item.recommendation.duration}
                              </span>
                            )}
                            <a
                              href={item.recommendation.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-0.5"
                            >
                              {isRTL ? 'למידע נוסף' : 'Learn more'}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Re-analyze button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => { setResult(null); setExpanded(false); }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isRTL ? 'נתח מחדש' : 'Re-analyze'}
          </Button>
        </div>
      )}
    </div>
  );
}
