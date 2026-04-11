import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, X, Check, SkipForward, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TourTooltipProps {
  targetSelector: string;
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onSkipStep?: () => void;
  isFirst: boolean;
  isLast: boolean;
  icon?: React.ElementType;
  isElementFound?: boolean;
  customImage?: string;
}

export function TourTooltip({
  targetSelector,
  title,
  description,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onSkipStep,
  isFirst,
  isLast,
  icon: Icon,
  isElementFound = true,
  customImage,
}: TourTooltipProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const [isVisible, setIsVisible] = useState(false);
  const [arrowOffset, setArrowOffset] = useState(0);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'ArrowRight') {
        if (isHebrew) { if (!isFirst) onPrev(); }
        else { onNext(); }
      } else if (e.key === 'ArrowLeft') {
        if (isHebrew) { onNext(); }
        else { if (!isFirst) onPrev(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onSkip, isFirst, isHebrew]);

  const updatePosition = useCallback(() => {
    const element = document.querySelector(targetSelector);

    // Fallback to center if element not found
    if (!element) {
      setPosition({
        top: window.innerHeight / 2 - 120,
        left: Math.max(16, (window.innerWidth - Math.min(360, window.innerWidth - 32)) / 2),
      });
      setPlacement('bottom');
      setIsVisible(true);
      return;
    }

    const rect = element.getBoundingClientRect();
    const tooltipHeight = 300;
    const tooltipWidth = Math.min(360, window.innerWidth - 32);
    const padding = 16;

    // Determine placement
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let newTop: number;
    let newPlacement: 'top' | 'bottom';

    if (spaceBelow > tooltipHeight + padding) {
      newPlacement = 'bottom';
      newTop = rect.bottom + padding;
    } else if (spaceAbove > tooltipHeight + padding) {
      newPlacement = 'top';
      newTop = rect.top - tooltipHeight - padding;
    } else {
      // Not enough space - show centered
      newPlacement = 'bottom';
      newTop = Math.max(padding, (window.innerHeight - tooltipHeight) / 2);
    }

    // Calculate horizontal position with proper boundary checks
    const elementCenter = rect.left + rect.width / 2;
    let newLeft = elementCenter - tooltipWidth / 2;

    // Ensure tooltip stays within viewport
    const minLeft = padding;
    const maxLeft = window.innerWidth - tooltipWidth - padding;
    newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));

    // Calculate arrow offset to point to element center
    const tooltipCenter = newLeft + tooltipWidth / 2;
    const offset = elementCenter - tooltipCenter;
    const maxOffset = tooltipWidth / 2 - 24; // Keep arrow within card bounds
    setArrowOffset(Math.max(-maxOffset, Math.min(offset, maxOffset)));

    setPlacement(newPlacement);
    setPosition({ top: newTop, left: newLeft });
    setIsVisible(true);
  }, [targetSelector]);

  useEffect(() => {
    setIsVisible(false);

    const timer = setTimeout(updatePosition, 400);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [targetSelector, updatePosition]);

  const tooltipWidth = Math.min(360, typeof window !== 'undefined' ? window.innerWidth - 32 : 360);

  // Estimated time (rough: ~8 seconds per step)
  const estimatedMinutes = Math.max(1, Math.round((totalSteps * 8) / 60));

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key={currentStep}
          className="fixed z-[9999]"
          style={{
            top: position.top,
            left: position.left,
            width: tooltipWidth,
          }}
          dir={isHebrew ? 'rtl' : 'ltr'}
          initial={{ opacity: 0, y: placement === 'bottom' ? -20 : 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: placement === 'bottom' ? -10 : 10, scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
            duration: 0.4,
          }}
          role="dialog"
          aria-label={isHebrew ? `שלב ${currentStep + 1} מתוך ${totalSteps}: ${title}` : `Step ${currentStep + 1} of ${totalSteps}: ${title}`}
        >
          <Card className="bg-card/95 backdrop-blur-md border-primary/40 shadow-2xl overflow-hidden">
            {/* Gradient header */}
            <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />

            <CardContent className="p-5">
              {/* Top row: step counter + skip/exit */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">
                  {isHebrew ? `שלב ${currentStep + 1} מתוך ${totalSteps}` : `Step ${currentStep + 1} of ${totalSteps}`}
                </span>
                <div className="flex items-center gap-1">
                  {/* Show estimated time on first step */}
                  {isFirst && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 me-2">
                      <Clock className="w-3 h-3" />
                      ~{estimatedMinutes} {isHebrew ? 'דק\'' : 'min'}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSkip}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    aria-label={isHebrew ? 'סיים סיור' : 'Exit tour'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1 rounded-full bg-muted-foreground/10 mb-4">
                <motion.div
                  className="h-1 rounded-full bg-primary"
                  initial={false}
                  animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              {/* Icon/Image and Content */}
              <div className="space-y-3 mb-5">
                {customImage ? (
                  <motion.div
                    className="mx-auto rounded-xl overflow-hidden shadow-lg"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <img
                      src={customImage}
                      alt="Tour illustration"
                      className="w-full h-24 object-cover"
                    />
                  </motion.div>
                ) : Icon && (
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <Icon className="w-6 h-6 text-primary" />
                  </motion.div>
                )}

                <motion.h3
                  className="font-bold text-xl text-foreground text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {title}
                </motion.h3>

                <motion.p
                  className="text-sm text-muted-foreground leading-relaxed text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  {description}
                </motion.p>
              </div>

              {/* Navigation */}
              <motion.div
                className="flex items-center justify-between gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPrev}
                  disabled={isFirst}
                  className="gap-1.5"
                  aria-label={isHebrew ? 'הקודם' : 'Previous'}
                >
                  {isHebrew ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  {isHebrew ? 'הקודם' : 'Back'}
                </Button>

                {/* Skip this step (middle) */}
                {onSkipStep && !isLast && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSkipStep}
                    className="gap-1 text-xs text-muted-foreground"
                    aria-label={isHebrew ? 'דלג על שלב' : 'Skip step'}
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    {isHebrew ? 'דלג' : 'Skip'}
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={onNext}
                  className="gap-1.5 min-w-[100px]"
                  aria-label={isLast ? (isHebrew ? 'סיום' : 'Finish') : (isHebrew ? 'הבא' : 'Next')}
                >
                  {isLast ? (
                    <>
                      <Check className="w-4 h-4" />
                      {isHebrew ? 'סיום' : 'Finish'}
                    </>
                  ) : (
                    <>
                      {isHebrew ? 'הבא' : 'Next'}
                      {isHebrew ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </>
                  )}
                </Button>
              </motion.div>

              {/* Keyboard hint */}
              <p className="text-[10px] text-muted-foreground/50 text-center mt-3 hidden sm:block">
                {isHebrew ? 'חצים ← → לניווט · Esc ליציאה' : '← → to navigate · Esc to exit'}
              </p>
            </CardContent>
          </Card>

          {/* Arrow pointing to element */}
          {isElementFound && (
            <motion.div
              className={`absolute w-4 h-4 bg-card/95 border-primary/40 transform rotate-45 ${
                placement === 'bottom'
                  ? '-top-2 border-t border-s'
                  : '-bottom-2 border-b border-e'
              }`}
              style={{
                left: '50%',
                marginLeft: arrowOffset - 8,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
