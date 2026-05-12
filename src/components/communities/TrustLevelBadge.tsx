import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Shield, User, Star, Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const TRUST_LEVELS = [
  { level: 0, en: 'New', he: 'חדש', color: 'bg-gray-100 text-gray-600 border-gray-300', icon: User },
  { level: 1, en: 'Member', he: 'חבר', color: 'bg-blue-100 text-blue-600 border-blue-300', icon: Shield },
  { level: 2, en: 'Active', he: 'פעיל', color: 'bg-green-100 text-green-600 border-green-300', icon: Star },
  { level: 3, en: 'Leader', he: 'מוביל', color: 'bg-purple-100 text-purple-600 border-purple-300', icon: Crown },
  { level: 4, en: 'Elder', he: 'זקן הקהילה', color: 'bg-amber-100 text-amber-600 border-amber-300', icon: Sparkles },
];

export function getTrustLevel(level: number) {
  return TRUST_LEVELS[Math.min(level, 4)] || TRUST_LEVELS[0];
}

export function TrustLevelBadge({ level, size = 'sm' }: { level: number; size?: 'xs' | 'sm' | 'md' }) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const tl = getTrustLevel(level);
  const Icon = tl.icon;

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0 gap-0.5',
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
  };

  const iconSize = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  return (
    <Badge variant="outline" className={cn(sizeClasses[size], tl.color)}>
      <Icon className={iconSize[size]} />
      {isRTL ? tl.he : tl.en}
    </Badge>
  );
}
