import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PlugChat } from './PlugChat';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PlugFABProps {
  contextPage?: 'dashboard' | 'cv-builder' | 'applications' | 'jobs' | 'default';
  className?: string;
}

export function PlugFAB({ contextPage = 'default', className }: PlugFABProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <>
      {/* FAB Button */}
      <div
        className={cn(
          'fixed bottom-20 z-[200] lg:bottom-6',
          isRTL ? 'left-4' : 'right-4',
          className
        )}
      >
        <AnimatePresence>
          {showTooltip && !open && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.9 }}
              className={cn(
                'absolute bottom-14 whitespace-nowrap bg-popover border border-border text-popover-foreground text-xs px-3 py-1.5 rounded-lg shadow-md',
                isRTL ? 'left-0' : 'right-0'
              )}
            >
              {isRTL ? '💬 שוחח עם Plug' : '💬 Chat with Plug'}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen(true)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="relative w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg flex items-center justify-center text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label={isRTL ? 'פתח את Plug' : 'Open Plug Chat'}
        >
          {/* Glow pulse */}
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/40"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <Sparkles className="w-5 h-5 relative z-10" />
          {/* Availability indicator dot */}
          <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white dark:border-background animate-pulse z-20" />
        </motion.button>
      </div>

      {/* Chat Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-2 border-b border-border flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              Plug AI
              <span className="text-xs text-muted-foreground font-normal ms-1">
                {isRTL ? '— עוזר חכם' : '— Smart Assistant'}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-0">
            <PlugChat contextPage={contextPage} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
