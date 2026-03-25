import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface RoleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  isSelected: boolean;
  onClick: () => void;
}

export function RoleCard({ title, description, icon: Icon, isSelected, onClick }: RoleCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center p-6 rounded-2xl border-2 transition-all duration-300',
        'text-center hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
        isSelected 
          ? 'border-primary bg-primary/10 plug-glow-mint' 
          : 'border-border bg-card hover:border-primary/50 hover:bg-card/80'
      )}
    >
      {/* Icon container */}
      <div className={cn(
        'flex items-center justify-center w-16 h-16 rounded-xl mb-4 transition-all duration-300',
        isSelected 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
      )}>
        <Icon className="w-8 h-8" />
      </div>
      
      {/* Title */}
      <h3 className={cn(
        'text-lg font-semibold mb-2 transition-colors',
        isSelected ? 'text-primary' : 'text-foreground'
      )}>
        {title}
      </h3>
      
      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 rtl:right-auto rtl:left-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <svg className="w-4 h-4 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  );
}
