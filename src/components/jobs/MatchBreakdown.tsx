import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Briefcase, Code, GraduationCap, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { getMatchBreakdown } from '@/hooks/useMatchScore';

interface MatchBreakdownProps {
  score: number;
  job: any;
  children: ReactNode;
}

export function MatchBreakdown({ score, job, children }: MatchBreakdownProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const bd = getMatchBreakdown(job, profile as any);

  const getColorClass = (s: number) => {
    if (s >= 80) return 'text-emerald-500';
    if (s >= 50) return 'text-yellow-400';
    return 'text-destructive';
  };

  const getBarColor = (s: number) => {
    if (s >= 80) return 'bg-emerald-500';
    if (s >= 50) return 'bg-yellow-400';
    return 'bg-destructive';
  };

  const scoreColor = score >= 75 ? 'text-emerald-500' : score >= 50 ? 'text-yellow-400' : 'text-destructive';

  // Only show factors that are applicable (≠ -1)
  const factors = [
    { icon: Briefcase, label_he: 'תחום', label_en: 'Field', value: bd.fieldScore },
    { icon: Code, label_he: 'תפקיד', label_en: 'Role', value: bd.roleScore },
    { icon: GraduationCap, label_he: 'רמת ניסיון', label_en: 'Seniority', value: bd.expScore },
  ].filter(f => f.value !== -1);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-background border-border" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">
              {isRTL ? 'פירוט ציון התאמה' : 'Match Score Breakdown'}
            </h4>
            <span className={cn('text-lg font-bold', scoreColor)}>{score}%</span>
          </div>

          {/* Factor bars */}
          {factors.length > 0 && (
            <div className="space-y-2.5">
              {factors.map((f, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <f.icon className="w-3.5 h-3.5" />
                      {isRTL ? f.label_he : f.label_en}
                    </span>
                    <span className={cn('font-semibold', getColorClass(f.value))}>
                      {f.value === 100 ? (isRTL ? 'מתאים ✓' : 'Match ✓') : (isRTL ? 'לא מתאים' : 'No match')}
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-secondary">
                    <div
                      className={cn('h-1 rounded-full transition-all', getBarColor(f.value))}
                      style={{ width: `${f.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Skill overlap */}
          {(bd.matchingSkills.length > 0 || bd.missingSkills.length > 0) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {isRTL ? `כישורים (${bd.matchingSkills.length}/${bd.matchingSkills.length + bd.missingSkills.length} תואמים)` : `Skills (${bd.matchingSkills.length}/${bd.matchingSkills.length + bd.missingSkills.length} match)`}
              </p>

              {/* Matching skills */}
              {bd.matchingSkills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {bd.matchingSkills.slice(0, 6).map((s, i) => (
                    <span key={i} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Missing skills */}
              {bd.missingSkills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {bd.missingSkills.slice(0, 5).map((s, i) => (
                    <span key={i} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
                      <XCircle className="w-2.5 h-2.5" />
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tip */}
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
            <p className="text-[10px] text-muted-foreground flex gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              {isRTL
                ? 'כדי לשפר את הציון, הוסף כישורים חסרים לפרופיל שלך'
                : 'Add missing skills to your profile to improve your score'}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
