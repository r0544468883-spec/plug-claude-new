import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Image, FileText, Phone, Link2, Video, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ProfileCompletionCardProps {
  onNavigate: (section: string) => void;
  onDismiss?: () => void;
}

interface CompletionItem {
  key: string;
  labelHe: string;
  labelEn: string;
  done: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

export function ProfileCompletionCard({ onNavigate, onDismiss }: ProfileCompletionCardProps) {
  const { profile, role } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const p = profile as any;

  const getItems = (): CompletionItem[] => {
    if (role === 'job_seeker') {
      return [
        { key: 'name', labelHe: 'שם מלא', labelEn: 'Full name', done: !!p?.full_name?.trim(), icon: User },
        { key: 'photo', labelHe: 'תמונת פרופיל', labelEn: 'Profile photo', done: !!p?.avatar_url, icon: Image },
        { key: 'tagline', labelHe: 'כותרת אישית', labelEn: 'Personal tagline', done: !!p?.personal_tagline?.trim(), icon: FileText },
        { key: 'about', labelHe: 'על עצמי', labelEn: 'About me', done: !!p?.about_me?.trim(), icon: FileText },
        { key: 'phone', labelHe: 'טלפון', labelEn: 'Phone', done: !!p?.phone?.trim(), icon: Phone },
        { key: 'cv', labelHe: 'קורות חיים', labelEn: 'Resume / CV', done: !!(p?.cv_data && Object.keys(p.cv_data || {}).length > 0), icon: FileText },
        { key: 'links', labelHe: 'קישורים מקצועיים', labelEn: 'Professional links', done: !!(p?.linkedin_url || p?.portfolio_url || p?.github_url), icon: Link2 },
        { key: 'video', labelHe: 'סרטון היכרות', labelEn: 'Intro video', done: !!p?.intro_video_url, icon: Video },
      ];
    }
    if (role === 'freelance_hr' || role === 'inhouse_hr') {
      return [
        { key: 'name', labelHe: 'שם מלא', labelEn: 'Full name', done: !!p?.full_name?.trim(), icon: User },
        { key: 'photo', labelHe: 'תמונת פרופיל', labelEn: 'Profile photo', done: !!p?.avatar_url, icon: Image },
        { key: 'bio', labelHe: 'על עצמי', labelEn: 'About me', done: !!p?.bio?.trim(), icon: FileText },
        { key: 'video', labelHe: 'סרטון היכרות', labelEn: 'Intro video', done: !!p?.intro_video_url, icon: Video },
      ];
    }
    // company_employee
    return [
      { key: 'name', labelHe: 'שם מלא', labelEn: 'Full name', done: !!p?.full_name?.trim(), icon: User },
      { key: 'photo', labelHe: 'תמונת פרופיל', labelEn: 'Profile photo', done: !!p?.avatar_url, icon: Image },
      { key: 'phone', labelHe: 'טלפון', labelEn: 'Phone', done: !!p?.phone?.trim(), icon: Phone },
      { key: 'links', labelHe: 'קישורים מקצועיים', labelEn: 'Professional links', done: !!(p?.linkedin_url || p?.portfolio_url), icon: Link2 },
    ];
  };

  const items = getItems();
  const doneCount = items.filter(i => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);
  const missing = items.filter(i => !i.done);

  // Don't show if 100% complete
  if (pct === 100) return null;

  const barColor = pct < 40 ? 'bg-destructive' : pct < 70 ? 'bg-orange-400' : 'bg-green-500';
  const ChevronIcon = isHebrew ? ChevronLeft : ChevronRight;

  return (
    <Card className="bg-card border-border border-l-4 border-l-primary" dir={isHebrew ? 'rtl' : 'ltr'}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">
              {isHebrew ? 'הפרופיל שלך' : 'Your Profile'}
              <span className={`ms-2 font-bold ${pct < 40 ? 'text-destructive' : pct < 70 ? 'text-orange-400' : 'text-green-500'}`}>
                {pct}%
              </span>
              {isHebrew ? ' מלא' : ' complete'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isHebrew
                ? `${missing.length} פריטים חסרים לפרופיל מלא`
                : `${missing.length} items missing for a complete profile`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={() => onNavigate('profile-docs')}
            >
              {isHebrew ? 'השלם' : 'Complete'}
              <ChevronIcon className="w-3 h-3" />
            </Button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label={isHebrew ? 'סגור' : 'Dismiss'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Missing items (max 3) */}
        {missing.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {missing.slice(0, 4).map(item => {
              const Icon = item.icon;
              return (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                >
                  <Icon className="w-3 h-3" />
                  {isHebrew ? item.labelHe : item.labelEn}
                </span>
              );
            })}
            {missing.length > 4 && (
              <span className="text-xs text-muted-foreground self-center">
                +{missing.length - 4} {isHebrew ? 'נוספים' : 'more'}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
