import { useCredits } from '@/contexts/CreditsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const LEVELS = [
  { min: 0, name_he: 'מתחיל', name_en: 'Beginner' },
  { min: 50, name_he: 'חוקר', name_en: 'Explorer' },
  { min: 150, name_he: 'מקצוען', name_en: 'Professional' },
  { min: 300, name_he: 'מומחה', name_en: 'Expert' },
  { min: 500, name_he: 'אמן', name_en: 'Master' },
  { min: 800, name_he: 'גרנד מאסטר', name_en: 'Grand Master' },
  { min: 1200, name_he: 'אלוף', name_en: 'Champion' },
  { min: 1800, name_he: 'אגדה', name_en: 'Legend' },
  { min: 2500, name_he: 'מיתולוגי', name_en: 'Mythic' },
  { min: 3500, name_he: 'אלמותי', name_en: 'Immortal' },
];

export function LevelBadge({ compact }: { compact?: boolean }) {
  const { totalCredits } = useCredits();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const currentLevel = LEVELS.reduce((acc, level, idx) => {
    if (totalCredits >= level.min) return idx;
    return acc;
  }, 0);

  const level = LEVELS[currentLevel];
  const nextLevel = LEVELS[currentLevel + 1];
  const levelNum = currentLevel + 1;

  const progress = nextLevel
    ? ((totalCredits - level.min) / (nextLevel.min - level.min)) * 100
    : 100;

  if (compact) {
    return (
      <span className="text-xs font-medium text-accent">
        Lv.{levelNum} {isRTL ? level.name_he : level.name_en}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
          {levelNum}
        </div>
        <span className="text-sm font-medium">{isRTL ? level.name_he : level.name_en}</span>
      </div>
      {nextLevel && (
        <div className="flex-1 max-w-[80px]">
          <div className="w-full h-1.5 rounded-full bg-secondary">
            <div
              className="h-1.5 rounded-full bg-accent transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
