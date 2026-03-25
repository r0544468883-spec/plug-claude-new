import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, FileText, Search, BarChart3, Upload, Briefcase, PenLine } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  labelHe: string;
  message: string;
  messageHe: string;
}

interface PlugFloatingHintProps {
  contextPage?: 'dashboard' | 'cv-builder' | 'applications' | 'jobs' | 'default';
  onChatOpen?: (initialMessage?: string) => void;
  /** Increment to force show the hint (e.g. via a button) */
  forceShowSignal?: number;
}

export const PlugFloatingHint = ({ contextPage = 'default', onChatOpen, forceShowSignal }: PlugFloatingHintProps) => {
  const { direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const isForceShownRef = useRef(false);


  const safeSessionGet = (key: string) => {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      console.warn('[PlugFloatingHint] sessionStorage.getItem failed', { key, e });
      return null;
    }
  };

  const safeSessionSet = (key: string, value: string) => {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn('[PlugFloatingHint] sessionStorage.setItem failed', { key, e });
    }
  };

  const safeSessionRemove = (key: string) => {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.warn('[PlugFloatingHint] sessionStorage.removeItem failed', { key, e });
    }
  };

  // Show hint after a short delay on page load - always show on each page visit
  useEffect(() => {
    // Reset dismissed state when context changes
    setIsDismissed(false);
    isForceShownRef.current = false;
    setIsVisible(false); // Reset visibility first
    
    // Always show hint after delay on each page/context change
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [contextPage]);

  // Allow the parent to force-show the hint via a signal.
  // This explicitly clears the session storage flag so it actually shows,
  // and keeps it visible until the user closes it.
  useEffect(() => {
    if (!forceShowSignal) return;
    // Make it visible even if sessionStorage is blocked.
    setIsVisible(true);
    // Clear the session storage so the hint can show again
    safeSessionRemove(`plug-hint-shown-${contextPage}`);
    setIsDismissed(false);
    isForceShownRef.current = true;
  }, [forceShowSignal, contextPage]);

  // Auto-hide after 10 seconds (extended for quick actions)
  useEffect(() => {
    if (isVisible && !isDismissed) {
      // If opened via ✨, keep it open until the user closes it.
      if (isForceShownRef.current) return;
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isDismissed]);

  const getHintMessage = () => {
    switch (contextPage) {
      case 'cv-builder':
        return isRTL 
          ? '💡 צריך עזרה עם קורות החיים? אני כאן!'
          : '💡 Need help with your CV? I\'m here!';
      case 'applications':
        return isRTL 
          ? '📊 רוצה שאסכם את ההתקדמות שלך?'
          : '📊 Want me to summarize your progress?';
      case 'jobs':
        return isRTL 
          ? '🎯 אני יכול לעזור למצוא משרות מתאימות!'
          : '🎯 I can help find matching jobs!';
      case 'dashboard':
      default:
        return isRTL 
          ? '👋 היי! אני Plug, ואני כאן לעזור לך'
          : '👋 Hey! I\'m Plug, here to help you';
    }
  };

  const getQuickActions = (): QuickAction[] => {
    switch (contextPage) {
      case 'cv-builder':
        return [
          { 
            icon: <PenLine className="w-3 h-3" />, 
            label: 'Improve CV', 
            labelHe: 'שפר קו״ח',
            message: 'Help me improve my CV - suggest better wording and structure',
            messageHe: 'עזור לי לשפר את קורות החיים שלי - הצע ניסוחים ומבנה טוב יותר'
          },
          { 
            icon: <Upload className="w-3 h-3" />, 
            label: 'Tips', 
            labelHe: 'טיפים',
            message: 'Give me professional tips to make my CV stand out',
            messageHe: 'תן לי טיפים מקצועיים כדי שקורות החיים שלי יבלטו'
          },
        ];
      case 'applications':
        return [
          { 
            icon: <BarChart3 className="w-3 h-3" />, 
            label: 'Summary', 
            labelHe: 'סיכום',
            message: 'Summarize my job application progress and status',
            messageHe: 'סכם לי את ההתקדמות שלי במועמדויות לעבודה'
          },
          { 
            icon: <FileText className="w-3 h-3" />, 
            label: 'Follow-ups', 
            labelHe: 'מעקב',
            message: 'Which applications should I follow up on?',
            messageHe: 'על אילו מועמדויות כדאי לי לעקוב?'
          },
        ];
      case 'jobs':
        return [
          { 
            icon: <Search className="w-3 h-3" />, 
            label: 'Match me', 
            labelHe: 'התאם לי',
            message: 'Find jobs that match my skills and experience',
            messageHe: 'מצא לי משרות שמתאימות לכישורים ולניסיון שלי'
          },
          { 
            icon: <Briefcase className="w-3 h-3" />, 
            label: 'Trending', 
            labelHe: 'טרנדים',
            message: 'What are the trending job opportunities in my field?',
            messageHe: 'מהן המשרות המובילות בתחום שלי?'
          },
        ];
      case 'dashboard':
      default:
        return [
          { 
            icon: <FileText className="w-3 h-3" />, 
            label: 'My status', 
            labelHe: 'הסטטוס שלי',
            message: 'Give me an overview of my job search status',
            messageHe: 'תן לי סקירה על מצב חיפוש העבודה שלי'
          },
          { 
            icon: <Search className="w-3 h-3" />, 
            label: 'Find jobs', 
            labelHe: 'חפש משרות',
            message: 'Help me find new job opportunities',
            messageHe: 'עזור לי למצוא הזדמנויות עבודה חדשות'
          },
        ];
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  const handleClick = () => {
    onChatOpen?.();
    setIsVisible(false);
  };

  const handleQuickAction = (action: QuickAction) => {
    const message = isRTL ? action.messageHe : action.message;
    onChatOpen?.(message);
    setIsVisible(false);
  };

  const quickActions = getQuickActions();

  return (
    <AnimatePresence>
      {isVisible && !isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
          }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ 
            type: 'spring', 
            stiffness: 400, 
            damping: 15,
            mass: 0.8,
          }}
          data-testid="plug-floating-hint"
          className={`pointer-events-auto fixed bottom-24 ${isRTL ? 'left-4' : 'right-4'} z-[1000] max-w-xs`}
        >
          {/* Glow effect */}
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/40 via-accent/40 to-primary/40 blur-xl"
            animate={{
              opacity: [0.4, 0.8, 0.4],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          
          <motion.div 
              className="pointer-events-auto relative bg-card border border-primary/30 rounded-2xl shadow-xl p-4 outline outline-1 outline-transparent"
            initial={{ rotate: -2 }}
            animate={{ rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors z-10"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>

            {/* Content */}
            <div className="flex items-start gap-3">
              <motion.div 
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 300, 
                  damping: 15, 
                  delay: 0.2,
                }}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </motion.div>
              </motion.div>
              <div className="flex-1">
                <motion.p 
                  className="text-sm font-medium text-foreground mb-3"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {getHintMessage()}
                </motion.p>
                
                {/* Quick Actions */}
                <motion.div 
                  className="flex flex-wrap gap-2 mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {quickActions.map((qa, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      <button
                        type="button"
                        onClick={() => handleQuickAction(qa)}
                        className="inline-flex items-center gap-1.5 text-xs h-7 px-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105 transition-transform"
                      >
                        {qa.icon}
                        {isRTL ? qa.labelHe : qa.label}
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
                
                {/* Open Chat button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <button
                    type="button"
                    onClick={handleClick}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Sparkles className="w-3 h-3" />
                    {isRTL ? 'או שאל אותי כל דבר...' : 'Or ask me anything...'}
                  </button>
                </motion.div>
              </div>
            </div>

            {/* Decorative tail */}
            <div className={`pointer-events-none absolute bottom-4 ${isRTL ? '-left-2' : '-right-2'} w-4 h-4 bg-card border-r border-b border-primary/30 transform rotate-45`} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
