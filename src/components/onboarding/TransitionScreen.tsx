import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlugLogo } from '@/components/PlugLogo';
import { useLanguage } from '@/contexts/LanguageContext';

interface TransitionScreenProps {
  tip: string;
  isActive: boolean;
  onComplete: () => void;
  duration?: number;
}

export function TransitionScreen({ 
  tip, 
  isActive, 
  onComplete, 
  duration = 2000 
}: TransitionScreenProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      return;
    }

    // Animate progress
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(interval);
        onComplete();
      }
    }, 16);

    return () => clearInterval(interval);
  }, [isActive, duration, onComplete]);

  // Safety: disabled to prevent full-screen overlay lockups.
  return null;
}
