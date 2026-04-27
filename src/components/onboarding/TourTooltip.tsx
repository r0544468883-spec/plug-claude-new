import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, X, Check } from 'lucide-react';
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
  isFirst: boolean;
  isLast: boolean;
  icon?: React.ElementType;
  isElementFound?: boolean;
  customImage?: string;
  sectionLabel?: string;
  /** Override the label of the last/finish button */
  lastLabel?: string;
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
  isFirst,
  isLast,
  icon: Icon,
  isElementFound = true,
  customImage,
  sectionLabel,
  lastLabel,
}: TourTooltipProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const reducedMotion = useReducedMotion();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const [isVisible, setIsVisible] = useState(false);
  const [arrowOffset, setArrowOffset] = useState(0);

  // Keyboard navigation (invisible — no UI noise)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'ArrowRight') {
        isHebrew ? (!isFirst && onPrev()) : onNext();
      } else if (e.key === 'ArrowLeft') {
        isHebrew ? onNext() : (!isFirst && onPrev());
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
    const tooltipHeight = Math.min(280, window.innerHeight * 0.55);
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
    const maxOffset = tooltipWidth / 2 - 24;
    setArrowOffset(Math.max(-maxOffset, Math.min(offset, maxOffset)));

    setPlacement(newPlacement);
    setPosition({ top: newTop, left: newLeft });
    setIsVisible(true);
  }, [targetSelector]);

  useEffect(() => {
    setIsVisible(false);

    const timer = setTimeout(updatePosition, 400);
    window.addEventListener('resize', updatePosition, { passive: true });
    window.addEventListener('scroll', updatePosition, { passive: true, capture: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, { capture: true } as EventListenerOptions);
    };
  }, [targetSelector, updatePosition]);

  const tooltipWidth = Math.min(360, typeof window !== 'undefined' ? window.innerWidth - 32 : 360);

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
          role="dialog"
          aria-live="polite"
          aria-label={title}
          initial={{ opacity: 0, y: reducedMotion ? 0 : (placement === 'bottom' ? -20 : 20), scale: reducedMotion ? 1 : 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : (placement === 'bottom' ? -10 : 10), scale: reducedMotion ? 1 : 0.95 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
            duration: reducedMotion ? 0 : 0.4,
          }}
        >
          <Card className="bg-card/95 backdrop-blur-md border-primary/40 shadow-2xl overflow-hidden">
            {/* Gradient header */}
            <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />

            <CardContent className="p-5">
              {/* Skip button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="absolute top-2 end-2 h-10 w-10 p-0 text-muted-foreground hover:text-foreground rounded-full"
                aria-label={isHebrew ? 'סגור' : 'Close'}
              >
                <X className="w-4 h-4" />
              </Button>

              {/* Section label */}
              {sectionLabel && (
                <motion.div
                  key={sectionLabel}
                  className="flex justify-center mb-2"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                    {sectionLabel}
                  </span>
                </motion.div>
              )}

              {/* Progress dots */}
              <div
                className="flex justify-center gap-1.5 mb-4"
                aria-label={isHebrew ? `שלב ${currentStep + 1} מתוך ${totalSteps}` : `Step ${currentStep + 1} of ${totalSteps}`}
                role="status"
              >
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`h-2 rounded-full transition-all ${
                      i === currentStep
                        ? 'bg-primary'
                        : i < currentStep
                        ? 'bg-primary/50'
                        : 'bg-muted-foreground/20'
                    }`}
                    initial={false}
                    animate={{
                      width: i === currentStep ? 20 : 8,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
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
                className="flex items-center justify-between gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reducedMotion ? 0 : 0.35 }}
              >
                <Button
                  variant="ghost"
                  size="default"
                  onClick={onPrev}
                  disabled={isFirst}
                  className="gap-1.5 min-h-[44px] px-3"
                  aria-label={isHebrew ? 'שלב קודם' : 'Previous step'}
                >
                  {isHebrew ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  {isHebrew ? 'הקודם' : 'Back'}
                </Button>

                <span className="text-xs text-muted-foreground font-medium" aria-hidden="true">
                  {currentStep + 1} / {totalSteps}
                </span>

                <Button
                  size="default"
                  onClick={onNext}
                  className="gap-1.5 min-w-[100px] min-h-[44px]"
                  aria-label={isLast
                    ? (lastLabel ?? (isHebrew ? 'סיום הסיור' : 'Finish tour'))
                    : (isHebrew ? 'שלב הבא' : 'Next step')}
                >
                  {isLast ? (
                    <>
                      <Check className="w-4 h-4" />
                      {lastLabel ?? (isHebrew ? 'סיום' : 'Finish')}
                    </>
                  ) : (
                    <>
                      {isHebrew ? 'הבא' : 'Next'}
                      {isHebrew ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </>
                  )}
                </Button>
              </motion.div>
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
