import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface TransitionScreenProps {
  tip: string;
  isActive: boolean;
  onComplete: () => void;
  duration?: number;
}

/**
 * Lightweight transition banner shown when the tour moves between sections.
 * Renders as a top banner (not full-screen) to avoid lockups.
 * Auto-completes after `duration` ms.
 */
export function TransitionScreen({
  tip,
  isActive,
  onComplete,
  duration = 1200
}: TransitionScreenProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  useEffect(() => {
    if (!isActive) return;

    const timer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [isActive, duration, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[10000] flex items-center justify-center py-4 px-6 bg-background/95 backdrop-blur-md border-b border-primary/30 shadow-lg"
          dir={isHebrew ? 'rtl' : 'ltr'}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <p className="text-sm font-medium text-foreground">{tip}</p>
          </div>
          {/* Progress bar */}
          <motion.div
            className="absolute bottom-0 left-0 h-0.5 bg-primary"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
