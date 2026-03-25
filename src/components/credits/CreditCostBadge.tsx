import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CREDIT_COSTS } from '@/lib/credit-costs';
import { cn } from '@/lib/utils';

interface CreditCostBadgeProps {
  action: keyof typeof CREDIT_COSTS;
  variant?: 'default' | 'compact' | 'inline';
  className?: string;
  showLabel?: boolean;
}

export const CreditCostBadge = ({ 
  action, 
  variant = 'default',
  className,
  showLabel = true 
}: CreditCostBadgeProps) => {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const cost = CREDIT_COSTS[action];

  if (!cost) return null;

  if (variant === 'compact') {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-[#00FF9D]",
        className
      )}>
        <Zap className="w-3 h-3" />
        {cost}
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full",
        "bg-[#00FF9D]/10 text-[#00FF9D] text-xs font-medium",
        className
      )}>
        <Zap className="w-3 h-3" />
        {cost} {isRTL ? 'דלק' : 'fuel'}
      </span>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg",
        "bg-gradient-to-r from-[#00FF9D]/10 to-[#B794F4]/10",
        "border border-[#00FF9D]/20",
        className
      )}
    >
      <Zap className="w-4 h-4 text-[#00FF9D]" />
      <div className="flex flex-col">
        <span className="text-sm font-bold text-[#00FF9D]">{cost}</span>
        {showLabel && (
          <span className="text-[10px] text-muted-foreground">
            {isRTL ? 'דלק לפעולה' : 'fuel per use'}
          </span>
        )}
      </div>
    </motion.div>
  );
};

// Banner variant for page headers
export const CreditCostBanner = ({ 
  action,
  description,
  className 
}: { 
  action: keyof typeof CREDIT_COSTS;
  description?: string;
  className?: string;
}) => {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const cost = CREDIT_COSTS[action];

  if (!cost) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center justify-between gap-4 p-3 rounded-xl",
        "bg-gradient-to-r from-[#00FF9D]/5 via-transparent to-[#B794F4]/5",
        "border border-[#00FF9D]/20",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#00FF9D]/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-[#00FF9D]" />
        </div>
        <div>
          <p className="text-sm font-medium">
            {isRTL ? 'פיצ\'ר AI מתקדם' : 'AI-Powered Feature'}
          </p>
          <p className="text-xs text-muted-foreground">
            {description || (isRTL 
              ? `שימוש בפיצ'ר זה דורש ${cost} יחידות דלק`
              : `Using this feature costs ${cost} fuel`)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00FF9D]/10">
        <Zap className="w-4 h-4 text-[#00FF9D]" />
        <span className="text-lg font-bold text-[#00FF9D]">{cost}</span>
      </div>
    </motion.div>
  );
};
