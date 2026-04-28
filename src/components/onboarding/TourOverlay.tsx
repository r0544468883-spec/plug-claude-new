import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

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
  const reducedMotion = useReducedMotion();

  const hasScrolledRef = useRef(false);

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

      // Scroll element into view only once per selector (avoid scroll loop)
      // On mobile, use 'center' so the tooltip has room above/below the element
      if (!hasScrolledRef.current) {
        hasScrolledRef.current = true;
        const isMobileVp = window.innerWidth < 768;
        element.scrollIntoView({ behavior: 'smooth', block: isMobileVp ? 'center' : 'nearest' });
      }
      onElementFound?.(true);
    } else {
      setSpotlightRect(null);
      onElementFound?.(false);
    }
  }, [targetSelector, onElementFound]);

  // Reset scroll flag when selector changes
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [targetSelector]);

  useEffect(() => {
    if (!isActive || !targetSelector) {
      setSpotlightRect(null);
      return;
    }

    // Retry finding element with exponential backoff
    let attempts = 0;
    const maxAttempts = 8;

    const tryFindElement = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        updateSpotlight();
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryFindElement, 200 + attempts * 100);
      } else {
        // Element not found after max attempts - proceed anyway
        onElementFound?.(false);
      }
    };

    // Initial attempt with delay for page transitions
    const timer = setTimeout(tryFindElement, 350);

    // Update on resize/scroll
    window.addEventListener('resize', updateSpotlight, { passive: true });
    window.addEventListener('scroll', updateSpotlight, { passive: true, capture: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, { capture: true } as EventListenerOptions);
    };
  }, [targetSelector, isActive, updateSpotlight, onElementFound]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[9998]"
          role="presentation"
          aria-hidden="true"
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.94 }}
          transition={{ duration: reducedMotion ? 0.15 : 0.28, ease: 'easeOut' }}
        >
          {/* Dark overlay with hole — blocks clicks outside spotlight */}
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'auto' }} aria-hidden="true" focusable="false">
            <defs>
              <mask id="spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {spotlightRect && (
                  <motion.rect
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1,
                      x: spotlightRect.left,
                      y: spotlightRect.top,
                      width: spotlightRect.width,
                      height: spotlightRect.height,
                    }}
                    transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                    rx="12"
                    fill="black"
                  />
                )}
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

          {/* Transparent clickable area over the spotlight hole — lets clicks pass through to the element */}
          {spotlightRect && (
            <div
              className="absolute"
              style={{
                top: spotlightRect.top,
                left: spotlightRect.left,
                width: spotlightRect.width,
                height: spotlightRect.height,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Spotlight border/glow with pulse animation */}
          {spotlightRect && (
            <motion.div
              className="absolute border-2 border-primary rounded-xl pointer-events-none"
              initial={{ opacity: 0, scale: 0.92 }}
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
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
