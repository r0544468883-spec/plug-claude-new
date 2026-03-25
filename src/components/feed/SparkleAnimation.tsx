import { motion, AnimatePresence } from 'framer-motion';

interface SparkleAnimationProps {
  show: boolean;
}

export function SparkleAnimation({ show }: SparkleAnimationProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1.2 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="absolute -top-1 -end-1 text-xs pointer-events-none"
          style={{ color: 'hsl(var(--primary))' }}
        >
          ✨
        </motion.span>
      )}
    </AnimatePresence>
  );
}
