import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Briefcase, Code, GraduationCap, MapPin, DollarSign, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface MatchBreakdownProps {
  score: number;
  job: any;
  children: ReactNode;
}

interface BreakdownItem {
  icon: typeof Briefcase;
  label_he: string;
  label_en: string;
  score: number;
}

export function MatchBreakdown({ score, job, children }: MatchBreakdownProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  // Generate breakdown based on available data
  const getBreakdown = (): BreakdownItem[] => {
    const prefs = profile as any;
    const items: BreakdownItem[] = [];

    // Field match
    const jobFieldId = job?.field_id || job?.job_field?.id;
    const fieldMatch = prefs?.preferred_fields?.includes(jobFieldId) ? 90 : 30;
    items.push({ icon: Briefcase, label_he: 'ניסיון רלוונטי', label_en: 'Relevant Experience', score: fieldMatch });

    // Role match
    const jobRoleId = job?.role_id || job?.job_role?.id;
    const roleMatch = prefs?.preferred_roles?.includes(jobRoleId) ? 85 : 40;
    items.push({ icon: Code, label_he: 'כישורים טכניים', label_en: 'Technical Skills', score: roleMatch });

    // Experience level match
    const expMatch = job?.experience_level_id === prefs?.preferred_experience_level_id ? 80 : 50;
    items.push({ icon: GraduationCap, label_he: 'רמת ניסיון', label_en: 'Experience Level', score: expMatch });

    // Location (always high if no location filter)
    items.push({ icon: MapPin, label_he: 'מיקום גאוגרפי', label_en: 'Location', score: job?.location ? 75 : 100 });

    // Salary range
    items.push({ icon: DollarSign, label_he: 'התאמת שכר', label_en: 'Salary Match', score: job?.salary_range ? 70 : 80 });

    return items;
  };

  const breakdown = getBreakdown();

  const getColorClass = (s: number) => {
    if (s >= 80) return 'text-primary';
    if (s >= 60) return 'text-yellow-400';
    return 'text-destructive';
  };

  const getBarColor = (s: number) => {
    if (s >= 80) return 'bg-primary';
    if (s >= 60) return 'bg-yellow-400';
    return 'bg-destructive';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-background border-accent/20" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">
              {isRTL ? 'פירוט ציון התאמה' : 'Match Score Breakdown'}
            </h4>
            <span className={cn('text-lg font-bold', getColorClass(score))}>
              {score}%
            </span>
          </div>

          <div className="space-y-3">
            {breakdown.map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    {isRTL ? item.label_he : item.label_en}
                  </span>
                  <span className={cn('font-medium', getColorClass(item.score))}>
                    {item.score}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-secondary">
                  <div
                    className={cn('h-1.5 rounded-full transition-all', getBarColor(item.score))}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
            <p className="text-xs text-muted-foreground flex gap-2">
              <Lightbulb className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              {isRTL
                ? 'כדי לשפר את הציון, עדכן את קורות החיים וההעדפות בפרופיל'
                : 'To improve your score, update your CV and profile preferences'}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
