import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BenchmarkBadgeProps {
  value: number;        // user's value (e.g. 24)
  marketAvg: number;    // market average (e.g. 18)
  unit?: string;        // e.g. '%', ' days'
  threshold?: number;   // % difference to consider "similar" (default 2)
}

export function BenchmarkBadge({ value, marketAvg, unit = '%', threshold = 2 }: BenchmarkBadgeProps) {
  const { language } = useLanguage();
  const isHe = language === 'he';

  if (!marketAvg) return null;

  const diff    = value - marketAvg;
  const isAbove = diff > threshold;
  const isBelow = diff < -threshold;
  const absDiff = Math.abs(diff);

  const Icon    = isAbove ? TrendingUp : isBelow ? TrendingDown : Minus;
  const color   = isAbove
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : isBelow
    ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : 'text-muted-foreground bg-muted/20 border-border';

  const label = isAbove
    ? (isHe ? `+${absDiff}${unit} מהממוצע (${marketAvg}${unit})` : `+${absDiff}${unit} vs avg (${marketAvg}${unit})`)
    : isBelow
    ? (isHe ? `-${absDiff}${unit} מהממוצע (${marketAvg}${unit})` : `-${absDiff}${unit} vs avg (${marketAvg}${unit})`)
    : (isHe ? `כממוצע השוק (${marketAvg}${unit})` : `~Market avg (${marketAvg}${unit})`);

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}
