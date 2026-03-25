import { cn } from '@/lib/utils';

interface PlugLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export function PlugLogo({ size = 'md', showText = true, className }: PlugLogoProps) {
  const sizes = {
    sm: { icon: 'w-6 h-6', text: 'text-lg' },
    md: { icon: 'w-8 h-8', text: 'text-2xl' },
    lg: { icon: 'w-12 h-12', text: 'text-3xl' },
    xl: { icon: 'w-16 h-16', text: 'text-5xl' },
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Plug Icon - stylized electrical plug */}
      <div className={cn(
        'relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent',
        sizes[size].icon
      )}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          className="w-2/3 h-2/3"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Plug prongs */}
          <path d="M7 4v4" className="text-background" />
          <path d="M17 4v4" className="text-background" />
          {/* Plug body */}
          <rect x="5" y="8" width="14" height="6" rx="2" className="fill-background/20 stroke-background" />
          {/* Cord */}
          <path d="M12 14v3" className="text-background" />
          <path d="M10 17h4" className="text-background" />
          <path d="M12 17v3" className="text-background" />
        </svg>
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/50 to-accent/50 blur-lg -z-10" />
      </div>
      
      {showText && (
        <span className={cn(
          'font-bold tracking-tight plug-gradient-text',
          sizes[size].text
        )}>
          PLUG
        </span>
      )}
    </div>
  );
}
