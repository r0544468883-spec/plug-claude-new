import { useLanguage } from '@/contexts/LanguageContext';
import { FEATURE_BADGES, type BadgeType } from '@/lib/feature-badges';
import { Wrench, Eye, Rocket } from 'lucide-react';

const BADGE_ICONS = { builder: Wrench, visionary: Eye, founder: Rocket };

interface BadgeDisplayProps {
  badges: Array<{ badge_type: string }>;
  size?: 'sm' | 'md';
}

export function BadgeDisplay({ badges, size = 'sm' }: BadgeDisplayProps) {
  const { language } = useLanguage();
  const isHe = language === 'he';

  if (!badges?.length) return null;

  const uniqueTypes = [...new Set(badges.map(b => b.badge_type))];

  return (
    <div className="flex items-center gap-1">
      {uniqueTypes.map(type => {
        const badge = FEATURE_BADGES[type as BadgeType];
        if (!badge) return null;
        const Icon = BADGE_ICONS[type as BadgeType];
        const s = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
        const textSize = size === 'sm' ? 'text-[9px]' : 'text-[11px]';

        return (
          <span
            key={type}
            title={badge.description[isHe ? 'he' : 'en']}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border ${badge.color}/15 ${badge.textColor} ${badge.borderColor} ${textSize} font-medium`}
          >
            <Icon className={s} />
            {badge.label[isHe ? 'he' : 'en']}
          </span>
        );
      })}
    </div>
  );
}
