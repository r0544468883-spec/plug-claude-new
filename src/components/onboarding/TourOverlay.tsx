import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourOverlayProps {
  targetSelector: string;
  isActive: boolean;
  onElementFound?: (found: boolean) => void;
}

export function TourOverlay({ targetSelector, isActive, onElementFound }: TourOverlayProps) {
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [searchAttempts, setSearchAttempts] = useState(0);

  const updateSpotlight = useCallback(() => {
    const element = document.querySelector(targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      const padding = 12;
      setSpotlightRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });

      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onElementFound?.(true);
      setSearchAttempts(0);
    } else {
      setSpotlightRect(null);
      onElementFound?.(false);
    }
  }, [targetSelector, onElementFound]);

  useEffect(() => {
    if (!isActive || !targetSelector) {
      setSpotlightRect(null);
      setSearchAttempts(0);
      return;
    }

    // Retry finding element with exponential backoff
    let attempts = 0;
    const maxAttempts = 8;
    
    const tryFindElement = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        updateSpotlight();
        setSearchAttempts(0);
      } else if (attempts < maxAttempts) {
        attempts++;
        setSearchAttempts(attempts);
        // Exponential backoff: 200, 400, 600, 800...
        setTimeout(tryFindElement, 200 + attempts * 100);
      } else {
        // Element not found after max attempts - proceed anyway
        onElementFound?.(false);
        setSearchAttempts(0);
      }
    };

    // Initial attempt with delay for page transitions
    const timer = setTimeout(tryFindElement, 350);

    // Update on resize/scroll
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [targetSelector, isActive, updateSpotlight, onElementFound]);

  return (
    <AnimatePresence>
      {isActive && spotlightRect && (
        <motion.div 
          className="fixed inset-0 z-[9998] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dark overlay with hole */}
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <mask id="spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <motion.rect
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    x: spotlightRect.left,
                    y: spotlightRect.top,
                    width: spotlightRect.width,
                    height: spotlightRect.height,
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  rx="12"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.7)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* Spotlight border/glow with pulse animation */}
          <motion.div
            className="absolute border-2 border-primary rounded-xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              boxShadow: [
                '0 0 20px hsl(var(--primary) / 0.4)',
                '0 0 40px hsl(var(--primary) / 0.6)',
                '0 0 20px hsl(var(--primary) / 0.4)',
              ],
            }}
            transition={{ 
              opacity: { duration: 0.3 },
              scale: { duration: 0.3 },
              boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
            style={{
              top: spotlightRect.top,
              left: spotlightRect.left,
              width: spotlightRect.width,
              height: spotlightRect.height,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
