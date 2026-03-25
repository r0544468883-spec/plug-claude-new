import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AchievementBadgeProps {
  icon: string;
  name: string;
  unlocked: boolean;
  size?: 'sm' | 'md';
}

export function AchievementBadge({ icon, name, unlocked, size = 'md' }: AchievementBadgeProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        initial={false}
        animate={unlocked ? { scale: [1, 1.2, 1] } : {}}
        className={cn(
          'rounded-full flex items-center justify-center',
          size === 'sm' ? 'w-10 h-10 text-lg' : 'w-12 h-12 text-2xl',
          unlocked
            ? 'bg-gradient-to-br from-primary to-accent shadow-lg'
            : 'bg-secondary/50 grayscale opacity-40'
        )}
      >
        {icon}
      </motion.div>
      <span className={cn(
        'text-[10px] text-center max-w-[60px] leading-tight',
        unlocked ? 'text-foreground' : 'text-muted-foreground'
      )}>
        {name}
      </span>
    </div>
  );
}
