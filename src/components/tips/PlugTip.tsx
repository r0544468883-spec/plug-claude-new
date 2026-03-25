import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Lightbulb, Target, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export type TipType = 'info' | 'encouragement' | 'action' | 'celebration';

export interface PlugTipProps {
  id: string;
  type?: TipType;
  titleHe: string;
  titleEn: string;
  messageHe: string;
  messageEn: string;
  actionLabel?: { he: string; en: string };
  onAction?: () => void;
  onDismiss?: () => void;
  autoHide?: number; // milliseconds
  position?: 'top' | 'bottom' | 'inline';
  className?: string;
}

const typeConfig: Record<TipType, { icon: typeof Sparkles; gradient: string; iconColor: string }> = {
  info: {
    icon: Lightbulb,
    gradient: 'from-blue-500/20 via-blue-400/10 to-transparent',
    iconColor: 'text-blue-400',
  },
  encouragement: {
    icon: Sparkles,
    gradient: 'from-accent/20 via-accent/10 to-transparent',
    iconColor: 'text-accent',
  },
  action: {
    icon: Target,
    gradient: 'from-primary/20 via-primary/10 to-transparent',
    iconColor: 'text-primary',
  },
  celebration: {
    icon: Zap,
    gradient: 'from-yellow-500/20 via-yellow-400/10 to-transparent',
    iconColor: 'text-yellow-400',
  },
};

export const PlugTip = ({
  id,
  type = 'info',
  titleHe,
  titleEn,
  messageHe,
  messageEn,
  actionLabel,
  onAction,
  onDismiss,
  autoHide,
  position = 'inline',
  className,
}: PlugTipProps) => {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [isVisible, setIsVisible] = useState(true);

  const config = typeConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHide);
      return () => clearTimeout(timer);
    }
  }, [autoHide]);

  const handleDismiss = () => {
    setIsVisible(false);
    // Store dismissed tip in localStorage
    const dismissed = JSON.parse(localStorage.getItem('dismissedPlugTips') || '[]');
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      localStorage.setItem('dismissedPlugTips', JSON.stringify(dismissed));
    }
    onDismiss?.();
  };

  const handleAction = () => {
    onAction?.();
    handleDismiss();
  };

  // Check if tip was already dismissed
  useEffect(() => {
    const dismissed = JSON.parse(localStorage.getItem('dismissedPlugTips') || '[]');
    if (dismissed.includes(id)) {
      setIsVisible(false);
    }
  }, [id]);

  if (!isVisible) return null;

  const positionClasses = {
    top: 'fixed top-4 left-4 right-4 z-50 max-w-md mx-auto',
    bottom: 'fixed bottom-24 left-4 right-4 z-50 max-w-md mx-auto',
    inline: 'relative w-full',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: position === 'top' ? -20 : 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: position === 'top' ? -20 : 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn(positionClasses[position], className)}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className={cn(
          'relative overflow-hidden rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm shadow-lg',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:opacity-50',
          `before:${config.gradient}`
        )}>
          {/* Decorative background */}
          <div className={cn(
            'absolute inset-0 bg-gradient-to-r opacity-30',
            config.gradient
          )} />
          
          <div className="relative p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <motion.div 
                className={cn(
                  'flex-shrink-0 p-2 rounded-full bg-background/50',
                  config.iconColor
                )}
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Icon className="w-5 h-5" />
              </motion.div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-foreground text-sm">
                    {isRTL ? titleHe : titleEn}
                  </h4>
                  <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 p-1 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {isRTL ? messageHe : messageEn}
                </p>

                {actionLabel && onAction && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleAction}
                    className={cn(
                      'mt-3 h-8 text-xs font-medium',
                      config.iconColor,
                      'hover:bg-background/50'
                    )}
                  >
                    {isRTL ? actionLabel.he : actionLabel.en}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PlugTip;
