import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface RoleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function RoleCard({ title, description, icon: Icon, isSelected, onClick, disabled }: RoleCardProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        'group relative flex flex-col items-center p-6 rounded-2xl border-2 transition-all duration-300',
        'text-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
        disabled
          ? 'border-border/40 bg-card/40 opacity-50 cursor-not-allowed'
          : isSelected
            ? 'border-primary bg-primary/10 plug-glow-mint hover:scale-[1.02]'
            : 'border-border bg-card hover:border-primary/50 hover:bg-card/80 hover:scale-[1.02]'
      )}
    >
      {/* Coming Soon badge */}
      {disabled && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-muted-foreground/20 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
          Coming Soon
        </div>
      )}

      {/* Icon container */}
      <div className={cn(
        'flex items-center justify-center w-16 h-16 rounded-xl mb-4 transition-all duration-300',
        disabled
          ? 'bg-muted/50 text-muted-foreground/50'
          : isSelected
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
      )}>
        <Icon className="w-8 h-8" />
      </div>

      {/* Title */}
      <h3 className={cn(
        'text-lg font-semibold mb-2 transition-colors',
        disabled ? 'text-muted-foreground/60' : isSelected ? 'text-primary' : 'text-foreground'
      )}>
        {title}
      </h3>

      {/* Description */}
      <p className={cn('text-sm leading-relaxed', disabled ? 'text-muted-foreground/40' : 'text-muted-foreground')}>
        {description}
      </p>

      {/* Selected indicator */}
      {isSelected && !disabled && (
        <div className="absolute top-3 right-3 rtl:right-auto rtl:left-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <svg className="w-4 h-4 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  );
}
