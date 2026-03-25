import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCredits } from '@/contexts/CreditsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Zap, Gem, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export const CreditHUD = () => {
  const { credits, totalCredits, isLoading } = useCredits();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'he';
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading || !credits) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 animate-pulse">
        <div className="w-4 h-4 rounded-full bg-muted" />
        <div className="w-8 h-4 rounded bg-muted" />
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "relative flex items-center gap-2 px-3 py-1.5 h-auto rounded-full",
                "bg-gradient-to-r from-[#00FF9D]/10 to-[#B794F4]/10",
                "border border-[#00FF9D]/20 hover:border-[#00FF9D]/40",
                "transition-all duration-300 hover:scale-105"
              )}
            >
              {/* Combined display */}
              <div className="flex items-center gap-3">
                {/* Daily Fuel */}
                <div className="flex items-center gap-1">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity,
                      repeatDelay: 3 
                    }}
                  >
                    <Zap className="w-4 h-4 text-[#00FF9D] fill-[#00FF9D]/20" />
                  </motion.div>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={credits.daily_fuel}
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 10, opacity: 0 }}
                      className="text-sm font-bold text-[#00FF9D]"
                    >
                      {credits.daily_fuel}
                    </motion.span>
                  </AnimatePresence>
                </div>

                <span className="text-muted-foreground/50">|</span>

                {/* Permanent Fuel */}
                <div className="flex items-center gap-1">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity,
                    }}
                  >
                    <Gem className="w-4 h-4 text-[#B794F4]" />
                  </motion.div>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={credits.permanent_fuel}
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 10, opacity: 0 }}
                      className="text-sm font-bold text-[#B794F4]"
                    >
                      {credits.permanent_fuel}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>

              <ChevronDown className={cn(
                "w-3 h-3 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />

              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00FF9D]/5 to-[#B794F4]/5 blur-xl -z-10" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{isRTL ? `סה"כ: ${totalCredits} קרדיטים` : `Total: ${totalCredits} credits`}</p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-64">
        <div className="p-3 space-y-3">
          {/* Daily Fuel Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#00FF9D] fill-[#00FF9D]/20" />
              <div>
                <p className="text-sm font-medium">
                  {isRTL ? 'דלק יומי' : 'Daily Fuel'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'מתאפס בחצות' : 'Resets at midnight'}
                </p>
              </div>
            </div>
            <span className="text-lg font-bold text-[#00FF9D]">{credits.daily_fuel}</span>
          </div>

          {/* Permanent Fuel Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-[#B794F4]" />
              <div>
                <p className="text-sm font-medium">
                  {isRTL ? 'דלק קבוע' : 'Permanent Fuel'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'נצבר ממשימות' : 'Earned from tasks'}
                </p>
              </div>
            </div>
            <span className="text-lg font-bold text-[#B794F4]">{credits.permanent_fuel}</span>
          </div>

          {/* Progress bar for total */}
          <div className="pt-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{isRTL ? 'סה"כ' : 'Total'}</span>
              <span>{totalCredits}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#00FF9D] to-[#B794F4]"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((totalCredits / 100) * 100, 100)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem 
          onClick={() => navigate('/credits')}
          className="cursor-pointer"
        >
          <span>{isRTL ? 'צפה בהיסטוריה' : 'View History'}</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => navigate('/fuel-up')}
          className="cursor-pointer text-[#00FF9D]"
        >
          <Zap className="w-4 h-4 me-2" />
          <span>{isRTL ? 'השג עוד דלק!' : 'Get More Fuel!'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
